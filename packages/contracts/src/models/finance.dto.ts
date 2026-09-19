import { z } from 'zod';
import {
  PaymentMethodSchema,
  DiscountTypeSchema,
  InvoiceStatusSchema,
  InvoiceItemTypeSchema,
  FinancialStatusSchema,
  PaymentTypeSchema,
} from '../enums/payment.js';

export {
  PaymentMethodSchema,
  DiscountTypeSchema,
  InvoiceStatusSchema,
  InvoiceItemTypeSchema,
  FinancialStatusSchema,
  PaymentTypeSchema,
};
export type {
  PaymentMethod,
  DiscountType,
  InvoiceStatus,
  InvoiceItemType,
  FinancialStatus,
  PaymentType,
} from '../enums/payment.js';

// --- Payments ---

export const PaymentDtoSchema = z.object({
  id: z.string().uuid(),
  receiptNumber: z.string(),
  studentId: z.string().uuid(),
  studentName: z.string().optional(),
  studentCode: z.string().optional(),
  groupId: z.string().uuid().nullable().optional(),
  groupName: z.string().optional(),
  amountCents: z.number().int().positive(),
  paymentMethod: PaymentMethodSchema,
  paymentDate: z.string(), // YYYY-MM-DD
  periodMonth: z.string().nullable().optional(), // YYYY-MM
  notes: z.string().nullable().optional(),
  recordedByUserId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PaymentDto = z.infer<typeof PaymentDtoSchema>;

export const RecordPaymentInputSchema = z.object({
  studentId: z.string().uuid(),
  groupId: z.string().uuid().nullable().optional(),
  amountCents: z.number().int().positive({ message: 'المبلغ يجب أن يكون أكبر من صفر' }),
  paymentMethod: PaymentMethodSchema.default('CASH'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'صيغة التاريخ غير صالحة YYYY-MM-DD' }),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, { message: 'صيغة الشهر غير صالحة YYYY-MM' }).nullable().optional(),
  notes: z.string().max(500).optional(),
});
export type RecordPaymentInput = z.infer<typeof RecordPaymentInputSchema>;

// --- Discounts ---

export const StudentDiscountDtoSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  groupId: z.string().uuid().nullable().optional(),
  groupName: z.string().optional(),
  discountType: DiscountTypeSchema,
  discountValue: z.number().int().positive(),
  reason: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  appliedByUserId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StudentDiscountDto = z.infer<typeof StudentDiscountDtoSchema>;

export const ApplyDiscountInputSchema = z.object({
  studentId: z.string().uuid(),
  groupId: z.string().uuid().nullable().optional(),
  discountType: DiscountTypeSchema,
  discountValue: z.number().int().positive({ message: 'قيمة الخصم يجب أن تكون أكبر من صفر' }),
  reason: z.string().min(2, { message: 'سبب الخصم مطلوب' }).max(200),
}).refine(
  (data) => {
    if (data.discountType === 'PERCENTAGE') {
      return data.discountValue >= 1 && data.discountValue <= 100;
    }
    return true;
  },
  { message: 'نسبة الخصم يجب أن تكون بين 1% و 100%', path: ['discountValue'] }
);
export type ApplyDiscountInput = z.infer<typeof ApplyDiscountInputSchema>;

// --- Invoices ---

export const InvoiceItemDtoSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  description: z.string(),
  itemType: InvoiceItemTypeSchema,
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  amountCents: z.number().int().nonnegative(),
  sessionId: z.string().uuid().nullable().optional(),
});
export type InvoiceItemDto = z.infer<typeof InvoiceItemDtoSchema>;

export const InvoiceDtoSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  studentId: z.string().uuid(),
  studentName: z.string().optional(),
  studentCode: z.string().optional(),
  groupId: z.string().uuid().nullable().optional(),
  groupName: z.string().optional(),
  issueDate: z.string(),
  dueDate: z.string().nullable().optional(),
  periodMonth: z.string().nullable().optional(),
  subtotalCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  paidCents: z.number().int().nonnegative(),
  remainingCents: z.number().int().nonnegative(),
  status: InvoiceStatusSchema,
  notes: z.string().nullable().optional(),
  items: z.array(InvoiceItemDtoSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InvoiceDto = z.infer<typeof InvoiceDtoSchema>;

export const CreateInvoiceInputSchema = z.object({
  studentId: z.string().uuid(),
  groupId: z.string().uuid().nullable().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(
    z.object({
      description: z.string().min(1),
      itemType: InvoiceItemTypeSchema.default('CUSTOM'),
      quantity: z.number().int().positive().default(1),
      unitPriceCents: z.number().int().nonnegative(),
      sessionId: z.string().uuid().nullable().optional(),
    })
  ).min(1, { message: 'يجب إضافة بند واحد على الأقل في الفاتورة' }),
  discountCents: z.number().int().nonnegative().default(0),
});
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;

// --- Summaries & Subscriptions ---

export const GroupSubscriptionSummaryDtoSchema = z.object({
  groupId: z.string().uuid(),
  groupName: z.string(),
  paymentType: PaymentTypeSchema,
  rateCents: z.number().int().nonnegative(),
  enrolledAt: z.string(),
  sessionsCount: z.number().int().nonnegative().optional(),
  monthsCount: z.number().int().nonnegative().optional(),
  totalChargeCents: z.number().int().nonnegative(),
  totalPaidCents: z.number().int().nonnegative(),
  balanceCents: z.number().int().nonnegative(),
});
export type GroupSubscriptionSummaryDto = z.infer<typeof GroupSubscriptionSummaryDtoSchema>;

export const StudentFinancialSummaryDtoSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string(),
  studentCode: z.string(),
  guardianPhone: z.string().optional(),
  gradeLevel: z.string().optional(),
  totalChargesCents: z.number().int().nonnegative(),
  totalDiscountsCents: z.number().int().nonnegative(),
  netPayableCents: z.number().int().nonnegative(),
  totalPaidCents: z.number().int().nonnegative(),
  remainingBalanceCents: z.number().int().nonnegative(),
  status: FinancialStatusSchema,
  subscriptions: z.array(GroupSubscriptionSummaryDtoSchema),
  recentPayments: z.array(PaymentDtoSchema),
});
export type StudentFinancialSummaryDto = z.infer<typeof StudentFinancialSummaryDtoSchema>;

export const OverallFinanceKpiDtoSchema = z.object({
  totalChargesCents: z.number().int().nonnegative(),
  totalCollectedCents: z.number().int().nonnegative(),
  totalOutstandingCents: z.number().int().nonnegative(),
  totalDiscountsCents: z.number().int().nonnegative(),
  activeStudentsCount: z.number().int().nonnegative(),
  paidStudentsCount: z.number().int().nonnegative(),
  unpaidStudentsCount: z.number().int().nonnegative(),
});
export type OverallFinanceKpiDto = z.infer<typeof OverallFinanceKpiDtoSchema>;
