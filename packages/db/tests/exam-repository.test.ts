import { afterEach, describe, expect, it } from 'vitest';
import { closeAcademicDatabase, ExamRepository, openAcademicDatabase } from '../src/index.js';

describe('ExamRepository', () => {
  afterEach(() => closeAcademicDatabase());

  it('persists immutable placement snapshots and deterministic A/B versions in the Academic DB', () => {
    const connection = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const repo = new ExamRepository(connection.db);
    repo.create({
      exam: { id: 'exam-1', title: 'اختبار تجريبي', blueprintJson: '{}', layoutJson: '{}', status: 'DRAFT', createdAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-20T00:00:00.000Z' },
      sections: [{ id: 'section-1', examId: 'exam-1', title: 'القسم الأول', instructionsJson: '[]', position: 0, createdAt: '2026-09-20T00:00:00.000Z' }],
      questions: [{ id: 'placement-1', examSectionId: 'section-1', questionIdSnapshot: 'question-system-id', provenance: 'QUESTION_BANK', contentJson: '{"version":1,"blocks":[]}', answerJson: null, curriculumNodeIdsJson: '["node-id"]', sourceReferenceIdsJson: '[]', marks: 2, answerSpaceLines: 1, position: 0, createdAt: '2026-09-20T00:00:00.000Z' }],
      versions: [{ id: 'version-a', examId: 'exam-1', label: 'A', questionOrderJson: '["placement-1"]', answerKeyJson: '[{"placementId":"placement-1"}]', createdAt: '2026-09-20T00:00:00.000Z' }],
    });
    const snapshot = repo.findSnapshot('exam-1');
    expect(snapshot?.questions[0]?.questionIdSnapshot).toBe('question-system-id');
    expect(snapshot?.versions[0]?.label).toBe('A');
  });
});
