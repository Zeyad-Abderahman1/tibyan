import { describe, expect, it } from 'vitest';
import { ExamGenerationRequestSchema, ExamGenerationResultSchema, SlidesGenerationResultSchema, ReviewGenerationResultSchema, NotesGenerationResultSchema } from '../src/index.js';

describe('AI generation contracts', () => {
  it('rejects unknown request configuration', () => {
    expect(ExamGenerationRequestSchema.safeParse({ sourceId: '00000000-0000-4000-8000-000000000000', config: { command: 'delete-all' } }).success).toBe(false);
  });
  it('requires complete exam questions and four matching MCQ options', () => {
    expect(ExamGenerationResultSchema.safeParse({ questions: [{ body: 'Q', type: 'MULTIPLE_CHOICE', correctAnswer: 'A', marks: 1, sourcePage: 1 }] }).success).toBe(false);
  });
  it('requires source pages and rejects extra provider fields for every tool', () => {
    for (const [schema, key, item] of [
      [ExamGenerationResultSchema, 'questions', { body: 'Q', type: 'SHORT_ANSWER', correctAnswer: 'A', marks: 1 }],
      [SlidesGenerationResultSchema, 'slides', { title: 'S', content: 'C' }],
      [ReviewGenerationResultSchema, 'sections', { title: 'R', content: 'C', type: 'content' }],
      [NotesGenerationResultSchema, 'sections', { title: 'N', content: 'C', type: 'content' }],
    ] as const) {
      expect(schema.safeParse({ [key]: [item] }).success).toBe(false);
      expect(schema.safeParse({ [key]: [{ ...item, sourcePage: 1, injected: true }] }).success).toBe(false);
    }
  });
});
