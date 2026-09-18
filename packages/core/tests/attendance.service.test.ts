import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  openAcademicDatabase,
  closeAllDatabases,
  type AcademicDatabaseConnection,
  AcademicAuditRepository,
  SessionRepository,
  GroupRepository,
  StudentRepository,
  EnrollmentRepository,
  AttendanceRepository,
} from '@tibyan/db';
import {
  AttendanceService,
  AttendanceError,
} from '../src/attendance/attendance.service.js';
import { SessionService, SessionError } from '../src/groups/session.service.js';
import type { AuthenticatedUser } from '../src/students/student.service.js';
import { FixedDateProvider } from '../src/common/date-provider.js';

describe('Task 18: AttendanceService & Session Attendance Core', () => {
  let tempDir: string;
  let acadConn: AcademicDatabaseConnection;
  let attendanceService: AttendanceService;
  let sessionService: SessionService;
  let attendanceRepo: AttendanceRepository;
  let sessionRepo: SessionRepository;
  let groupRepo: GroupRepository;
  let studentRepo: StudentRepository;
  let enrollmentRepo: EnrollmentRepository;
  let auditRepo: AcademicAuditRepository;

  const ownerActor: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'الأستاذ أحمد الشريف',
    role: 'OWNER',
    permissions: [],
  };

  const assistantActor: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'أحمد المساعد (حضور وجلسات)',
    role: 'ASSISTANT',
    permissions: ['GROUPS_READ', 'ATTENDANCE_WRITE', 'SESSIONS_MANAGE'],
  };

  const readOnlyActor: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'محمود قارئ فقط',
    role: 'ASSISTANT',
    permissions: ['GROUPS_READ'],
  };

  const systemActor = {
    actorType: 'SYSTEM' as const,
    fullName: 'نظام تِبيان الآلي',
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-attendance-test-'));
    const dbPath = path.join(tempDir, 'academic.db');
    acadConn = openAcademicDatabase(dbPath);

    attendanceService = new AttendanceService(acadConn.db);
    sessionService = new SessionService(acadConn.db, new FixedDateProvider('2026-10-01', '12:00'));

    attendanceRepo = new AttendanceRepository(acadConn.db);
    sessionRepo = new SessionRepository(acadConn.db);
    groupRepo = new GroupRepository(acadConn.db);
    studentRepo = new StudentRepository(acadConn.db);
    enrollmentRepo = new EnrollmentRepository(acadConn.db);
    auditRepo = new AcademicAuditRepository(acadConn.db);
  });

  afterEach(() => {
    closeAllDatabases();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  function createTestFixture() {
    const now = new Date().toISOString();
    const group = groupRepo.create({
      id: crypto.randomUUID(),
      name: 'مجموعة 2ث تفوق',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_2',
      languageTrack: 'ARABIC',
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 300,
      createdAt: now,
      updatedAt: now,
    });

    const student1 = studentRepo.create({
      id: crypto.randomUUID(),
      studentCode: 'STU-001',
      fullName: 'أحمد محمود',
      guardianPhone: '01012345678',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_2',
      languageTrack: 'ARABIC',
      status: 'ACTIVE',
      qrToken: 'qr-001',
      barcodeValue: 'bar-001',
      createdAt: now,
      updatedAt: now,
    });

    const student2 = studentRepo.create({
      id: crypto.randomUUID(),
      studentCode: 'STU-002',
      fullName: 'بلال علي',
      guardianPhone: '01198765432',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_2',
      languageTrack: 'ARABIC',
      status: 'ACTIVE',
      qrToken: 'qr-002',
      barcodeValue: 'bar-002',
      createdAt: now,
      updatedAt: now,
    });

    const student3 = studentRepo.create({
      id: crypto.randomUUID(),
      studentCode: 'STU-003',
      fullName: 'عمر ياسين',
      guardianPhone: '01234567890',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_2',
      languageTrack: 'ARABIC',
      status: 'ACTIVE',
      qrToken: 'qr-003',
      barcodeValue: 'bar-003',
      createdAt: now,
      updatedAt: now,
    });

    // Active enrollment with defaults for student1
    const enrollment1 = enrollmentRepo.create({
      id: crypto.randomUUID(),
      groupId: group.id,
      studentId: student1.id,
      enrolledAt: now,
      status: 'ACTIVE',
      paymentTypeOverride: null,
      paymentAmountOverride: null,
      createdAt: now,
    });

    // Active enrollment with per-session override for student2
    const enrollment2 = enrollmentRepo.create({
      id: crypto.randomUUID(),
      groupId: group.id,
      studentId: student2.id,
      enrolledAt: now,
      status: 'ACTIVE',
      paymentTypeOverride: 'PER_SESSION',
      paymentAmountOverride: 75,
      createdAt: now,
    });

    // Ended enrollment for student3 (should be excluded from active roster)
    const enrollment3 = enrollmentRepo.create({
      id: crypto.randomUUID(),
      groupId: group.id,
      studentId: student3.id,
      enrolledAt: now,
      status: 'ENDED',
      paymentTypeOverride: null,
      paymentAmountOverride: null,
      createdAt: now,
    });

    const session = sessionRepo.create({
      id: crypto.randomUUID(),
      groupId: group.id,
      scheduleId: null,
      occurrenceKey: `${group.id}_2026-10-01_16:00`,
      scheduledDate: '2026-10-01',
      scheduledStartTime: '16:00',
      effectiveDate: '2026-10-01',
      effectiveStartTime: '16:00',
      durationMinutes: 90,
      status: 'SCHEDULED',
      rescheduleReason: null,
      rescheduledAt: null,
      cancellationReason: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    });

    return { group, student1, student2, student3, enrollment1, enrollment2, enrollment3, session };
  }

  describe('getSessionRoster', () => {
    it('returns empty roster if group has no students', async () => {
      const now = new Date().toISOString();
      const emptyGroup = groupRepo.create({
        id: crypto.randomUUID(),
        name: 'مجموعة فارغة',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        defaultPaymentType: 'MONTHLY',
        defaultPaymentAmount: 250,
        createdAt: now,
        updatedAt: now,
      });

      const session = sessionRepo.create({
        id: crypto.randomUUID(),
        groupId: emptyGroup.id,
        scheduleId: null,
        occurrenceKey: `${emptyGroup.id}_2026-10-01_16:00`,
        scheduledDate: '2026-10-01',
        scheduledStartTime: '16:00',
        effectiveDate: '2026-10-01',
        effectiveStartTime: '16:00',
        durationMinutes: 90,
        status: 'SCHEDULED',
        rescheduleReason: null,
        rescheduledAt: null,
        cancellationReason: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      });

      const roster = await attendanceService.getSessionRoster(session.id, ownerActor);
      expect(roster.roster).toHaveLength(0);
      expect(roster.summary.totalStudents).toBe(0);
      expect(roster.summary.unmarked).toBe(0);
    });

    it('returns active enrolled students and excludes ENDED enrollments', async () => {
      const { session, student1, student2 } = createTestFixture();

      const roster = await attendanceService.getSessionRoster(session.id, assistantActor);
      expect(roster.roster).toHaveLength(2);
      expect(roster.summary.totalStudents).toBe(2);
      expect(roster.summary.unmarked).toBe(2);
      expect(roster.summary.present).toBe(0);

      const studentIds = roster.roster.map((r) => r.studentId);
      expect(studentIds).toContain(student1.id);
      expect(studentIds).toContain(student2.id);
    });

    it('reflects inherited payment defaults vs enrollment overrides in roster', async () => {
      const { session, student1, student2 } = createTestFixture();

      const roster = await attendanceService.getSessionRoster(session.id, ownerActor);
      const item1 = roster.roster.find((r) => r.studentId === student1.id)!;
      expect(item1.paymentType).toBe('MONTHLY');
      expect(item1.paymentAmount).toBe(300);

      const item2 = roster.roster.find((r) => r.studentId === student2.id)!;
      expect(item2.paymentType).toBe('PER_SESSION');
      expect(item2.paymentAmount).toBe(75);
    });

    it('reflects existing attendance records and updates summary counts', async () => {
      const { session, student1, student2 } = createTestFixture();

      // Record attendance for student1 (PRESENT)
      await attendanceService.recordAttendance(
        {
          sessionId: session.id,
          studentId: student1.id,
          status: 'PRESENT',
          arrivalTime: '16:00',
          notes: 'حضر بالموعد',
        },
        assistantActor
      );

      const roster = await attendanceService.getSessionRoster(session.id, ownerActor);
      expect(roster.summary.totalStudents).toBe(2);
      expect(roster.summary.present).toBe(1);
      expect(roster.summary.unmarked).toBe(1);

      const item1 = roster.roster.find((r) => r.studentId === student1.id)!;
      expect(item1.attendanceRecord).toBeDefined();
      expect(item1.attendanceRecord?.status).toBe('PRESENT');
      expect(item1.attendanceRecord?.arrivalTime).toBe('16:00');

      const item2 = roster.roster.find((r) => r.studentId === student2.id)!;
      expect(item2.attendanceRecord).toBeNull();
    });

    it('throws AttendanceError(SESSION_NOT_FOUND) if session does not exist', async () => {
      await expect(
        attendanceService.getSessionRoster(crypto.randomUUID(), ownerActor)
      ).rejects.toThrow(SessionError);
    });
  });

  describe('recordAttendance', () => {
    it('rejects actor without ATTENDANCE_WRITE permission', async () => {
      const { session, student1 } = createTestFixture();

      await expect(
        attendanceService.recordAttendance(
          {
            sessionId: session.id,
            studentId: student1.id,
            status: 'PRESENT',
          },
          readOnlyActor
        )
      ).rejects.toThrow(AttendanceError);
    });

    it('rejects recording attendance for non-existent session', async () => {
      const { student1 } = createTestFixture();

      await expect(
        attendanceService.recordAttendance(
          {
            sessionId: crypto.randomUUID(),
            studentId: student1.id,
            status: 'PRESENT',
          },
          assistantActor
        )
      ).rejects.toThrow(/Session not found/);
    });

    it('rejects recording attendance for non-existent student', async () => {
      const { session } = createTestFixture();

      await expect(
        attendanceService.recordAttendance(
          {
            sessionId: session.id,
            studentId: crypto.randomUUID(),
            status: 'PRESENT',
          },
          assistantActor
        )
      ).rejects.toThrow(/Student not found/);
    });

    it('creates attendance record and writes ATTENDANCE_RECORDED audit entry', async () => {
      const { session, student1 } = createTestFixture();

      const record = await attendanceService.recordAttendance(
        {
          sessionId: session.id,
          studentId: student1.id,
          status: 'PRESENT',
          arrivalTime: '16:05',
          notes: 'حضر',
        },
        assistantActor
      );

      expect(record.sessionId).toBe(session.id);
      expect(record.studentId).toBe(student1.id);
      expect(record.status).toBe('PRESENT');
      expect(record.arrivalTime).toBe('16:05');
      expect(record.recordedByUserId).toBe(assistantActor.userId);

      // Verify audit log
      const audits = auditRepo.findByEntity('ATTENDANCE', record.id);
      expect(audits).toHaveLength(1);
      expect(audits[0]!.action).toBe('ATTENDANCE_RECORDED');
      expect(audits[0]!.actorUserId).toBe(assistantActor.userId);
      expect(audits[0]!.actorType).toBe('USER');
    });

    it('updates attendance record on repeat call and writes ATTENDANCE_UPDATED audit entry', async () => {
      const { session, student1 } = createTestFixture();

      // First call: PRESENT
      const first = await attendanceService.recordAttendance(
        {
          sessionId: session.id,
          studentId: student1.id,
          status: 'PRESENT',
        },
        assistantActor
      );

      // Second call: change to LATE with arrival time
      const second = await attendanceService.recordAttendance(
        {
          sessionId: session.id,
          studentId: student1.id,
          status: 'LATE',
          arrivalTime: '16:20',
          notes: 'تأخير بعذر',
        },
        assistantActor
      );

      expect(second.id).toBe(first.id);
      expect(second.status).toBe('LATE');
      expect(second.arrivalTime).toBe('16:20');

      // Database should only have 1 record for this student/session
      const dbRecords = attendanceRepo.listBySessionId(session.id);
      expect(dbRecords).toHaveLength(1);

      // Verify audit trail has both events (ordered desc by createdAt)
      const audits = auditRepo.findByEntity('ATTENDANCE', first.id);
      expect(audits).toHaveLength(2);
      expect(audits.map((a) => a.action)).toEqual(['ATTENDANCE_UPDATED', 'ATTENDANCE_RECORDED']);
    });

    it('allows system actor to record attendance with actorType SYSTEM and null actorUserId', async () => {
      const { session, student1 } = createTestFixture();

      const record = await attendanceService.recordAttendance(
        {
          sessionId: session.id,
          studentId: student1.id,
          status: 'ABSENT',
        },
        systemActor
      );

      expect(record.recordedByUserId).toBeNull();
      const audits = auditRepo.findByEntity('ATTENDANCE', record.id);
      expect(audits).toHaveLength(1);
      expect(audits[0]!.actorType).toBe('SYSTEM');
      expect(audits[0]!.actorUserId).toBeNull();
    });
  });

  describe('batchRecordAttendance', () => {
    it('rejects actor without ATTENDANCE_WRITE', async () => {
      const { session, student1, student2 } = createTestFixture();

      await expect(
        attendanceService.batchRecordAttendance(
          {
            sessionId: session.id,
            records: [
              { studentId: student1.id, status: 'PRESENT' },
              { studentId: student2.id, status: 'ABSENT' },
            ],
          },
          readOnlyActor
        )
      ).rejects.toThrow(AttendanceError);
    });

    it('records multiple attendance items atomically and writes audit logs', async () => {
      const { session, student1, student2 } = createTestFixture();

      const results = await attendanceService.batchRecordAttendance(
        {
          sessionId: session.id,
          records: [
            { studentId: student1.id, status: 'PRESENT', arrivalTime: '16:00' },
            { studentId: student2.id, status: 'ABSENT', notes: 'غياب بعذر' },
          ],
        },
        assistantActor
      );

      expect(results).toHaveLength(2);
      expect(results[0]!.status).toBe('PRESENT');
      expect(results[1]!.status).toBe('ABSENT');

      const allRecords = attendanceRepo.listBySessionId(session.id);
      expect(allRecords).toHaveLength(2);
    });
  });

  describe('completeSession', () => {
    it('rejects actor without SESSIONS_MANAGE permission', async () => {
      const { session } = createTestFixture();

      await expect(
        attendanceService.completeSession(
          { sessionId: session.id },
          readOnlyActor
        )
      ).rejects.toThrow(SessionError);
    });

    it('marks session as COMPLETED and writes SESSION_COMPLETED audit entry', async () => {
      const { session } = createTestFixture();

      const completed = await attendanceService.completeSession(
        { sessionId: session.id, notes: 'تم إنهاء الحصة وشرح الدرس بالكامل' },
        assistantActor
      );

      expect(completed.status).toBe('COMPLETED');
      expect(completed.notes).toBe('تم إنهاء الحصة وشرح الدرس بالكامل');

      const dbRow = sessionRepo.findById(session.id);
      expect(dbRow?.status).toBe('COMPLETED');
      expect(dbRow?.notes).toBe('تم إنهاء الحصة وشرح الدرس بالكامل');

      const audits = auditRepo.findByEntity('SESSION', session.id);
      const completeAudit = audits.find((a) => a.action === 'SESSION_COMPLETED');
      expect(completeAudit).toBeDefined();
    });

    it('is idempotent if session is already COMPLETED', async () => {
      const { session } = createTestFixture();

      await attendanceService.completeSession(
        { sessionId: session.id, notes: 'إنهاء 1' },
        assistantActor
      );

      const second = await attendanceService.completeSession(
        { sessionId: session.id, notes: 'إنهاء 2' },
        assistantActor
      );

      expect(second.status).toBe('COMPLETED');
    });

    it('rejects completing a session with status CANCELLED_BY_TEACHER', async () => {
      const { session } = createTestFixture();

      await sessionService.cancelSession(
        { sessionId: session.id, reason: 'إلغاء بسبب ظرف طارئ' },
        ownerActor
      );

      await expect(
        attendanceService.completeSession({ sessionId: session.id }, assistantActor)
      ).rejects.toThrow(SessionError);
    });
  });

  describe('getEndOfDayFollowUp', () => {
    it('gathers all absent and late students across sessions on the date with Arabic drafts', async () => {
      const { session, student1, student2 } = createTestFixture();

      // student1 is LATE (arrived 16:15)
      await attendanceService.recordAttendance(
        {
          sessionId: session.id,
          studentId: student1.id,
          status: 'LATE',
          arrivalTime: '16:15',
        },
        assistantActor
      );

      // student2 is ABSENT
      await attendanceService.recordAttendance(
        {
          sessionId: session.id,
          studentId: student2.id,
          status: 'ABSENT',
        },
        assistantActor
      );

      const followUp = await attendanceService.getEndOfDayFollowUp('2026-10-01', ownerActor);

      expect(followUp.date).toBe('2026-10-01');
      expect(followUp.totalSessions).toBe(1);
      expect(followUp.totalAbsent).toBe(1);
      expect(followUp.totalLate).toBe(1);
      expect(followUp.followUps).toHaveLength(2);

      const absentItem = followUp.followUps.find((f) => f.studentId === student2.id)!;
      expect(absentItem.status).toBe('ABSENT');
      expect(absentItem.studentName).toBe('بلال علي');
      expect(absentItem.guardianPhone).toBe('01198765432');
      expect(absentItem.whatsappMessage).toContain('غاب/ت عن حضور حصة الرياضيات');
      expect(absentItem.whatsappMessage).toContain('مجموعة 2ث تفوق');

      const lateItem = followUp.followUps.find((f) => f.studentId === student1.id)!;
      expect(lateItem.status).toBe('LATE');
      expect(lateItem.studentName).toBe('أحمد محمود');
      expect(lateItem.guardianPhone).toBe('01012345678');
      expect(lateItem.whatsappMessage).toContain('تأخر/ت عن موعد بدء حصة الرياضيات');
      expect(lateItem.whatsappMessage).toContain('16:15');
    });

    it('returns empty list and zero counts if all students are present', async () => {
      const { session, student1, student2 } = createTestFixture();

      await attendanceService.recordAttendance(
        { sessionId: session.id, studentId: student1.id, status: 'PRESENT' },
        assistantActor
      );
      await attendanceService.recordAttendance(
        { sessionId: session.id, studentId: student2.id, status: 'PRESENT' },
        assistantActor
      );

      const followUp = await attendanceService.getEndOfDayFollowUp('2026-10-01', ownerActor);
      expect(followUp.totalAbsent).toBe(0);
      expect(followUp.totalLate).toBe(0);
      expect(followUp.followUps).toHaveLength(0);
    });
  });
});
