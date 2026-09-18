import { z } from 'zod';
import { AttendanceStatusSchema } from '../enums/attendance.js';
import { PaymentTypeSchema } from '../enums/payment.js';
import { SessionDtoSchema } from './session.dto.js';

export const AttendanceRecordDtoSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: AttendanceStatusSchema,
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:MM').nullable(),
  notes: z.string().max(1000).nullable(),
  recordedByUserId: z.string().nullable(),
  recordedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AttendanceRecordDto = z.infer<typeof AttendanceRecordDtoSchema>;

export const SessionRosterItemDtoSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string().min(1),
  guardianPhone: z.string().min(1),
  enrollmentId: z.string().uuid(),
  paymentType: PaymentTypeSchema,
  paymentAmount: z.number().nonnegative(),
  attendanceRecord: AttendanceRecordDtoSchema.nullable(),
});
export type SessionRosterItemDto = z.infer<typeof SessionRosterItemDtoSchema>;

export const SessionAttendanceRosterDtoSchema = z.object({
  session: SessionDtoSchema,
  groupName: z.string().min(1),
  roster: z.array(SessionRosterItemDtoSchema),
  summary: z.object({
    totalStudents: z.number().int().nonnegative(),
    present: z.number().int().nonnegative(),
    absent: z.number().int().nonnegative(),
    late: z.number().int().nonnegative(),
    excused: z.number().int().nonnegative(),
    unmarked: z.number().int().nonnegative(),
  }),
});
export type SessionAttendanceRosterDto = z.infer<typeof SessionAttendanceRosterDtoSchema>;

export const RecordAttendanceInputSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: AttendanceStatusSchema,
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:MM').nullish(),
  notes: z.string().max(1000).nullish(),
});
export type RecordAttendanceInput = z.infer<typeof RecordAttendanceInputSchema>;

export const BatchRecordAttendanceInputSchema = z.object({
  sessionId: z.string().uuid(),
  records: z.array(
    z.object({
      studentId: z.string().uuid(),
      status: AttendanceStatusSchema,
      arrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:MM').nullish(),
      notes: z.string().max(1000).nullish(),
    })
  ).min(1),
});
export type BatchRecordAttendanceInput = z.infer<typeof BatchRecordAttendanceInputSchema>;

export const CompleteSessionInputSchema = z.object({
  sessionId: z.string().uuid(),
  notes: z.string().max(1000).nullish(),
});
export type CompleteSessionInput = z.infer<typeof CompleteSessionInputSchema>;

export const EndOfDayFollowUpItemDtoSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string().min(1),
  guardianPhone: z.string().min(1),
  sessionId: z.string().uuid(),
  groupName: z.string().min(1),
  status: AttendanceStatusSchema,
  sessionDate: z.string(),
  sessionStartTime: z.string(),
  whatsappMessage: z.string().min(1),
});
export type EndOfDayFollowUpItemDto = z.infer<typeof EndOfDayFollowUpItemDtoSchema>;

export const EndOfDayFollowUpDtoSchema = z.object({
  date: z.string(),
  totalSessions: z.number().int().nonnegative(),
  totalAbsent: z.number().int().nonnegative(),
  totalLate: z.number().int().nonnegative(),
  followUps: z.array(EndOfDayFollowUpItemDtoSchema),
});
export type EndOfDayFollowUpDto = z.infer<typeof EndOfDayFollowUpDtoSchema>;
