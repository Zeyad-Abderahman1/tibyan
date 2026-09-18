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
  type SessionDto,
  RecordAttendanceInputSchema,
  BatchRecordAttendanceInputSchema,
  CalendarDateSchema,
  type PermissionCode,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  getAcademicDatabase,
  AttendanceRepository,
  SessionRepository,
  GroupRepository,
  EnrollmentRepository,
  StudentRepository,
  AcademicAuditRepository,
  type AttendanceRecordRow,
} from '@tibyan/db';
import { requirePermission } from '../auth/permissions.js';
import type { AuthenticatedUser } from '../students/student.service.js';
import {
  type AnyActor,
  isSystemActor,
  SessionService,
} from '../groups/session.service.js';
import { calculateEffectivePayment } from '../groups/payment-inheritance.js';

export type AttendanceErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'STUDENT_NOT_FOUND'
  | 'PERMISSION_DENIED'
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
  public readonly sessionService: SessionService;

  constructor(private db?: AcademicDrizzle) {
    this.attendanceRepo = new AttendanceRepository(this.db);
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

  /**
   * Retrieves the full roster for a session, including active enrolled students,
   * any recorded attendance entries, and an aggregate summary count.
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

    // Get active enrollments for this group
    const enrollments = this.enrollmentRepo
      .listByGroup(sessionDto.groupId)
      .filter((e) => e.status === 'ACTIVE');

    // Get attendance records for this session
    const attendanceRecords = this.attendanceRepo.listBySessionId(sessionId);
    const attendanceMap = new Map<string, AttendanceRecordRow>();
    for (const rec of attendanceRecords) {
      attendanceMap.set(rec.studentId, rec);
    }

    // Build roster items
    const roster: SessionRosterItemDto[] = [];
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let unmarkedCount = 0;

    for (const enrollment of enrollments) {
      const student = this.studentRepo.findById(enrollment.studentId);
      if (!student) continue;

      const effective = calculateEffectivePayment(
        {
          defaultPaymentType: group.defaultPaymentType,
          defaultPaymentAmount: group.defaultPaymentAmount,
        },
        {
          paymentTypeOverride: enrollment.paymentTypeOverride,
          paymentAmountOverride: enrollment.paymentAmountOverride,
        }
      );

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
        studentName: student.fullName,
        guardianPhone: student.guardianPhone,
        enrollmentId: enrollment.id,
        paymentType: effective.paymentType,
        paymentAmount: effective.amount,
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

    const student = this.studentRepo.findById(validated.studentId);
    if (!student) {
      throw new AttendanceError('STUDENT_NOT_FOUND', `Student not found: ${validated.studentId}`);
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
        arrivalTime: validated.arrivalTime ?? null,
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
          arrivalTime: validated.arrivalTime ?? null,
        }),
        createdAt: nowIso,
      });

      return upserted;
    });

    return this.toAttendanceRecordDto(saved);
  }

  /**
   * Atomically records/updates attendance for multiple students in a session.
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
          arrivalTime: item.arrivalTime ?? null,
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
   * Completes a session.
   */
  async completeSession(
    input: CompleteSessionInput,
    actor: AnyActor
  ): Promise<SessionDto> {
    return this.sessionService.completeSession(input, actor);
  }

  /**
   * Compiles End-of-Day Follow-Up items for all absent and late students on a given date,
   * generating polite Arabic WhatsApp notification drafts.
   */
  async getEndOfDayFollowUp(
    dateStr: string,
    actor: AnyActor
  ): Promise<EndOfDayFollowUpDto> {
    this.checkPermission(actor, 'GROUPS_READ');

    // Validate date
    CalendarDateSchema.parse(dateStr);

    const details = this.attendanceRepo.listByDateWithDetails(dateStr);
    const sessionsOnDate = this.sessionRepo.listByEffectiveDate(dateStr);

    const followUps: EndOfDayFollowUpItemDto[] = [];
    let totalAbsent = 0;
    let totalLate = 0;

    for (const d of details) {
      if (d.status === 'ABSENT') {
        totalAbsent++;
        followUps.push({
          studentId: d.studentId,
          studentName: d.studentName,
          guardianPhone: d.guardianPhone,
          sessionId: d.sessionId,
          groupName: d.groupName,
          status: 'ABSENT',
          sessionDate: d.sessionDate,
          sessionStartTime: d.sessionStartTime,
          whatsappMessage: `السلام عليكم ورحمة الله وبركاته، ولي أمر الطالب/ة ${d.studentName}. نود إحاطتكم بعلم أن الطالب/ة غاب/ت عن حضور حصة الرياضيات اليوم (${d.sessionDate}) لمجموعة ${d.groupName}. يرجى المتابعة لتعويض ما فاته.`,
        });
      } else if (d.status === 'LATE') {
        totalLate++;
        const timeInfo = d.arrivalTime ? ` (حضر في تمام الساعة ${d.arrivalTime})` : '';
        followUps.push({
          studentId: d.studentId,
          studentName: d.studentName,
          guardianPhone: d.guardianPhone,
          sessionId: d.sessionId,
          groupName: d.groupName,
          status: 'LATE',
          sessionDate: d.sessionDate,
          sessionStartTime: d.sessionStartTime,
          whatsappMessage: `السلام عليكم ورحمة الله وبركاته، ولي أمر الطالب/ة ${d.studentName}. نود إحاطتكم بعلم أن الطالب/ة تأخر/ت عن موعد بدء حصة الرياضيات لمجموعة ${d.groupName} اليوم (${d.sessionDate})${timeInfo}. نرجو الحرص على الحضور في الموعد المحدد.`,
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
