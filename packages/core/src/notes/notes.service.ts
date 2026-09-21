import crypto from 'crypto';
import { notesArtifacts } from '@tibyan/db';
import { NotesGenerationRequestSchema, NotesGenerationResultSchema, type NotesGenerationRequest, type NotesGenerationResult } from '@tibyan/contracts';
export class NotesService {
  constructor(private readonly db: any) {}
  createGenerated(request: NotesGenerationRequest, content: NotesGenerationResult) {
    const r=NotesGenerationRequestSchema.parse(request), c=NotesGenerationResultSchema.parse(content), now=new Date().toISOString();
    const row=this.db.insert(notesArtifacts).values({id:crypto.randomUUID(),sourceDocumentId:r.sourceDocumentId,title:r.title,gradeLevel:r.gradeLevel,scope:r.scope??null,detailStyle:r.detailStyle,includeExercises:r.includeExercises,includeModelSolutions:r.includeModelSolutions,contentJson:JSON.stringify(c),createdAt:now,updatedAt:now}).returning().get();
    return {...row, content:c};
  }
}
