import { eq, and, desc } from 'drizzle-orm';
import { type SystemDrizzle } from '../../connection.js';
import {
  sourceDocuments,
  type SourceDocumentRow,
  type NewSourceDocumentRow,
} from '../../schema/system.schema.js';

export class SourceDocumentRepository {
  constructor(private readonly db: SystemDrizzle) {}

  findById(id: string): SourceDocumentRow | null {
    const row = this.db
      .select()
      .from(sourceDocuments)
      .where(eq(sourceDocuments.id, id))
      .get();
    return row ?? null;
  }

  findByHash(sha256Hash: string): SourceDocumentRow | null {
    const row = this.db
      .select()
      .from(sourceDocuments)
      .where(eq(sourceDocuments.sha256Hash, sha256Hash))
      .get();
    return row ?? null;
  }

  list(curriculumCatalogId?: string): SourceDocumentRow[] {
    if (curriculumCatalogId) {
      return this.db
        .select()
        .from(sourceDocuments)
        .where(eq(sourceDocuments.curriculumCatalogId, curriculumCatalogId))
        .orderBy(desc(sourceDocuments.createdAt))
        .all();
    }
    return this.db
      .select()
      .from(sourceDocuments)
      .orderBy(desc(sourceDocuments.createdAt))
      .all();
  }

  listGroupedByGrade(): Array<{
    gradeLevel: string | null;
    educationSystem: string | null;
    documents: SourceDocumentRow[];
    count: number;
  }> {
    const all = this.db
      .select()
      .from(sourceDocuments)
      .orderBy(desc(sourceDocuments.createdAt))
      .all();

    const groups = new Map<string, SourceDocumentRow[]>();
    for (const doc of all) {
      const key = doc.gradeLevel || 'غير محدد';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(doc);
    }

    return Array.from(groups.entries()).map(([grade, docs]) => ({
      gradeLevel: grade === 'غير محدد' ? null : grade,
      educationSystem: docs[0]?.educationSystem ?? null,
      documents: docs,
      count: docs.length,
    }));
  }

  findByFilter(filter: { gradeLevel?: string; subject?: string; educationSystem?: string }): SourceDocumentRow[] {
    const conditions = [];
    if (filter.gradeLevel) conditions.push(eq(sourceDocuments.gradeLevel, filter.gradeLevel));
    if (filter.subject) conditions.push(eq(sourceDocuments.subject, filter.subject));
    if (filter.educationSystem) conditions.push(eq(sourceDocuments.educationSystem, filter.educationSystem));

    return this.db
      .select()
      .from(sourceDocuments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sourceDocuments.createdAt))
      .all();
  }

  create(data: NewSourceDocumentRow): SourceDocumentRow {
    return this.db
      .insert(sourceDocuments)
      .values(data)
      .returning()
      .get();
  }

  update(id: string, data: Partial<NewSourceDocumentRow>): SourceDocumentRow {
    return this.db
      .update(sourceDocuments)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(sourceDocuments.id, id))
      .returning()
      .get();
  }

  delete(id: string): void {
    this.db.delete(sourceDocuments).where(eq(sourceDocuments.id, id)).run();
  }
}
