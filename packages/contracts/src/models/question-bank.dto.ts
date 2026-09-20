import { z } from 'zod';
import {
  QuestionTypeSchema,
  QuestionDifficultySchema,
  QuestionStatusSchema,
} from '../enums/curriculum.js';
import { LanguageTrackSchema } from '../enums/academic.js';
import { MathRichContentSchema } from './math-rich-content.dto.js';

export const QuestionSourceRefLinkSchema = z.object({
  sourceReferenceId: z.string().uuid(),
  referenceLabel: z.string().optional(),
  sourceDocumentTitle: z.string().optional(),
  startPage: z.number().int().optional(),
  endPage: z.number().int().optional(),
  notes: z.string().nullable().optional(),
});
export type QuestionSourceRefLink = z.infer<typeof QuestionSourceRefLinkSchema>;

export const QuestionDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(50),
  body: MathRichContentSchema,
  modelAnswer: MathRichContentSchema.nullable().optional(),
  questionType: QuestionTypeSchema,
  difficulty: QuestionDifficultySchema,
  defaultMarks: z.number().int().positive().default(1),
  languageTrack: LanguageTrackSchema.default('ARABIC'),
  status: QuestionStatusSchema.default('ACTIVE'),
  contentFingerprint: z.string().min(1),
  curriculumTags: z.array(z.string().uuid()).default([]),
  sourceReferences: z.array(QuestionSourceRefLinkSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type QuestionDto = z.infer<typeof QuestionDtoSchema>;

export const CreateQuestionSchema = z.object({
  body: MathRichContentSchema,
  modelAnswer: MathRichContentSchema.optional(),
  questionType: QuestionTypeSchema.default('MULTIPLE_CHOICE'),
  difficulty: QuestionDifficultySchema.default('MEDIUM'),
  defaultMarks: z.number().int().positive().default(1),
  languageTrack: LanguageTrackSchema.default('ARABIC'),
  status: QuestionStatusSchema.default('ACTIVE'),
  curriculumNodeIds: z.array(z.string().uuid()).min(1, 'يجب ربط السؤال بمهارة أو درس واحد على الأقل'),
  sourceReferenceIds: z.array(z.string().uuid()).default([]),
});
export type CreateQuestionDto = z.input<typeof CreateQuestionSchema>;

export const UpdateQuestionSchema = z.object({
  id: z.string().uuid(),
  body: MathRichContentSchema.optional(),
  modelAnswer: MathRichContentSchema.nullable().optional(),
  questionType: QuestionTypeSchema.optional(),
  difficulty: QuestionDifficultySchema.optional(),
  defaultMarks: z.number().int().positive().optional(),
  languageTrack: LanguageTrackSchema.optional(),
  status: QuestionStatusSchema.optional(),
  curriculumNodeIds: z.array(z.string().uuid()).optional(),
  sourceReferenceIds: z.array(z.string().uuid()).optional(),
});
export type UpdateQuestionDto = z.input<typeof UpdateQuestionSchema>;

export const QuestionFilterSchema = z.object({
  curriculumNodeId: z.string().uuid().optional(),
  catalogId: z.string().uuid().optional(),
  questionType: QuestionTypeSchema.optional(),
  difficulty: QuestionDifficultySchema.optional(),
  status: QuestionStatusSchema.optional(),
  search: z.string().optional(),
});
export type QuestionFilterDto = z.infer<typeof QuestionFilterSchema>;

// Task 6: Duplicate Detection and Bulk Ingestion
export const DuplicateMatchLevelSchema = z.enum(['EXACT', 'CANDIDATE', 'NONE']);
export type DuplicateMatchLevel = z.infer<typeof DuplicateMatchLevelSchema>;

export const DuplicateCheckResultSchema = z.object({
  isDuplicate: z.boolean(),
  matchLevel: DuplicateMatchLevelSchema,
  existingQuestionId: z.string().uuid().optional(),
  existingQuestionCode: z.string().optional(),
  reasonAr: z.string(),
});
export type DuplicateCheckResultDto = z.infer<typeof DuplicateCheckResultSchema>;

export const BulkQuestionItemSchema = z.object({
  tempId: z.string().min(1),
  body: MathRichContentSchema,
  modelAnswer: MathRichContentSchema.optional(),
  questionType: QuestionTypeSchema.default('MULTIPLE_CHOICE'),
  difficulty: QuestionDifficultySchema.default('MEDIUM'),
  defaultMarks: z.number().int().positive().default(1),
  languageTrack: LanguageTrackSchema.default('ARABIC'),
  curriculumNodeIds: z.array(z.string().uuid()).default([]),
  sourceReferenceIds: z.array(z.string().uuid()).default([]),
});
export type BulkQuestionItemDto = z.infer<typeof BulkQuestionItemSchema>;

export const BulkReviewItemStatusSchema = z.enum([
  'VALID',
  'WARNING',
  'DUPLICATE_EXACT',
  'DUPLICATE_CANDIDATE',
]);
export type BulkReviewItemStatus = z.infer<typeof BulkReviewItemStatusSchema>;

export const BulkImportReviewItemSchema = z.object({
  tempId: z.string(),
  item: BulkQuestionItemSchema,
  status: BulkReviewItemStatusSchema,
  validationErrors: z.array(z.string()),
  duplicateMatch: DuplicateCheckResultSchema.optional(),
  suggestedAction: z.enum(['CREATE_NEW', 'LINK_SOURCE', 'DISMISS']),
});
export type BulkImportReviewItemDto = z.infer<typeof BulkImportReviewItemSchema>;

export const CommitBulkImportActionSchema = z.object({
  tempId: z.string(),
  action: z.enum(['CREATE_NEW', 'LINK_SOURCE', 'DISMISS']),
  targetQuestionId: z.string().uuid().optional(),
  item: BulkQuestionItemSchema,
});
export type CommitBulkImportActionDto = z.infer<typeof CommitBulkImportActionSchema>;

export const CommitBulkImportInputSchema = z.object({
  actions: z.array(CommitBulkImportActionSchema),
});
export type CommitBulkImportInputDto = z.infer<typeof CommitBulkImportInputSchema>;
