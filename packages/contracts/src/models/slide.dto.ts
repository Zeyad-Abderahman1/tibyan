import { z } from 'zod';

// ─── Slide Deck ──────────────────────────────────────────────────────────────

export const SlideDeckStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);
export type SlideDeckStatus = z.infer<typeof SlideDeckStatusSchema>;

export const SlideGenerationSettingsSchema = z.object({
  sourceDocumentId: z.string().uuid(),
  gradeLevel: z.enum(['SEC_1', 'SEC_2', 'SEC_3']),
  slideCount: z.number().int().min(1).max(50),
  detailLevel: z.enum(['BRIEF', 'MODERATE', 'DETAILED']),
  includeInteractive: z.boolean(),
  includeExamples: z.boolean(),
  includeSummary: z.boolean(),
  theme: z.enum(['LIGHT', 'DARK', 'TIBYAN']),
  layoutTemplate: z.enum(['SIMPLE_EDUCATIONAL', 'EXPLAIN_EXAMPLE', 'QUICK_REVIEW', 'VISUAL_EXPLAIN']),
  aspectRatio: z.literal('16:9'),
}).strict();
export type SlideGenerationSettings = z.infer<typeof SlideGenerationSettingsSchema>;

export const SlideDeckSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  curriculumNodeId: z.string().uuid().optional().nullable(),
  groupId: z.string().uuid().optional().nullable(),
  status: SlideDeckStatusSchema.default('DRAFT'),
  slideCount: z.number().int().nonnegative().default(0),
  generationSettings: SlideGenerationSettingsSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SlideDeckDto = z.infer<typeof SlideDeckSchema>;

export const CreateSlideDeckSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  curriculumNodeId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
});
export type CreateSlideDeckInput = z.infer<typeof CreateSlideDeckSchema>;

export const UpdateSlideDeckSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  curriculumNodeId: z.string().uuid().optional().nullable(),
  groupId: z.string().uuid().optional().nullable(),
});
export type UpdateSlideDeckInput = z.infer<typeof UpdateSlideDeckSchema>;

// ─── Slide ───────────────────────────────────────────────────────────────────

export const SlideSchema = z.object({
  id: z.string().uuid(),
  deckId: z.string().uuid(),
  title: z.string().max(200).optional().nullable(),
  position: z.number().int().nonnegative(),
  notes: z.string().max(5000).optional().nullable(),
  blockCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
});
export type SlideDto = z.infer<typeof SlideSchema>;

export const CreateSlideSchema = z.object({
  deckId: z.string().uuid(),
  title: z.string().max(200).optional(),
  position: z.number().int().nonnegative().optional(),
  notes: z.string().max(5000).optional(),
});
export type CreateSlideInput = z.infer<typeof CreateSlideSchema>;

export const UpdateSlideSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});
export type UpdateSlideInput = z.infer<typeof UpdateSlideSchema>;

export const ReorderSlidesSchema = z.object({
  deckId: z.string().uuid(),
  slideIds: z.array(z.string().uuid()).min(1),
});
export type ReorderSlidesInput = z.infer<typeof ReorderSlidesSchema>;

// ─── Slide Block ─────────────────────────────────────────────────────────────

export const SlideBlockTypeSchema = z.enum(['TEXT', 'MATH', 'IMAGE', 'GEOMETRY', 'QUESTION']);
export type SlideBlockType = z.infer<typeof SlideBlockTypeSchema>;

export const SlideBlockSchema = z.object({
  id: z.string().uuid(),
  slideId: z.string().uuid(),
  blockType: SlideBlockTypeSchema,
  contentJson: z.string().min(1),
  questionId: z.string().uuid().optional().nullable(),
  position: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export type SlideBlockDto = z.infer<typeof SlideBlockSchema>;

export const CreateSlideBlockSchema = z.object({
  slideId: z.string().uuid(),
  blockType: SlideBlockTypeSchema,
  contentJson: z.string().min(1),
  questionId: z.string().uuid().optional(),
  position: z.number().int().nonnegative().optional(),
});
export type CreateSlideBlockInput = z.infer<typeof CreateSlideBlockSchema>;

export const UpdateSlideBlockSchema = z.object({
  contentJson: z.string().min(1).optional(),
  questionId: z.string().uuid().optional().nullable(),
});
export type UpdateSlideBlockInput = z.infer<typeof UpdateSlideBlockSchema>;

export const ReorderSlideBlocksSchema = z.object({
  slideId: z.string().uuid(),
  blockIds: z.array(z.string().uuid()).min(1),
});
export type ReorderSlideBlocksInput = z.infer<typeof ReorderSlideBlocksSchema>;

export const MoveSlideBlockSchema = z.object({
  blockId: z.string().uuid(),
  targetSlideId: z.string().uuid(),
  position: z.number().int().nonnegative(),
});
export type MoveSlideBlockInput = z.infer<typeof MoveSlideBlockSchema>;

// ─── Slide Deck Full Snapshot ────────────────────────────────────────────────

export const SlideDeckWithSlidesSchema = SlideDeckSchema.extend({
  slides: z.array(SlideSchema.extend({
    blocks: z.array(SlideBlockSchema),
  })),
});
export type SlideDeckWithSlides = z.infer<typeof SlideDeckWithSlidesSchema>;

// ─── Presentation Mode ───────────────────────────────────────────────────────

export const SlidePresentationSchema = z.object({
  deck: SlideDeckSchema,
  slides: z.array(SlideSchema.extend({
    blocks: z.array(SlideBlockSchema.extend({
      renderedHtml: z.string().optional(),
    })),
  })),
});
export type SlidePresentation = z.infer<typeof SlidePresentationSchema>;
