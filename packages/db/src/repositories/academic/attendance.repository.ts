import { eq, and } from 'drizzle-orm';
import { type AcademicDrizzle, getAcademicDatabase } from '../../connection.js';
import {
  attendanceRecords,
  sessions,
  students,
  groups,
  type AttendanceRecordRow,
  type NewAttendanceRecordRow,
} from '../../schema/academic.schema.js';
import { AttendanceStatus } from '@tibyan/contracts';

export interface AttendanceDetailRow {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  guardianPhone: string;
  groupName: string;
  status: AttendanceStatus;
  arrivalTime: string | null;
  notes: string | null;
  sessionDate: string;
  sessionStartTime: string;
  recordedByUserId: string | null;
  recordedAt: string;
  updatedAt: string;
}

export class AttendanceRepository {
  constructor(private db?: AcademicDrizzle) {}

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  findById(id: string): AttendanceRecordRow | null {
    const row = this.client
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, id))
      .get();
    return row ?? null;
  }

  findBySessionAndStudent(sessionId: string, studentId: string): AttendanceRecordRow | null {
    const row = this.client
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.sessionId, sessionId),
          eq(attendanceRecords.studentId, studentId)
        )
      )
      .get();
    return row ?? null;
  }

  listBySessionId(sessionId: string): AttendanceRecordRow[] {
    return this.client
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, sessionId))
      .all();
  }

  upsert(record: NewAttendanceRecordRow): AttendanceRecordRow {
    const now = record.updatedAt ?? new Date().toISOString();
    this.client
      .insert(attendanceRecords)
      .values({
        ...record,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [attendanceRecords.sessionId, attendanceRecords.studentId],
        set: {
          status: record.status,
          arrivalTime: record.arrivalTime,
          notes: record.notes,
          recordedByUserId: record.recordedByUserId,
          updatedAt: now,
        },
      })
      .run();

    const saved = this.findBySessionAndStudent(record.sessionId, record.studentId);
    if (!saved) {
      throw new Error(
        `Failed to upsert attendance record for session ${record.sessionId} and student ${record.studentId}`
      );
    }
    return saved;
  }

  batchUpsert(records: NewAttendanceRecordRow[]): AttendanceRecordRow[] {
    if (records.length === 0) return [];
    return records.map((rec) => this.upsert(rec));
  }

  listByDateWithDetails(date: string): AttendanceDetailRow[] {
    const rows = this.client
      .select({
        id: attendanceRecords.id,
        sessionId: attendanceRecords.sessionId,
        studentId: attendanceRecords.studentId,
        studentName: students.fullName,
        guardianPhone: students.guardianPhone,
        groupName: groups.name,
        status: attendanceRecords.status,
        arrivalTime: attendanceRecords.arrivalTime,
        notes: attendanceRecords.notes,
        sessionDate: sessions.effectiveDate,
        sessionStartTime: sessions.effectiveStartTime,
        recordedByUserId: attendanceRecords.recordedByUserId,
        recordedAt: attendanceRecords.recordedAt,
        updatedAt: attendanceRecords.updatedAt,
      })
      .from(attendanceRecords)
      .innerJoin(sessions, eq(attendanceRecords.sessionId, sessions.id))
      .innerJoin(students, eq(attendanceRecords.studentId, students.id))
      .innerJoin(groups, eq(sessions.groupId, groups.id))
      .where(eq(sessions.effectiveDate, date))
      .all();

    return rows as AttendanceDetailRow[];
  }

  countByStatusForSession(sessionId: string): {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  } {
    const records = this.listBySessionId(sessionId);
    const summary = {
      total: records.length,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };
    for (const rec of records) {
      if (rec.status === 'PRESENT') summary.present++;
      else if (rec.status === 'ABSENT') summary.absent++;
      else if (rec.status === 'LATE') summary.late++;
      else if (rec.status === 'EXCUSED') summary.excused++;
    }
    return summary;
  }
}
