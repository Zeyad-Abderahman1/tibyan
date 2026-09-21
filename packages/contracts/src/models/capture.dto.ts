import { z } from 'zod';
import {
  CaptureSessionStatusSchema,
  CapturePageStatusSchema,
  SubmissionStatusSchema,
} from '../enums/capture.js';

// --- Enums (re-exported from enums/capture.ts for convenience) ---

export const CapturePageSourceSchema = z.enum(['IMAGE', 'PDF']);
export type CapturePageSource = z.infer<typeof CapturePageSourceSchema>;

export const AssociationMethodSchema = z.enum(['MANUAL', 'AUTO_BARCODE', 'AUTO_NAME', 'UNASSOCIATED']);
export type AssociationMethod = z.infer<typeof AssociationMethodSchema>;

// --- Capture Session ---

export const CaptureSessionSchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
  examTitle: z.string(),
  examFormLabel: z.string(), // A/B/C/D
  status: CaptureSessionStatusSchema,
  totalSubmissions: z.number().int().nonnegative(),
  completedSubmissions: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CaptureSessionDto = z.infer<typeof CaptureSessionSchema>;

export const CreateCaptureSessionSchema = z.object({
  examId: z.string().uuid(),
  examFormLabel: z.enum(['A', 'B', 'C', 'D']),
});
export type CreateCaptureSessionDto = z.input<typeof CreateCaptureSessionSchema>;

// --- Capture Submission ---

export const CaptureSubmissionSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  studentId: z.string().uuid().nullable(),
  studentName: z.string().nullable(),
  studentCode: z.string().nullable(),
  associationMethod: AssociationMethodSchema,
  status: SubmissionStatusSchema,
  pageCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CaptureSubmissionDto = z.infer<typeof CaptureSubmissionSchema>;

// --- Capture Page ---

export const CapturePageSchema = z.object({
  id: z.string().uuid(),
  submissionId: z.string().uuid(),
  sessionId: z.string().uuid(),
  pageOrder: z.number().int().nonnegative(),
  source: CapturePageSourceSchema,
  originalFilePath: z.string(),
  originalFileName: z.string(),
  originalFileSizeBytes: z.number().int().nonnegative(),
  fingerprintSha256: z.string(),
  normalizedFilePath: z.string().nullable(),
  status: CapturePageStatusSchema,
  rotationDegrees: z.number().int(),
  excluded: z.boolean(),
  failureReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CapturePageDto = z.infer<typeof CapturePageSchema>;

// --- Import ---

export const ImportCaptureFilesSchema = z.object({
  sessionId: z.string().uuid(),
  submissionId: z.string().uuid().optional(),
  filePaths: z.array(z.string()).min(1),
  studentId: z.string().uuid().optional(),
});
export type ImportCaptureFilesInput = z.input<typeof ImportCaptureFilesSchema>;

export const AssociateSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  studentId: z.string().uuid().nullable(),
});
export type AssociateSubmissionInput = z.input<typeof AssociateSubmissionSchema>;

export const ReassignPageSchema = z.object({
  pageId: z.string().uuid(),
  targetSubmissionId: z.string().uuid(),
  newPageOrder: z.number().int().nonnegative().optional(),
});
export type ReassignPageInput = z.input<typeof ReassignPageSchema>;

export const ExcludePageSchema = z.object({
  pageId: z.string().uuid(),
  excluded: z.boolean(),
});
export type ExcludePageInput = z.input<typeof ExcludePageSchema>;

export const RotatePageSchema = z.object({
  pageId: z.string().uuid(),
  rotationDegrees: z.enum(['0', '90', '180', '270']),
});
export type RotatePageInput = z.input<typeof RotatePageSchema>;
