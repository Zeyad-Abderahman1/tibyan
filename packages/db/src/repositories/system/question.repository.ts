import { eq, desc, and, like } from 'drizzle-orm';
import { type SystemDrizzle } from '../../connection.js';
import {
  questions,
  questionCurriculumTags,
  questionSourceReferences,
  sourceReferences,
  sourceDocuments,
  type QuestionRow,
  type NewQuestionRow,
} from '../../schema/system.schema.js';

export interface QuestionFilterOptions {
  curriculumNodeId?: string;
  catalogId?: string;
  questionType?: string;
  difficulty?: string;
  status?: string;
  search?: string;
}

export interface QuestionSourceRefDetail {
  sourceReferenceId: string;
  referenceLabel: string;
  sourceDocumentTitle: string;
  startPage: number;
  endPage: number;
  notes?: string | null;
}

export class QuestionRepository {
  constructor(private readonly db: SystemDrizzle) {}

  findById(id: string): QuestionRow | null {
    const row = this.db
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .get();
    return row ?? null;
  }

  findByCode(code: string): QuestionRow | null {
    const row = this.db
      .select()
      .from(questions)
      .where(eq(questions.code, code))
      .get();
    return row ?? null;
  }

  findByFingerprint(contentFingerprint: string): QuestionRow[] {
    return this.db
      .select()
      .from(questions)
      .where(eq(questions.contentFingerprint, contentFingerprint))
      .all();
  }

  getNextCode(): string {
    const latest = this.db
      .select({ code: questions.code })
      .from(questions)
      .orderBy(desc(questions.code))
      .limit(1)
      .get();

    if (!latest || !latest.code.startsWith('Q-')) {
      return 'Q-000001';
    }

    const numPart = parseInt(latest.code.replace('Q-', ''), 10);
    const nextNum = isNaN(numPart) ? 1 : numPart + 1;
    return `Q-${String(nextNum).padStart(6, '0')}`;
  }

  list(filter?: QuestionFilterOptions): QuestionRow[] {
    const conditions = [];

    if (filter?.status) {
      conditions.push(eq(questions.status, filter.status as any));
    }
    if (filter?.questionType) {
      conditions.push(eq(questions.questionType, filter.questionType as any));
    }
    if (filter?.difficulty) {
      conditions.push(eq(questions.difficulty, filter.difficulty as any));
    }
    if (filter?.search) {
      conditions.push(like(questions.bodyJson, `%${filter.search}%`));
    }

    let query = this.db.select().from(questions);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const rows = (query as any).orderBy(desc(questions.createdAt)).all() as QuestionRow[];

    // If filtered by curriculumNodeId, filter in memory or via subquery
    if (filter?.curriculumNodeId) {
      const taggedQuestionIds = new Set(
        this.db
          .select({ questionId: questionCurriculumTags.questionId })
          .from(questionCurriculumTags)
          .where(eq(questionCurriculumTags.curriculumNodeId, filter.curriculumNodeId))
          .all()
          .map((r) => r.questionId)
      );
      return rows.filter((r) => taggedQuestionIds.has(r.id));
    }

    return rows;
  }

  getCurriculumTagIds(questionId: string): string[] {
    return this.db
      .select({ nodeId: questionCurriculumTags.curriculumNodeId })
      .from(questionCurriculumTags)
      .where(eq(questionCurriculumTags.questionId, questionId))
      .all()
      .map((r) => r.nodeId);
  }

  getSourceReferences(questionId: string): QuestionSourceRefDetail[] {
    const rows = this.db
      .select({
        sourceReferenceId: questionSourceReferences.sourceReferenceId,
        notes: questionSourceReferences.notes,
        referenceLabel: sourceReferences.referenceLabel,
        startPage: sourceReferences.startPage,
        endPage: sourceReferences.endPage,
        sourceDocumentTitle: sourceDocuments.title,
      })
      .from(questionSourceReferences)
      .innerJoin(sourceReferences, eq(questionSourceReferences.sourceReferenceId, sourceReferences.id))
      .innerJoin(sourceDocuments, eq(sourceReferences.sourceDocumentId, sourceDocuments.id))
      .where(eq(questionSourceReferences.questionId, questionId))
      .all();

    return rows.map((r) => ({
      sourceReferenceId: r.sourceReferenceId,
      referenceLabel: r.referenceLabel,
      sourceDocumentTitle: r.sourceDocumentTitle,
      startPage: r.startPage,
      endPage: r.endPage,
      notes: r.notes,
    }));
  }

