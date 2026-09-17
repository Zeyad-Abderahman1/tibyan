import { eq, and } from 'drizzle-orm';
import { type AcademicDrizzle, getAcademicDatabase } from '../../connection.js';
import {
  groups,
  groupSchedules,
  type GroupRow,
  type NewGroupRow,
  type GroupScheduleRow,
  type NewGroupScheduleRow,
} from '../../schema/academic.schema.js';
import type {
  GradeLevel,
  EducationSystem,
  LanguageTrack,
} from '@tibyan/contracts';

export interface GroupFilter {
  status?: 'ACTIVE' | 'ARCHIVED';
  gradeLevel?: GradeLevel;
  educationSystem?: EducationSystem;
  languageTrack?: LanguageTrack;
}

export class GroupRepository {
  constructor(private db?: AcademicDrizzle) {}

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  findById(id: string): GroupRow | null {
    const row = this.client.select().from(groups).where(eq(groups.id, id)).get();
    return row ?? null;
  }

  create(newGroup: NewGroupRow): GroupRow {
    this.client.insert(groups).values(newGroup).run();
    const created = this.findById(newGroup.id);
    if (!created) {
      throw new Error(`Failed to create group with id: ${newGroup.id}`);
    }
    return created;
  }

  update(id: string, updates: Partial<Omit<GroupRow, 'id' | 'createdAt'>>): GroupRow | null {
    const now = new Date().toISOString();
    this.client
      .update(groups)
      .set({ ...updates, updatedAt: updates.updatedAt ?? now })
      .where(eq(groups.id, id))
      .run();
    return this.findById(id);
  }

  list(filter?: GroupFilter): GroupRow[] {
    const conditions = [];
    if (filter?.status) {
      conditions.push(eq(groups.status, filter.status));
    }
    if (filter?.gradeLevel) {
      conditions.push(eq(groups.gradeLevel, filter.gradeLevel));
    }
    if (filter?.educationSystem) {
      conditions.push(eq(groups.educationSystem, filter.educationSystem));
    }
    if (filter?.languageTrack) {
      conditions.push(eq(groups.languageTrack, filter.languageTrack));
    }

    if (conditions.length > 0) {
      return this.client.select().from(groups).where(and(...conditions)).all();
    }
    return this.client.select().from(groups).all();
  }

  addSchedule(schedule: NewGroupScheduleRow): GroupScheduleRow {
    this.client.insert(groupSchedules).values(schedule).run();
    const created = this.client
      .select()
      .from(groupSchedules)
      .where(eq(groupSchedules.id, schedule.id))
      .get();
    if (!created) {
      throw new Error(`Failed to create schedule with id: ${schedule.id}`);
    }
    return created;
  }

  getSchedules(groupId: string): GroupScheduleRow[] {
    return this.client
      .select()
      .from(groupSchedules)
      .where(eq(groupSchedules.groupId, groupId))
      .all();
  }

  deleteSchedule(scheduleId: string): void {
    this.client.delete(groupSchedules).where(eq(groupSchedules.id, scheduleId)).run();
  }
}
