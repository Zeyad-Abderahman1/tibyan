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

export interface SessionDto {
  id: string;
  groupId: string;
  groupName: string;
  scheduleId: string | null;
  educationSystem?: z.infer<typeof EducationSystemSchema>;
  gradeLevel?: z.infer<typeof GradeLevelSchema>;
  languageTrack?: z.infer<typeof LanguageTrackSchema>;
  
  // Immutable occurrence identity
  occurrenceKey: string;
  scheduledDate: string;       // YYYY-MM-DD
  scheduledStartTime: string;  // HH:mm
  
  // Mutable effective execution slot (used for Today Dashboard & scheduling views)
  effectiveDate: string;       // YYYY-MM-DD
  effectiveStartTime: string;  // HH:mm
  durationMinutes: number;
  
  status: z.infer<typeof SessionStatusSchema>;
  rescheduleReason: string | null;
  rescheduledAt: string | null;
  notes: string | null;
  studentCount?: number;
  createdAt: string;
  updatedAt: string;
}
