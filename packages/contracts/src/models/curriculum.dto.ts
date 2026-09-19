import { z } from 'zod';
import {
  EducationSystemSchema,
  GradeLevelSchema,
  LanguageTrackSchema,
  MathBranchSchema,
} from '../enums/academic.js';
import {
  CurriculumCatalogStatusSchema,
  CurriculumNodeTierSchema,
  CurriculumProgressStatusSchema,
  CurriculumProjectionStatusSchema,
} from '../enums/curriculum.js';

// ==========================================
// 1. Curriculum Catalog Models
// ==========================================

export const CurriculumCatalogDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
  educationSystem: EducationSystemSchema,
  gradeLevel: GradeLevelSchema,
  languageTrack: LanguageTrackSchema,
  mathBranch: MathBranchSchema.nullable(),
  version: z.number().int().min(1),
  status: CurriculumCatalogStatusSchema,
  publishedAt: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CurriculumCatalogDto = z.infer<typeof CurriculumCatalogDtoSchema>;

export const CreateCurriculumCatalogSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code must contain only alphanumeric characters, dashes, and underscores'),
  title: z.string().min(1).max(255),
  educationSystem: EducationSystemSchema,
  gradeLevel: GradeLevelSchema,
  languageTrack: LanguageTrackSchema,
  mathBranch: MathBranchSchema.optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});
export type CreateCurriculumCatalogDto = z.infer<typeof CreateCurriculumCatalogSchema>;

export const UpdateCurriculumCatalogSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
});
export type UpdateCurriculumCatalogDto = z.infer<typeof UpdateCurriculumCatalogSchema>;

export const CurriculumCatalogFilterSchema = z.object({
  educationSystem: EducationSystemSchema.optional(),
  gradeLevel: GradeLevelSchema.optional(),
  languageTrack: LanguageTrackSchema.optional(),
  mathBranch: MathBranchSchema.optional().nullable(),
  status: CurriculumCatalogStatusSchema.optional(),
  search: z.string().optional(),
});
export type CurriculumCatalogFilter = z.infer<typeof CurriculumCatalogFilterSchema>;

// ==========================================
// 2. Curriculum Node & Tree Models
// ==========================================

export const CurriculumNodeDtoSchema = z.object({
  id: z.string().uuid(),
  catalogId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  tier: CurriculumNodeTierSchema,
  titleAr: z.string().min(1).max(255),
  titleEn: z.string().max(255).nullable(),
  code: z.string().min(1).max(64),
  orderIndex: z.number().int().min(0),
  description: z.string().nullable(),
  metadataJson: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CurriculumNodeDto = z.infer<typeof CurriculumNodeDtoSchema>;

export const CreateCurriculumNodeSchema = z.object({
  catalogId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
  tier: CurriculumNodeTierSchema,
  titleAr: z.string().min(1).max(255),
  titleEn: z.string().max(255).optional().nullable(),
  code: z.string().min(1).max(64),
  orderIndex: z.number().int().min(0).optional(),
  description: z.string().max(2000).optional().nullable(),
  metadataJson: z.string().optional().nullable(),
});
export type CreateCurriculumNodeDto = z.infer<typeof CreateCurriculumNodeSchema>;

export const UpdateCurriculumNodeSchema = z.object({
  titleAr: z.string().min(1).max(255).optional(),
  titleEn: z.string().max(255).optional().nullable(),
  code: z.string().min(1).max(64).optional(),
  orderIndex: z.number().int().min(0).optional(),
  description: z.string().max(2000).optional().nullable(),
  metadataJson: z.string().optional().nullable(),
});
export type UpdateCurriculumNodeDto = z.infer<typeof UpdateCurriculumNodeSchema>;

export const ReorderCurriculumNodesSchema = z.object({
  catalogId: z.string().uuid(),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      orderIndex: z.number().int().min(0),
    })
  ).min(1),
});
export type ReorderCurriculumNodesDto = z.infer<typeof ReorderCurriculumNodesSchema>;

export interface CurriculumTreeNodeDto extends CurriculumNodeDto {
  children: CurriculumTreeNodeDto[];
}

export const CurriculumTreeNodeDtoSchema: z.ZodType<CurriculumTreeNodeDto> = CurriculumNodeDtoSchema.extend({
  children: z.lazy(() => z.array(CurriculumTreeNodeDtoSchema)),
});

// ==========================================
// 3. Group Curriculum Assignment & Progress
// ==========================================

export const GroupCurriculumAssignmentDtoSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  catalogId: z.string().uuid(),
  catalogVersion: z.number().int().min(1),
  assignedAt: z.string(),
  assignedByUserId: z.string().nullable(),
  assignedByNameSnapshot: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GroupCurriculumAssignmentDto = z.infer<typeof GroupCurriculumAssignmentDtoSchema>;

export const AssignGroupCatalogSchema = z.object({
  groupId: z.string().uuid(),
  catalogId: z.string().uuid(),
  notes: z.string().max(1000).optional().nullable(),
});
export type AssignGroupCatalogDto = z.infer<typeof AssignGroupCatalogSchema>;

export const GroupNodeProgressDtoSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  catalogId: z.string().uuid(),
  nodeId: z.string().uuid(),
  status: CurriculumProgressStatusSchema,
  completedAt: z.string().nullable(),
  updatedByUserId: z.string().nullable(),
  updatedByNameSnapshot: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GroupNodeProgressDto = z.infer<typeof GroupNodeProgressDtoSchema>;

export const UpdateGroupNodeProgressSchema = z.object({
  groupId: z.string().uuid(),
  nodeId: z.string().uuid(),
  status: CurriculumProgressStatusSchema,
  notes: z.string().max(1000).optional().nullable(),
});
export type UpdateGroupNodeProgressDto = z.infer<typeof UpdateGroupNodeProgressSchema>;

export const GroupCurriculumProjectionSchema = z.object({
  status: CurriculumProjectionStatusSchema,
  messageAr: z.string(),
  completedSessionsCount: z.number().int().min(0),
  skillsPerWeekRate: z.number().nullable(),
  projectedCompletionDate: z.string().nullable(),
});
export type GroupCurriculumProjection = z.infer<typeof GroupCurriculumProjectionSchema>;

export const GroupCurriculumOverviewDtoSchema = z.object({
  assignment: GroupCurriculumAssignmentDtoSchema.nullable(),
  catalog: CurriculumCatalogDtoSchema.nullable(),
  totalSkills: z.number().int().min(0),
  completedSkills: z.number().int().min(0),
  inProgressSkills: z.number().int().min(0),
  remainingSkills: z.number().int().min(0),
  completionPercentage: z.number().min(0).max(100),
  projection: GroupCurriculumProjectionSchema,
});
export type GroupCurriculumOverviewDto = z.infer<typeof GroupCurriculumOverviewDtoSchema>;
