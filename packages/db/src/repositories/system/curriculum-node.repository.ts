import { eq, and, asc, isNull } from 'drizzle-orm';
import { type SystemDrizzle } from '../../connection.js';
import {
  curriculumNodes,
  type CurriculumNodeRow,
  type NewCurriculumNodeRow,
} from '../../schema/system.schema.js';

export class CurriculumNodeRepository {
  constructor(private readonly db: SystemDrizzle) {}

  findById(id: string): CurriculumNodeRow | null {
    const row = this.db
      .select()
      .from(curriculumNodes)
      .where(eq(curriculumNodes.id, id))
      .get();
    return row ?? null;
  }

  findByCatalogId(catalogId: string): CurriculumNodeRow[] {
    return this.db
      .select()
      .from(curriculumNodes)
      .where(eq(curriculumNodes.catalogId, catalogId))
      .orderBy(asc(curriculumNodes.orderIndex), asc(curriculumNodes.createdAt))
      .all();
  }

  findByParentId(catalogId: string, parentId: string | null): CurriculumNodeRow[] {
    const condition = parentId
      ? and(
          eq(curriculumNodes.catalogId, catalogId),
          eq(curriculumNodes.parentId, parentId)
        )
      : and(
          eq(curriculumNodes.catalogId, catalogId),
          isNull(curriculumNodes.parentId)
        );

    return this.db
      .select()
      .from(curriculumNodes)
      .where(condition)
      .orderBy(asc(curriculumNodes.orderIndex))
      .all();
  }

  countByCatalogId(catalogId: string): number {
    const rows = this.db
      .select({ id: curriculumNodes.id })
      .from(curriculumNodes)
      .where(eq(curriculumNodes.catalogId, catalogId))
      .all();
    return rows.length;
  }

  countSkillsByCatalogId(catalogId: string): number {
    const rows = this.db
      .select({ id: curriculumNodes.id })
      .from(curriculumNodes)
      .where(
        and(
          eq(curriculumNodes.catalogId, catalogId),
          eq(curriculumNodes.tier, 'SKILL')
        )
      )
      .all();
    return rows.length;
  }

  create(data: NewCurriculumNodeRow): CurriculumNodeRow {
    return this.db.insert(curriculumNodes).values(data).returning().get();
  }

  createBatch(dataList: NewCurriculumNodeRow[]): CurriculumNodeRow[] {
    if (dataList.length === 0) return [];
    return this.db.insert(curriculumNodes).values(dataList).returning().all();
  }

  update(id: string, data: Partial<NewCurriculumNodeRow>): CurriculumNodeRow {
    const updated = this.db
      .update(curriculumNodes)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(curriculumNodes.id, id))
      .returning()
      .get();

    if (!updated) {
      throw new Error(`Curriculum node with id '${id}' not found`);
    }
    return updated;
  }

  delete(id: string): boolean {
    const res = this.db.delete(curriculumNodes).where(eq(curriculumNodes.id, id)).run();
    return res.changes > 0;
  }

  reorder(catalogId: string, items: { id: string; orderIndex: number }[]): void {
    for (const item of items) {
      this.db
        .update(curriculumNodes)
        .set({
          orderIndex: item.orderIndex,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(curriculumNodes.id, item.id),
            eq(curriculumNodes.catalogId, catalogId)
          )
        )
        .run();
    }
  }
}
