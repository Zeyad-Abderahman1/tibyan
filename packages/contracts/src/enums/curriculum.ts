import { z } from 'zod';

export const CurriculumCatalogStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type CurriculumCatalogStatus = z.infer<typeof CurriculumCatalogStatusSchema>;

export const CurriculumNodeTierSchema = z.enum(['UNIT', 'LESSON', 'CONCEPT', 'SKILL']);
export type CurriculumNodeTier = z.infer<typeof CurriculumNodeTierSchema>;

export const CurriculumProgressStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);
export type CurriculumProgressStatus = z.infer<typeof CurriculumProgressStatusSchema>;

export const CurriculumProjectionStatusSchema = z.enum([
  'INSUFFICIENT_DATA',
  'COMPLETED',
  'ON_TRACK',
  'UNREALISTIC_PACING',
]);
export type CurriculumProjectionStatus = z.infer<typeof CurriculumProjectionStatusSchema>;

export const LessonPlanStatusSchema = z.enum(['DRAFT', 'READY', 'ARCHIVED']);
export type LessonPlanStatus = z.infer<typeof LessonPlanStatusSchema>;

export const ReflectionCompletionStatusSchema = z.enum([
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'POSTPONED',
]);
export type ReflectionCompletionStatus = z.infer<typeof ReflectionCompletionStatusSchema>;
export const SourceDocumentStatusSchema = z.enum(['INDEXED', 'PROCESSING', 'ERROR']);
export type SourceDocumentStatus = z.infer<typeof SourceDocumentStatusSchema>;

export const QuestionTypeSchema = z.enum([
  'MULTIPLE_CHOICE',
  'ESSAY',
  'SHORT_ANSWER',
  'TRUE_FALSE',
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QuestionDifficultySchema = z.enum([
  'EASY',
  'MEDIUM',
  'HARD',
  'ADVANCED',
]);
export type QuestionDifficulty = z.infer<typeof QuestionDifficultySchema>;

export const QuestionStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export type QuestionStatus = z.infer<typeof QuestionStatusSchema>;
