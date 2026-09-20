import { describe, it, expect } from 'vitest';
import {
  SourceDocumentDtoSchema,
  CreateSourceReferenceSchema,
  CreateQuestionSchema,
  QuestionDtoSchema,
  DuplicateCheckResultSchema,
  BulkImportReviewItemSchema,
  CommitBulkImportInputSchema,
} from '../src/index.js';

describe('Phase 3 Tasks 4-6 Contracts Test Suite', () => {
  const dummyMathContent = {
    version: 1,
    blocks: [
      { id: 'b1', type: 'text' as const, content: 'أوجد مشتقة الدالة التالية:' },
      { id: 'b2', type: 'math' as const, latex: 'f(x) = x^2 + \\sin(x)', displayMode: 'block' as const },
    ],
  };

  describe('Task 4: Source Documents & Page References', () => {
    it('validates a valid SourceDocumentDto', () => {
      const validDoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'كتاب المعاصر في التفاضل والتكامل 2026',
        author: 'أحمد الشريف',
        publisher: 'دار المعارف',
        editionYear: '2026',
        filePath: 'sources/moasser-2026.pdf',
        fileName: 'moasser-2026.pdf',
        fileSizeBytes: 15420000,
        sha256Hash: 'a'.repeat(64),
        pageCount: 350,
        status: 'INDEXED' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const parsed = SourceDocumentDtoSchema.parse(validDoc);
      expect(parsed.title).toBe(validDoc.title);
      expect(parsed.pageCount).toBe(350);
    });

    it('rejects invalid sha256 hash length', () => {
      expect(() =>
        SourceDocumentDtoSchema.parse({
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'كتاب',
          filePath: 'sources/test.pdf',
          fileName: 'test.pdf',
          fileSizeBytes: 100,
          sha256Hash: 'short',
          pageCount: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      ).toThrow();
    });

    it('enforces endPage >= startPage for SourceReference', () => {
      const validRef = {
        sourceDocumentId: '123e4567-e89b-12d3-a456-426614174000',
        startPage: 10,
        endPage: 15,
        referenceLabel: 'تمارين 1-1 صـ 10 إلى 15',
      };
      expect(CreateSourceReferenceSchema.parse(validRef).endPage).toBe(15);

      const invalidRef = {
        sourceDocumentId: '123e4567-e89b-12d3-a456-426614174000',
        startPage: 20,
        endPage: 10,
        referenceLabel: 'غير منطقي',
      };
      expect(() => CreateSourceReferenceSchema.parse(invalidRef)).toThrow();
    });
  });

  describe('Task 5: Question Bank Entity & Curriculum Tags', () => {
    it('validates CreateQuestionSchema with valid MathRichContent and curriculum tag', () => {
      const input = {
        body: dummyMathContent,
        questionType: 'MULTIPLE_CHOICE' as const,
        difficulty: 'MEDIUM' as const,
        defaultMarks: 2,
        curriculumNodeIds: ['123e4567-e89b-12d3-a456-426614174001'],
      };

      const parsed = CreateQuestionSchema.parse(input);
      expect(parsed.defaultMarks).toBe(2);
      expect(parsed.curriculumNodeIds).toHaveLength(1);
    });

    it('rejects question without curriculum tags', () => {
      const input = {
        body: dummyMathContent,
        curriculumNodeIds: [],
      };
      expect(() => CreateQuestionSchema.parse(input)).toThrow();
    });

    it('validates QuestionDto with multiple source references', () => {
      const question = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        code: 'Q-000001',
        body: dummyMathContent,
        questionType: 'MULTIPLE_CHOICE' as const,
        difficulty: 'HARD' as const,
        defaultMarks: 3,
        languageTrack: 'ARABIC' as const,
        status: 'ACTIVE' as const,
        contentFingerprint: 'abc123hash',
        curriculumTags: ['123e4567-e89b-12d3-a456-426614174001'],
        sourceReferences: [
          {
            sourceReferenceId: '123e4567-e89b-12d3-a456-426614174002',
            referenceLabel: 'المعاصر صـ 45',
            sourceDocumentTitle: 'كتاب المعاصر',
            startPage: 45,
            endPage: 45,
          },
          {
            sourceReferenceId: '123e4567-e89b-12d3-a456-426614174003',
            referenceLabel: 'امتحان مصر دور أول 2024',
            startPage: 3,
            endPage: 3,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const parsed = QuestionDtoSchema.parse(question);
      expect(parsed.sourceReferences).toHaveLength(2);
      expect(parsed.code).toBe('Q-000001');
    });
  });

  describe('Task 6: Duplicate Detection & Bulk Ingestion', () => {
    it('validates DuplicateCheckResultSchema', () => {
      const res = {
        isDuplicate: true,
        matchLevel: 'EXACT' as const,
        existingQuestionId: '123e4567-e89b-12d3-a456-426614174000',
        existingQuestionCode: 'Q-000042',
        reasonAr: 'تطابق تام في نص وصيغة المسألة الرياضية',
      };
      const parsed = DuplicateCheckResultSchema.parse(res);
      expect(parsed.isDuplicate).toBe(true);
      expect(parsed.matchLevel).toBe('EXACT');
    });

    it('validates BulkImportReviewItemSchema and CommitBulkImportInputSchema', () => {
      const reviewItem = {
        tempId: 'temp-1',
        item: {
          tempId: 'temp-1',
          body: dummyMathContent,
          questionType: 'MULTIPLE_CHOICE' as const,
          difficulty: 'MEDIUM' as const,
          defaultMarks: 1,
          languageTrack: 'ARABIC' as const,
          curriculumNodeIds: ['123e4567-e89b-12d3-a456-426614174001'],
          sourceReferenceIds: [],
        },
        status: 'VALID' as const,
        validationErrors: [],
        suggestedAction: 'CREATE_NEW' as const,
      };

      const parsedReview = BulkImportReviewItemSchema.parse(reviewItem);
      expect(parsedReview.status).toBe('VALID');

      const commitInput = {
        actions: [
          {
            tempId: 'temp-1',
            action: 'CREATE_NEW' as const,
            item: reviewItem.item,
          },
        ],
      };

      const parsedCommit = CommitBulkImportInputSchema.parse(commitInput);
      expect(parsedCommit.actions).toHaveLength(1);
    });
  });
});
