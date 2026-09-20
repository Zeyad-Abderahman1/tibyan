import * as crypto from 'node:crypto';
import {
  type QuestionDto,
  type CreateQuestionDto,
  type UpdateQuestionDto,
  type QuestionFilterDto,
  type DuplicateCheckResultDto,
  type BulkImportReviewItemDto,
  type CommitBulkImportInputDto,
  type MathRichContent,
  CreateQuestionSchema,
  UpdateQuestionSchema,
  QuestionFilterSchema,
  CommitBulkImportInputSchema,
  BulkQuestionItemSchema,
} from '@tibyan/contracts';
import {
  type SystemDrizzle,
  QuestionRepository,
  CurriculumNodeRepository,
  SourceReferenceRepository,
  SystemAuditRepository,
  type QuestionRow,
} from '@tibyan/db';
import { MathRichContentSanitizer } from '../content/math-rich-content-sanitizer.js';
import { DuplicateDetectionService } from './duplicate-detection.service.js';
import { requirePermission } from '../auth/permissions.js';
import { type AuthActor } from '../sources/pdf-source.service.js';

export class QuestionBankService {
  private readonly questionRepo: QuestionRepository;
  private readonly nodeRepo: CurriculumNodeRepository;
  private readonly sourceRefRepo: SourceReferenceRepository;
  private readonly auditRepo: SystemAuditRepository;
  private readonly sanitizer: MathRichContentSanitizer;
  private readonly duplicateDetector: DuplicateDetectionService;

  constructor(systemDb: SystemDrizzle) {
    this.questionRepo = new QuestionRepository(systemDb);
    this.nodeRepo = new CurriculumNodeRepository(systemDb);
    this.sourceRefRepo = new SourceReferenceRepository(systemDb);
    this.auditRepo = new SystemAuditRepository(systemDb);
    this.sanitizer = new MathRichContentSanitizer();
    this.duplicateDetector = new DuplicateDetectionService(this.questionRepo);
  }

  createQuestion(input: CreateQuestionDto, actor: AuthActor): QuestionDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = CreateQuestionSchema.parse(input);

    // 1. Sanitize MathRichContent
    const sanitizedBody = this.sanitizer.sanitizeDocument(validated.body);
    const sanitizedAnswer = validated.modelAnswer
      ? this.sanitizer.sanitizeDocument(validated.modelAnswer)
      : null;

    // 2. Validate curriculum nodes exist in System DB
    for (const nodeId of validated.curriculumNodeIds) {
      const node = this.nodeRepo.findById(nodeId);
      if (!node) {
        throw new Error(`عنصر المنهج المحدد غير موجود: ${nodeId}`);
      }
    }

    // 3. Validate source references exist in System DB
    for (const refId of validated.sourceReferenceIds) {
      const ref = this.sourceRefRepo.findById(refId);
      if (!ref) {
        throw new Error(`مرجع المصدر المحدد غير موجود: ${refId}`);
      }
    }

    // 4. Generate deterministic fingerprint and unique sequential code
    const fingerprint = DuplicateDetectionService.generateFingerprint(sanitizedBody);
    const code = this.questionRepo.getNextCode();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const created = this.questionRepo.create(
      {
        id,
        code,
        bodyJson: JSON.stringify(sanitizedBody),
        modelAnswerJson: sanitizedAnswer ? JSON.stringify(sanitizedAnswer) : null,
        questionType: validated.questionType,
        difficulty: validated.difficulty,
        defaultMarks: validated.defaultMarks,
        languageTrack: validated.languageTrack,
        status: validated.status,
        contentFingerprint: fingerprint,
        metadataJson: null,
        createdAt: now,
        updatedAt: now,
      },
      validated.curriculumNodeIds,
      validated.sourceReferenceIds
    );

