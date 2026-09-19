import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  openAcademicDatabase,
  closeAllDatabases,
} from '../src/connection.js';
import { migrateAcademicDatabase } from '../src/migrations/migrator.js';
import {
  StudentRepository,
  GroupRepository,
  PaymentRepository,
  InvoiceRepository,
  DiscountRepository,
} from '../src/repositories/index.js';

describe('Finance Repositories & Database Tables', () => {
  let tempDir: string;
  let academicDbPath: string;
  let studentRepo: StudentRepository;
  let groupRepo: GroupRepository;
  let paymentRepo: PaymentRepository;
  let invoiceRepo: InvoiceRepository;
  let discountRepo: DiscountRepository;

  let testStudentId: string;
  let testGroupId: string;

  beforeEach(() => {
    closeAllDatabases();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-finance-db-test-'));
    academicDbPath = path.join(tempDir, 'academic-2026-2027.sqlite');

    const acad = openAcademicDatabase(academicDbPath);
    migrateAcademicDatabase(acad.raw);

    studentRepo = new StudentRepository(acad.db);
    groupRepo = new GroupRepository(acad.db);
    paymentRepo = new PaymentRepository(acad.db);
    invoiceRepo = new InvoiceRepository(acad.db);
    discountRepo = new DiscountRepository(acad.db);

    testStudentId = crypto.randomUUID();
    studentRepo.create({
      id: testStudentId,
      studentCode: 'TB-1001',
      fullName: 'عمر خالد السعيد',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01012345678',
      status: 'ACTIVE',
      qrToken: 'QR-TB-1001',
      barcodeValue: 'TB-1001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    testGroupId = crypto.randomUUID();
    groupRepo.create({
      id: testGroupId,
      name: 'مجموعة الصف الأول الثانوي - أ',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 300,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

  });

  afterEach(() => {
    closeAllDatabases();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('PaymentRepository', () => {
    it('inserts and retrieves a payment row', () => {
      const paymentId = crypto.randomUUID();
      const created = paymentRepo.insert({
        id: paymentId,
        receiptNumber: 'REC-2026-0001',
        studentId: testStudentId,
        groupId: testGroupId,
        amountCents: 30000, // 300.00 EGP
        paymentMethod: 'CASH',
        paymentDate: '2026-09-19',
        periodMonth: '2026-09',
        notes: 'دفعة نقدية لشهر سبتمبر',
        recordedByUserId: 'usr-admin-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(created.id).toBe(paymentId);
      expect(created.amountCents).toBe(30000);
      expect(created.receiptNumber).toBe('REC-2026-0001');

      const byId = paymentRepo.findById(paymentId);
      expect(byId).not.toBeNull();
      expect(byId?.receiptNumber).toBe('REC-2026-0001');

      const byReceipt = paymentRepo.findByReceiptNumber('REC-2026-0001');
      expect(byReceipt).not.toBeNull();
      expect(byReceipt?.id).toBe(paymentId);
    });

    it('lists payments by student and calculates totals', () => {
      paymentRepo.insert({
        id: crypto.randomUUID(),
        receiptNumber: 'REC-2026-0001',
        studentId: testStudentId,
        amountCents: 15000,
        paymentMethod: 'VODAFONE_CASH',
        paymentDate: '2026-09-01',
        recordedByUserId: 'usr-admin-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      paymentRepo.insert({
        id: crypto.randomUUID(),
        receiptNumber: 'REC-2026-0002',
        studentId: testStudentId,
        amountCents: 10000,
        paymentMethod: 'CASH',
        paymentDate: '2026-09-15',
        recordedByUserId: 'usr-admin-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const list = paymentRepo.listByStudent(testStudentId);
      expect(list).toHaveLength(2);

      const total = paymentRepo.totalPaidByStudent(testStudentId);
      expect(total).toBe(25000);

      const totalCollected = paymentRepo.totalCollected();
      expect(totalCollected).toBe(25000);
    });

    it('rejects zero or negative amount at database level', () => {
      expect(() => {
        paymentRepo.insert({
          id: crypto.randomUUID(),
          receiptNumber: 'REC-INVALID',
          studentId: testStudentId,
          amountCents: 0,
          paymentMethod: 'CASH',
          paymentDate: '2026-09-19',
          recordedByUserId: 'usr-admin-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }).toThrow();

      expect(() => {
        paymentRepo.insert({
          id: crypto.randomUUID(),
          receiptNumber: 'REC-INVALID-2',
          studentId: testStudentId,
          amountCents: -500,
          paymentMethod: 'CASH',
          paymentDate: '2026-09-19',
          recordedByUserId: 'usr-admin-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }).toThrow();
    });
  });

  describe('InvoiceRepository', () => {
    it('creates invoice with items and retrieves it', () => {
      const invoiceId = crypto.randomUUID();
      const result = invoiceRepo.insert(
        {
          id: invoiceId,
          invoiceNumber: 'INV-2026-0001',
          studentId: testStudentId,
          groupId: testGroupId,
          issueDate: '2026-09-19',
          dueDate: '2026-09-30',
          periodMonth: '2026-09',
          subtotalCents: 35000,
          discountCents: 5000,
          totalCents: 30000,
          paidCents: 0,
          remainingCents: 30000,
          status: 'UNPAID',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        [
          {
            id: crypto.randomUUID(),
            invoiceId,
            description: 'اشتراك شهر سبتمبر',
            itemType: 'MONTHLY_SUBSCRIPTION',
            quantity: 1,
            unitPriceCents: 30000,
            amountCents: 30000,
          },
          {
            id: crypto.randomUUID(),
            invoiceId,
            description: 'مذكرة الرياضيات - الجبر',
            itemType: 'MATERIAL_FEE',
            quantity: 1,
            unitPriceCents: 5000,
            amountCents: 5000,
          },
        ]
      );

      expect(result.invoice.invoiceNumber).toBe('INV-2026-0001');
      expect(result.items).toHaveLength(2);

      const fetched = invoiceRepo.findById(invoiceId);
      expect(fetched).not.toBeNull();
      expect(fetched?.invoice.totalCents).toBe(30000);
      expect(fetched?.items).toHaveLength(2);

      // Update invoice status
      invoiceRepo.updateStatus(invoiceId, 'PAID', 30000, 0);
      const updated = invoiceRepo.findById(invoiceId);
      expect(updated?.invoice.status).toBe('PAID');
      expect(updated?.invoice.paidCents).toBe(30000);
      expect(updated?.invoice.remainingCents).toBe(0);
    });
  });

  describe('DiscountRepository', () => {
    it('inserts and lists discounts for a student', () => {
      const discountId = crypto.randomUUID();
      discountRepo.insert({
        id: discountId,
        studentId: testStudentId,
        groupId: testGroupId,
        discountType: 'PERCENTAGE',
        discountValue: 15,
        reason: 'خصم تفوق',
        status: 'ACTIVE',
        appliedByUserId: 'usr-admin-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const active = discountRepo.listActiveByStudent(testStudentId, testGroupId);
      expect(active).toHaveLength(1);
      expect(active[0]!.discountValue).toBe(15);
      expect(active[0]!.discountType).toBe('PERCENTAGE');

      // Deactivate discount
      discountRepo.updateStatus(discountId, 'INACTIVE');
      const activeAfter = discountRepo.listActiveByStudent(testStudentId, testGroupId);
      expect(activeAfter).toHaveLength(0);
    });
  });
});
