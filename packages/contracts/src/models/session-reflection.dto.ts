import { z } from 'zod';
import { ReflectionCompletionStatusSchema } from '../enums/curriculum.js';
import { LessonPlanSectionsSchema } from './lesson-plan.dto.js';

// ==========================================
// 1. Immutable Lesson Plan Snapshot
// ==========================================

/**
 * Immutable historical snapshot of a Lesson Plan captured at the moment
 * a reflection is submitted or session is conducted.
 * Ensures that later edits to a lesson plan NEVER rewrite historical reflection meaning.
 */
export const LessonPlanSnapshotDtoSchema = z.object({
  planId: z.string().uuid(),
  curriculumNodeId: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
  targetDurationMinutes: z.number().int().min(1).max(480),
  version: z.number().int().min(1),
  sections: LessonPlanSectionsSchema,
  snapshottedAt: z.string(),
});
export type LessonPlanSnapshotDto = z.infer<typeof LessonPlanSnapshotDtoSchema>;

// ==========================================
// 2. Session Reflection DTOs
// ==========================================

export const SessionReflectionDtoSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().min(1).max(64),
  lessonPlanId: z.string().uuid().optional().nullable(),
  lessonPlanSnapshot: LessonPlanSnapshotDtoSchema.optional().nullable(),
  completionStatus: ReflectionCompletionStatusSchema,
  uncompletedItems: z.string().max(3000).optional().nullable(),
  topicsNeedingReview: z.string().max(3000).optional().nullable(),
  quickNotes: z.string().max(4000).optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SessionReflectionDto = z.infer<typeof SessionReflectionDtoSchema>;

export const CreateSessionReflectionSchema = z.object({
  sessionId: z.string().min(1).max(64),
  lessonPlanId: z.string().uuid().optional().nullable(),
  completionStatus: ReflectionCompletionStatusSchema,
  uncompletedItems: z.string().max(3000).optional().nullable(),
  topicsNeedingReview: z.string().max(3000).optional().nullable(),
  quickNotes: z.string().max(4000).optional().nullable(),
});
export type CreateSessionReflectionDto = z.infer<typeof CreateSessionReflectionSchema>;

export const UpdateSessionReflectionSchema = z.object({
  completionStatus: ReflectionCompletionStatusSchema.optional(),
  uncompletedItems: z.string().max(3000).optional().nullable(),
  topicsNeedingReview: z.string().max(3000).optional().nullable(),
  quickNotes: z.string().max(4000).optional().nullable(),
});
export type UpdateSessionReflectionDto = z.infer<typeof UpdateSessionReflectionSchema>;
