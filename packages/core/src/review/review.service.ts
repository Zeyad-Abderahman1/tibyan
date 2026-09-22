import crypto from 'crypto';
import { ReviewArtifactRepository } from '@tibyan/db';
import { ReviewGenerationRequestSchema, ReviewGenerationResultSchema, type ReviewGenerationRequest, type ReviewGenerationResult } from '@tibyan/contracts';
export class ReviewService {
  private repo: ReviewArtifactRepository;
  constructor(db: any) { this.repo = new ReviewArtifactRepository(db); }
  createGenerated(request: ReviewGenerationRequest, result: ReviewGenerationResult) {
    const req=ReviewGenerationRequestSchema.parse(request); const out=ReviewGenerationResultSchema.parse(result);
    const questions=out.sections.filter(s=>s.type==='question').length;
    if ((req.reviewType==='QUESTIONS'||req.reviewType==='MIXED') && questions!==req.questionCount) throw new Error(`عدد الأسئلة غير مطابق: ${questions}/${req.questionCount}`);
    const now=new Date().toISOString(); const id=crypto.randomUUID();
    const row = this.repo.create({id,sourceDocumentId:req.sourceDocumentId,title:req.title,reviewType:req.reviewType,detailLevel:req.detailLevel,scope:req.scope??null,questionCount:req.questionCount,includeModelAnswers:req.includeModelAnswers,contentJson:JSON.stringify(out),createdAt:now,updatedAt:now});
    return {...row, content: out};
  }
  get(id:string){ const row=this.repo.findById(id); if(!row) return null; return {...row, content: ReviewGenerationResultSchema.parse(JSON.parse(row.contentJson))}; }
  list(){ return this.repo.list().map(r=>({...r,content:ReviewGenerationResultSchema.parse(JSON.parse(r.contentJson))})); }
  saveContent(id: string, content: ReviewGenerationResult) {
    const parsed = ReviewGenerationResultSchema.parse(content);
    const row = this.repo.update(id, { contentJson: JSON.stringify(parsed) });
    return {...row, content: parsed};
  }
}
