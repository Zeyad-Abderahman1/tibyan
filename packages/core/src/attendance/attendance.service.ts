import crypto from 'crypto';
import {
  type AttendanceRecordDto,
  type SessionAttendanceRosterDto,
  type SessionRosterItemDto,
  type RecordAttendanceInput,
  type BatchRecordAttendanceInput,
  type CompleteSessionInput,
  type EndOfDayFollowUpDto,
  type EndOfDayFollowUpItemDto,
  type AttendanceFollowUpDto,
  type UpdateFollowUpStatusInput,
  type SessionDto,
  RecordAttendanceInputSchema,
  BatchRecordAttendanceInputSchema,
  UpdateFollowUpStatusInputSchema,
  CalendarDateSchema,
  type PermissionCode,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  getAcademicDatabase,
  AttendanceRepository,
  AttendanceFollowUpRepository,
  SessionRepository,
  GroupRepository,
  EnrollmentRepository,
  StudentRepository,
  AcademicAuditRepository,
  type AttendanceRecordRow,
  type AttendanceFollowUpRow,
} from '@tibyan/db';
import { requirePermission } from '../auth/permissions.js';
import type { AuthenticatedUser } from '../students/student.service.js';
import {
  type AnyActor,
  isSystemActor,
  SessionService,
} from '../groups/session.service.js';

export type AttendanceErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'STUDENT_NOT_FOUND'
  | 'STUDENT_NOT_ENROLLED'
  | 'SESSION_CANCELLED'
  | 'INVALID_ARRIVAL_TIME'
  | 'INVALID_PHOTO_PATH'
  | 'PERMISSION_DENIED'
  | 'ATTENDANCE_RECORD_NOT_FOUND'
  | 'INVALID_INPUT';

export class AttendanceError extends Error {
  constructor(public readonly code: AttendanceErrorCode, message: string) {
    super(message);
    this.name = 'AttendanceError';
  }
}

export class AttendanceService {
  public readonly attendanceRepo: AttendanceRepository;
  public readonly sessionRepo: SessionRepository;
  public readonly groupRepo: GroupRepository;
  public readonly enrollmentRepo: EnrollmentRepository;
  public readonly studentRepo: StudentRepository;
  public readonly auditRepo: AcademicAuditRepository;
  public readonly followUpRepo: AttendanceFollowUpRepository;
  public readonly sessionService: SessionService;

  constructor(private db?: AcademicDrizzle) {
    this.attendanceRepo = new AttendanceRepository(this.db);
    this.followUpRepo = new AttendanceFollowUpRepository(this.db);
    this.sessionRepo = new SessionRepository(this.db);
    this.groupRepo = new GroupRepository(this.db);
    this.enrollmentRepo = new EnrollmentRepository(this.db);
    this.studentRepo = new StudentRepository(this.db);
    this.auditRepo = new AcademicAuditRepository(this.db);
    this.sessionService = new SessionService(this.db);
  }

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  private checkPermission(actor: AnyActor, permission: PermissionCode): void {
    if (isSystemActor(actor)) return;
    try {
      requirePermission(actor.role, actor.permissions ?? [], permission);
    } catch (err: any) {
      throw new AttendanceError(
        'PERMISSION_DENIED',
        err.message || `Permission denied: ${permission}`
      );
    }
  }

  private isStudentEnrolledOnDate(
    enrollment: { enrolledAt: string; leftAt: string | null },
    effectiveDate: string
  ): boolean {
    const enrolledDate = enrollment.enrolledAt.slice(0, 10);
    if (enrolledDate > effectiveDate) return false;
    if (enrollment.leftAt) {
      const leftDate = enrollment.leftAt.slice(0, 10);
      if (leftDate < effectiveDate) return false;
    }
    return true;
  }

