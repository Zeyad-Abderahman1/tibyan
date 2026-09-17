import { z } from 'zod';

export const SessionStatusSchema = z.enum([
  'SCHEDULED',
  'COMPLETED',
  'RESCHEDULED',
  'CANCELLED_BY_TEACHER',
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const WeekdaySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);
export type Weekday = z.infer<typeof WeekdaySchema>;
