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

export const ExamSectionDtoSchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
  title: z.string().min(1).max(200),
  instructionsJson: z.string().default('[]'),
  position: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type ExamSectionDto = z.infer<typeof ExamSectionDtoSchema>;

export const ExamVersionDtoSchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
  label: z.enum(['A', 'B', 'C', 'D']),
  questionOrder: z.array(z.string().uuid()),
  answerKey: z.array(z.object({
    placementId: z.string().uuid(),
    answer: z.unknown(),
  })),
  createdAt: z.string(),
});
export type ExamVersionDto = z.infer<typeof ExamVersionDtoSchema>;

export const ExamPlacementSchema = z.object({
  id: z.string().uuid(),
  examSectionId: z.string().uuid().optional(),
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
  title: z.string().min(1).max(200),
  blueprint: ExamBlueprintSchema,
  status: ExamStatusSchema,
  sections: z.array(ExamSectionDtoSchema).default([]),
  placements: z.array(ExamPlacementSchema),
  versions: z.array(ExamVersionDtoSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExamDto = z.infer<typeof ExamDtoSchema>;

export const AssemblyPreviewResultSchema = z.object({
  valid: z.boolean(),
  conflicts: z.array(z.string()),
  selectedQuestions: z.array(z.object({
    questionId: z.string().uuid(),
    marks: z.number().int().positive(),
    curriculumNodeIds: z.array(z.string().uuid()),
    sourceReferenceIds: z.array(z.string().uuid()),
    questionType: QuestionTypeSchema,
    difficulty: QuestionDifficultySchema,
    body: MathRichContentSchema,
    modelAnswer: MathRichContentSchema.nullable(),
  })),
  totalSelectedMarks: z.number().int().nonnegative(),
  totalSelectedQuestions: z.number().int().nonnegative(),
});
export type AssemblyPreviewResult = z.infer<typeof AssemblyPreviewResultSchema>;

export const ConfirmAssemblyInputSchema = z.object({
  blueprint: ExamBlueprintSchema,
  placements: z.array(z.object({
    questionId: z.string().uuid().optional(),
    provenance: ExamProvenanceSchema,
    body: MathRichContentSchema,
    modelAnswer: MathRichContentSchema.nullable().default(null),
    marks: z.number().int().positive(),
    answerSpaceLines: z.number().int().nonnegative().default(0),
    curriculumNodeIds: z.array(z.string().uuid()),
    sourceReferenceIds: z.array(z.string().uuid()).default([]),
    position: z.number().int().nonnegative(),
  })).min(1),
  sectionTitle: z.string().min(1).max(200).default('القسم الرئيسي'),
});
export type ConfirmAssemblyInput = z.infer<typeof ConfirmAssemblyInputSchema>;

export const AiGenerateCandidatesInputSchema = z.object({
  topicOrStandard: z.string().min(1).max(500),
  gradeLevel: GradeLevelSchema,
  languageTrack: LanguageTrackSchema,
  questionType: QuestionTypeSchema,
  difficulty: QuestionDifficultySchema,
  marks: z.number().int().positive().max(1000).default(1),
  count: z.number().int().min(1).max(10).default(3),
  curriculumNodeIds: z.array(z.string().uuid()).default([]),
  sourceReferenceIds: z.array(z.string().uuid()).default([]),
});
export type AiGenerateCandidatesInput = z.infer<typeof AiGenerateCandidatesInputSchema>;

