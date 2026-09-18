import { z } from 'zod';
import { AttendanceStatusSchema, FollowUpContactStatusSchema } from '../enums/attendance.js';
import { SessionDtoSchema } from './session.dto.js';
import { TIME_HHMM_REGEX } from '../common/regex.js';

export const AttendanceRecordDtoSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: AttendanceStatusSchema,
  arrivalTime: z.string().regex(TIME_HHMM_REGEX, 'Invalid arrival time format (HH:mm 00:00-23:59)').nullable(),
  notes: z.string().max(1000).nullable(),
  recordedByUserId: z.string().nullable(),
  recordedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AttendanceRecordDto = z.infer<typeof AttendanceRecordDtoSchema>;

/**
 * Minimized attendance roster item DTO.
 * Exposes strictly attendance-relevant fields: student identity, code, name,
 * safe media URL projection, enrollment ID, and current attendance record.
 * Unnecessary financial and guardian contact fields are excluded for data minimization.
 */
export const SessionRosterItemDtoSchema = z.object({
  studentId: z.string().uuid(),
  studentCode: z.string().min(1),
  studentName: z.string().min(1),
  photoUrl: z.string().nullable(),
  enrollmentId: z.string().uuid(),
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

export const RecordAttendanceInputSchema = z
  .object({
    sessionId: z.string().uuid(),
    studentId: z.string().uuid(),
    status: AttendanceStatusSchema,
    arrivalTime: z.string().regex(TIME_HHMM_REGEX, 'Invalid arrival time format (HH:mm 00:00-23:59)').nullish(),
    notes: z.string().max(1000).nullish(),
  })
  .refine((data) => {
    if (data.status === 'LATE') {
      return typeof data.arrivalTime === 'string' && data.arrivalTime.trim().length > 0;
    }
    return true;
  }, {
    message: 'Arrival time is required when status is LATE',
    path: ['arrivalTime'],
  })
  .refine((data) => {
    if ((data.status === 'ABSENT' || data.status === 'EXCUSED') && data.arrivalTime != null) {
      return false;
    }
    return true;
  }, {
    message: 'Arrival time must be null for ABSENT or EXCUSED status',
    path: ['arrivalTime'],
  });
export type RecordAttendanceInput = z.infer<typeof RecordAttendanceInputSchema>;

export const BatchAttendanceRecordItemSchema = z
  .object({
    studentId: z.string().uuid(),
    status: AttendanceStatusSchema,
    arrivalTime: z.string().regex(TIME_HHMM_REGEX, 'Invalid arrival time format (HH:mm 00:00-23:59)').nullish(),
    notes: z.string().max(1000).nullish(),
  })
  .refine((data) => {
    if (data.status === 'LATE') {
      return typeof data.arrivalTime === 'string' && data.arrivalTime.trim().length > 0;
    }
    return true;
  }, {
    message: 'Arrival time is required when status is LATE',
    path: ['arrivalTime'],
  })
  .refine((data) => {
    if ((data.status === 'ABSENT' || data.status === 'EXCUSED') && data.arrivalTime != null) {
      return false;
    }
    return true;
  }, {
    message: 'Arrival time must be null for ABSENT or EXCUSED status',
    path: ['arrivalTime'],
  });
export type BatchAttendanceRecordItem = z.infer<typeof BatchAttendanceRecordItemSchema>;

export const BatchRecordAttendanceInputSchema = z
  .object({
    sessionId: z.string().uuid(),
    records: z.array(BatchAttendanceRecordItemSchema).min(1, 'At least one record is required'),
  })
  .refine((data) => {
    const ids = data.records.map((r) => r.studentId);
    return new Set(ids).size === ids.length;
  }, {
    message: 'Duplicate studentId detected in batch attendance records',
    path: ['records'],
  });
export type BatchRecordAttendanceInput = z.infer<typeof BatchRecordAttendanceInputSchema>;

export const CompleteSessionInputSchema = z.object({
  sessionId: z.string().uuid(),
  notes: z.string().max(1000).nullish(),
});
export type CompleteSessionInput = z.infer<typeof CompleteSessionInputSchema>;

export const EndOfDayFollowUpItemDtoSchema = z.object({
  attendanceRecordId: z.string().uuid().optional(),
  studentId: z.string().uuid(),
  studentName: z.string().min(1),
  guardianPhone: z.string().min(1),
  sessionId: z.string().uuid(),
  groupName: z.string().min(1),
  status: AttendanceStatusSchema,
  sessionDate: z.string(),
  sessionStartTime: z.string(),
  whatsappMessage: z.string(),
  contactStatus: FollowUpContactStatusSchema.default('UNCONTACTED'),
  contactedAt: z.string().nullable().optional().default(null),
  contactedByUserId: z.string().nullable().optional().default(null),
  contactNote: z.string().nullable().optional().default(null),
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

export const AttendanceFollowUpDtoSchema = z.object({
  id: z.string().uuid(),
  attendanceRecordId: z.string().uuid(),
  contactStatus: FollowUpContactStatusSchema,
  note: z.string().nullable(),
  contactedAt: z.string().nullable(),
  contactedByUserId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AttendanceFollowUpDto = z.infer<typeof AttendanceFollowUpDtoSchema>;

export const UpdateFollowUpStatusInputSchema = z.object({
  attendanceRecordId: z.string().uuid(),
  contactStatus: FollowUpContactStatusSchema,
  note: z.string().max(1000).nullish(),
});
export type UpdateFollowUpStatusInput = z.infer<typeof UpdateFollowUpStatusInputSchema>;
