import { z } from 'zod';

const sourcePage = z.number().int().positive();
const sourceId = z.string().uuid();
const scope = z.string().trim().min(1).max(500).optional();

export const SourceGenerationRequestSchema = z.object({ sourceId, scope }).strict();
export type SourceGenerationRequest = z.infer<typeof SourceGenerationRequestSchema>;
export const ExamGenerationRequestSchema = z.object({
  sourceId,
  config: z.object({
    questionCount: z.number().int().min(1).max(100).optional(),
    difficulty: z.string().max(50).optional(),
    types: z.array(z.enum(['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'TRUE_FALSE', 'WRITTEN'])).max(4).optional(),
    mcqCount: z.number().int().nonnegative().max(100).optional(),
    writtenCount: z.number().int().nonnegative().max(100).optional(),
    trueFalseCount: z.number().int().nonnegative().max(100).optional(),
    shortAnswerCount: z.number().int().nonnegative().max(100).optional(),
    generationMode: z.string().max(50).optional(),
  }).strict().default({}),
}).strict();
export type ExamGenerationRequest = z.infer<typeof ExamGenerationRequestSchema>;

export const GeneratedQuestionSchema = z.object({
  body: z.string().trim().min(1),
  type: z.enum(['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'TRUE_FALSE', 'WRITTEN']),
  options: z.array(z.string().trim().min(1)).min(2).max(6).optional(),
  correctAnswer: z.string().trim().min(1),
  explanation: z.string().optional(),
  marks: z.number().int().positive(),
  sourcePage,
}).strict().superRefine((question, context) => {
  if (question.type === 'MULTIPLE_CHOICE' && (question.options?.length !== 4 || !question.options.includes(question.correctAnswer))) {
    context.addIssue({ code: 'custom', message: 'Multiple choice questions require four options and a matching answer' });
  }
});
export const ExamGenerationResultSchema = z.object({ title: z.string().optional(), questions: z.array(GeneratedQuestionSchema).min(1).max(100) }).strict();
export type ExamGenerationResult = z.infer<typeof ExamGenerationResultSchema>;

export const GeneratedSlideSchema = z.object({ title: z.string().trim().min(1), content: z.string().trim().min(1), notes: z.string().optional(), sourcePage }).strict();
export const SlidesGenerationResultSchema = z.object({ title: z.string().optional(), slides: z.array(GeneratedSlideSchema).min(1).max(50) }).strict();
export type SlidesGenerationResult = z.infer<typeof SlidesGenerationResultSchema>;

const sectionFields = { title: z.string().trim().min(1), content: z.string().trim().min(1), sourcePage };
export const GeneratedReviewSectionSchema = z.object({ ...sectionFields, type: z.enum(['heading', 'content', 'question', 'example']) }).strict();
export const ReviewGenerationResultSchema = z.object({ title: z.string().optional(), sections: z.array(GeneratedReviewSectionSchema).min(1).max(100) }).strict();
export type ReviewGenerationResult = z.infer<typeof ReviewGenerationResultSchema>;
export const GeneratedNoteSectionSchema = z.object({ ...sectionFields, type: z.enum(['heading', 'content', 'example', 'exercise']) }).strict();
export const NotesGenerationResultSchema = z.object({ title: z.string().optional(), sections: z.array(GeneratedNoteSectionSchema).min(1).max(100) }).strict();
export type NotesGenerationResult = z.infer<typeof NotesGenerationResultSchema>;

export const GeneratedExamContentSchema = z.object({ type: z.literal('exam'), title: z.string(), data: ExamGenerationResultSchema, sourceDocumentId: z.string(), generatedAt: z.string() }).strict();
export const GeneratedSlidesContentSchema = z.object({ type: z.literal('slides'), title: z.string(), data: SlidesGenerationResultSchema, sourceDocumentId: z.string(), generatedAt: z.string() }).strict();
export const GeneratedReviewContentSchema = z.object({ type: z.literal('review'), title: z.string(), data: ReviewGenerationResultSchema, sourceDocumentId: z.string(), generatedAt: z.string() }).strict();
export const GeneratedNotesContentSchema = z.object({ type: z.literal('notes'), title: z.string(), data: NotesGenerationResultSchema, sourceDocumentId: z.string(), generatedAt: z.string() }).strict();
export type GeneratedExamContent = z.infer<typeof GeneratedExamContentSchema>;
export type GeneratedSlidesContent = z.infer<typeof GeneratedSlidesContentSchema>;
export type GeneratedReviewContent = z.infer<typeof GeneratedReviewContentSchema>;
export type GeneratedNotesContent = z.infer<typeof GeneratedNotesContentSchema>;
