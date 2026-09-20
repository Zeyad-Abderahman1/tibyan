import { eq, asc } from 'drizzle-orm';
import { type SystemDrizzle } from '../../connection.js';
import {
  sourceReferences,
  type SourceReferenceRow,
  type NewSourceReferenceRow,
} from '../../schema/system.schema.js';

export class SourceReferenceRepository {
  constructor(private readonly db: SystemDrizzle) {}

  findById(id: string): SourceReferenceRow | null {
    const row = this.db
      .select()
      .from(sourceReferences)
      .where(eq(sourceReferences.id, id))
      .get();
    return row ?? null;
  }

  listBySourceDocument(sourceDocumentId: string): SourceReferenceRow[] {
    return this.db
      .select()
      .from(sourceReferences)
      .where(eq(sourceReferences.sourceDocumentId, sourceDocumentId))
      .orderBy(asc(sourceReferences.startPage), asc(sourceReferences.endPage))
      .all();
  }

  findAll(): SourceReferenceRow[] {
    return this.db
      .select()
      .from(sourceReferences)
      .orderBy(asc(sourceReferences.startPage), asc(sourceReferences.endPage))
      .all();
  }

  create(data: NewSourceReferenceRow): SourceReferenceRow {
    return this.db
      .insert(sourceReferences)
      .values(data)
      .returning()
      .get();
  }

  update(id: string, data: Partial<NewSourceReferenceRow>): SourceReferenceRow {
    return this.db
      .update(sourceReferences)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(sourceReferences.id, id))
      .returning()
      .get();
  }

  delete(id: string): void {
    this.db.delete(sourceReferences).where(eq(sourceReferences.id, id)).run();
  }
}
