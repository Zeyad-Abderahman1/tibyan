import { z } from 'zod';
import { LessonPlanStatusSchema } from '../enums/curriculum.js';
import {
  MathRichContentSchema,
  createEmptyMathRichContent,
} from './math-rich-content.dto.js';

// ==========================================
// 1. Timing Breakdown
// ==========================================

export const TimingBreakdownItemSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  minutes: z.number().int().min(1).max(300),
});
export type TimingBreakdownItem = z.infer<typeof TimingBreakdownItemSchema>;

export function calculatePlannedDuration(timingBreakdown: TimingBreakdownItem[]): number {
  return timingBreakdown.reduce((sum, item) => sum + item.minutes, 0);
}

export type TimingStatus = 'EXACT' | 'UNDER' | 'OVER';

export interface TimingValidationResult {
  plannedMinutes: number;
  targetMinutes: number;
  diffMinutes: number;
  status: TimingStatus;
  statusAr: string;
}

export function validateLessonPlanTiming(
  targetMinutes: number,
  timingBreakdown: TimingBreakdownItem[]
): TimingValidationResult {
  const plannedMinutes = calculatePlannedDuration(timingBreakdown);
  const diffMinutes = plannedMinutes - targetMinutes;

  if (diffMinutes === 0) {
    return {
      plannedMinutes,
      targetMinutes,
      diffMinutes: 0,
      status: 'EXACT',
      statusAr: 'مطابق تماماً للمدة المستهدفة',
    };
  } else if (diffMinutes < 0) {
    return {
      plannedMinutes,
      targetMinutes,
      diffMinutes,
      status: 'UNDER',
      statusAr: `أقل من المستهدف بـ ${Math.abs(diffMinutes)} دقيقة`,
    };
  } else {
    return {
      plannedMinutes,
      targetMinutes,
      diffMinutes,
      status: 'OVER',
      statusAr: `زائد عن المستهدف بـ ${diffMinutes} دقيقة`,
    };
  }
}

// ==========================================
// 2. Pedagogical Sections
// ==========================================

export const LessonPlanSectionsSchema = z.object({
  objectives: z.array(z.string().min(1).max(500)).max(30).default([]),
  priorReview: MathRichContentSchema,
  explanation: MathRichContentSchema,
  examples: MathRichContentSchema,
  inClassQuestions: MathRichContentSchema,
  commonMistakes: MathRichContentSchema,
  homework: MathRichContentSchema,
  timingBreakdown: z.array(TimingBreakdownItemSchema).max(30).default([]),
  notes: z.string().max(3000).optional().nullable(),
});
export type LessonPlanSections = z.infer<typeof LessonPlanSectionsSchema>;

export function createEmptyLessonPlanSections(): LessonPlanSections {
  return {
    objectives: [],
    priorReview: createEmptyMathRichContent(),
    explanation: createEmptyMathRichContent(),
    examples: createEmptyMathRichContent(),
    inClassQuestions: createEmptyMathRichContent(),
    commonMistakes: createEmptyMathRichContent(),
    homework: createEmptyMathRichContent(),
    timingBreakdown: [
      { id: 't_rev', label: 'مراجعة تمهيدية', minutes: 10 },
      { id: 't_exp', label: 'شرح المفاهيم والأمثلة', minutes: 25 },
      { id: 't_act', label: 'تطبيقات وأسئلة تفاعلية', minutes: 15 },
      { id: 't_sum', label: 'خلاصة وتكليف الواجب', minutes: 10 },
    ],
    notes: null,
  };
}

// ==========================================
// 3. Lesson Plan DTOs
// ==========================================

export const LessonPlanDtoSchema = z.object({
  id: z.string().uuid(),
  curriculumNodeId: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
  targetDurationMinutes: z.number().int().min(1).max(480),
  status: LessonPlanStatusSchema,
  version: z.number().int().min(1),
  sections: LessonPlanSectionsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LessonPlanDto = z.infer<typeof LessonPlanDtoSchema>;

export const CreateLessonPlanSchema = z.object({
  curriculumNodeId: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
  targetDurationMinutes: z.number().int().min(1).max(480).default(60),
  status: LessonPlanStatusSchema.default('DRAFT'),
  sections: LessonPlanSectionsSchema,
});
export type CreateLessonPlanDto = z.input<typeof CreateLessonPlanSchema>;

export const UpdateLessonPlanSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  targetDurationMinutes: z.number().int().min(1).max(480).optional(),
  status: LessonPlanStatusSchema.optional(),
  sections: LessonPlanSectionsSchema.optional(),
});
export type UpdateLessonPlanDto = z.infer<typeof UpdateLessonPlanSchema>;

export const LessonPlanFilterSchema = z.object({
  curriculumNodeId: z.string().optional(),
  status: LessonPlanStatusSchema.optional(),
  search: z.string().optional(),
});
export type LessonPlanFilter = z.infer<typeof LessonPlanFilterSchema>;
