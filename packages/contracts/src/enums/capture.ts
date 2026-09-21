import { z } from 'zod';

export const CaptureSessionStatusSchema = z.enum(['COLLECTING', 'EXTRACTING', 'READY_FOR_GRADING', 'GRADING', 'FINALIZED']);
export type CaptureSessionStatus = z.infer<typeof CaptureSessionStatusSchema>;

export const CapturePageStatusSchema = z.enum(['IMPORTED', 'NORMALIZED', 'EXTRACTING', 'EXTRACTED', 'FAILED', 'EXCLUDED']);
export type CapturePageStatus = z.infer<typeof CapturePageStatusSchema>;

export const SubmissionStatusSchema = z.enum(['PENDING', 'EXTRACTING', 'EXTRACTED', 'GRADING', 'GRADED', 'REVIEWED', 'FINALIZED', 'FAILED']);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const GradingMethodSchema = z.enum(['DETERMINISTIC', 'AI_ASSISTED', 'TEACHER_ONLY']);
export type GradingMethod = z.infer<typeof GradingMethodSchema>;

export const ExtractionStatusSchema = z.enum(['PENDING', 'EXTRACTED', 'NEEDS_REVIEW', 'REVIEWED', 'FAILED']);
export type ExtractionStatus = z.infer<typeof ExtractionStatusSchema>;
