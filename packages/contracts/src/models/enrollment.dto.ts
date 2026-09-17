import { z } from 'zod';
import { PaymentTypeSchema } from '../enums/payment.js';

export const EnrollStudentSchema = z.object({
  groupId: z.string().uuid('Invalid group ID format'),
  studentId: z.string().uuid('Invalid student ID format'),
  paymentTypeOverride: PaymentTypeSchema.nullable().optional().default(null),
  paymentAmountOverride: z
    .number()
    .nonnegative('Payment override amount cannot be negative')
    .nullable()
    .optional()
    .default(null),
});
export type EnrollStudentInput = z.input<typeof EnrollStudentSchema>;

export const UpdateEnrollmentPaymentSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID format'),
  paymentTypeOverride: PaymentTypeSchema.nullable().optional(),
  paymentAmountOverride: z
    .number()
    .nonnegative('Payment override amount cannot be negative')
    .nullable()
    .optional(),
});
export type UpdateEnrollmentPaymentInput = z.infer<typeof UpdateEnrollmentPaymentSchema>;

export const EndEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID format'),
  reason: z.string().trim().optional(),
});
export type EndEnrollmentInput = z.infer<typeof EndEnrollmentSchema>;

export interface GroupEnrollmentDto {
  id: string;
  groupId: string;
  groupName?: string;
  studentId: string;
  studentName?: string;
  studentCode?: string;
  enrolledAt: string;
  leftAt: string | null;
  status: 'ACTIVE' | 'ENDED';
  paymentTypeOverride: z.infer<typeof PaymentTypeSchema> | null;
  paymentAmountOverride: number | null;
  // Computed effective payment properties
  effectivePaymentType?: z.infer<typeof PaymentTypeSchema>;
  effectivePaymentAmount?: number;
  isPaymentOverridden?: boolean;
  createdAt: string;
}
