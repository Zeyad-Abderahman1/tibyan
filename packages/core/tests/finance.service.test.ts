import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  openAcademicDatabase,
  closeAllDatabases,
} from '@tibyan/db';
import { migrateAcademicDatabase } from '@tibyan/db';
import {
  FinanceService,
  egpToCents,
  centsToEgp,
  formatCentsToArabicEgp,
} from '../src/finance/finance.service.js';
import type { AuthenticatedUser } from '../src/students/student.service.js';

describe('FinanceService Core Domain Logic', () => {
  let tempDir: string;
  let academicDbPath: string;
  let financeService: FinanceService;

  let ownerActor: AuthenticatedUser;
  let assistantActorWithoutPerm: AuthenticatedUser;
  let assistantActorWithPerm: AuthenticatedUser;

  let testStudentId: string;
  let testGroupId: string;

  beforeEach(() => {
    closeAllDatabases();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-finance-core-test-'));
    academicDbPath = path.join(tempDir, 'academic-2026-2027.sqlite');

    const acad = openAcademicDatabase(academicDbPath);
    migrateAcademicDatabase(acad.raw);

    financeService = new FinanceService(acad.db);

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

    assistantActorWithPerm = {
      userId: 'usr-assistant-2',
      fullName: 'مساعد المعلم - بصلاحية مالية',
      role: 'ASSISTANT',
      permissions: ['PAYMENTS_READ', 'PAYMENTS_WRITE'],
    };

    // Create test student
    testStudentId = crypto.randomUUID();
    financeService.studentRepo.create({
      id: testStudentId,
      studentCode: 'TB-0101',
      fullName: 'يوسف مصطفى عثمان',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_2',
      languageTrack: 'ARABIC',
      guardianPhone: '01123456789',
      status: 'ACTIVE',
      qrToken: 'QR-TB-0101',
      barcodeValue: 'TB-0101',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create test group with monthly billing of 350 EGP
    testGroupId = crypto.randomUUID();
    financeService.groupRepo.create({
      id: testGroupId,
      name: 'مجموعة الصف الثاني الثانوي - تفاضل وحساب مثلثات',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_2',
      languageTrack: 'ARABIC',
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 350,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Enroll student into the group
    financeService.enrollmentRepo.create({
      id: crypto.randomUUID(),
      studentId: testStudentId,
      groupId: testGroupId,
      enrolledAt: '2026-09-01',
      status: 'ACTIVE',
      paymentTypeOverride: null,
      paymentAmountOverride: null,
      createdAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    closeAllDatabases();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Money Conversion Helpers', () => {
    it('converts EGP to cents accurately without floating precision errors', () => {
      expect(egpToCents(350)).toBe(35000);
      expect(egpToCents(99.50)).toBe(9950);
      expect(egpToCents(0.25)).toBe(25);
    });

    it('converts cents back to EGP accurately', () => {
      expect(centsToEgp(35000)).toBe(350);
      expect(centsToEgp(9950)).toBe(99.5);
    });

    it('formats cents to localized Arabic EGP text', () => {
      const formatted = formatCentsToArabicEgp(35000);
      expect(formatted).toContain('ج.م');
    });
  });

  describe('recordPayment', () => {
    it('records payment, creates sequential receipt number and emits audit log', async () => {
      const payment = await financeService.recordPayment(
        {
          studentId: testStudentId,
          groupId: testGroupId,
          amountCents: 35000,
          paymentMethod: 'CASH',
          paymentDate: '2026-09-19',
          periodMonth: '2026-09',
          notes: 'سداد كامل اشتراك شهر سبتمبر',
        },
        ownerActor
      );

      expect(payment.id).toBeDefined();
      expect(payment.receiptNumber).toMatch(/^REC-\d{4}-\d{4}$/);
      expect(payment.amountCents).toBe(35000);
      expect(payment.studentName).toBe('يوسف مصطفى عثمان');
      expect(payment.studentCode).toBe('TB-0101');

      // Verify audit log
      const auditRows = financeService.auditRepo.findByEntity('PAYMENT', payment.id);
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0]!.action).toBe('PAYMENT_RECORDED');
      expect(auditRows[0]!.actorNameSnapshot).toBe('الأستاذ أحمد الشريف');
    });

    it('enforces PAYMENTS_WRITE permission for assistant users', async () => {
      await expect(
        financeService.recordPayment(
          {
            studentId: testStudentId,
            amountCents: 10000,
            paymentMethod: 'CASH',
            paymentDate: '2026-09-19',
          },
          assistantActorWithoutPerm
        )
      ).rejects.toThrow(/PERMISSION_DENIED/);

      // Assistant with permission succeeds
      const payment = await financeService.recordPayment(
        {
          studentId: testStudentId,
          amountCents: 10000,
          paymentMethod: 'CASH',
          paymentDate: '2026-09-19',
        },
        assistantActorWithPerm
      );
      expect(payment.amountCents).toBe(10000);
    });

    it('throws STUDENT_NOT_FOUND when studentId does not exist', async () => {
      await expect(
        financeService.recordPayment(
          {
            studentId: crypto.randomUUID(),
            amountCents: 5000,
            paymentMethod: 'CASH',
            paymentDate: '2026-09-19',
          },
          ownerActor
        )
      ).rejects.toThrow(/غير موجود/);
    });
  });

  describe('applyDiscount', () => {
    it('applies a percentage discount and verifies audit log', async () => {
      const discount = await financeService.applyDiscount(
        {
          studentId: testStudentId,
          groupId: testGroupId,
          discountType: 'PERCENTAGE',
          discountValue: 20,
          reason: 'خصم تفوق أكاديمي',
        },
        ownerActor
      );

      expect(discount.id).toBeDefined();
      expect(discount.discountType).toBe('PERCENTAGE');
      expect(discount.discountValue).toBe(20);
      expect(discount.status).toBe('ACTIVE');

      const auditRows = financeService.auditRepo.findByEntity('STUDENT_DISCOUNT', discount.id);
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0]!.action).toBe('DISCOUNT_APPLIED');
    });

    it('applies a fixed amount discount', async () => {
      const discount = await financeService.applyDiscount(
        {
          studentId: testStudentId,
          discountType: 'FIXED_AMOUNT',
          discountValue: 5000, // 50 EGP
          reason: 'خصم أشقاء',
        },
        ownerActor
      );

      expect(discount.discountType).toBe('FIXED_AMOUNT');
      expect(discount.discountValue).toBe(5000);
    });
  });

  describe('getStudentFinancialSummary & Balance Math', () => {
    it('accurately computes charges, discounts, payments, and status', async () => {
      // Initially: 1 month active (Sep 2026) at 350 EGP (35000 cents), 0 paid -> UNPAID
      const initialSummary = await financeService.getStudentFinancialSummary(testStudentId);
      expect(initialSummary.totalChargesCents).toBe(35000);
      expect(initialSummary.totalPaidCents).toBe(0);
      expect(initialSummary.remainingBalanceCents).toBe(35000);
      expect(initialSummary.status).toBe('UNPAID');

      // Apply 10% discount: 3500 cents discount, net = 31500 cents
      await financeService.applyDiscount(
        {
          studentId: testStudentId,
          groupId: testGroupId,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          reason: 'خصم 10%',
        },
        ownerActor
      );

      const summaryAfterDiscount = await financeService.getStudentFinancialSummary(testStudentId);
      expect(summaryAfterDiscount.totalDiscountsCents).toBe(3500);
      expect(summaryAfterDiscount.netPayableCents).toBe(31500);
      expect(summaryAfterDiscount.remainingBalanceCents).toBe(31500);

      // Make partial payment of 150 EGP (15000 cents) -> PARTIALLY_PAID
      await financeService.recordPayment(
        {
          studentId: testStudentId,
          groupId: testGroupId,
          amountCents: 15000,
          paymentMethod: 'VODAFONE_CASH',
          paymentDate: '2026-09-10',
        },
        ownerActor
      );

      const summaryAfterPartial = await financeService.getStudentFinancialSummary(testStudentId);
      expect(summaryAfterPartial.totalPaidCents).toBe(15000);
      expect(summaryAfterPartial.remainingBalanceCents).toBe(16500); // 31500 - 15000
      expect(summaryAfterPartial.status).toBe('PARTIALLY_PAID');

      // Pay remaining 165 EGP (16500 cents) -> PAID
      await financeService.recordPayment(
        {
          studentId: testStudentId,
          groupId: testGroupId,
          amountCents: 16500,
          paymentMethod: 'CASH',
          paymentDate: '2026-09-19',
        },
        ownerActor
      );

      const summaryAfterFinal = await financeService.getStudentFinancialSummary(testStudentId);
      expect(summaryAfterFinal.totalPaidCents).toBe(31500);
      expect(summaryAfterFinal.remainingBalanceCents).toBe(0);
      expect(summaryAfterFinal.status).toBe('PAID');
    });
  });

  describe('createInvoice & getInvoice', () => {
    it('creates invoice with items, matches payments, and generates deterministic invoice number', async () => {
      const invoice = await financeService.createInvoice(
        {
          studentId: testStudentId,
          groupId: testGroupId,
          issueDate: '2026-09-19',
          dueDate: '2026-09-30',
          periodMonth: '2026-09',
          items: [
            {
              description: 'اشتراك شهر سبتمبر 2026',
              itemType: 'MONTHLY_SUBSCRIPTION',
              quantity: 1,
              unitPriceCents: 35000,
            },
            {
              description: 'مذكرة المراجعة الشاملة',
              itemType: 'MATERIAL_FEE',
              quantity: 1,
              unitPriceCents: 5000,
            },
          ],
          discountCents: 5000,
        },
        ownerActor
      );

      expect(invoice.id).toBeDefined();
      expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(invoice.subtotalCents).toBe(40000);
      expect(invoice.discountCents).toBe(5000);
      expect(invoice.totalCents).toBe(35000);
      expect(invoice.items).toHaveLength(2);

      // Verify getInvoice retrieves the created invoice
      const retrieved = await financeService.getInvoice(invoice.id);
      expect(retrieved.invoiceNumber).toBe(invoice.invoiceNumber);
      expect(retrieved.studentName).toBe('يوسف مصطفى عثمان');
      expect(retrieved.items).toHaveLength(2);

      // Verify listStudentInvoices
      const studentInvoices = await financeService.listStudentInvoices(testStudentId);
      expect(studentInvoices).toHaveLength(1);
    });
  });

  describe('getOverallFinanceKpi', () => {
    it('computes overall finance KPI across students', async () => {
      // Record a payment for the test student
      await financeService.recordPayment(
        {
          studentId: testStudentId,
          amountCents: 20000,
          paymentMethod: 'CASH',
          paymentDate: '2026-09-19',
        },
        ownerActor
      );

      const kpi = await financeService.getOverallFinanceKpi();
      expect(kpi.activeStudentsCount).toBeGreaterThanOrEqual(1);
      expect(kpi.totalCollectedCents).toBe(20000);
      expect(kpi.totalChargesCents).toBe(35000);
      expect(kpi.totalOutstandingCents).toBe(15000);
    });
  });
});
