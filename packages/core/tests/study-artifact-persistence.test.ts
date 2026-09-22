import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { closeAcademicDatabase, openAcademicDatabase } from '@tibyan/db';
import { ReviewService } from '../src/review/review.service.js';
import { NotesService } from '../src/notes/notes.service.js';

const sourceDocumentId = '00000000-0000-4000-8000-000000000001';

describe('study artifact persistence', () => {
  const directory = mkdtempSync(join(tmpdir(), 'tibyan-study-artifacts-'));
  const filePath = join(directory, 'academic.sqlite');
  afterEach(() => closeAcademicDatabase());

  it('returns review content immediately and reopens review and notes after restart', () => {
    const first = openAcademicDatabase('2026-2027', { filePath });
    const review = new ReviewService(first.db).createGenerated(
      { sourceDocumentId, title: 'مراجعة القوى', reviewType: 'QUESTIONS', detailLevel: 'MODERATE', questionCount: 1, includeModelAnswers: true },
      { sections: [{ title: 'سؤال القوة', content: 'احسب القوة', type: 'question', sourcePage: 2, modelAnswer: 'F=ma' }] },
    );
    const notes = new NotesService(first.db).createGenerated(
      { sourceDocumentId, title: 'مذكرة القوى', gradeLevel: 'SEC_2', detailStyle: 'EXPLAIN_EXAMPLES_PRACTICE', includeExercises: true, includeModelSolutions: true },
      { sections: [{ title: 'القوة', content: 'القوة تساوي الكتلة في التسارع', type: 'content', sourcePage: 2 }] },
    );
    expect(review.content.sections[0]?.sourcePage).toBe(2);
    expect(notes.content.sections[0]?.sourcePage).toBe(2);
    new ReviewService(first.db).saveContent(review.id, { sections: [{ title: 'سؤال معدل', content: 'احسب القوة الجديدة', type: 'question', sourcePage: 2, modelAnswer: 'F=ma' }] });
    new NotesService(first.db).saveContent(notes.id, { sections: [{ title: 'قوة معدلة', content: 'القوة تساوي الكتلة في التسارع', type: 'content', sourcePage: 2 }] });
    closeAcademicDatabase();
    const second = openAcademicDatabase('2026-2027', { filePath });
    expect(new ReviewService(second.db).get(review.id)?.content.sections[0]?.title).toBe('سؤال معدل');
    expect(new NotesService(second.db).get(notes.id)?.content.sections[0]?.title).toBe('قوة معدلة');
    closeAcademicDatabase();
    if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe cleanup path');
    rmSync(directory, { recursive: true, force: true });
  });
});
