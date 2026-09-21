import { z } from 'zod';

// --- Exam Analytics ---

export const ExamAnalyticsSummarySchema = z.object({
  examId: z.string().uuid(),
  examTitle: z.string(),
  totalSubmissions: z.number().int().nonnegative(),
  finalizedCount: z.number().int().nonnegative(),
  averageScore: z.number().nullable(),
  medianScore: z.number().nullable(),
  highestScore: z.number().nullable(),
  lowestScore: z.number().nullable(),
  standardDeviation: z.number().nullable(),
  averagePercentage: z.number().nullable(),
});
export type ExamAnalyticsSummaryDto = z.infer<typeof ExamAnalyticsSummarySchema>;

export const ScoreDistributionBucketSchema = z.object({
  rangeStart: z.number(),
  rangeEnd: z.number(),
  count: z.number().int().nonnegative(),
  percentage: z.number(),
});
export type ScoreDistributionBucketDto = z.infer<typeof ScoreDistributionBucketSchema>;

export const ScoreDistributionSchema = z.object({
  examId: z.string().uuid(),
  buckets: z.array(ScoreDistributionBucketSchema),
  totalStudents: z.number().int().nonnegative(),
});
export type ScoreDistributionDto = z.infer<typeof ScoreDistributionSchema>;

// --- Question Analytics ---

export const QuestionPerformanceSchema = z.object({
  examQuestionId: z.string().uuid(),
  questionPosition: z.number().int(),
  questionType: z.string(),
  maxMarks: z.number().int().positive(),
  attempts: z.number().int().nonnegative(),
  fullCreditCount: z.number().int().nonnegative(),
  partialCreditCount: z.number().int().nonnegative(),
  zeroCreditCount: z.number().int().nonnegative(),
  omittedCount: z.number().int().nonnegative(),
  averageAwardedMarks: z.number().nullable(),
  successPercentage: z.number().nullable(),
  curriculumNodeIds: z.array(z.string()),
});
export type QuestionPerformanceDto = z.infer<typeof QuestionPerformanceSchema>;

// --- Skill Analytics ---

export const SkillPerformanceSchema = z.object({
  curriculumNodeId: z.string(),
  nodeTitle: z.string(),
  nodeCode: z.string(),
  totalAttempts: z.number().int().nonnegative(),
  averageAwardedMarks: z.number().nullable(),
  averageMaxMarks: z.number().nullable(),
  successPercentage: z.number().nullable(),
  sampleSize: z.number().int().nonnegative(),
});
export type SkillPerformanceDto = z.infer<typeof SkillPerformanceSchema>;

// --- Student Results ---

export const StudentExamResultSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string(),
  studentCode: z.string(),
  submissionId: z.string().uuid(),
  examId: z.string().uuid(),
  examTitle: z.string(),
  totalAwardedMarks: z.number().int().nonnegative(),
  totalMaxMarks: z.number().int().positive(),
  percentage: z.number().nullable(),
  questionResults: z.array(z.object({
    examQuestionId: z.string().uuid(),
    questionPosition: z.number().int(),
    maxMarks: z.number().int().positive(),
    awardedMarks: z.number().int().nonnegative(),
    gradingMethod: z.string(),
    teacherOverride: z.boolean(),
    rubricResults: z.array(z.object({
      criterionKey: z.string(),
      criterionLabel: z.string(),
      maxMarks: z.number().int().nonnegative(),
      awardedMarks: z.number().int().nonnegative(),
      source: z.string(),
    })).optional(),
  })),
  skillPerformance: z.array(SkillPerformanceSchema),
  isFinalized: z.boolean(),
  finalizedAt: z.string().datetime().nullable(),
});
export type StudentExamResultDto = z.infer<typeof StudentExamResultSchema>;

// --- Input Schemas ---

export const GetExamAnalyticsSchema = z.object({
  examId: z.string().uuid(),
});
export type GetExamAnalyticsInput = z.input<typeof GetExamAnalyticsSchema>;

export const GetStudentResultSchema = z.object({
  submissionId: z.string().uuid(),
});
export type GetStudentResultInput = z.input<typeof GetStudentResultSchema>;
