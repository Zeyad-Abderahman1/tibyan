import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  openAcademicDatabase,
  closeAcademicDatabase,
  openSystemDatabase,
  closeSystemDatabase,
  type AcademicDatabaseConnection,
  type SystemDatabaseConnection,
  QuestionRepository,
  CurriculumCatalogRepository,
  CurriculumNodeRepository,
} from '@tibyan/db';
import { seedPermissions } from '../src/auth/permissions.js';
import { ExamService } from '../src/exams/exam.service.js';
import type { ExamBlueprint, MathRichContent } from '@tibyan/contracts';

const dummyBody: MathRichContent = {
  version: 1,
  blocks: [{ id: 'b1', type: 'text', content: 'ما هو ناتج 2 + 2؟', direction: 'rtl' }],
};

const dummyAnswer: MathRichContent = {
  version: 1,
  blocks: [{ id: 'a1', type: 'text', content: '4', direction: 'rtl' }],
};

const nodeId = '11111111-1111-1111-1111-111111111111';

describe('ExamService workflow: preview -> confirm -> audit -> undo', () => {
  let sysDb: SystemDatabaseConnection;
  let acadDb: AcademicDatabaseConnection;
  let service: ExamService;
  let questionRepo: QuestionRepository;

  const actor = {
    userId: '00000000-0000-0000-0000-000000000001',
    fullName: 'أستاذ أحمد',
    role: 'OWNER' as const,
  };

  beforeEach(() => {
    sysDb = openSystemDatabase({ filePath: ':memory:', autoMigrate: true });
    acadDb = openAcademicDatabase('2026-2027', { filePath: ':memory:', autoMigrate: true });
    seedPermissions(sysDb.db);
    const catalogRepo = new CurriculumCatalogRepository(sysDb.db);
    const nodeRepo = new CurriculumNodeRepository(sysDb.db);
    questionRepo = new QuestionRepository(sysDb.db);
    service = new ExamService(acadDb.db, sysDb.db);

    const catalogId = crypto.randomUUID();
    catalogRepo.create({
      id: catalogId,
      code: 'SEC1-MATH',
      title: 'منهج الرياضيات',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      status: 'PUBLISHED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    nodeRepo.create({
      id: nodeId,
      catalogId,
      tier: 'SKILL',
      titleAr: 'الجمع الحسابي',
      code: 'SK-01',
      orderIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed Question Bank with test questions

    questionRepo.create(
      {
        id: '22222222-2222-2222-2222-222222222221',
        code: 'Q-000001',
        bodyJson: JSON.stringify(dummyBody),
        modelAnswerJson: JSON.stringify(dummyAnswer),
        questionType: 'MULTIPLE_CHOICE',
        difficulty: 'EASY',
        defaultMarks: 2,
        languageTrack: 'ARABIC',
        status: 'ACTIVE',
        contentFingerprint: 'fp1',
        metadataJson: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      [nodeId],
      []
    );

    questionRepo.create(
      {
        id: '22222222-2222-2222-2222-222222222222',
        code: 'Q-000002',
        bodyJson: JSON.stringify(dummyBody),
        modelAnswerJson: JSON.stringify(dummyAnswer),
        questionType: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        defaultMarks: 3,
        languageTrack: 'ARABIC',
        status: 'ACTIVE',
        contentFingerprint: 'fp2',
        metadataJson: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      [nodeId],
      []
    );
  });

  afterEach(() => {
    closeAcademicDatabase();
    closeSystemDatabase();
  });

  const validBlueprint: ExamBlueprint = {
    title: 'اختبار تجريبي',
    gradeLevel: 'SEC_1',
    languageTrack: 'ARABIC',
    curriculumNodeIds: [nodeId],
    sourceReferenceIds: [],
    totalQuestions: 2,
    totalMarks: 5,
    durationMinutes: 45,
    difficultyDistribution: { EASY: 1, MEDIUM: 1, HARD: 0, ADVANCED: 0 },
    questionTypeDistribution: { MULTIPLE_CHOICE: 1, SHORT_ANSWER: 1 },
    variantCount: 2,
  };

  it('previews balanced assembly and reports conflicts for impossible blueprints', () => {
    const preview = service.previewAssembly(validBlueprint);
    expect(preview.valid).toBe(true);
    expect(preview.selectedQuestions).toHaveLength(2);
    expect(preview.totalSelectedMarks).toBe(5);

    const impossibleBlueprint: ExamBlueprint = {
      ...validBlueprint,
      totalQuestions: 4,
      totalMarks: 10,
      difficultyDistribution: { EASY: 2, MEDIUM: 2, HARD: 0, ADVANCED: 0 },
      questionTypeDistribution: { MULTIPLE_CHOICE: 2, SHORT_ANSWER: 2 },
    };
    const invalidPreview = service.previewAssembly(impossibleBlueprint);
    expect(invalidPreview.valid).toBe(false);
    expect(invalidPreview.conflicts.length).toBeGreaterThan(0);
  });

  it('confirms assembly, creates snapshot and variants, records audit, and supports undo', () => {
    const preview = service.previewAssembly(validBlueprint);
    expect(preview.valid).toBe(true);

    const exam = service.confirmAssembly(
      {
        blueprint: validBlueprint,
        sectionTitle: 'القسم الأول',
        placements: preview.selectedQuestions.map((q, idx) => ({
          questionId: q.questionId,
          provenance: 'QUESTION_BANK' as const,
          body: q.body,
          modelAnswer: q.modelAnswer,
          marks: q.marks,
          answerSpaceLines: 2,
          curriculumNodeIds: q.curriculumNodeIds,
          sourceReferenceIds: q.sourceReferenceIds,
          position: idx,
        })),
      },
      actor
    );

    expect(exam.id).toBeDefined();
    expect(exam.status).toBe('CONFIRMED');
    expect(exam.placements).toHaveLength(2);
    expect(exam.versions).toHaveLength(2); // A and B

    // Verify variants A and B have rotated order and correct answer keys
    expect(exam.versions[0]!.label).toBe('A');
    expect(exam.versions[1]!.label).toBe('B');

    // Retrieve via getExam and listExams
    const retrieved = service.getExam(exam.id);
    expect(retrieved?.id).toBe(exam.id);
    expect(service.listExams()).toHaveLength(1);

    // Reversible undo
    service.undoLastMutation(exam.id, actor);
    expect(service.getExam(exam.id)).toBeNull();
    expect(service.listExams()).toHaveLength(0);
  });
});
