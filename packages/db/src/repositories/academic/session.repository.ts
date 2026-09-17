import { eq, and, gte, lte, asc, inArray, isNull, gt, or } from 'drizzle-orm';
import { type AcademicDrizzle, getAcademicDatabase } from '../../connection.js';
import {
  sessions,
  type SessionRow,
  type NewSessionRow,
} from '../../schema/academic.schema.js';

export class SessionRepository {
  constructor(private db?: AcademicDrizzle) {}

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  findById(id: string): SessionRow | null {
    const row = this.client.select().from(sessions).where(eq(sessions.id, id)).get();
    return row ?? null;
  }

  findByOccurrenceKey(occurrenceKey: string): SessionRow | null {
    const row = this.client
      .select()
      .from(sessions)
      .where(eq(sessions.occurrenceKey, occurrenceKey))
      .get();
    return row ?? null;
  }

  create(newSession: NewSessionRow): SessionRow {
    this.client.insert(sessions).values(newSession).run();
    const created = this.findById(newSession.id);
    if (!created) {
      throw new Error(`Failed to create session with id: ${newSession.id}`);
    }
    return created;
  }

  createMany(newSessions: NewSessionRow[]): SessionRow[] {
    if (newSessions.length === 0) return [];
    this.client.insert(sessions).values(newSessions).run();
    const ids = newSessions.map((s) => s.id);
    return this.client.select().from(sessions).where(inArray(sessions.id, ids)).all();
  }

  update(
    id: string,
    updates: Partial<Omit<SessionRow, 'id' | 'occurrenceKey' | 'createdAt'>>
  ): SessionRow | null {
    const now = new Date().toISOString();
    this.client
      .update(sessions)
      .set({ ...updates, updatedAt: updates.updatedAt ?? now })
      .where(eq(sessions.id, id))
      .run();
    return this.findById(id);
  }

  listByGroup(groupId: string): SessionRow[] {
    return this.client
      .select()
      .from(sessions)
      .where(eq(sessions.groupId, groupId))
      .orderBy(asc(sessions.effectiveDate), asc(sessions.effectiveStartTime))
      .all();
  }

  listByEffectiveDate(date: string): SessionRow[] {
    return this.client
      .select()
      .from(sessions)
      .where(eq(sessions.effectiveDate, date))
      .orderBy(asc(sessions.effectiveStartTime))
      .all();
  }

  listByDateRange(startDate: string, endDate: string, groupId?: string): SessionRow[] {
    const conditions = [
      gte(sessions.effectiveDate, startDate),
      lte(sessions.effectiveDate, endDate),
    ];
    if (groupId) {
      conditions.push(eq(sessions.groupId, groupId));
    }
    return this.client
      .select()
      .from(sessions)
      .where(and(...conditions))
      .orderBy(asc(sessions.effectiveDate), asc(sessions.effectiveStartTime))
      .all();
  }

  deleteUntouchedFutureScheduledSessions(
    groupId: string,
    fromDate: string,
    fromTime?: string,
    scheduleIds?: string[]
  ): number {
    const isStrictlyFuture = fromTime
      ? or(
          gt(sessions.effectiveDate, fromDate),
          and(
            eq(sessions.effectiveDate, fromDate),
            gt(sessions.effectiveStartTime, fromTime)
          )
        )
      : gte(sessions.effectiveDate, fromDate);

    const conditions = [
      eq(sessions.groupId, groupId),
      eq(sessions.status, 'SCHEDULED'),
      isNull(sessions.rescheduleReason),
      isStrictlyFuture,
    ];
    if (scheduleIds && scheduleIds.length > 0) {
      conditions.push(inArray(sessions.scheduleId, scheduleIds));
    }
    const result = this.client
      .delete(sessions)
      .where(and(...conditions))
      .run();
    return result.changes;
  }
}
