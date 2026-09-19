import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  openAcademicDatabase,
  closeAllDatabases,
  migrateAcademicDatabase,
  students,
  groups,
} from '@tibyan/db';
import { FinanceService } from '../src/finance/finance.service.js';
import { ThermalReceiptService } from '../src/finance/thermal-receipt.service.js';
import { EscPosBuilder } from '../src/finance/escpos.builder.js';
import type { AuthenticatedUser } from '../src/students/student.service.js';

describe('ThermalReceiptService & EscPosBuilder', () => {
  let tempDir: string;
  let academicDbPath: string;
  let financeService: FinanceService;
  let thermalService: ThermalReceiptService;

  let ownerActor: AuthenticatedUser;
  let assistantActorWithoutPerm: AuthenticatedUser;
  let testStudentId: string;
  let testGroupId: string;

  beforeEach(() => {
    closeAllDatabases();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-thermal-core-test-'));
    academicDbPath = path.join(tempDir, 'academic-2026-2027.sqlite');

    const acad = openAcademicDatabase(academicDbPath);
    migrateAcademicDatabase(acad.raw);

    financeService = new FinanceService(acad.db);
    thermalService = new ThermalReceiptService(acad.db);

    ownerActor = {
      userId: 'usr-owner-1',
      fullName: 'الأستاذ أحمد الشريف',
      role: 'OWNER',
      permissions: [],
    };

    assistantActorWithoutPerm = {
      userId: 'usr-assistant-1',
      fullName: 'مساعد المعلم - بدون صلاحية',
      role: 'ASSISTANT',
      permissions: ['STUDENTS_READ'],
    };

    // Seed student
    testStudentId = crypto.randomUUID();
    const now = new Date().toISOString();
    acad.db.insert(students).values({
      id: testStudentId,
      fullName: 'محمود السيد علي',
      studentCode: 'TB-4001',
      qrToken: crypto.randomUUID(),
      barcodeValue: 'TB-4001',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01011112222',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    }).run();

    // Seed group
    testGroupId = crypto.randomUUID();
    acad.db.insert(groups).values({
      id: testGroupId,
      name: 'مجموعة الجبر - أولى إعدادي',
      gradeLevel: 'PREP_1',
      educationSystem: 'GENERAL',
      languageTrack: 'ARABIC',
      defaultPaymentType: 'PER_SESSION',
      defaultPaymentAmount: 6000,
      createdAt: now,
      updatedAt: now,
    }).run();
  });

  afterEach(() => {
    closeAllDatabases();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('Authoritative Receipt Loading & Immutability', () => {
    it('loads persisted receipt data from paymentId accurately', async () => {
      const payment = await financeService.recordPayment(
        {
          studentId: testStudentId,
          groupId: testGroupId,
          amountCents: 12000,
          paymentMethod: 'CASH',
          paymentDate: '2026-10-01',
          notes: 'دفعة حصتين مقدماً',
        },
        ownerActor
      );

      const receipt = await thermalService.getThermalReceiptData(payment.id, ownerActor);

      expect(receipt.paymentId).toBe(payment.id);
      expect(receipt.receiptNumber).toBe(payment.receiptNumber);
      expect(receipt.studentName).toBe('محمود السيد علي');
      expect(receipt.studentCode).toBe('TB-4001');
      expect(receipt.groupName).toBe('مجموعة الجبر - أولى إعدادي');
      expect(receipt.gradeLevelNameAr).toBe('الصف الأول الإعدادي');
      expect(receipt.amountCents).toBe(12000);
      expect(receipt.amountFormatted).toContain('ج.م');
      expect(receipt.paymentMethod).toBe('CASH');
      expect(receipt.paymentMethodNameAr).toBe('نقدي');
      expect(receipt.notes).toBe('دفعة حصتين مقدماً');
      expect(receipt.isTestReceipt).toBe(false);
    });

    it('preserves exact receipt number and never creates duplicate payment on reprint', async () => {
      const payment = await financeService.recordPayment(
        {
          studentId: testStudentId,
          amountCents: 5000,
          paymentMethod: 'INSTAPAY',
          paymentDate: '2026-10-02',
        },
        ownerActor
      );

      const receipt1 = await thermalService.getThermalReceiptData(payment.id, ownerActor);
      const receipt2 = await thermalService.getThermalReceiptData(payment.id, ownerActor);

      expect(receipt1.receiptNumber).toBe(payment.receiptNumber);
      expect(receipt2.receiptNumber).toBe(payment.receiptNumber);
      expect(receipt1.receiptNumber).toBe(receipt2.receiptNumber);

      // Verify no extra payment was created
      const allPayments = await financeService.listStudentPayments(testStudentId);
      expect(allPayments.length).toBe(1);
    });

    it('throws PAYMENT_NOT_FOUND for invalid paymentId', async () => {
      const fakeId = crypto.randomUUID();
      await expect(thermalService.getThermalReceiptData(fakeId, ownerActor)).rejects.toThrowError(
        /سجل الدفعة بالمعرف .* غير موجود/
      );
    });

    it('enforces authentication and PAYMENTS_READ permissions', async () => {
      const payment = await financeService.recordPayment(
        {
          studentId: testStudentId,
          amountCents: 5000,
          paymentMethod: 'CASH',
          paymentDate: '2026-10-02',
        },
        ownerActor
      );

      await expect(thermalService.getThermalReceiptData(payment.id, assistantActorWithoutPerm)).rejects.toThrowError(
        /PERMISSION_DENIED/
      );
    });

    it('generates non-financial test receipt without modifying database', () => {
      const initialPayments = financeService.paymentRepo.countAll();
      const testReceipt = thermalService.generateTestReceiptData('80mm', 'أ. أحمد الشريف');

      expect(testReceipt.isTestReceipt).toBe(true);
      expect(testReceipt.receiptNumber).toBe('TEST-0000');
      expect(testReceipt.teacherName).toBe('أ. أحمد الشريف');
      expect(testReceipt.studentCode).toBe('TB-TEST');

      // Zero db mutations
      expect(financeService.paymentRepo.countAll()).toBe(initialPayments);
    });
  });

  describe('EscPosBuilder Transport-Independent Command Stream', () => {
    it('initializes with ESC @', () => {
      const builder = new EscPosBuilder();
      const buf = builder.build();
      expect(buf[0]).toBe(0x1b);
      expect(buf[1]).toBe(0x40);
    });

    it('sets alignment correctly for left, center, right', () => {
      const b1 = new EscPosBuilder().setAlign('left').build();
      expect(b1.subarray(2, 5)).toEqual(Buffer.from([0x1b, 0x61, 0x00]));

      const b2 = new EscPosBuilder().setAlign('center').build();
      expect(b2.subarray(2, 5)).toEqual(Buffer.from([0x1b, 0x61, 0x01]));

      const b3 = new EscPosBuilder().setAlign('right').build();
      expect(b3.subarray(2, 5)).toEqual(Buffer.from([0x1b, 0x61, 0x02]));
    });

    it('sets bold and cut commands', () => {
      const builder = new EscPosBuilder()
        .setBold(true)
        .cut('partial');

      const buf = builder.build();
      // ESC E 1
      expect(buf.includes(Buffer.from([0x1b, 0x45, 0x01]))).toBe(true);
      // GS V B 0
      expect(buf.includes(Buffer.from([0x1d, 0x56, 0x42, 0x00]))).toBe(true);
    });

    it('encodes raster bit image with GS v 0 format', () => {
      const width = 16; // 2 bytes
      const height = 2;
      const dummyBitData = Buffer.from([0xff, 0x00, 0xaa, 0x55]);

      const builder = new EscPosBuilder().rasterBitImage(width, height, dummyBitData);
      const buf = builder.build();

      // Look for GS v 0 0 xL xH yL yH
      // xL = 2, xH = 0, yL = 2, yH = 0
      const expectedHeader = Buffer.from([0x1d, 0x76, 0x30, 0x00, 0x02, 0x00, 0x02, 0x00]);
      expect(buf.includes(expectedHeader)).toBe(true);
      expect(buf.includes(dummyBitData)).toBe(true);
    });

    it('builds complete formatted receipt buffer for 80mm and 58mm', () => {
      const testReceipt = thermalService.generateTestReceiptData('80mm');
      const buf80 = EscPosBuilder.buildReceipt(testReceipt, { paperWidth: '80mm', autoCut: true });
      const buf58 = EscPosBuilder.buildReceipt(testReceipt, { paperWidth: '58mm', autoCut: false });

      expect(buf80.length).toBeGreaterThan(100);
      expect(buf58.length).toBeGreaterThan(100);

      // buf80 has cut command (GS V)
      expect(buf80.includes(Buffer.from([0x1d, 0x56]))).toBe(true);
      // buf58 has autoCut=false so no cut command
      expect(buf58.includes(Buffer.from([0x1d, 0x56]))).toBe(false);
    });
  });
});
