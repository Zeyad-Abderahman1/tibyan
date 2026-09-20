import { eq, and, desc, like } from 'drizzle-orm';
import { type AcademicDrizzle } from '../../connection.js';
import {
  lessonPlans,
  type LessonPlanRow,
  type NewLessonPlanRow,
} from '../../schema/academic.schema.js';

export class LessonPlanRepository {
  constructor(private readonly db: AcademicDrizzle) {}

  create(data: NewLessonPlanRow): LessonPlanRow {
    return this.db.insert(lessonPlans).values(data).returning().get();
  }

  update(id: string, partial: Partial<NewLessonPlanRow>): LessonPlanRow {
    const updated = this.db
      .update(lessonPlans)
      .set({
        ...partial,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(lessonPlans.id, id))
      .returning()
      .get();

    if (!updated) {
      throw new Error(`Lesson plan not found: ${id}`);
    }
    return updated;
  }

  findById(id: string): LessonPlanRow | null {
    const row = this.db
      .select()
      .from(lessonPlans)
      .where(eq(lessonPlans.id, id))
      .get();
    return row ?? null;
  }

  findByCurriculumNodeId(curriculumNodeId: string): LessonPlanRow[] {
    return this.db
      .select()
      .from(lessonPlans)
      .where(eq(lessonPlans.curriculumNodeId, curriculumNodeId))
      .orderBy(desc(lessonPlans.createdAt))
      .all();
  }

  list(filter?: { curriculumNodeId?: string; status?: string; search?: string }): LessonPlanRow[] {
    const conditions = [];

    if (filter?.curriculumNodeId) {
      conditions.push(eq(lessonPlans.curriculumNodeId, filter.curriculumNodeId));
    }

    if (filter?.status) {
      conditions.push(eq(lessonPlans.status, filter.status as any));
    }

    if (filter?.search) {
      conditions.push(like(lessonPlans.title, `%${filter.search}%`));
    }

    const query = this.db.select().from(lessonPlans);

    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(desc(lessonPlans.createdAt)).all();
    }

    return query.orderBy(desc(lessonPlans.createdAt)).all();
  }

  delete(id: string): boolean {
    const res = this.db.delete(lessonPlans).where(eq(lessonPlans.id, id)).run();
    return res.changes > 0;
  }
}
