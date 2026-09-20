import * as crypto from 'node:crypto';
import {
  type MathRichContent,
  type DuplicateCheckResultDto,
  type BulkQuestionItemDto,
  type BulkImportReviewItemDto,
} from '@tibyan/contracts';
import { QuestionRepository } from '@tibyan/db';

export class DuplicateDetectionService {
  constructor(private readonly questionRepo: QuestionRepository) {}

  /**
   * Normalizes Arabic text by removing diacritics, unifying letter shapes, and stripping punctuation.
   */
  static normalizeText(text: string): string {
    if (!text) return '';

    return text
      // Strip Arabic tashkeel (fatha, damma, kasra, sukun, shadda, tanween)
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Unify Alef variations (أ, إ, آ, ٱ -> ا)
      .replace(/[أإآٱ]/g, 'ا')
      // Unify Taa Marbuta (ة -> ه)
      .replace(/ة/g, 'ه')
      // Unify Yaa / Alef Maksura (ى -> ي)
      .replace(/ى/g, 'ي')
      // Convert to lowercase
      .toLowerCase()
      // Remove punctuation and special symbols except alphanumeric and math operators
      .replace(/[^\w\s\u0600-\u06FF=+\-*/^()]/g, ' ')
      // Collapse multiple whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalizes LaTeX mathematical expressions by stripping non-semantic spaces.
   */
  static normalizeLatex(latex: string): string {
    if (!latex) return '';

    return latex
      .trim()
      // Normalize spacing around braces and symbols
      .replace(/\s*\{\s*/g, '{')
      .replace(/\s*\}\s*/g, '}')
      .replace(/\s*=\s*/g, '=')
      .replace(/\s*\+\s*/g, '+')
      .replace(/\s*-\s*/g, '-')
      .replace(/\s*\*\s*/g, '*')
      .replace(/\s*\\cdot\s*/g, '\\cdot')
      .replace(/\s+/g, ' ');
  }

  /**
   * Generates a deterministic content fingerprint (SHA-256) from a MathRichContent document.
   */
  static generateFingerprint(content: MathRichContent): string {
    const parts: string[] = [];

    for (const block of content.blocks) {
      if (block.type === 'text') {
        const norm = this.normalizeText(block.content);
        if (norm) parts.push(norm);
      } else if (block.type === 'math') {
        const normLatex = this.normalizeLatex(block.latex);
        if (normLatex) parts.push(`math:${normLatex}`);
      }
    }

    const unified = parts.join('||');
    return crypto.createHash('sha256').update(unified).digest('hex');
  }

  /**
   * Checks whether a given question body is a duplicate of an existing question.
   */
  checkDuplicate(body: MathRichContent, curriculumNodeIds: string[] = []): DuplicateCheckResultDto {
    const fingerprint = DuplicateDetectionService.generateFingerprint(body);

    // 1. Exact duplicate check by content fingerprint
    const exactMatches = this.questionRepo.findByFingerprint(fingerprint);
    const activeExact = exactMatches.find((q) => q.status !== 'ARCHIVED');

    if (activeExact) {
      return {
        isDuplicate: true,
        matchLevel: 'EXACT',
        existingQuestionId: activeExact.id,
        existingQuestionCode: activeExact.code,
        reasonAr: `تطابق تام ومؤكد مع المسألة المسجلة كود (${activeExact.code})`,
      };
    }

    // 2. Candidate check: Check questions tagged with the same curriculum skill
    if (curriculumNodeIds.length > 0) {
      const candidateTokens = this.extractTokens(body);

      for (const nodeId of curriculumNodeIds) {
        const taggedQuestions = this.questionRepo.list({
          curriculumNodeId: nodeId,
          status: 'ACTIVE',
        });

        for (const q of taggedQuestions) {
          try {
            const existingBody = JSON.parse(q.bodyJson) as MathRichContent;
            const existingTokens = this.extractTokens(existingBody);

            const similarity = this.calculateJaccardSimilarity(candidateTokens, existingTokens);
            if (similarity >= 0.8) {
              return {
                isDuplicate: true,
                matchLevel: 'CANDIDATE',
                existingQuestionId: q.id,
                existingQuestionCode: q.code,
                reasonAr: `تشابه كبير (${Math.round(similarity * 100)}%) في صياغة المسألة مع (${q.code}) لنفس المهارة التعليمية`,
              };
            }
          } catch {
            // Ignore parse errors on older test data
          }
        }
      }
    }

    return {
      isDuplicate: false,
      matchLevel: 'NONE',
      reasonAr: 'لا يوجد تطابق مسبق في بنك الأسئلة',
    };
  }

  /**
   * Previews a batch of question records for bulk ingestion review.
   */
  previewBulk(items: BulkQuestionItemDto[]): BulkImportReviewItemDto[] {
    const reviews: BulkImportReviewItemDto[] = [];
    const seenFingerprintsInBatch = new Map<string, string>(); // fingerprint -> tempId

    for (const item of items) {
      const errors: string[] = [];

      // Validation 1: Question body not empty
      if (!item.body || !item.body.blocks || item.body.blocks.length === 0) {
        errors.push('نص المسألة فارغ تماماً');
      }

      // Validation 2: Curriculum tagging
      if (!item.curriculumNodeIds || item.curriculumNodeIds.length === 0) {
        errors.push('المسألة غير مربوطة بأي مهارة أو درس في المنهج');
      }

      // Compute fingerprint
      const fingerprint = DuplicateDetectionService.generateFingerprint(item.body);

      // Check duplicate within the current batch
      if (seenFingerprintsInBatch.has(fingerprint)) {
        errors.push(`تكرار تام مع مسألة أخرى داخل نفس دفعة الاستيراد (رقم ${seenFingerprintsInBatch.get(fingerprint)})`);
      } else {
        seenFingerprintsInBatch.set(fingerprint, item.tempId);
      }

      // Check duplicate against existing database
      const dupCheck = this.checkDuplicate(item.body, item.curriculumNodeIds);

      let status: 'VALID' | 'WARNING' | 'DUPLICATE_EXACT' | 'DUPLICATE_CANDIDATE' = 'VALID';
      let suggestedAction: 'CREATE_NEW' | 'LINK_SOURCE' | 'DISMISS' = 'CREATE_NEW';

      if (dupCheck.matchLevel === 'EXACT') {
        status = 'DUPLICATE_EXACT';
        suggestedAction = item.sourceReferenceIds && item.sourceReferenceIds.length > 0 ? 'LINK_SOURCE' : 'DISMISS';
      } else if (dupCheck.matchLevel === 'CANDIDATE') {
        status = 'DUPLICATE_CANDIDATE';
        suggestedAction = 'CREATE_NEW';
      } else if (errors.length > 0) {
        status = 'WARNING';
        suggestedAction = 'CREATE_NEW';
      } else if (!item.sourceReferenceIds || item.sourceReferenceIds.length === 0) {
        status = 'WARNING';
        errors.push('المسألة لا تتضمن مرجع كتاب أو صفحة');
      }

      reviews.push({
        tempId: item.tempId,
        item,
        status,
        validationErrors: errors,
        duplicateMatch: dupCheck.isDuplicate ? dupCheck : undefined,
        suggestedAction,
      });
    }

    return reviews;
  }

  private extractTokens(content: MathRichContent): Set<string> {
    const tokens = new Set<string>();
    for (const block of content.blocks) {
      if (block.type === 'text') {
        const norm = DuplicateDetectionService.normalizeText(block.content);
        norm.split(' ').filter((w) => w.length > 2).forEach((w) => tokens.add(w));
      } else if (block.type === 'math') {
        tokens.add(DuplicateDetectionService.normalizeLatex(block.latex));
      }
    }
    return tokens;
  }

  private calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }
}
