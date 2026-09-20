import { z } from 'zod';
import { SourceDocumentStatusSchema } from '../enums/curriculum.js';

export const SourceDocumentDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  author: z.string().max(100).nullable().optional(),
  publisher: z.string().max(100).nullable().optional(),
  editionYear: z.string().max(20).nullable().optional(),
  curriculumCatalogId: z.string().uuid().nullable().optional(),
  filePath: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().nonnegative(),
  sha256Hash: z.string().length(64),
  pageCount: z.number().int().positive(),
  status: SourceDocumentStatusSchema.default('INDEXED'),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SourceDocumentDto = z.infer<typeof SourceDocumentDtoSchema>;

export const ImportSourceDocumentSchema = z.object({
  sourceFilePath: z.string().min(1),
  title: z.string().min(1).max(200),
  author: z.string().max(100).optional(),
  publisher: z.string().max(100).optional(),
  editionYear: z.string().max(20).optional(),
  curriculumCatalogId: z.string().uuid().optional(),
});
export type ImportSourceDocumentDto = z.infer<typeof ImportSourceDocumentSchema>;

export const UpdateSourceDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  author: z.string().max(100).nullable().optional(),
  publisher: z.string().max(100).nullable().optional(),
  editionYear: z.string().max(20).nullable().optional(),
  curriculumCatalogId: z.string().uuid().nullable().optional(),
});
export type UpdateSourceDocumentDto = z.infer<typeof UpdateSourceDocumentSchema>;

export const SourceReferenceDtoSchema = z.object({
  id: z.string().uuid(),
  sourceDocumentId: z.string().uuid(),
  startPage: z.number().int().positive(),
  endPage: z.number().int().positive(),
  referenceLabel: z.string().min(1).max(150),
  notes: z.string().max(1000).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).refine((data) => data.endPage >= data.startPage, {
  message: 'رقم صفحة النهاية يجب أن يكون أكبر من أو يساوي رقم صفحة البداية',
  path: ['endPage'],
});
export type SourceReferenceDto = z.infer<typeof SourceReferenceDtoSchema>;

export const CreateSourceReferenceSchema = z.object({
  sourceDocumentId: z.string().uuid(),
  startPage: z.number().int().positive(),
  endPage: z.number().int().positive(),
  referenceLabel: z.string().min(1).max(150),
  notes: z.string().max(1000).optional(),
}).refine((data) => data.endPage >= data.startPage, {
  message: 'رقم صفحة النهاية يجب أن يكون أكبر من أو يساوي رقم صفحة البداية',
  path: ['endPage'],
});
export type CreateSourceReferenceDto = z.infer<typeof CreateSourceReferenceSchema>;

export const UpdateSourceReferenceSchema = z.object({
  id: z.string().uuid(),
  startPage: z.number().int().positive().optional(),
  endPage: z.number().int().positive().optional(),
  referenceLabel: z.string().min(1).max(150).optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type UpdateSourceReferenceDto = z.infer<typeof UpdateSourceReferenceSchema>;
