import { z } from 'zod';

export const CurriculumGradeGroupSchema = z.object({
  gradeLevel: z.string().nullable(),
  educationSystem: z.string().nullable(),
  documents: z.array(z.any()),
  count: z.number().int().nonnegative(),
});
export type CurriculumGradeGroup = z.infer<typeof CurriculumGradeGroupSchema>;

export const ImportCurriculumLibraryInputSchema = z.object({
  sourceFilePath: z.string().min(1),
  title: z.string().min(1).max(200),
  gradeLevel: z.string().min(1).max(50),
  educationSystem: z.string().max(50).optional(),
  subject: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  author: z.string().max(100).optional(),
  publisher: z.string().max(100).optional(),
  editionYear: z.string().max(20).optional(),
  curriculumCatalogId: z.string().uuid().optional(),
});
export type ImportCurriculumLibraryInput = z.infer<typeof ImportCurriculumLibraryInputSchema>;

export const UpdateCurriculumLibraryInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  gradeLevel: z.string().min(1).max(50).optional(),
  educationSystem: z.string().max(50).nullable().optional(),
  subject: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  curriculumCatalogId: z.string().uuid().nullable().optional(),
});
export type UpdateCurriculumLibraryInput = z.infer<typeof UpdateCurriculumLibraryInputSchema>;

export const CurriculumLibraryFilterSchema = z.object({
  gradeLevel: z.string().optional(),
  subject: z.string().optional(),
  educationSystem: z.string().optional(),
});
export type CurriculumLibraryFilter = z.infer<typeof CurriculumLibraryFilterSchema>;

export const CurriculumPdfViewRequestSchema = z.object({
  id: z.string().uuid(),
  page: z.number().int().positive().optional(),
});
export type CurriculumPdfViewRequest = z.infer<typeof CurriculumPdfViewRequestSchema>;
