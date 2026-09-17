import { eq, and, inArray, sql, asc } from 'drizzle-orm';
import type { PaymentType } from '@tibyan/contracts';
import { type AcademicDrizzle, getAcademicDatabase } from '../../connection.js';
import {
  groupEnrollments,
  groups,
  students,
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

  updatePaymentOverrides(
    id: string,
    paymentTypeOverride: PaymentType | null | undefined,
    paymentAmountOverride: number | null | undefined
  ): GroupEnrollmentRow | null {
    const updates: Partial<GroupEnrollmentRow> = {};
    if (paymentTypeOverride !== undefined) {
      updates.paymentTypeOverride = paymentTypeOverride;
    }
    if (paymentAmountOverride !== undefined) {
      updates.paymentAmountOverride = paymentAmountOverride;
    }
    this.client
      .update(groupEnrollments)
      .set(updates)
      .where(eq(groupEnrollments.id, id))
      .run();
    return this.findById(id);
  }

  countActiveByGroupIds(groupIds: string[]): Map<string, number> {
    const map = new Map<string, number>();
    if (groupIds.length === 0) return map;
    const rows = this.client
      .select({
        groupId: groupEnrollments.groupId,
        count: sql<number>`count(*)`,
      })
      .from(groupEnrollments)
      .where(
        and(
          inArray(groupEnrollments.groupId, groupIds),
          eq(groupEnrollments.status, 'ACTIVE')
        )
      )
      .groupBy(groupEnrollments.groupId)
      .all();
    for (const row of rows) {
      map.set(row.groupId, row.count);
    }
    return map;
  }

  countDistinctActiveEnrolledStudents(): number {
    const result = this.client
      .select({
        count: sql<number>`count(distinct ${groupEnrollments.studentId})`,
      })
      .from(groupEnrollments)
      .innerJoin(students, eq(groupEnrollments.studentId, students.id))
      .where(
        and(
          eq(groupEnrollments.status, 'ACTIVE'),
          eq(students.status, 'ACTIVE')
        )
      )
      .get();
    return result?.count ?? 0;
  }

  getActiveGroupsForStudents(studentIds: string[]): Map<string, Array<{ groupId: string; groupName: string }>> {
    const map = new Map<string, Array<{ groupId: string; groupName: string }>>();
    if (studentIds.length === 0) return map;
    const rows = this.client
      .select({
        studentId: groupEnrollments.studentId,
        groupId: groups.id,
        groupName: groups.name,
      })
      .from(groupEnrollments)
      .innerJoin(groups, eq(groupEnrollments.groupId, groups.id))
      .where(
        and(
          inArray(groupEnrollments.studentId, studentIds),
          eq(groupEnrollments.status, 'ACTIVE')
        )
      )
      .orderBy(asc(groups.name), asc(groups.id))
      .all();
    for (const row of rows) {
      const list = map.get(row.studentId) ?? [];
      list.push({ groupId: row.groupId, groupName: row.groupName });
      map.set(row.studentId, list);
    }
    return map;
  }
}

