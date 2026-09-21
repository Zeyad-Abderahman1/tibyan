import { describe, expect, it } from 'vitest';
import { buildExamVariants } from '../src/exams/exam-variants.js';

describe('deterministic exam variants', () => {
  it('creates equivalent A/B/C forms without dropping or duplicating placements', () => {
    const variants = buildExamVariants([
      { id: 'p1', marks: 2, answer: 'x=1' },
      { id: 'p2', marks: 3, answer: 'x=2' },
      { id: 'p3', marks: 1, answer: 'x=3' },
    ], 3);
    expect(variants.map((variant) => variant.label)).toEqual(['A', 'B', 'C']);
    for (const variant of variants) {
      expect([...variant.placementIds].sort()).toEqual(['p1', 'p2', 'p3']);
      expect(variant.totalMarks).toBe(6);
      expect(variant.answerKey.map((entry) => entry.placementId).sort()).toEqual(['p1', 'p2', 'p3']);
    }
    expect(variants[0]?.placementIds).not.toEqual(variants[1]?.placementIds);
  });
});
