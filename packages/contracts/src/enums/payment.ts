import { z } from 'zod';

export const PaymentTypeSchema = z.enum(['MONTHLY', 'PER_SESSION']);
export type PaymentType = z.infer<typeof PaymentTypeSchema>;
