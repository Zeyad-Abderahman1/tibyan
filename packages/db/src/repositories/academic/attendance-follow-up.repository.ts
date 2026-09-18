import { eq, inArray } from 'drizzle-orm';
import { type AcademicDrizzle, getAcademicDatabase } from '../../connection.js';
import {
  attendanceFollowUps,
  type AttendanceFollowUpRow,
  type NewAttendanceFollowUpRow,
} from '../../schema/academic.schema.js';

export class AttendanceFollowUpRepository {
  constructor(private db?: AcademicDrizzle) {}

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  findById(id: string): AttendanceFollowUpRow | null {
    const row = this.client
      .select()
      .from(attendanceFollowUps)
      .where(eq(attendanceFollowUps.id, id))
      .get();
    return row ?? null;
  }

  findByAttendanceRecordId(attendanceRecordId: string): AttendanceFollowUpRow | null {
    const row = this.client
      .select()
      .from(attendanceFollowUps)
      .where(eq(attendanceFollowUps.attendanceRecordId, attendanceRecordId))
      .get();
    return row ?? null;
  }

  listByAttendanceRecordIds(recordIds: string[]): AttendanceFollowUpRow[] {
    if (recordIds.length === 0) return [];
    return this.client
      .select()
      .from(attendanceFollowUps)
      .where(inArray(attendanceFollowUps.attendanceRecordId, recordIds))
      .all();
  }

  upsert(followUp: NewAttendanceFollowUpRow): AttendanceFollowUpRow {
    const now = followUp.updatedAt ?? new Date().toISOString();
    this.client
      .insert(attendanceFollowUps)
      .values({
        ...followUp,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: attendanceFollowUps.attendanceRecordId,
        set: {
          contactStatus: followUp.contactStatus,
          note: followUp.note,
          contactedAt: followUp.contactedAt,
          contactedByUserId: followUp.contactedByUserId,
          updatedAt: now,
        },
      })
      .run();

    const saved = this.findByAttendanceRecordId(followUp.attendanceRecordId);
    if (!saved) {
      throw new Error(
        `Failed to upsert attendance follow up for record ${followUp.attendanceRecordId}`
      );
    }
    return saved;
  }

  deleteByAttendanceRecordId(attendanceRecordId: string): void {
    this.client
      .delete(attendanceFollowUps)
      .where(eq(attendanceFollowUps.attendanceRecordId, attendanceRecordId))
      .run();
  }
}