  private toSafePhotoUrl(photoPath: string | null): string | null {
    if (!photoPath) return null;
    const normalized = photoPath.trim().replace(/\\/g, '/');
    if (
      normalized.startsWith('/') ||
      /^[a-zA-Z]:/.test(normalized) ||
      normalized.startsWith('//') ||
      normalized.includes('..') ||
      normalized.toLowerCase().includes('appdata')
    ) {
      throw new AttendanceError('INVALID_PHOTO_PATH', 'Dangerous or absolute photoPath detected');
    }
    const cleanPath = normalized.startsWith('tibyan-media://')
      ? normalized.replace(/^tibyan-media:\/\//, '')
      : normalized;
    return `tibyan-media://${cleanPath}`;
  }

  /**
   * Retrieves the full roster for a session, including active enrolled students as of
   * session.effectiveDate, any recorded attendance entries, and an aggregate summary count.
   * Roster data is minimized (no financial or guardian phone data exposed).
   */
  async getSessionRoster(
    sessionId: string,
    actor: AnyActor
  ): Promise<SessionAttendanceRosterDto> {
    this.checkPermission(actor, 'GROUPS_READ');

    const sessionDto = await this.sessionService.getSessionById(sessionId, actor);
    const group = this.groupRepo.findById(sessionDto.groupId);
    if (!group) {
      throw new AttendanceError('SESSION_NOT_FOUND', `Group not found for session: ${sessionId}`);
    }

    // Get active enrollments for this group as of session.effectiveDate
    const enrollments = this.enrollmentRepo
      .listByGroup(sessionDto.groupId)
      .filter((e) => this.isStudentEnrolledOnDate(e, sessionDto.effectiveDate));

    // Get attendance records for this session
    const attendanceRecords = this.attendanceRepo.listBySessionId(sessionId);
    const attendanceMap = new Map<string, AttendanceRecordRow>();
    for (const rec of attendanceRecords) {
      attendanceMap.set(rec.studentId, rec);
    }

    // Build roster items with minimized data projection and safe media URL
    const roster: SessionRosterItemDto[] = [];
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let unmarkedCount = 0;

    for (const enrollment of enrollments) {
      const student = this.studentRepo.findById(enrollment.studentId);
      if (!student) continue;

      const rec = attendanceMap.get(student.id);
      let recordDto: AttendanceRecordDto | null = null;

      if (rec) {
        recordDto = this.toAttendanceRecordDto(rec);
        if (rec.status === 'PRESENT') presentCount++;
        else if (rec.status === 'ABSENT') absentCount++;
        else if (rec.status === 'LATE') lateCount++;
        else if (rec.status === 'EXCUSED') excusedCount++;
      } else {
        unmarkedCount++;
      }

      roster.push({
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        photoUrl: this.toSafePhotoUrl(student.photoPath),
        enrollmentId: enrollment.id,
        attendanceRecord: recordDto,
      });
    }

    // Sort roster alphabetically by student name
    roster.sort((a, b) => a.studentName.localeCompare(b.studentName, 'ar'));

    return {
      session: sessionDto,
      groupName: group.name,
      roster,
      summary: {
        totalStudents: roster.length,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
        unmarked: unmarkedCount,
      },
    };
  }

  /**
   * Records or updates attendance for a single student in a session.
   * Validates temporal enrollment and rejects cancelled sessions.
   * Atomically logs mutation to academic audit log.
   */
  async recordAttendance(
    input: RecordAttendanceInput,
    actor: AnyActor
  ): Promise<AttendanceRecordDto> {
    this.checkPermission(actor, 'ATTENDANCE_WRITE');

    const validated = RecordAttendanceInputSchema.parse(input);

    const session = this.sessionRepo.findById(validated.sessionId);
    if (!session) {
      throw new AttendanceError('SESSION_NOT_FOUND', `Session not found: ${validated.sessionId}`);
    }

    if (session.status === 'CANCELLED_BY_TEACHER') {
      throw new AttendanceError('SESSION_CANCELLED', 'Cannot record attendance for a cancelled session');
    }

    const student = this.studentRepo.findById(validated.studentId);
    if (!student) {
      throw new AttendanceError('STUDENT_NOT_FOUND', `Student not found: ${validated.studentId}`);
    }

    // Validate temporal enrollment as of session.effectiveDate
    const enrollments = this.enrollmentRepo
      .listByGroup(session.groupId)
      .filter((e) => e.studentId === validated.studentId && this.isStudentEnrolledOnDate(e, session.effectiveDate));

    if (enrollments.length === 0) {
      throw new AttendanceError(
        'STUDENT_NOT_ENROLLED',
        `Student is not enrolled in this group on session date ${session.effectiveDate}`
      );
    }

    // Enforce arrival time normalization based on status
    let normalizedArrivalTime: string | null = null;
    if (validated.status === 'LATE') {
      if (!validated.arrivalTime) {
        throw new AttendanceError('INVALID_ARRIVAL_TIME', 'Arrival time is required for LATE status');
      }
      normalizedArrivalTime = validated.arrivalTime;
    } else if (validated.status === 'PRESENT') {
      normalizedArrivalTime = validated.arrivalTime ?? null;
    } else {
      if (validated.arrivalTime != null) {
        throw new AttendanceError('INVALID_ARRIVAL_TIME', 'Arrival time must be null for ABSENT or EXCUSED');
      }
      normalizedArrivalTime = null;
    }

    const existingRecord = this.attendanceRepo.findBySessionAndStudent(
      validated.sessionId,
      validated.studentId
    );

    const nowIso = new Date().toISOString();
    const isSystem = isSystemActor(actor);
    const actorUserId = isSystem ? null : (actor as AuthenticatedUser).userId;

    const saved = this.client.transaction((tx) => {
      const attendanceRepoTx = new AttendanceRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const recordId = existingRecord ? existingRecord.id : crypto.randomUUID();
      const upserted = attendanceRepoTx.upsert({
        id: recordId,
        sessionId: validated.sessionId,
        studentId: validated.studentId,
        status: validated.status,
        arrivalTime: normalizedArrivalTime,
        notes: validated.notes ?? null,
        recordedByUserId: actorUserId,
        recordedAt: existingRecord ? existingRecord.recordedAt : nowIso,
        updatedAt: nowIso,
      });

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: isSystem ? 'SYSTEM' : 'USER',
        actorUserId,
        actorNameSnapshot: actor.fullName,
        action: existingRecord ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_RECORDED',
        entityType: 'ATTENDANCE',
        entityId: upserted.id,
        beforeJson: existingRecord ? JSON.stringify(this.toAttendanceRecordDto(existingRecord)) : null,
        afterJson: JSON.stringify(this.toAttendanceRecordDto(upserted)),
        metadataJson: JSON.stringify({
          sessionId: validated.sessionId,
          studentId: validated.studentId,
          status: validated.status,
          arrivalTime: normalizedArrivalTime,
        }),
        createdAt: nowIso,
      });

      return upserted;
    });

