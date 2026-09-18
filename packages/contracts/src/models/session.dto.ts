import { z } from 'zod';
import { SessionStatusSchema } from '../enums/session.js';
import {
  EducationSystemSchema,
  GradeLevelSchema,
  LanguageTrackSchema,
} from '../enums/academic.js';
import { CalendarDateSchema, TIME_HHMM_REGEX } from '../common/regex.js';

export const RescheduleSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  newEffectiveDate: CalendarDateSchema,
  newEffectiveStartTime: z
    .string()
    .trim()
    .regex(TIME_HHMM_REGEX, 'Start time must be in 24-hour format (HH:mm)'),
  reason: z.string().trim().min(1, 'Reschedule reason is required'),
});
export type RescheduleSessionInput = z.infer<typeof RescheduleSessionSchema>;

export const CancelSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  reason: z.string().trim().min(1, 'Cancellation reason is required'),
});
export type CancelSessionInput = z.infer<typeof CancelSessionSchema>;

export const ListSessionsByDateRangeSchema = z.object({
  startDate: CalendarDateSchema,
  endDate: CalendarDateSchema,
  groupId: z.string().uuid().optional(),
});
export type ListSessionsByDateRangeInput = z.infer<typeof ListSessionsByDateRangeSchema>;

export const SessionDtoSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  groupName: z.string(),
  scheduleId: z.string().uuid().nullable().optional(),
  educationSystem: EducationSystemSchema.optional(),
  gradeLevel: GradeLevelSchema.optional(),
  languageTrack: LanguageTrackSchema.optional(),
  
  // Immutable occurrence identity
  occurrenceKey: z.string(),
  scheduledDate: z.string(),       // YYYY-MM-DD
  scheduledStartTime: z.string(),  // HH:mm
  
  // Mutable effective execution slot (used for Today Dashboard & scheduling views)
  effectiveDate: z.string(),       // YYYY-MM-DD
  effectiveStartTime: z.string(),  // HH:mm
  durationMinutes: z.number(),
  
  status: SessionStatusSchema,
  rescheduleReason: z.string().nullable(),
  rescheduledAt: z.string().nullable().optional(),
  cancellationReason: z.string().nullable().optional(),
  notes: z.string().nullable(),
  studentCount: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SessionDto = z.infer<typeof SessionDtoSchema>;

export interface MaterializeSessionsResultDto {
  startDate: string;
  endDate: string;
  createdCount: number;
  existingCount: number;
}
