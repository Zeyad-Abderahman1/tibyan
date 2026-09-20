import { eq, and } from 'drizzle-orm';
import { type AcademicDrizzle } from '../../connection.js';
import {
  groupCurriculumAssignments,
  groupCurriculumProgress,
  type GroupCurriculumAssignmentRow,
  type NewGroupCurriculumAssignmentRow,
  type GroupCurriculumProgressRow,
  type NewGroupCurriculumProgressRow,
} from '../../schema/academic.schema.js';

export class GroupCurriculumRepository {
  constructor(private readonly db: AcademicDrizzle) {}

  getAssignment(groupId: string): GroupCurriculumAssignmentRow | null {
    const row = this.db
      .select()
      .from(groupCurriculumAssignments)
      .where(eq(groupCurriculumAssignments.groupId, groupId))
      .get();
    return row ?? null;
  }

  assignCatalog(data: NewGroupCurriculumAssignmentRow): GroupCurriculumAssignmentRow {
    // If existing assignment exists, update it, otherwise insert
    const existing = this.getAssignment(data.groupId);
    if (existing) {
      const updated = this.db
        .update(groupCurriculumAssignments)
        .set({
          catalogId: data.catalogId,
          catalogVersion: data.catalogVersion,
          assignedAt: data.assignedAt,
          assignedByUserId: data.assignedByUserId,
          assignedByNameSnapshot: data.assignedByNameSnapshot,
          notes: data.notes,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(groupCurriculumAssignments.id, existing.id))
        .returning()
        .get();
      return updated;
    }

    return this.db.insert(groupCurriculumAssignments).values(data).returning().get();
  }

  removeAssignment(groupId: string): boolean {
    const res = this.db
      .delete(groupCurriculumAssignments)
      .where(eq(groupCurriculumAssignments.groupId, groupId))
      .run();
    return res.changes > 0;
  }

  getProgressByGroup(groupId: string): GroupCurriculumProgressRow[] {
    return this.db
      .select()
      .from(groupCurriculumProgress)
      .where(eq(groupCurriculumProgress.groupId, groupId))
      .all();
  }

  getNodeProgress(groupId: string, nodeId: string): GroupCurriculumProgressRow | null {
    const row = this.db
      .select()
      .from(groupCurriculumProgress)
      .where(
        and(
          eq(groupCurriculumProgress.groupId, groupId),
          eq(groupCurriculumProgress.nodeId, nodeId)
        )
      )
      .get();
    return row ?? null;
  }

  upsertProgress(data: NewGroupCurriculumProgressRow): GroupCurriculumProgressRow {
    const existing = this.getNodeProgress(data.groupId, data.nodeId);
    if (existing) {
      const updated = this.db
        .update(groupCurriculumProgress)
        .set({
          status: data.status,
          completedAt: data.status === 'COMPLETED' ? (data.completedAt ?? new Date().toISOString()) : null,
          updatedByUserId: data.updatedByUserId,
          updatedByNameSnapshot: data.updatedByNameSnapshot,
          notes: data.notes ?? existing.notes,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(groupCurriculumProgress.id, existing.id))
        .returning()
        .get();
      return updated;
    }

    return this.db
      .insert(groupCurriculumProgress)
      .values({
        ...data,
        completedAt: data.status === 'COMPLETED' ? (data.completedAt ?? new Date().toISOString()) : null,
      })
      .returning()
      .get();
  }

  countProgressByStatus(groupId: string): { completed: number; inProgress: number } {
    const allRows = this.getProgressByGroup(groupId);
    let completed = 0;
    let inProgress = 0;
    for (const r of allRows) {
      if (r.status === 'COMPLETED') completed++;
      else if (r.status === 'IN_PROGRESS') inProgress++;
    }
    return { completed, inProgress };
  }

  resetProgressForGroup(groupId: string): void {
    this.db
      .delete(groupCurriculumProgress)
      .where(eq(groupCurriculumProgress.groupId, groupId))
      .run();
  }

  deleteByGroup(groupId: string): void {
    this.resetProgressForGroup(groupId);
  }

  countByGroup(groupId: string): number {
    return this.getProgressByGroup(groupId).length;
  }
}
