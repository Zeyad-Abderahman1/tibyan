import { eq } from 'drizzle-orm';
import { type AcademicDrizzle } from '../../connection.js';
import { reviewArtifacts, type NewReviewArtifactRow, type ReviewArtifactRow } from '../../schema/academic.schema.js';
export class ReviewArtifactRepository {
  constructor(private readonly db: AcademicDrizzle) {}
  create(data: NewReviewArtifactRow): ReviewArtifactRow { return this.db.insert(reviewArtifacts).values(data).returning().get(); }
  findById(id: string): ReviewArtifactRow | null { return this.db.select().from(reviewArtifacts).where(eq(reviewArtifacts.id,id)).get() ?? null; }
  list(): ReviewArtifactRow[] { return this.db.select().from(reviewArtifacts).all(); }
  update(id: string, partial: Partial<NewReviewArtifactRow>): ReviewArtifactRow { const v=this.db.update(reviewArtifacts).set({...partial,updatedAt:new Date().toISOString()}).where(eq(reviewArtifacts.id,id)).returning().get(); if(!v) throw new Error('Review artifact not found'); return v; }
}
