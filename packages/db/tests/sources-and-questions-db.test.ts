import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import {
  SYSTEM_MIGRATIONS,
  SourceDocumentRepository,
  SourceReferenceRepository,
  QuestionRepository,
  CurriculumCatalogRepository,
  CurriculumNodeRepository,
} from '../src/index.js';

describe('Phase 3 Tasks 4-6 Database Repositories Suite', () => {
  let sqlite: Database.Database;
  let db: any;
  let sourceDocRepo: SourceDocumentRepository;
  let sourceRefRepo: SourceReferenceRepository;
  let questionRepo: QuestionRepository;
  let catalogRepo: CurriculumCatalogRepository;
  let nodeRepo: CurriculumNodeRepository;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    // Run system migrations
    for (const mig of SYSTEM_MIGRATIONS) {
      sqlite.exec(mig.sql);
    }
    db = drizzle(sqlite);
    sourceDocRepo = new SourceDocumentRepository(db);
    sourceRefRepo = new SourceReferenceRepository(db);
    questionRepo = new QuestionRepository(db);
    catalogRepo = new CurriculumCatalogRepository(db);
    nodeRepo = new CurriculumNodeRepository(db);
  });

  it('handles source document and page reference lifecycle', () => {
    const docId = crypto.randomUUID();
    const doc = sourceDocRepo.create({
      id: docId,
      title: 'كتاب المعاصر في التفاضل والتكامل',
      author: 'أحمد الشريف',
      publisher: 'دار المعارف',
      editionYear: '2026',
      filePath: 'sources/moasser-2026.pdf',
      fileName: 'moasser-2026.pdf',
      fileSizeBytes: 1048576,
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      pageCount: 120,
      status: 'INDEXED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(doc.id).toBe(docId);
    expect(doc.title).toContain('المعاصر');

    // Create page reference
    const refId = crypto.randomUUID();
    const ref = sourceRefRepo.create({
      id: refId,
      sourceDocumentId: docId,
      startPage: 40,
      endPage: 45,
      referenceLabel: 'تمارين 2-1 صـ 40 إلى 45',
      notes: 'مسائل هامة على قاعدة السلسلة',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(ref.id).toBe(refId);
    expect(ref.startPage).toBe(40);
    expect(ref.endPage).toBe(45);

    const refs = sourceRefRepo.listBySourceDocument(docId);
    expect(refs).toHaveLength(1);
    expect(refs[0]!.referenceLabel).toBe('تمارين 2-1 صـ 40 إلى 45');
  });

  it('handles question bank creation, curriculum tagging, and multi-source linking', () => {
    // 1. Create catalog & node
    const catalogId = crypto.randomUUID();
    catalogRepo.create({
      id: catalogId,
      code: 'SEC3-MATH',
      title: 'منهج الرياضيات للثانوية العامة',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_3',
      languageTrack: 'ARABIC',
      status: 'PUBLISHED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const nodeId = crypto.randomUUID();
    nodeRepo.create({
      id: nodeId,
      catalogId,
      tier: 'SKILL',
      titleAr: 'اشتقاق الدوال المثلثية',
      code: 'SKILL-01',
      orderIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Create source doc & 2 references
    const docId = crypto.randomUUID();
    sourceDocRepo.create({
      id: docId,
      title: 'كتاب الوزارة 2026',
      filePath: 'sources/ministry.pdf',
      fileName: 'ministry.pdf',
      fileSizeBytes: 500000,
      sha256Hash: '1'.repeat(64),
      pageCount: 80,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const ref1Id = crypto.randomUUID();
    sourceRefRepo.create({
      id: ref1Id,
      sourceDocumentId: docId,
      startPage: 12,
      endPage: 12,
      referenceLabel: 'سؤال 4 صـ 12',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const ref2Id = crypto.randomUUID();
    sourceRefRepo.create({
      id: ref2Id,
      sourceDocumentId: docId,
      startPage: 55,
      endPage: 56,
      referenceLabel: 'امتحان تجريبي صـ 55',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Create question
    const qId = crypto.randomUUID();
    const code = questionRepo.getNextCode();
    expect(code).toBe('Q-000001');

    const createdQ = questionRepo.create(
      {
        id: qId,
        code,
        bodyJson: JSON.stringify({
          version: 1,
          blocks: [{ id: '1', type: 'text', content: 'ما هي مشتقة ظا(س)؟' }],
        }),
        questionType: 'MULTIPLE_CHOICE',
        difficulty: 'MEDIUM',
        defaultMarks: 1,
        languageTrack: 'ARABIC',
        status: 'ACTIVE',
        contentFingerprint: 'fingerprint-tan-x',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      [nodeId],
      [ref1Id]
    );

    expect(createdQ.id).toBe(qId);
    expect(createdQ.code).toBe('Q-000001');

    // 4. Verify tags and source refs
    const tags = questionRepo.getCurriculumTagIds(qId);
    expect(tags).toEqual([nodeId]);

    const sourceRefs = questionRepo.getSourceReferences(qId);
    expect(sourceRefs).toHaveLength(1);
    expect(sourceRefs[0]!.sourceReferenceId).toBe(ref1Id);
    expect(sourceRefs[0]!.sourceDocumentTitle).toBe('كتاب الوزارة 2026');

    // 5. Multi-Source Linking (Task 6): Link second source reference
    questionRepo.addSourceReference(qId, ref2Id, 'تكرر في الامتحان التجريبي');
    const updatedSourceRefs = questionRepo.getSourceReferences(qId);
    expect(updatedSourceRefs).toHaveLength(2);

    // 6. Duplicate detection query by fingerprint
    const dups = questionRepo.findByFingerprint('fingerprint-tan-x');
    expect(dups).toHaveLength(1);
    expect(dups[0]!.id).toBe(qId);

    // 7. Next code generation increments
    expect(questionRepo.getNextCode()).toBe('Q-000002');
  });
});
