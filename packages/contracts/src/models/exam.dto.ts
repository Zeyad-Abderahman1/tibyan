import { z } from 'zod';
import { GradeLevelSchema, LanguageTrackSchema } from '../enums/academic.js';
import { QuestionDifficultySchema, QuestionTypeSchema } from '../enums/curriculum.js';
import { MathRichContentSchema } from './math-rich-content.dto.js';

export const ExamStatusSchema = z.enum(['DRAFT', 'CONFIRMED', 'ARCHIVED']);
export type ExamStatus = z.infer<typeof ExamStatusSchema>;

export const ExamProvenanceSchema = z.enum(['QUESTION_BANK', 'AI_CANDIDATE', 'SOURCE_LINKED']);
export type ExamProvenance = z.infer<typeof ExamProvenanceSchema>;

export const ExamBlueprintSchema = z.object({
  title: z.string().trim().min(1).max(200),
  gradeLevel: GradeLevelSchema,
  languageTrack: LanguageTrackSchema,
  curriculumNodeIds: z.array(z.string().uuid()).min(1),
  sourceReferenceIds: z.array(z.string().uuid()).default([]),
  totalQuestions: z.number().int().positive().max(100),
  totalMarks: z.number().int().positive().max(1000),
  durationMinutes: z.number().int().positive().max(600),
  difficultyDistribution: z.record(QuestionDifficultySchema, z.number().int().nonnegative()),
  questionTypeDistribution: z.record(QuestionTypeSchema, z.number().int().nonnegative()),
  variantCount: z.number().int().min(1).max(4).default(1),
}).superRefine((value, ctx) => {
  const difficultyTotal = Object.values(value.difficultyDistribution).reduce((total, count) => total + count, 0);
  if (difficultyTotal !== value.totalQuestions) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['difficultyDistribution'], message: 'يجب أن يساوي مجموع توزيع الصعوبة عدد الأسئلة' });
  }
  const typeTotal = Object.values(value.questionTypeDistribution).reduce((total, count) => total + count, 0);
  if (typeTotal !== value.totalQuestions) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['questionTypeDistribution'], message: 'يجب أن يساوي مجموع توزيع أنواع الأسئلة عدد الأسئلة' });
  }
});
export type ExamBlueprint = z.infer<typeof ExamBlueprintSchema>;

/** Untrusted provider proposal: intentionally has no database IDs, commands, or provenance authority. */
export const AiExamCandidateSchema = z.object({
  body: MathRichContentSchema,
  modelAnswer: MathRichContentSchema.nullable(),
  questionType: QuestionTypeSchema,
  difficulty: QuestionDifficultySchema,
  marks: z.number().int().positive().max(1000),
}).strict();
export type AiExamCandidate = z.infer<typeof AiExamCandidateSchema>;

export const ExamPlacementSchema = z.object({
  id: z.string().uuid(),
  questionId: z.string().uuid().optional(),
  provenance: ExamProvenanceSchema,
  body: MathRichContentSchema,
  modelAnswer: MathRichContentSchema.nullable(),
  marks: z.number().int().positive(),
  answerSpaceLines: z.number().int().nonnegative().default(0),
  curriculumNodeIds: z.array(z.string().uuid()),
  sourceReferenceIds: z.array(z.string().uuid()),
  position: z.number().int().nonnegative(),
});
export type ExamPlacement = z.infer<typeof ExamPlacementSchema>;

export const ExamDtoSchema = z.object({
  id: z.string().uuid(),
  blueprint: ExamBlueprintSchema,
  status: ExamStatusSchema,
  placements: z.array(ExamPlacementSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExamDto = z.infer<typeof ExamDtoSchema>;
