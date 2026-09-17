import { eq, and } from 'drizzle-orm';
import { type AcademicDrizzle, getAcademicDatabase } from '../../connection.js';
import {
  groupEnrollments,
  type GroupEnrollmentRow,
  type NewGroupEnrollmentRow,
} from '../../schema/academic.schema.js';

export class EnrollmentRepository {
  constructor(private db?: AcademicDrizzle) {}

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  findById(id: string): GroupEnrollmentRow | null {
    const row = this.client.select().from(groupEnrollments).where(eq(groupEnrollments.id, id)).get();
    return row ?? null;
  }

  findActiveEnrollment(groupId: string, studentId: string): GroupEnrollmentRow | null {
    const row = this.client
      .select()
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.groupId, groupId),
          eq(groupEnrollments.studentId, studentId),
          eq(groupEnrollments.status, 'ACTIVE')
        )
      )
      .get();
    return row ?? null;
  }

  create(newEnrollment: NewGroupEnrollmentRow): GroupEnrollmentRow {
    this.client.insert(groupEnrollments).values(newEnrollment).run();
    const created = this.findById(newEnrollment.id);
    if (!created) {
      throw new Error(`Failed to create enrollment with id: ${newEnrollment.id}`);
    }
    return created;
  }

  endEnrollment(id: string, leftAt?: string): void {
    const date = leftAt ?? new Date().toISOString();
    this.client
      .update(groupEnrollments)
      .set({ status: 'ENDED', leftAt: date })
      .where(eq(groupEnrollments.id, id))
      .run();
  }

  listByGroup(groupId: string, activeOnly: boolean = false): GroupEnrollmentRow[] {
    if (activeOnly) {
      return this.client
        .select()
        .from(groupEnrollments)
        .where(
          and(
            eq(groupEnrollments.groupId, groupId),
            eq(groupEnrollments.status, 'ACTIVE')
          )
        )
        .all();
    }
    return this.client
      .select()
      .from(groupEnrollments)
      .where(eq(groupEnrollments.groupId, groupId))
      .all();
  }

  listByStudent(studentId: string, activeOnly: boolean = false): GroupEnrollmentRow[] {
    if (activeOnly) {
      return this.client
        .select()
        .from(groupEnrollments)
        .where(
          and(
            eq(groupEnrollments.studentId, studentId),
            eq(groupEnrollments.status, 'ACTIVE')
          )
        )
        .all();
    }
    return this.client
      .select()
      .from(groupEnrollments)
      .where(eq(groupEnrollments.studentId, studentId))
      .all();
  }
}
