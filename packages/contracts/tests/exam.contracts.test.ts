import { describe, expect, it } from 'vitest';
import { AiExamCandidateSchema, ExamBlueprintSchema, ExamStatusSchema } from '../src/index.js';

const id = '123e4567-e89b-12d3-a456-426614174000';

describe('exam contracts', () => {
  it('accepts a balanced teacher blueprint with explicit source scope', () => {
    const blueprint = ExamBlueprintSchema.parse({
      title: 'اختبار التفاضل الشهري',
      gradeLevel: 'SEC_3',
      languageTrack: 'ARABIC',
      curriculumNodeIds: [id],
      sourceReferenceIds: ['123e4567-e89b-12d3-a456-426614174001'],
      totalQuestions: 4,
      totalMarks: 10,
      durationMinutes: 45,
      difficultyDistribution: { EASY: 1, MEDIUM: 2, HARD: 1, ADVANCED: 0 },
      questionTypeDistribution: { MULTIPLE_CHOICE: 2, SHORT_ANSWER: 2 },
      variantCount: 2,
    });

    expect(blueprint.variantCount).toBe(2);
    expect(ExamStatusSchema.parse('CONFIRMED')).toBe('CONFIRMED');
  });

  it('rejects an over-specified difficulty distribution before assembly', () => {
    expect(() => ExamBlueprintSchema.parse({
      title: 'اختبار', gradeLevel: 'SEC_3', languageTrack: 'ARABIC', curriculumNodeIds: [id],
      totalQuestions: 2, totalMarks: 4, durationMinutes: 30,
      difficultyDistribution: { EASY: 2, MEDIUM: 1, HARD: 0, ADVANCED: 0 },
      questionTypeDistribution: { MULTIPLE_CHOICE: 2 }, variantCount: 1,
    })).toThrow('يجب أن يساوي مجموع توزيع الصعوبة عدد الأسئلة');
  });

  it('accepts only ID-free AI proposals with canonical MathRichContent', () => {
    const candidate = AiExamCandidateSchema.parse({
      body: { version: 1, blocks: [{ id: 'text-1', type: 'text', content: 'أوجد قيمة س', direction: 'rtl' }] },
      modelAnswer: null,
      questionType: 'SHORT_ANSWER', difficulty: 'MEDIUM', marks: 2,
    });
    expect(candidate.questionType).toBe('SHORT_ANSWER');
    expect(() => AiExamCandidateSchema.parse({ ...candidate, questionId: id })).toThrow();
  });
});
