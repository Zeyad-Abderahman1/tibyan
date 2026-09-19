import { describe, it, expect } from 'vitest';
import {
  PaymentMethodSchema,
  DiscountTypeSchema,
  InvoiceStatusSchema,
  FinancialStatusSchema,
  RecordPaymentInputSchema,
  ApplyDiscountInputSchema,
  CreateInvoiceInputSchema,
  StudentFinancialSummaryDtoSchema,
  OverallFinanceKpiDtoSchema,
} from '../src/models/finance.dto.js';

describe('Finance Contracts & Validation Schemas', () => {
  describe('PaymentMethodSchema', () => {
    it('accepts all supported payment methods', () => {
      const valid = ['CASH', 'BANK_TRANSFER', 'VODAFONE_CASH', 'INSTAPAY', 'OTHER'];
      for (const m of valid) {
        expect(PaymentMethodSchema.parse(m)).toBe(m);
      }
    });

    it('rejects unknown payment method', () => {
      expect(() => PaymentMethodSchema.parse('BITCOIN')).toThrow();
    });
  });

  describe('DiscountTypeSchema', () => {
    it('accepts FIXED_AMOUNT and PERCENTAGE', () => {
      expect(DiscountTypeSchema.parse('FIXED_AMOUNT')).toBe('FIXED_AMOUNT');
      expect(DiscountTypeSchema.parse('PERCENTAGE')).toBe('PERCENTAGE');
      expect(() => DiscountTypeSchema.parse('FREE')).toThrow();
    });
  });

  describe('InvoiceStatusSchema', () => {
    it('accepts valid invoice statuses', () => {
      expect(InvoiceStatusSchema.parse('DRAFT')).toBe('DRAFT');
      expect(InvoiceStatusSchema.parse('UNPAID')).toBe('UNPAID');
      expect(InvoiceStatusSchema.parse('PARTIALLY_PAID')).toBe('PARTIALLY_PAID');
      expect(InvoiceStatusSchema.parse('PAID')).toBe('PAID');
      expect(InvoiceStatusSchema.parse('VOID')).toBe('VOID');
      expect(() => InvoiceStatusSchema.parse('UNKNOWN')).toThrow();
    });
  });

  describe('FinancialStatusSchema', () => {
    it('accepts valid financial statuses', () => {
      expect(FinancialStatusSchema.parse('PAID')).toBe('PAID');
      expect(FinancialStatusSchema.parse('PARTIALLY_PAID')).toBe('PARTIALLY_PAID');
      expect(FinancialStatusSchema.parse('UNPAID')).toBe('UNPAID');
      expect(FinancialStatusSchema.parse('OVERDUE')).toBe('OVERDUE');
      expect(() => FinancialStatusSchema.parse('INVALID')).toThrow();
    });
  });

  describe('RecordPaymentInputSchema', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('validates a correct payment input', () => {
      const parsed = RecordPaymentInputSchema.parse({
        studentId: validUuid,
        amountCents: 15000,
        paymentMethod: 'VODAFONE_CASH',
        paymentDate: '2026-09-19',
        periodMonth: '2026-09',
        notes: 'دفعة شهر سبتمبر',
      });
      expect(parsed.amountCents).toBe(15000);
      expect(parsed.paymentMethod).toBe('VODAFONE_CASH');
    });

    it('defaults paymentMethod to CASH if omitted', () => {
      const parsed = RecordPaymentInputSchema.parse({
        studentId: validUuid,
        amountCents: 5000,
        paymentDate: '2026-09-19',
      });
      expect(parsed.paymentMethod).toBe('CASH');
    });

    it('rejects zero or negative amount', () => {
      expect(() =>
        RecordPaymentInputSchema.parse({
          studentId: validUuid,
          amountCents: 0,
          paymentDate: '2026-09-19',
        })
      ).toThrow();

      expect(() =>
        RecordPaymentInputSchema.parse({
          studentId: validUuid,
          amountCents: -500,
          paymentDate: '2026-09-19',
        })
      ).toThrow();
    });

    it('rejects invalid date format', () => {
      expect(() =>
        RecordPaymentInputSchema.parse({
          studentId: validUuid,
          amountCents: 1000,
          paymentDate: '19-09-2026',
        })
      ).toThrow();
    });
  });

  describe('ApplyDiscountInputSchema', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('validates a valid percentage discount', () => {
      const parsed = ApplyDiscountInputSchema.parse({
        studentId: validUuid,
        discountType: 'PERCENTAGE',
        discountValue: 20,
        reason: 'تفوق دراسي',
      });
      expect(parsed.discountValue).toBe(20);
    });

    it('rejects percentage discount greater than 100', () => {
      expect(() =>
        ApplyDiscountInputSchema.parse({
          studentId: validUuid,
          discountType: 'PERCENTAGE',
          discountValue: 105,
          reason: 'خصم زائد',
        })
      ).toThrow();
    });

    it('validates a fixed amount discount', () => {
      const parsed = ApplyDiscountInputSchema.parse({
        studentId: validUuid,
        discountType: 'FIXED_AMOUNT',
        discountValue: 5000, // 50 EGP
        reason: 'خصم أشقاء',
      });
      expect(parsed.discountValue).toBe(5000);
    });
  });

  describe('CreateInvoiceInputSchema', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('validates invoice input with items', () => {
      const parsed = CreateInvoiceInputSchema.parse({
        studentId: validUuid,
        issueDate: '2026-09-19',
        dueDate: '2026-09-30',
        items: [
          {
            description: 'اشتراك شهر سبتمبر',
            itemType: 'MONTHLY_SUBSCRIPTION',
            quantity: 1,
            unitPriceCents: 30000,
          },
        ],
        discountCents: 5000,
      });
      expect(parsed.items).toHaveLength(1);
      expect(parsed.discountCents).toBe(5000);
    });

    it('rejects invoice with empty items array', () => {
      expect(() =>
        CreateInvoiceInputSchema.parse({
          studentId: validUuid,
          issueDate: '2026-09-19',
          items: [],
        })
      ).toThrow();
    });
  });

  describe('StudentFinancialSummaryDtoSchema', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('parses valid student financial summary', () => {
      const parsed = StudentFinancialSummaryDtoSchema.parse({
        studentId: validUuid,
        studentName: 'أحمد محمود',
        studentCode: 'TB-0001',
        totalChargesCents: 30000,
        totalDiscountsCents: 5000,
        netPayableCents: 25000,
        totalPaidCents: 25000,
        remainingBalanceCents: 0,
        status: 'PAID',
        subscriptions: [],
        recentPayments: [],
      });
      expect(parsed.status).toBe('PAID');
      expect(parsed.remainingBalanceCents).toBe(0);
    });
  });

  describe('OverallFinanceKpiDtoSchema', () => {
    it('parses valid KPI data', () => {
      const parsed = OverallFinanceKpiDtoSchema.parse({
        totalChargesCents: 100000,
        totalCollectedCents: 80000,
        totalOutstandingCents: 20000,
        totalDiscountsCents: 5000,
        activeStudentsCount: 10,
        paidStudentsCount: 8,
        unpaidStudentsCount: 2,
      });
      expect(parsed.activeStudentsCount).toBe(10);
    });
  });
});
