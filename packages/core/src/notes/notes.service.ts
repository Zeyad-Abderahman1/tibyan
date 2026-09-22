import crypto from 'crypto';
import { notesArtifacts, NotesArtifactRepository } from '@tibyan/db';
import { NotesGenerationRequestSchema, NotesGenerationResultSchema, type NotesGenerationRequest, type NotesGenerationResult } from '@tibyan/contracts';
export class NotesService {
  constructor(private readonly db: any) {}
  get(id: string) { const row = new NotesArtifactRepository(this.db).findById(id); return row ? {...row, content: NotesGenerationResultSchema.parse(JSON.parse(row.contentJson))} : null; }
  list() { return new NotesArtifactRepository(this.db).list().map((row) => ({...row, content: NotesGenerationResultSchema.parse(JSON.parse(row.contentJson))})); }
  saveContent(id: string, content: NotesGenerationResult) {
    const parsed = NotesGenerationResultSchema.parse(content);
    const row = new NotesArtifactRepository(this.db).updateContent(id, JSON.stringify(parsed));
    return {...row, content: parsed};
  }
  createGenerated(request: NotesGenerationRequest, content: NotesGenerationResult) {
    const r=NotesGenerationRequestSchema.parse(request), c=NotesGenerationResultSchema.parse(content), now=new Date().toISOString();
    const row=this.db.insert(notesArtifacts).values({id:crypto.randomUUID(),sourceDocumentId:r.sourceDocumentId,title:r.title,gradeLevel:r.gradeLevel,scope:r.scope??null,detailStyle:r.detailStyle,includeExercises:r.includeExercises,includeModelSolutions:r.includeModelSolutions,contentJson:JSON.stringify(c),createdAt:now,updatedAt:now}).returning().get();
    return {...row, content:c};
  }
}
