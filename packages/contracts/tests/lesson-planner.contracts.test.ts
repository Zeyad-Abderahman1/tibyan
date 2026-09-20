import { describe, it, expect } from 'vitest';
import {
  LessonPlanStatusSchema,
  ReflectionCompletionStatusSchema,
  TimingBreakdownItemSchema,
  calculatePlannedDuration,
  validateLessonPlanTiming,
  LessonPlanSectionsSchema,
  createEmptyLessonPlanSections,
  LessonPlanDtoSchema,
  CreateLessonPlanSchema,
  UpdateLessonPlanSchema,
  LessonPlanSnapshotDtoSchema,
  SessionReflectionDtoSchema,
  CreateSessionReflectionSchema,
  UpdateSessionReflectionSchema,
  createTextBlock,
  createMathBlock,
  createEmptyMathRichContent,
} from '../src/index.js';

describe('Lesson Planner & Session Reflection Contracts Suite', () => {
  describe('Enums', () => {
    it('validates allowed LessonPlanStatus values', () => {
      expect(LessonPlanStatusSchema.parse('DRAFT')).toBe('DRAFT');
      expect(LessonPlanStatusSchema.parse('READY')).toBe('READY');
      expect(LessonPlanStatusSchema.parse('ARCHIVED')).toBe('ARCHIVED');
      expect(() => LessonPlanStatusSchema.parse('DELETED')).toThrow();
    });

    it('validates allowed ReflectionCompletionStatus values', () => {
      expect(ReflectionCompletionStatusSchema.parse('COMPLETED')).toBe('COMPLETED');
      expect(ReflectionCompletionStatusSchema.parse('PARTIALLY_COMPLETED')).toBe('PARTIALLY_COMPLETED');
      expect(ReflectionCompletionStatusSchema.parse('POSTPONED')).toBe('POSTPONED');
      expect(() => ReflectionCompletionStatusSchema.parse('CANCELLED')).toThrow();
    });
  });

  describe('Timing Breakdown & Calculator', () => {
    it('validates timing breakdown items', () => {
      const item = TimingBreakdownItemSchema.parse({
        id: 't_1',
        label: 'مقدمة وتمهيد',
        minutes: 15,
      });
      expect(item.label).toBe('مقدمة وتمهيد');
      expect(item.minutes).toBe(15);
    });

    it('rejects invalid or negative minutes', () => {
      expect(() =>
        TimingBreakdownItemSchema.parse({
          id: 't_2',
          label: 'شرح',
          minutes: 0,
        })
      ).toThrow();

      expect(() =>
        TimingBreakdownItemSchema.parse({
          id: 't_3',
          label: 'شرح',
          minutes: -10,
        })
      ).toThrow();
    });

    it('calculates total planned duration deterministically', () => {
      const items = [
        { id: '1', label: 'مراجعة', minutes: 10 },
        { id: '2', label: 'شرح', minutes: 30 },
        { id: '3', label: 'تمارين', minutes: 20 },
      ];
      expect(calculatePlannedDuration(items)).toBe(60);
    });

    it('validates timing matching target duration (EXACT)', () => {
      const items = [
        { id: '1', label: 'مراجعة', minutes: 20 },
        { id: '2', label: 'شرح', minutes: 40 },
      ];
      const result = validateLessonPlanTiming(60, items);
      expect(result.status).toBe('EXACT');
      expect(result.diffMinutes).toBe(0);
      expect(result.plannedMinutes).toBe(60);
      expect(result.statusAr).toContain('مطابق تماماً');
    });

    it('validates timing under target duration (UNDER)', () => {
      const items = [{ id: '1', label: 'شرح', minutes: 45 }];
      const result = validateLessonPlanTiming(60, items);
      expect(result.status).toBe('UNDER');
      expect(result.diffMinutes).toBe(-15);
      expect(result.plannedMinutes).toBe(45);
      expect(result.statusAr).toContain('أقل من المستهدف بـ 15 دقيقة');
    });

    it('validates timing exceeding target duration (OVER)', () => {
      const items = [
        { id: '1', label: 'شرح', minutes: 50 },
        { id: '2', label: 'تمارين', minutes: 25 },
      ];
      const result = validateLessonPlanTiming(60, items);
      expect(result.status).toBe('OVER');
      expect(result.diffMinutes).toBe(15);
      expect(result.plannedMinutes).toBe(75);
      expect(result.statusAr).toContain('زائد عن المستهدف بـ 15 دقيقة');
    });
  });

  describe('LessonPlanSections & MathRichContent Integration', () => {
    it('creates and validates empty default lesson plan sections', () => {
      const sections = createEmptyLessonPlanSections();
      const parsed = LessonPlanSectionsSchema.parse(sections);
      expect(parsed.timingBreakdown.length).toBe(4);
      expect(calculatePlannedDuration(parsed.timingBreakdown)).toBe(60);
      expect(parsed.explanation.blocks).toEqual([]);
    });

    it('validates rich math sections with real MathRichContent blocks', () => {
      const sections = {
        objectives: ['فهم قاعدة السلسلة', 'تطبيق المشتقة على الدوال الدائرية'],
        priorReview: createEmptyMathRichContent(),
        explanation: {
          version: 1 as const,
          blocks: [
            createTextBlock('قاعدة تفاضل دالة الدالة (قاعدة السلسلة):'),
            createMathBlock('\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}'),
          ],
        },
        examples: {
          version: 1 as const,
          blocks: [
            createTextBlock('مثال: إذا كانت:'),
            createMathBlock('y = u^3, \\quad u = 2x + 1'),
          ],
        },
        inClassQuestions: createEmptyMathRichContent(),
        commonMistakes: createEmptyMathRichContent(),
        homework: createEmptyMathRichContent(),
        timingBreakdown: [
          { id: '1', label: 'مراجعة', minutes: 10 },
          { id: '2', label: 'شرح', minutes: 35 },
          { id: '3', label: 'حل أمثلة', minutes: 15 },
        ],
        notes: 'التركيز على الطلاب الضعاف في الأسس',
      };

      const parsed = LessonPlanSectionsSchema.parse(sections);
      expect(parsed.objectives).toHaveLength(2);
      expect(parsed.explanation.blocks).toHaveLength(2);
      expect(parsed.examples.blocks).toHaveLength(2);
      expect(parsed.notes).toBe('التركيز على الطلاب الضعاف في الأسس');
    });

    it('rejects oversized objectives', () => {
      const tooManyObjectives = Array.from({ length: 35 }, (_, i) => `هدف رقم ${i}`);
      expect(() =>
        LessonPlanSectionsSchema.parse({
          ...createEmptyLessonPlanSections(),
          objectives: tooManyObjectives,
        })
      ).toThrow();
    });
  });

  describe('LessonPlanDto & Mutation Schemas', () => {
    const validPlan = {
      id: 'a8b1c2d3-e4f5-4a6b-8c7d-9e0f1a2b3c4d',
      curriculumNodeId: 'node_calc_01',
      title: 'خطة درس التفاضل والتكامل: قاعدة السلسلة',
      targetDurationMinutes: 60,
      status: 'READY' as const,
      version: 1,
      sections: createEmptyLessonPlanSections(),
      createdAt: '2026-09-20T10:00:00.000Z',
      updatedAt: '2026-09-20T10:00:00.000Z',
    };

    it('validates a complete LessonPlanDto', () => {
      const parsed = LessonPlanDtoSchema.parse(validPlan);
      expect(parsed.id).toBe(validPlan.id);
      expect(parsed.curriculumNodeId).toBe('node_calc_01');
      expect(parsed.status).toBe('READY');
      expect(parsed.version).toBe(1);
    });

    it('validates CreateLessonPlanSchema', () => {
      const input = {
        curriculumNodeId: 'node_calc_01',
        title: 'خطة درس مساحة المثلث',
        targetDurationMinutes: 90,
        sections: createEmptyLessonPlanSections(),
      };
      const parsed = CreateLessonPlanSchema.parse(input);
      expect(parsed.status).toBe('DRAFT'); // Default
      expect(parsed.targetDurationMinutes).toBe(90);
    });

    it('validates UpdateLessonPlanSchema', () => {
      const update = {
        title: 'عنوان معدل',
        status: 'READY' as const,
        targetDurationMinutes: 75,
      };
      const parsed = UpdateLessonPlanSchema.parse(update);
      expect(parsed.title).toBe('عنوان معدل');
      expect(parsed.targetDurationMinutes).toBe(75);
    });
  });

  describe('SessionReflectionDto & Immutable Snapshot Preservation', () => {
    const validSnapshot = {
      planId: 'a8b1c2d3-e4f5-4a6b-8c7d-9e0f1a2b3c4d',
      curriculumNodeId: 'node_calc_01',
      title: 'خطة درس التفاضل والتكامل',
      targetDurationMinutes: 60,
      version: 2,
      sections: createEmptyLessonPlanSections(),
      snapshottedAt: '2026-09-20T12:00:00.000Z',
    };

    it('validates LessonPlanSnapshotDtoSchema', () => {
      const parsed = LessonPlanSnapshotDtoSchema.parse(validSnapshot);
      expect(parsed.planId).toBe(validSnapshot.planId);
      expect(parsed.version).toBe(2);
      expect(parsed.snapshottedAt).toBe(validSnapshot.snapshottedAt);
    });

    it('validates SessionReflectionDto with snapshot and status', () => {
      const reflection = {
        id: 'f1e2d3c4-b5a6-4f7e-8d9c-0b1a2f3e4d5c',
        sessionId: 'sess_group_a_001',
        lessonPlanId: 'a8b1c2d3-e4f5-4a6b-8c7d-9e0f1a2b3c4d',
        lessonPlanSnapshot: validSnapshot,
        completionStatus: 'PARTIALLY_COMPLETED' as const,
        uncompletedItems: 'لم يتم حل تمرين 4 و 5 من كراسة التمارين',
        topicsNeedingReview: 'إعادة مراجعة تفاضل الدوال المثلثية في أول 10 دقائق من الحصة القادمة',
        quickNotes: 'تفاعل ممتاز من المجموعة مع أمثلة التفاضل الضمني',
        createdAt: '2026-09-20T12:30:00.000Z',
        updatedAt: '2026-09-20T12:30:00.000Z',
      };

      const parsed = SessionReflectionDtoSchema.parse(reflection);
      expect(parsed.completionStatus).toBe('PARTIALLY_COMPLETED');
      expect(parsed.lessonPlanSnapshot?.version).toBe(2);
      expect(parsed.uncompletedItems).toContain('تمرين 4');
    });

    it('validates CreateSessionReflectionSchema without plan (standalone reflection)', () => {
      const input = {
        sessionId: 'sess_group_b_002',
        completionStatus: 'COMPLETED' as const,
        quickNotes: 'حصة مراجعة شاملة قبل الامتحان الشهري',
      };
      const parsed = CreateSessionReflectionSchema.parse(input);
      expect(parsed.sessionId).toBe('sess_group_b_002');
      expect(parsed.completionStatus).toBe('COMPLETED');
      expect(parsed.lessonPlanId).toBeUndefined();
    });

    it('validates UpdateSessionReflectionSchema', () => {
      const update = {
        completionStatus: 'POSTPONED' as const,
        uncompletedItems: 'تم تأجيل شرح الدرس لتعويض إجازة رسمية',
      };
      const parsed = UpdateSessionReflectionSchema.parse(update);
      expect(parsed.completionStatus).toBe('POSTPONED');
      expect(parsed.uncompletedItems).toContain('إجازة رسمية');
    });
  });
});
