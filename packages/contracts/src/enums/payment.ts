import { z } from 'zod';

export const PaymentTypeSchema = z.enum(['MONTHLY', 'PER_SESSION']);
export type PaymentType = z.infer<typeof PaymentTypeSchema>;

export const PaymentMethodSchema = z.enum([
  'CASH',
  'BANK_TRANSFER',
  'VODAFONE_CASH',
  'INSTAPAY',
  'OTHER',
]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const DiscountTypeSchema = z.enum(['FIXED_AMOUNT', 'PERCENTAGE']);
export type DiscountType = z.infer<typeof DiscountTypeSchema>;

export const InvoiceStatusSchema = z.enum([
  'DRAFT',
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'VOID',
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceItemTypeSchema = z.enum([
  'SESSION_FEE',
  'MONTHLY_SUBSCRIPTION',
  'MATERIAL_FEE',
  'CUSTOM',
]);
export type InvoiceItemType = z.infer<typeof InvoiceItemTypeSchema>;

export const FinancialStatusSchema = z.enum([
  'PAID',
  'PARTIALLY_PAID',
  'UNPAID',
  'OVERDUE',
]);
export type FinancialStatus = z.infer<typeof FinancialStatusSchema>;

