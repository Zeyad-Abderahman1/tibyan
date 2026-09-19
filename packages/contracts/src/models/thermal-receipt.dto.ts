import { z } from 'zod';
import { PaymentMethodSchema } from '../enums/payment.js';

export const ThermalPaperWidthSchema = z.enum(['80mm', '58mm']);
export type ThermalPaperWidth = z.infer<typeof ThermalPaperWidthSchema>;

export const ThermalPrintMethodSchema = z.enum(['SYSTEM_DRIVER', 'ESCPOS_NETWORK', 'ESCPOS_RAW']);
export type ThermalPrintMethod = z.infer<typeof ThermalPrintMethodSchema>;

export const PrinterInfoSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  status: z.number(),
  isDefault: z.boolean(),
});
export type PrinterInfo = z.infer<typeof PrinterInfoSchema>;

export const ThermalPrinterSettingsSchema = z.object({
  printerName: z.string().optional(),
  paperWidth: ThermalPaperWidthSchema.default('80mm'),
  printMethod: ThermalPrintMethodSchema.default('SYSTEM_DRIVER'),
  networkHost: z.string().optional(),
  networkPort: z.number().int().positive().default(9100).optional(),
  autoCut: z.boolean().default(true),
  copies: z.number().int().min(1).max(5).default(1),
});
export type ThermalPrinterSettings = z.infer<typeof ThermalPrinterSettingsSchema>;

export const ThermalReceiptDtoSchema = z.object({
  paymentId: z.string().uuid(),
  receiptNumber: z.string(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  studentCode: z.string(),
  gradeLevel: z.string().optional(),
  gradeLevelNameAr: z.string().optional(),
  groupName: z.string().optional(),
  amountCents: z.number().int().positive(),
  amountFormatted: z.string(),
  paymentMethod: PaymentMethodSchema,
  paymentMethodNameAr: z.string(),
  paymentDate: z.string(),
  periodMonth: z.string().nullable().optional(),
  remainingBalanceCents: z.number().int().nonnegative().optional(),
  remainingBalanceFormatted: z.string().optional(),
  teacherName: z.string(),
  operatorName: z.string(),
  notes: z.string().nullable().optional(),
  issuedAt: z.string(),
  isTestReceipt: z.boolean().optional(),
});
export type ThermalReceiptDto = z.infer<typeof ThermalReceiptDtoSchema>;

export const PrintThermalReceiptInputSchema = z.object({
  paymentId: z.string().uuid(),
  settings: ThermalPrinterSettingsSchema.optional(),
});
export type PrintThermalReceiptInput = z.infer<typeof PrintThermalReceiptInputSchema>;

export const TestPrintInputSchema = z.object({
  settings: ThermalPrinterSettingsSchema.optional(),
  paperWidth: ThermalPaperWidthSchema.default('80mm').optional(),
});
export type TestPrintInput = z.infer<typeof TestPrintInputSchema>;

export const EscPosGenerateInputSchema = z.object({
  receipt: ThermalReceiptDtoSchema,
  paperWidth: ThermalPaperWidthSchema.default('80mm'),
  autoCut: z.boolean().default(true),
});
export type EscPosGenerateInput = z.infer<typeof EscPosGenerateInputSchema>;

export const EscPosNetworkPrintInputSchema = z.object({
  host: z.string().min(1, 'Host address is required'),
  port: z.number().int().min(1).max(65535).default(9100),
  payloadBase64: z.string().min(1, 'Payload is required'),
});
export type EscPosNetworkPrintInput = z.infer<typeof EscPosNetworkPrintInputSchema>;
