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
