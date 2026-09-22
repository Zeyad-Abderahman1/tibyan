import { z } from 'zod';
import {
  EducationSystemSchema,
  GradeLevelSchema,
  LanguageTrackSchema,
} from '../enums/academic.js';
import { EgyptianGuardianPhoneSchema } from './student.dto.js';

export const ImportRowStatusSchema = z.enum([
  'READY',
  'DUPLICATE',
  'MISSING_DATA',
  'UNKNOWN_VALUE',
  'INVALID_PHONE',
  'NEEDS_REVIEW',
]);
export type ImportRowStatus = z.infer<typeof ImportRowStatusSchema>;

export const ParsedStudentRowSchema = z.object({
  rowIndex: z.number(),
  fullName: z.string().trim(),
  educationSystem: EducationSystemSchema.optional(),
  gradeLevel: GradeLevelSchema.optional(),
  languageTrack: LanguageTrackSchema.optional(),
  guardianPhone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  rawValues: z.record(z.string(), z.string()).optional(),
  status: ImportRowStatusSchema,
  statusMessageAr: z.string(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  selected: z.boolean().default(true),
});
export type ParsedStudentRow = z.infer<typeof ParsedStudentRowSchema>;

export const StudentImportPreviewSchema = z.object({
  fileName: z.string(),
  totalRows: z.number(),
  validCount: z.number(),
  duplicateCount: z.number(),
  warningCount: z.number(),
  invalidCount: z.number(),
  rows: z.array(ParsedStudentRowSchema),
});
export type StudentImportPreview = z.infer<typeof StudentImportPreviewSchema>;

export const ExecuteStudentImportInputSchema = z.object({
  rows: z.array(
    z.object({
      fullName: z.string().trim().min(1, 'اسم الطالب مطلوب'),
      educationSystem: EducationSystemSchema,
      gradeLevel: GradeLevelSchema,
      languageTrack: LanguageTrackSchema,
      guardianPhone: EgyptianGuardianPhoneSchema,
      notes: z.string().trim().optional(),
    })
  ),
});
export type ExecuteStudentImportInput = z.infer<typeof ExecuteStudentImportInputSchema>;

export const StudentImportResultSchema = z.object({
  importedCount: z.number(),
  skippedCount: z.number(),
  failedCount: z.number(),
  importedStudentIds: z.array(z.string()),
  errors: z.array(z.string()),
});
export type StudentImportResult = z.infer<typeof StudentImportResultSchema>;

export type StudentImportPreviewDto = StudentImportPreview;
export type StudentImportRowDto = ParsedStudentRow;
export type StudentImportResultDto = StudentImportResult;