  create(
    data: NewQuestionRow,
    curriculumNodeIds: string[],
    sourceReferenceIds: string[] = []
  ): QuestionRow {
    const now = new Date().toISOString();

    const created = this.db
      .insert(questions)
      .values(data)
      .returning()
      .get();

    for (const nodeId of curriculumNodeIds) {
      this.db
        .insert(questionCurriculumTags)
        .values({
          id: crypto.randomUUID(),
          questionId: created.id,
          curriculumNodeId: nodeId,
          createdAt: now,
        })
        .run();
    }

    for (const sourceRefId of sourceReferenceIds) {
      this.db
        .insert(questionSourceReferences)
        .values({
          id: crypto.randomUUID(),
          questionId: created.id,
          sourceReferenceId: sourceRefId,
          createdAt: now,
        })
        .run();
    }

    return created;
  }

  update(
    id: string,
    data: Partial<NewQuestionRow>,
    curriculumNodeIds?: string[],
    sourceReferenceIds?: string[]
  ): QuestionRow {
    const now = new Date().toISOString();

    const updated = this.db
      .update(questions)
      .set({ ...data, updatedAt: now })
      .where(eq(questions.id, id))
      .returning()
      .get();

    if (curriculumNodeIds !== undefined) {
      this.db.delete(questionCurriculumTags).where(eq(questionCurriculumTags.questionId, id)).run();
      for (const nodeId of curriculumNodeIds) {
        this.db
          .insert(questionCurriculumTags)
          .values({
            id: crypto.randomUUID(),
            questionId: id,
            curriculumNodeId: nodeId,
            createdAt: now,
          })
          .run();
      }
    }

    if (sourceReferenceIds !== undefined) {
      this.db.delete(questionSourceReferences).where(eq(questionSourceReferences.questionId, id)).run();
      for (const sourceRefId of sourceReferenceIds) {
        this.db
          .insert(questionSourceReferences)
          .values({
            id: crypto.randomUUID(),
            questionId: id,
            sourceReferenceId: sourceRefId,
            createdAt: now,
          })
          .run();
      }
    }

    return updated;
  }

  addSourceReference(questionId: string, sourceReferenceId: string, notes?: string): void {
    const existing = this.db
      .select()
      .from(questionSourceReferences)
      .where(
        and(
          eq(questionSourceReferences.questionId, questionId),
          eq(questionSourceReferences.sourceReferenceId, sourceReferenceId)
        )
      )
      .get();

    if (!existing) {
      this.db
        .insert(questionSourceReferences)
        .values({
          id: crypto.randomUUID(),
          questionId,
          sourceReferenceId,
          notes: notes ?? null,
          createdAt: new Date().toISOString(),
        })
        .run();
    }
  }

  archive(id: string): void {
    this.db
      .update(questions)
      .set({ status: 'ARCHIVED', updatedAt: new Date().toISOString() })
      .where(eq(questions.id, id))
      .run();
  }

  delete(id: string): void {
    this.db.delete(questionCurriculumTags).where(eq(questionCurriculumTags.questionId, id)).run();
    this.db.delete(questionSourceReferences).where(eq(questionSourceReferences.questionId, id)).run();
    this.db.delete(questions).where(eq(questions.id, id)).run();
  }

  linkSourceReference(questionId: string, sourceReferenceId: string, notes?: string): void {
    this.addSourceReference(questionId, sourceReferenceId, notes);
  }

  unlinkSourceReference(questionId: string, sourceReferenceId: string): void {
    this.db
      .delete(questionSourceReferences)
      .where(
        and(
          eq(questionSourceReferences.questionId, questionId),
          eq(questionSourceReferences.sourceReferenceId, sourceReferenceId)
        )
      )
      .run();
  }
}
