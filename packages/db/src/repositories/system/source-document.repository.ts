import { eq, desc } from 'drizzle-orm';
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