    return this.toAttendanceRecordDto(saved);
  }

  /**
   * Atomically records/updates attendance for multiple students in a session.
   * Rejects duplicate students and validates temporal enrollment.
   */
  async batchRecordAttendance(
    input: BatchRecordAttendanceInput,
    actor: AnyActor
  ): Promise<AttendanceRecordDto[]> {
    this.checkPermission(actor, 'ATTENDANCE_WRITE');

    const validated = BatchRecordAttendanceInputSchema.parse(input);

    const session = this.sessionRepo.findById(validated.sessionId);
    if (!session) {
      throw new AttendanceError('SESSION_NOT_FOUND', `Session not found: ${validated.sessionId}`);
    }

    if (session.status === 'CANCELLED_BY_TEACHER') {
      throw new AttendanceError('SESSION_CANCELLED', 'Cannot record attendance for a cancelled session');
    }

    // Pre-load all enrollments for this group on session.effectiveDate
    const eligibleEnrollments = this.enrollmentRepo
      .listByGroup(session.groupId)
      .filter((e) => this.isStudentEnrolledOnDate(e, session.effectiveDate));
    const eligibleStudentIds = new Set(eligibleEnrollments.map((e) => e.studentId));

    for (const item of validated.records) {
      if (!eligibleStudentIds.has(item.studentId)) {
        throw new AttendanceError(
          'STUDENT_NOT_ENROLLED',
          `Student ${item.studentId} is not enrolled on session date ${session.effectiveDate}`
        );
      }
    }

    const nowIso = new Date().toISOString();
    const isSystem = isSystemActor(actor);
    const actorUserId = isSystem ? null : (actor as AuthenticatedUser).userId;

    const savedRecords = this.client.transaction((tx) => {
      const attendanceRepoTx = new AttendanceRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);
      const results: AttendanceRecordRow[] = [];

      for (const item of validated.records) {
        const student = this.studentRepo.findById(item.studentId);
        if (!student) {
          throw new AttendanceError('STUDENT_NOT_FOUND', `Student not found: ${item.studentId}`);
        }

        let normalizedArrivalTime: string | null = null;
        if (item.status === 'LATE') {
          if (!item.arrivalTime) {
            throw new AttendanceError('INVALID_ARRIVAL_TIME', 'Arrival time is required for LATE status');
          }
          normalizedArrivalTime = item.arrivalTime;
        } else if (item.status === 'PRESENT') {
          normalizedArrivalTime = item.arrivalTime ?? null;
        } else {
          if (item.arrivalTime != null) {
            throw new AttendanceError('INVALID_ARRIVAL_TIME', 'Arrival time must be null for ABSENT or EXCUSED');
          }
          normalizedArrivalTime = null;
        }

        const existingRecord = attendanceRepoTx.findBySessionAndStudent(
          validated.sessionId,
          item.studentId
        );

        const recordId = existingRecord ? existingRecord.id : crypto.randomUUID();
        const upserted = attendanceRepoTx.upsert({
          id: recordId,
          sessionId: validated.sessionId,
          studentId: item.studentId,
          status: item.status,
          arrivalTime: normalizedArrivalTime,
          notes: item.notes ?? null,
          recordedByUserId: actorUserId,
          recordedAt: existingRecord ? existingRecord.recordedAt : nowIso,
          updatedAt: nowIso,
        });

        auditRepoTx.insert({
          id: crypto.randomUUID(),
          actorType: isSystem ? 'SYSTEM' : 'USER',
          actorUserId,
          actorNameSnapshot: actor.fullName,
          action: existingRecord ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_RECORDED',
          entityType: 'ATTENDANCE',
          entityId: upserted.id,
          beforeJson: existingRecord ? JSON.stringify(this.toAttendanceRecordDto(existingRecord)) : null,
          afterJson: JSON.stringify(this.toAttendanceRecordDto(upserted)),
          metadataJson: JSON.stringify({
            sessionId: validated.sessionId,
            studentId: item.studentId,
            status: item.status,
            arrivalTime: normalizedArrivalTime,
          }),
          createdAt: nowIso,
        });

        results.push(upserted);
      }

      return results;
    });

    return savedRecords.map((r) => this.toAttendanceRecordDto(r));
  }

  /**
   * Completes a session delegating authoritatively to SessionService.
   */
  async completeSession(
    input: CompleteSessionInput,
    actor: AnyActor
  ): Promise<SessionDto> {
    return this.sessionService.completeSession(input, actor);
  }

  /**
   * Compiles End-of-Day Follow-Up items for absent and late students on a given date,
   * generating polite Arabic WhatsApp notification drafts without hardcoded subjects.
   * Cancelled teacher sessions are strictly excluded.
   */
  async getEndOfDayFollowUp(
    dateStr: string,
    actor: AnyActor
  ): Promise<EndOfDayFollowUpDto> {
    this.checkPermission(actor, 'GROUPS_READ');

    // Validate date
    CalendarDateSchema.parse(dateStr);

    const details = this.attendanceRepo.listByDateWithDetails(dateStr);
    const sessionsOnDate = this.sessionRepo
      .listByEffectiveDate(dateStr)
      .filter((s) => s.status !== 'CANCELLED_BY_TEACHER');
    const validSessionIds = new Set(sessionsOnDate.map((s) => s.id));

    // Exclude cancelled sessions from follow-up items
    const activeDetails = details.filter((d) => validSessionIds.has(d.sessionId));

    const followUps: EndOfDayFollowUpItemDto[] = [];
    let totalAbsent = 0;
    let totalLate = 0;

    for (const d of activeDetails) {
      if (d.status === 'ABSENT') {
        totalAbsent++;
        followUps.push({
          attendanceRecordId: d.id,
          studentId: d.studentId,
          studentName: d.studentName,
          guardianPhone: d.guardianPhone,
          sessionId: d.sessionId,
          groupName: d.groupName,
          status: 'ABSENT',
          sessionDate: d.sessionDate,
          sessionStartTime: d.sessionStartTime,
          whatsappMessage: `السلام عليكم ورحمة الله وبركاته، ولي أمر الطالب/ة ${d.studentName}. نود إحاطتكم بعلم أن الطالب/ة غاب/ت عن حضور حصة اليوم (${d.sessionDate}) لمجموعة ${d.groupName}. يرجى المتابعة لتعويض ما فاته.`,
          contactStatus: d.contactStatus,
          contactedAt: d.contactedAt,
          contactedByUserId: d.contactedByUserId,
          contactNote: d.contactNote,
        });
      } else if (d.status === 'LATE') {
        totalLate++;
        const timeInfo = d.arrivalTime ? ` (حضر في تمام الساعة ${d.arrivalTime})` : '';
        followUps.push({
          attendanceRecordId: d.id,
          studentId: d.studentId,
          studentName: d.studentName,
          guardianPhone: d.guardianPhone,
          sessionId: d.sessionId,
          groupName: d.groupName,
          status: 'LATE',
          sessionDate: d.sessionDate,
          sessionStartTime: d.sessionStartTime,
          whatsappMessage: `السلام عليكم ورحمة الله وبركاته، ولي أمر الطالب/ة ${d.studentName}. نود إحاطتكم بعلم أن الطالب/ة تأخر/ت عن موعد بدء الحصة لمجموعة ${d.groupName} اليوم (${d.sessionDate})${timeInfo}. نرجو الحرص على الحضور في الموعد المحدد.`,
          contactStatus: d.contactStatus,
          contactedAt: d.contactedAt,
          contactedByUserId: d.contactedByUserId,
          contactNote: d.contactNote,
        });
      }
    }

    return {
      date: dateStr,
      totalSessions: sessionsOnDate.length,
      totalAbsent,
      totalLate,
      followUps,
    };
  }

  /**
   * Authoritatively updates parent follow-up contact status and notes for an absent/late student.
   * Atomically records audit trail in academic_audit_log.
   */
  async updateFollowUpStatus(
    input: UpdateFollowUpStatusInput,
    actor: AnyActor
  ): Promise<AttendanceFollowUpDto> {
    this.checkPermission(actor, 'ATTENDANCE_WRITE');

    const validated = UpdateFollowUpStatusInputSchema.parse(input);

    const record = this.attendanceRepo.findById(validated.attendanceRecordId);
    if (!record) {
      throw new AttendanceError(
        'ATTENDANCE_RECORD_NOT_FOUND',
        `Attendance record not found: ${validated.attendanceRecordId}`
      );
    }

    const nowIso = new Date().toISOString();
    const isSystem = isSystemActor(actor);
    const actorUserId = isSystem ? null : (actor as AuthenticatedUser).userId;

    const saved = this.client.transaction((tx) => {
      const followUpRepoTx = new AttendanceFollowUpRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const existing = followUpRepoTx.findByAttendanceRecordId(validated.attendanceRecordId);
      const followUpId = existing ? existing.id : crypto.randomUUID();

      const contactedAt =
        validated.contactStatus === 'UNCONTACTED'
          ? null
          : (existing?.contactedAt ?? nowIso);
      const contactedByUserId =
        validated.contactStatus === 'UNCONTACTED'
          ? null
          : (existing?.contactedByUserId ?? actorUserId);

      const upserted = followUpRepoTx.upsert({
        id: followUpId,
        attendanceRecordId: validated.attendanceRecordId,
        contactStatus: validated.contactStatus,
        note: validated.note ?? null,
        contactedAt,
        contactedByUserId,
        createdAt: existing ? existing.createdAt : nowIso,
        updatedAt: nowIso,
      });

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: isSystem ? 'SYSTEM' : 'USER',
        actorUserId,
        actorNameSnapshot: actor.fullName,
        action: 'FOLLOW_UP_STATUS_UPDATED',
        entityType: 'ATTENDANCE_FOLLOW_UP',
        entityId: upserted.id,
        beforeJson: existing ? JSON.stringify(this.toAttendanceFollowUpDto(existing)) : null,
        afterJson: JSON.stringify(this.toAttendanceFollowUpDto(upserted)),
        metadataJson: JSON.stringify({
          attendanceRecordId: validated.attendanceRecordId,
          contactStatus: validated.contactStatus,
        }),
        createdAt: nowIso,
      });

      return upserted;
    });

    return this.toAttendanceFollowUpDto(saved);
  }

  private toAttendanceFollowUpDto(row: AttendanceFollowUpRow): AttendanceFollowUpDto {
    return {
      id: row.id,
      attendanceRecordId: row.attendanceRecordId,
      contactStatus: row.contactStatus,
      note: row.note,
      contactedAt: row.contactedAt,
      contactedByUserId: row.contactedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toAttendanceRecordDto(row: AttendanceRecordRow): AttendanceRecordDto {
    return {
      id: row.id,
      sessionId: row.sessionId,
      studentId: row.studentId,
      status: row.status,
      arrivalTime: row.arrivalTime,
      notes: row.notes,
      recordedByUserId: row.recordedByUserId,
      recordedAt: row.recordedAt,
      updatedAt: row.updatedAt,
    };
  }
}