    // 5. Audit Log
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'CREATE_QUESTION',
      entityType: 'QUESTION',
      entityId: id,
      afterJson: JSON.stringify(created),
      createdAt: now,
    });

    return this.getQuestion(id);
  }

  getQuestion(id: string): QuestionDto {
    const q = this.questionRepo.findById(id);
    if (!q) {
      throw new Error(`المسألة غير موجودة في بنك الأسئلة: ${id}`);
    }

    const tags = this.questionRepo.getCurriculumTagIds(id);
    const sourceRefs = this.questionRepo.getSourceReferences(id);

    return this.mapToDto(q, tags, sourceRefs);
  }

  listQuestions(filter?: QuestionFilterDto): QuestionDto[] {
    const validated = filter ? QuestionFilterSchema.parse(filter) : undefined;
    const questions = this.questionRepo.list(validated);

    return questions.map((q) => {
      const tags = this.questionRepo.getCurriculumTagIds(q.id);
      const sourceRefs = this.questionRepo.getSourceReferences(q.id);
      return this.mapToDto(q, tags, sourceRefs);
    });
  }

  updateQuestion(id: string, input: UpdateQuestionDto, actor: AuthActor): QuestionDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = UpdateQuestionSchema.parse(input);

    const existing = this.questionRepo.findById(id);
    if (!existing) {
      throw new Error(`المسألة غير موجودة في بنك الأسئلة: ${id}`);
    }

    let sanitizedBody: MathRichContent | undefined;
    let fingerprint: string | undefined;
    if (validated.body) {
      sanitizedBody = this.sanitizer.sanitizeDocument(validated.body);
      fingerprint = DuplicateDetectionService.generateFingerprint(sanitizedBody);
    }

    let sanitizedAnswer: MathRichContent | null | undefined;
    if (validated.modelAnswer !== undefined) {
      sanitizedAnswer = validated.modelAnswer
        ? this.sanitizer.sanitizeDocument(validated.modelAnswer)
        : null;
    }

    if (validated.curriculumNodeIds) {
      for (const nodeId of validated.curriculumNodeIds) {
        const node = this.nodeRepo.findById(nodeId);
        if (!node) throw new Error(`عنصر المنهج المحدد غير موجود: ${nodeId}`);
      }
    }

    if (validated.sourceReferenceIds) {
      for (const refId of validated.sourceReferenceIds) {
        const ref = this.sourceRefRepo.findById(refId);
        if (!ref) throw new Error(`مرجع المصدر المحدد غير موجود: ${refId}`);
      }
    }

    this.questionRepo.update(
      id,
      {
        bodyJson: sanitizedBody ? JSON.stringify(sanitizedBody) : undefined,
        modelAnswerJson: sanitizedAnswer !== undefined ? (sanitizedAnswer ? JSON.stringify(sanitizedAnswer) : null) : undefined,
        questionType: validated.questionType,
        difficulty: validated.difficulty,
        defaultMarks: validated.defaultMarks,
        languageTrack: validated.languageTrack,
        status: validated.status,
        contentFingerprint: fingerprint,
      },
      validated.curriculumNodeIds,
      validated.sourceReferenceIds
    );

    const now = new Date().toISOString();
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'UPDATE_QUESTION',
      entityType: 'QUESTION',
      entityId: id,
      beforeJson: JSON.stringify(existing),
      createdAt: now,
    });

    return this.getQuestion(id);
  }

  archiveQuestion(id: string, actor: AuthActor): void {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const existing = this.questionRepo.findById(id);
    if (!existing) {
      throw new Error(`المسألة غير موجودة: ${id}`);
    }

    this.questionRepo.archive(id);

    const now = new Date().toISOString();
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'ARCHIVE_QUESTION',
      entityType: 'QUESTION',
      entityId: id,
      beforeJson: JSON.stringify(existing),
      createdAt: now,
    });
  }

  deleteQuestion(id: string, actor: AuthActor): void {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const existing = this.questionRepo.findById(id);
    if (!existing) {
      throw new Error(`المسألة غير موجودة: ${id}`);
    }

    this.questionRepo.delete(id);

    const now = new Date().toISOString();
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'DELETE_QUESTION',
      entityType: 'QUESTION',
      entityId: id,
      beforeJson: JSON.stringify(existing),
      createdAt: now,
    });
  }

  linkSources(questionId: string, sourceReferenceIds: string[], actor: AuthActor): void {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const existing = this.questionRepo.findById(questionId);
    if (!existing) {
      throw new Error(`المسألة غير موجودة: ${questionId}`);
    }

    for (const refId of sourceReferenceIds) {
      this.questionRepo.linkSourceReference(questionId, refId);
    }

    const now = new Date().toISOString();
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'LINK_SOURCES_TO_QUESTION',
      entityType: 'QUESTION',
      entityId: questionId,
      afterJson: JSON.stringify({ linkedSourceIds: sourceReferenceIds }),
      createdAt: now,
    });
  }

  unlinkSource(questionId: string, sourceReferenceId: string, actor: AuthActor): void {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    this.questionRepo.unlinkSourceReference(questionId, sourceReferenceId);

    const now = new Date().toISOString();
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'UNLINK_SOURCE_FROM_QUESTION',
      entityType: 'QUESTION',
      entityId: questionId,
      afterJson: JSON.stringify({ unlinkedSourceId: sourceReferenceId }),
      createdAt: now,
    });
  }

  checkDuplicate(body: MathRichContent, curriculumNodeIds: string[] = []): DuplicateCheckResultDto {
    return this.duplicateDetector.checkDuplicate(body, curriculumNodeIds);
  }

  previewBulk(rawItems: unknown[]): BulkImportReviewItemDto[] {
    const validatedItems = rawItems.map((item) => BulkQuestionItemSchema.parse(item));
    return this.duplicateDetector.previewBulk(validatedItems);
  }

  commitBulk(
    input: CommitBulkImportInputDto,
    actor: AuthActor
  ): { createdCount: number; linkedCount: number; dismissedCount: number } {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = CommitBulkImportInputSchema.parse(input);

    let createdCount = 0;
    let linkedCount = 0;
    let dismissedCount = 0;

    for (const actionItem of validated.actions) {
      if (actionItem.action === 'DISMISS') {
        dismissedCount++;
        continue;
      }

      if (actionItem.action === 'LINK_SOURCE') {
        // Multi-Source Linking: attach the item's source references to the target question
        if (!actionItem.targetQuestionId) {
          throw new Error('يجب تحديد المسألة المستهدفة لربط المصدر البديل بها');
        }
        for (const sourceRefId of actionItem.item.sourceReferenceIds) {
          this.questionRepo.addSourceReference(
            actionItem.targetQuestionId,
            sourceRefId,
            'تم الربط عبر الاستيراد المجمع'
          );
        }
        linkedCount++;
        continue;
      }

      if (actionItem.action === 'CREATE_NEW') {
        this.createQuestion(
          {
            body: actionItem.item.body,
            modelAnswer: actionItem.item.modelAnswer,
            questionType: actionItem.item.questionType,
            difficulty: actionItem.item.difficulty,
            defaultMarks: actionItem.item.defaultMarks,
            languageTrack: actionItem.item.languageTrack,
            status: 'ACTIVE',
            curriculumNodeIds: actionItem.item.curriculumNodeIds,
            sourceReferenceIds: actionItem.item.sourceReferenceIds,
          },
          actor
        );
        createdCount++;
      }
    }

    return { createdCount, linkedCount, dismissedCount };
  }

  private mapToDto(
    row: QuestionRow,
    tagIds: string[],
    sourceRefs: {
      sourceReferenceId: string;
      referenceLabel: string;
      sourceDocumentTitle: string;
      startPage: number;
      endPage: number;
      notes?: string | null;
    }[]
  ): QuestionDto {
    return {
      id: row.id,
      code: row.code,
      body: JSON.parse(row.bodyJson),
      modelAnswer: row.modelAnswerJson ? JSON.parse(row.modelAnswerJson) : null,
      questionType: row.questionType as any,
      difficulty: row.difficulty as any,
      defaultMarks: row.defaultMarks,
      languageTrack: row.languageTrack as any,
      status: row.status as any,
      contentFingerprint: row.contentFingerprint,
      curriculumTags: tagIds,
      sourceReferences: sourceRefs,
      metadata: row.metadataJson ? JSON.parse(row.metadataJson) : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
