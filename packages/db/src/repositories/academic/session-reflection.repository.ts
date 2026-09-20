import { eq, desc } from 'drizzle-orm';
import { type AcademicDrizzle } from '../../connection.js';
import {
  sessionReflections,
  type SessionReflectionRow,
  type NewSessionReflectionRow,
} from '../../schema/academic.schema.js';

export class SessionReflectionRepository {
  constructor(private readonly db: AcademicDrizzle) {}

  create(data: NewSessionReflectionRow): SessionReflectionRow {
    return this.db.insert(sessionReflections).values(data).returning().get();
  }

  update(id: string, partial: Partial<NewSessionReflectionRow>): SessionReflectionRow {
    const updated = this.db
      .update(sessionReflections)
      .set({
        ...partial,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sessionReflections.id, id))
      .returning()
      .get();

    if (!updated) {
      throw new Error(`Session reflection not found: ${id}`);
    }
    return updated;
  }

  findById(id: string): SessionReflectionRow | null {
    const row = this.db
      .select()
      .from(sessionReflections)
      .where(eq(sessionReflections.id, id))
      .get();
    return row ?? null;
  }

  findBySessionId(sessionId: string): SessionReflectionRow | null {
    const row = this.db
      .select()
      .from(sessionReflections)
      .where(eq(sessionReflections.sessionId, sessionId))
      .get();
    return row ?? null;
  }

  findByLessonPlanId(lessonPlanId: string): SessionReflectionRow[] {
    return this.db
      .select()
      .from(sessionReflections)
      .where(eq(sessionReflections.lessonPlanId, lessonPlanId))
      .orderBy(desc(sessionReflections.createdAt))
      .all();
  }

  list(filter?: { completionStatus?: string }): SessionReflectionRow[] {
    const query = this.db.select().from(sessionReflections);
    if (filter?.completionStatus) {
      return query
        .where(eq(sessionReflections.completionStatus, filter.completionStatus as any))
        .orderBy(desc(sessionReflections.createdAt))
        .all();
    }
    return query.orderBy(desc(sessionReflections.createdAt)).all();
  }

  delete(id: string): boolean {
    const res = this.db.delete(sessionReflections).where(eq(sessionReflections.id, id)).run();
    return res.changes > 0;
  }
}
