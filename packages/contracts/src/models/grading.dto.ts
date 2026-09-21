import { z } from 'zod';
import {
  GradingMethodSchema,
  ExtractionStatusSchema,
} from '../enums/capture.js';

// --- Types inferred from enums (not re-exported to avoid collision with enums/index.ts) ---

// --- Extracted Answer ---

export const ExtractedAnswerSchema = z.object({
  id: z.string().uuid(),
  submissionId: z.string().uuid(),
  examQuestionId: z.string().uuid(),
  examVersionLabel: z.string().nullable(),
  recognizedResponse: z.string().nullable(),
  recognizedOptionLabel: z.string().nullable(),
  extractionMethod: z.enum(['DETERMINISTIC', 'AI_MULTIMODAL', 'TEACHER_INPUT']),
  confidence: z.number().min(0).max(1).nullable(),
  evidenceRefJson: z.string().nullable(),
  rawExtractionJson: z.string().nullable(),
  status: ExtractionStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ExtractedAnswerDto = z.infer<typeof ExtractedAnswerSchema>;

// --- Grading Decision ---

export const GradingDecisionStatusSchema = z.enum(['PENDING', 'GRADED', 'REVIEWED', 'FINALIZED', 'OVERRIDDEN']);
export type GradingDecisionStatus = z.infer<typeof GradingDecisionStatusSchema>;

export const RubricCriterionResultSchema = z.object({
  criterionKey: z.string(),
  criterionLabel: z.string(),
  maxMarks: z.number().int().nonnegative(),
  awardedMarks: z.number().int().nonnegative(),
  rationale: z.string().optional(),
  source: z.enum(['DETERMINISTIC', 'AI_PROPOSAL', 'TEACHER_OVERRIDE']),
});
export type RubricCriterionResultDto = z.infer<typeof RubricCriterionResultSchema>;

export const GradingDecisionSchema = z.object({
  id: z.string().uuid(),
  submissionId: z.string().uuid(),
  examQuestionId: z.string().uuid(),
  questionPosition: z.number().int(),
  questionMarks: z.number().int().positive(),
  awardedMarks: z.number().int().nonnegative(),
  gradingMethod: GradingMethodSchema,
  rubricResultsJson: z.string().nullable(),
  teacherOverride: z.boolean(),
  teacherOverrideAt: z.string().datetime().nullable(),
  aiProposalJson: z.string().nullable(),
  gradingRunId: z.string().uuid().nullable(),
  status: GradingDecisionStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GradingDecisionDto = z.infer<typeof GradingDecisionSchema>;

// --- Grading Run ---

export const GradingRunSchema = z.object({
  id: z.string().uuid(),
  submissionId: z.string().uuid(),
  method: GradingMethodSchema,
  triggeredByUserId: z.string().uuid().nullable(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  questionCount: z.number().int().nonnegative(),
  gradedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  status: z.enum(['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
});
export type GradingRunDto = z.infer<typeof GradingRunSchema>;

// --- Input Schemas ---

export const GradeSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  method: GradingMethodSchema,
});
export type GradeSubmissionInput = z.input<typeof GradeSubmissionSchema>;

export const OverrideGradingDecisionSchema = z.object({
  decisionId: z.string().uuid(),
  awardedMarks: z.number().int().nonnegative(),
  rubricOverrides: z.array(z.object({
    criterionKey: z.string(),
    awardedMarks: z.number().int().nonnegative(),
  })).optional(),
  rationale: z.string().optional(),
});
export type OverrideGradingDecisionInput = z.input<typeof OverrideGradingDecisionSchema>;

export const ReviewExtractedAnswerSchema = z.object({
  answerId: z.string().uuid(),
  action: z.enum(['APPROVE', 'EDIT_SCORE', 'EDIT_RESPONSE', 'REJECT', 'SKIP', 'MARK_FOR_LATER']),
  correctedResponse: z.string().optional(),
  correctedOptionLabel: z.string().optional(),
});
export type ReviewExtractedAnswerInput = z.input<typeof ReviewExtractedAnswerSchema>;

export const FinalizeSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
});
export type FinalizeSubmissionInput = z.input<typeof FinalizeSubmissionSchema>;

export const RegradeSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  reason: z.string().optional(),
});
export type RegradeSubmissionInput = z.input<typeof RegradeSubmissionSchema>;

// --- AI Grading Proposal ---

export const AiGradingProposalSchema = z.object({
  examQuestionId: z.string().uuid(),
  awardedMarks: z.number().int().nonnegative(),
  rubricResults: z.array(RubricCriterionResultSchema),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  uncertaintyFlags: z.array(z.string()),
  evidenceReferences: z.array(z.string()),
});
export type AiGradingProposal = z.infer<typeof AiGradingProposalSchema>;

export const AiGradingResponseSchema = z.object({
  proposals: z.array(AiGradingProposalSchema),
});
export type AiGradingResponse = z.infer<typeof AiGradingResponseSchema>;

// --- Rubric Definition ---

export const RubricCriterionSchema = z.object({
  key: z.string(),
  label: z.string(),
  maxMarks: z.number().int().positive(),
  description: z.string().optional(),
});
export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;

export const QuestionRubricSchema = z.object({
  questionId: z.string(),
  criteria: z.array(RubricCriterionSchema),
  totalMaxMarks: z.number().int().positive(),
});
export type QuestionRubric = z.infer<typeof QuestionRubricSchema>;
