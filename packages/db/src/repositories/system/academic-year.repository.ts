import { eq } from 'drizzle-orm';
import { type SystemDrizzle, getSystemDatabase } from '../../connection.js';
import {
  academicYears,
  type AcademicYearRow,
  type NewAcademicYearRow,
} from '../../schema/system.schema.js';

export class AcademicYearRepository {
  constructor(private db?: SystemDrizzle) {}

  private get client(): SystemDrizzle {
    return this.db ?? getSystemDatabase().db;
  }

  findById(id: string): AcademicYearRow | null {
    const row = this.client.select().from(academicYears).where(eq(academicYears.id, id)).get();
    return row ?? null;
  }

  findByName(name: string): AcademicYearRow | null {
    const row = this.client.select().from(academicYears).where(eq(academicYears.name, name)).get();
    return row ?? null;
  }

  findActive(): AcademicYearRow | null {
    const row = this.client.select().from(academicYears).where(eq(academicYears.isActive, true)).get();
    return row ?? null;
  }

  create(year: NewAcademicYearRow): AcademicYearRow {
    this.client.insert(academicYears).values(year).run();
    const created = this.findById(year.id);
    if (!created) {
      throw new Error(`Failed to create academic year with id: ${year.id}`);
    }
    return created;
  }

  setActiveYear(id: string): void {
    const now = new Date().toISOString();
    // In a transaction: deactivate any currently active year first to respect the partial unique index,
    // then activate the designated year.
    this.client.transaction((tx) => {
      tx.update(academicYears)
        .set({ isActive: false, updatedAt: now })
        .where(eq(academicYears.isActive, true))
        .run();

      tx.update(academicYears)
        .set({ isActive: true, updatedAt: now })
        .where(eq(academicYears.id, id))
        .run();
    });
  }

  archiveYear(id: string): void {
    const now = new Date().toISOString();
    this.client
      .update(academicYears)
      .set({ isArchived: true, isActive: false, updatedAt: now })
      .where(eq(academicYears.id, id))
      .run();
  }

  listAll(): AcademicYearRow[] {
    return this.client.select().from(academicYears).all();
  }
}
