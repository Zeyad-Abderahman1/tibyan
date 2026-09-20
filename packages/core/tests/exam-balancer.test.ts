import { describe, expect, it } from 'vitest';
import { validateExamBlueprint, selectBalancedQuestions } from '../src/index.js';
import type { ExamBlueprint } from '@tibyan/contracts';

const blueprint: ExamBlueprint = {
  title: 'اختبار', gradeLevel: 'SEC_3', languageTrack: 'ARABIC', curriculumNodeIds: ['123e4567-e89b-12d3-a456-426614174000'], sourceReferenceIds: [],
  totalQuestions: 2, totalMarks: 4, durationMinutes: 30,
  difficultyDistribution: { EASY: 1, MEDIUM: 1, HARD: 0, ADVANCED: 0 },
  questionTypeDistribution: { MULTIPLE_CHOICE: 1, SHORT_ANSWER: 1 }, variantCount: 1,
};

describe('deterministic exam blueprint validation', () => {
  it('reports an actionable conflict when available marks cannot satisfy the blueprint', () => {
    const result = validateExamBlueprint(blueprint, [
      { id: 'a', questionType: 'MULTIPLE_CHOICE', difficulty: 'EASY', defaultMarks: 1, curriculumTags: blueprint.curriculumNodeIds, sourceReferenceIds: [] },
      { id: 'b', questionType: 'SHORT_ANSWER', difficulty: 'MEDIUM', defaultMarks: 1, curriculumTags: blueprint.curriculumNodeIds, sourceReferenceIds: [] },
    ]);
    expect(result.valid).toBe(false);
    expect(result.conflicts).toContain('إجمالي درجات الأسئلة المتاحة لا يحقق الدرجة الكلية المطلوبة');
  });

  it('deterministically selects balanced questions according to blueprint', () => {
    const candidates = [
      { id: 'q1', questionType: 'MULTIPLE_CHOICE' as const, difficulty: 'EASY' as const, defaultMarks: 2, curriculumTags: blueprint.curriculumNodeIds, sourceReferenceIds: [] },
      { id: 'q2', questionType: 'SHORT_ANSWER' as const, difficulty: 'MEDIUM' as const, defaultMarks: 2, curriculumTags: blueprint.curriculumNodeIds, sourceReferenceIds: [] },
      { id: 'q3', questionType: 'MULTIPLE_CHOICE' as const, difficulty: 'HARD' as const, defaultMarks: 2, curriculumTags: blueprint.curriculumNodeIds, sourceReferenceIds: [] },
    ];
    const { selected, conflicts } = selectBalancedQuestions(blueprint, candidates);
    expect(conflicts).toHaveLength(0);
    expect(selected).toHaveLength(2);
    expect(selected.map((s) => s.id)).toEqual(['q1', 'q2']);
  });
});

