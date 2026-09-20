import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  openSystemDatabase,
  closeAllDatabases,
  CurriculumCatalogRepository,
  CurriculumNodeRepository,
  type SystemDrizzle,
} from '@tibyan/db';
import {
  PdfScanner,
  PdfSourceService,
  QuestionBankService,
  DuplicateDetectionService,
  type AuthActor,
} from '../src/index.js';
import type { MathRichContent, BulkQuestionItemDto } from '@tibyan/contracts';

describe('Phase 3 Tasks 4-6 Core Services Suite', () => {
  let tempDir: string;
  let db: SystemDrizzle;
  let pdfService: PdfSourceService;
  let questionService: QuestionBankService;
  let catalogRepo: CurriculumCatalogRepository;
  let nodeRepo: CurriculumNodeRepository;

  const ownerActor: AuthActor = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    username: 'owner',
    fullName: 'مالك المنظومة',
    role: 'OWNER',
    permissions: [],
  };

  const samplePdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Pages /Count 15 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
  );

  beforeEach(() => {
    closeAllDatabases();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-sources-test-'));
    const sysConn = openSystemDatabase({ filePath: ':memory:', autoMigrate: true });
    db = sysConn.db;
    catalogRepo = new CurriculumCatalogRepository(db);
    nodeRepo = new CurriculumNodeRepository(db);

    const storageDir = path.join(tempDir, 'sources');
    pdfService = new PdfSourceService(db, storageDir);
    questionService = new QuestionBankService(db);
  });

  afterEach(() => {
    closeAllDatabases();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Task 4: PdfScanner & PdfSourceService', () => {
    it('scans PDF buffer and extracts page count correctly', () => {
      const scanned = PdfScanner.scanBuffer(samplePdfBuffer, 'test.pdf');
      expect(scanned.pageCount).toBe(15);
      expect(scanned.sha256Hash).toHaveLength(64);
      expect(scanned.fileName).toBe('test.pdf');
    });

    it('rejects invalid non-PDF buffer', () => {
      const badBuffer = Buffer.from('NOT A PDF FILE');
      expect(() => PdfScanner.scanBuffer(badBuffer, 'bad.pdf')).toThrow('ليس ملف PDF صالح');
    });

    it('rejects directory traversal in assertWithinBase', () => {
      const base = path.join(tempDir, 'sandbox');
      const malicious = path.join(base, '..', 'escape.txt');
      expect(() => PdfScanner.assertWithinBase(malicious, base)).toThrow('Directory Traversal Detected');
    });

    it('imports PDF source document and manages page references', () => {
      const sourceFile = path.join(tempDir, 'sample-book.pdf');
      fs.writeFileSync(sourceFile, samplePdfBuffer);

      const imported = pdfService.importSource(
        {
          sourceFilePath: sourceFile,
          title: 'كتاب المعاصر في الرياضيات 2026',
          author: 'الأستاذ أحمد',
        },
        ownerActor
      );

      expect(imported.title).toBe('كتاب المعاصر في الرياضيات 2026');
      expect(imported.pageCount).toBe(15);

      // Re-importing identical PDF returns existing record
      const reimported = pdfService.importSource(
        {
          sourceFilePath: sourceFile,
          title: 'نسخة أخرى',
        },
        ownerActor
      );
      expect(reimported.id).toBe(imported.id);

      // Create page reference
      const ref = pdfService.createReference(
        {
          sourceDocumentId: imported.id,
          startPage: 3,
          endPage: 5,
          referenceLabel: 'مسائل الدرس الأول صـ 3-5',
        },
        ownerActor
      );
      expect(ref.referenceLabel).toBe('مسائل الدرس الأول صـ 3-5');

      // Rejects out of bound page range
      expect(() =>
        pdfService.createReference(
          {
            sourceDocumentId: imported.id,
            startPage: 10,
            endPage: 20, // exceeds 15
            referenceLabel: 'خارج النطاق',
          },
          ownerActor
        )
      ).toThrow('يتجاوز إجمالي صفحات المصدر');
    });
  });

  describe('Task 5: QuestionBankService & Curriculum Tagging', () => {
    it('creates question with MathRichContent and validates curriculum references', () => {
      // Create catalog and skill node
      const catalogId = crypto.randomUUID();
      catalogRepo.create({
        id: catalogId,
        code: 'SEC3-MATH',
        title: 'ثانوية عامة رياضيات',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_3',
        languageTrack: 'ARABIC',
        status: 'PUBLISHED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const skillId = crypto.randomUUID();
      nodeRepo.create({
        id: skillId,
        catalogId,
        tier: 'SKILL',
        titleAr: 'تفاضل الدوال الأسية',
        code: 'SKILL-01',
        orderIndex: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const q = questionService.createQuestion(
        {
          body: {
            version: 1,
            blocks: [
              { id: '1', type: 'text', content: 'أوجد مشتقة الدالة التالية:', direction: 'auto' },
              { id: '2', type: 'math', latex: 'y = e^{3x}', displayMode: 'block' },
            ],
          } as MathRichContent,
          questionType: 'MULTIPLE_CHOICE',
          difficulty: 'MEDIUM',
          defaultMarks: 1,
          curriculumNodeIds: [skillId],
        },
        ownerActor
      );

      expect(q.code).toBe('Q-000001');
      expect(q.curriculumTags).toContain(skillId);
      expect(q.body.blocks).toHaveLength(2);

      // Rejects question referencing nonexistent node
      expect(() =>
        questionService.createQuestion(
          {
            body: { version: 1, blocks: [{ id: '1', type: 'text', content: 'سؤال', direction: 'auto' }] } as MathRichContent,
            curriculumNodeIds: [crypto.randomUUID()],
          },
          ownerActor
        )
      ).toThrow('عنصر المنهج المحدد غير موجود');
    });
  });

  describe('Task 6: DuplicateDetectionService & Bulk Ingestion Review', () => {
    it('normalizes text and strips Arabic diacritics', () => {
      const raw1 = 'أَوْجِدْ   مُشْتَقَّةَ   الدَّالَّةِ!';
      const raw2 = 'اوجد مشتقه الداله';
      expect(DuplicateDetectionService.normalizeText(raw1)).toBe(
        DuplicateDetectionService.normalizeText(raw2)
      );
    });

    it('detects exact duplicate by fingerprint and candidate duplicate by high similarity', () => {
      // 1. Create skill node
      const catalogId = crypto.randomUUID();
      catalogRepo.create({
        id: catalogId,
        code: 'CAT-1',
        title: 'منهج',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_3',
        languageTrack: 'ARABIC',
        status: 'PUBLISHED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const skillId = crypto.randomUUID();
      nodeRepo.create({
        id: skillId,
        catalogId,
        tier: 'SKILL',
        titleAr: 'التكامل المحدد',
        code: 'SKILL-INT',
        orderIndex: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const body1: MathRichContent = {
        version: 1,
        blocks: [
          { id: '1', type: 'text' as const, content: 'احسب قيمة التكامل التالي:', direction: 'auto' },
          { id: '2', type: 'math' as const, latex: '\\int_0^1 x^2 dx', displayMode: 'block' as const },
        ],
      };

      const q1 = questionService.createQuestion(
        {
          body: body1,
          questionType: 'SHORT_ANSWER',
          curriculumNodeIds: [skillId],
        },
        ownerActor
      );

      // Check exact duplicate
      const exactCheck = questionService.checkDuplicate(body1, [skillId]);
      expect(exactCheck.isDuplicate).toBe(true);
      expect(exactCheck.matchLevel).toBe('EXACT');
      expect(exactCheck.existingQuestionId).toBe(q1.id);

      // Check different question has no duplicate
      const differentBody: MathRichContent = {
        version: 1,
        blocks: [{ id: '1', type: 'text' as const, content: 'ما هي نهايات الدوال المثلثية عند الصفر؟', direction: 'auto' }],
      };
      const diffCheck = questionService.checkDuplicate(differentBody, [skillId]);
      expect(diffCheck.isDuplicate).toBe(false);
      expect(diffCheck.matchLevel).toBe('NONE');
    });

    it('previews and commits bulk ingestion with duplicate detection and source linking', () => {
      // Create skill node
      const catalogId = crypto.randomUUID();
      catalogRepo.create({
        id: catalogId,
        code: 'CAT-BULK',
        title: 'منهج',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_3',
        languageTrack: 'ARABIC',
        status: 'PUBLISHED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const skillId = crypto.randomUUID();
      nodeRepo.create({
        id: skillId,
        catalogId,
        tier: 'SKILL',
        titleAr: 'قاعدة السلسلة',
        code: 'SKILL-CHAIN',
        orderIndex: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const bulkItems: BulkQuestionItemDto[] = [
        {
          tempId: 'b-1',
          body: {
            version: 1,
            blocks: [{ id: '1', type: 'text' as const, content: 'إذا كانت ص = ع^2 وَ ع = س + 1 أوجد دص/دس', direction: 'auto' }],
          },
          questionType: 'SHORT_ANSWER' as const,
          difficulty: 'MEDIUM' as const,
          defaultMarks: 2,
          languageTrack: 'ARABIC' as const,
          curriculumNodeIds: [skillId],
          sourceReferenceIds: [],
        },
        {
          tempId: 'b-2', // identical to b-1 in same batch
          body: {
            version: 1,
            blocks: [{ id: '1', type: 'text' as const, content: 'إذا كانت ص = ع^2 وَ ع = س + 1 أوجد دص/دس', direction: 'auto' }],
          },
          questionType: 'SHORT_ANSWER' as const,
          difficulty: 'MEDIUM' as const,
          defaultMarks: 2,
          languageTrack: 'ARABIC' as const,
          curriculumNodeIds: [skillId],
          sourceReferenceIds: [],
        },
      ];

      const preview = questionService.previewBulk(bulkItems);
      expect(preview).toHaveLength(2);
      expect(preview[0]!.status).toBe('WARNING'); // missing source reference warning
      expect(preview[1]!.status).toBe('WARNING'); // duplicate in same batch warning

      // Commit 1 question
      const commitRes = questionService.commitBulk(
        {
          actions: [
            {
              tempId: 'b-1',
              action: 'CREATE_NEW',
              item: bulkItems[0]!,
            },
            {
              tempId: 'b-2',
              action: 'DISMISS',
              item: bulkItems[1]!,
            },
          ],
        },
        ownerActor
      );

      expect(commitRes.createdCount).toBe(1);
      expect(commitRes.dismissedCount).toBe(1);

      const allQ = questionService.listQuestions();
      expect(allQ).toHaveLength(1);
      expect(allQ[0]!.code).toBe('Q-000001');
    });
  });
});
