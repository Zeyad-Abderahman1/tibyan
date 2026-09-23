import { eq } from 'drizzle-orm';
import { type AcademicDrizzle } from '../../connection.js';
import { notesArtifacts, type NotesArtifactRow } from '../../schema/academic.schema.js';

export class NotesArtifactRepository {
  constructor(private readonly db: AcademicDrizzle) {}
  findById(id: string): NotesArtifactRow | null {
    return this.db.select().from(notesArtifacts).where(eq(notesArtifacts.id, id)).get() ?? null;
  }
  list(): NotesArtifactRow[] { return this.db.select().from(notesArtifacts).all(); }
  updateContent(id: string, contentJson: string): NotesArtifactRow {
    const row = this.db.update(notesArtifacts).set({contentJson, updatedAt: new Date().toISOString()}).where(eq(notesArtifacts.id, id)).returning().get();
    if (!row) throw new Error('Notes artifact not found');
    return row;
  }
}
