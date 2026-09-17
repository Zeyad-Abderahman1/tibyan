import { z } from 'zod';

export const EducationSystemSchema = z.enum(['GENERAL', 'EGYPTIAN_BACCALAUREATE']);
export type EducationSystem = z.infer<typeof EducationSystemSchema>;

export const GradeLevelSchema = z.enum([
  'PREP_1',
  'PREP_2',
  'PREP_3',
  'SEC_1',
  'SEC_2',
  'SEC_3',
]);
export type GradeLevel = z.infer<typeof GradeLevelSchema>;

export const LanguageTrackSchema = z.enum(['ARABIC', 'LANG_ENGLISH']);
export type LanguageTrack = z.infer<typeof LanguageTrackSchema>;

export const MathBranchSchema = z.enum([
  'GENERAL_MATH',
  'ALGEBRA',
  'GEOMETRY',
  'TRIGONOMETRY',
  'CALCULUS',
  'STATISTICS',
  'APPLIED_MATH',
]);
export type MathBranch = z.infer<typeof MathBranchSchema>;
