import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
      enrolledAt: '2026-08-01T00:00:00.000Z',
      leftAt: '2026-09-30T23:59:59.000Z',
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

    it('minimizes roster DTO by omitting payment fields and guardian phone', async () => {
      const { session, student1, student2 } = createTestFixture();

      const roster = await attendanceService.getSessionRoster(session.id, ownerActor);
      const item1 = roster.roster.find((r) => r.studentId === student1.id)!;
      expect((item1 as any).paymentType).toBeUndefined();
      expect((item1 as any).paymentAmount).toBeUndefined();
      expect((item1 as any).guardianPhone).toBeUndefined();
      expect(item1.studentCode).toBe('STU-001');
      expect(item1.studentName).toBe('أحمد محمود');

      const item2 = roster.roster.find((r) => r.studentId === student2.id)!;
      expect((item2 as any).paymentType).toBeUndefined();
      expect((item2 as any).paymentAmount).toBeUndefined();
      expect((item2 as any).guardianPhone).toBeUndefined();
      expect(item2.studentCode).toBe('STU-002');
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
      expect(absentItem.whatsappMessage).toContain('غاب/ت عن حضور حصة اليوم');
      expect(absentItem.whatsappMessage).toContain('مجموعة 2ث تفوق');

      const lateItem = followUp.followUps.find((f) => f.studentId === student1.id)!;
      expect(lateItem.status).toBe('LATE');
      expect(lateItem.studentName).toBe('أحمد محمود');
      expect(lateItem.guardianPhone).toBe('01012345678');
      expect(lateItem.whatsappMessage).toContain('تأخر/ت عن موعد بدء الحصة لمجموعة');
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

  describe('Hardening: Photo Media Safety & Projections', () => {
    it('maps safe relative photoPath to tibyan-media:// and rejects host absolute/UNC paths', async () => {
      const { session, student1 } = createTestFixture();

      // Set safe relative photoPath
      studentRepo.update(student1.id, { photoPath: 'students/stu-001.jpg' } as any);
      let roster = await attendanceService.getSessionRoster(session.id, ownerActor);
      let item = roster.roster.find((r) => r.studentId === student1.id)!;
      expect(item.photoUrl).toBe('tibyan-media://students/stu-001.jpg');

      // Set Windows drive-letter path - must throw INVALID_PHOTO_PATH
      studentRepo.update(student1.id, { photoPath: 'C:\\Users\\photos\\stu.jpg' } as any);
      await expect(attendanceService.getSessionRoster(session.id, ownerActor)).rejects.toThrow(
        AttendanceError
      );

      // Set UNC path - must throw INVALID_PHOTO_PATH
      studentRepo.update(student1.id, { photoPath: '\\\\server\\share\\photo.jpg' } as any);
      await expect(attendanceService.getSessionRoster(session.id, ownerActor)).rejects.toThrow(
        AttendanceError
      );

      // Set path traversal - must throw INVALID_PHOTO_PATH
      studentRepo.update(student1.id, { photoPath: '../sensitive/passwords.txt' } as any);
      await expect(attendanceService.getSessionRoster(session.id, ownerActor)).rejects.toThrow(
        AttendanceError
      );
    });
  });

  describe('Hardening: Temporal Enrollment Enforcement', () => {
    it('rejects recording attendance for a student who left before the session date', async () => {
      const { session, student3 } = createTestFixture();
      // student3 has leftAt '2026-09-30', session date is '2026-10-01'
      await expect(
        attendanceService.recordAttendance(
          {
            sessionId: session.id,
            studentId: student3.id,
            status: 'PRESENT',
          },
          assistantActor
        )
      ).rejects.toThrow(AttendanceError);
    });

    it('rejects batch attendance recording if any student is not enrolled on session date', async () => {
      const { session, student1, student3 } = createTestFixture();
      await expect(
        attendanceService.batchRecordAttendance(
          {
            sessionId: session.id,
            records: [
              { studentId: student1.id, status: 'PRESENT' },
              { studentId: student3.id, status: 'PRESENT' },
            ],
          },
          assistantActor
        )
      ).rejects.toThrow(AttendanceError);
    });
  });

  describe('Hardening: SessionService Auto-Absence on Completion & Atomic Rollback', () => {
    it('auto-absents unmarked enrolled students upon session completion without overwriting existing marks', async () => {
      const { session, student1, student2 } = createTestFixture();

      // Mark student1 as PRESENT beforehand
      await attendanceService.recordAttendance(
        {
          sessionId: session.id,
          studentId: student1.id,
          status: 'PRESENT',
          arrivalTime: '16:05',
        },
        assistantActor
      );

      // Complete session via SessionService
      const completedSession = await sessionService.completeSession(
        { sessionId: session.id },
        ownerActor
      );
      expect(completedSession.status).toBe('COMPLETED');

      // Verify attendance records in DB
      const rec1 = attendanceRepo.findBySessionAndStudent(session.id, student1.id);
      expect(rec1).toBeDefined();
      expect(rec1?.status).toBe('PRESENT');
      expect(rec1?.arrivalTime).toBe('16:05');

      const rec2 = attendanceRepo.findBySessionAndStudent(session.id, student2.id);
      expect(rec2).toBeDefined();
      expect(rec2?.status).toBe('ABSENT');
      expect(rec2?.notes).toBe('غياب تلقائي عند اكتمال الحصة');
      expect(rec2?.arrivalTime).toBeNull();

      // Verify audit logs were created
      const audits = auditRepo.findByEntity('ATTENDANCE', rec2!.id);
      expect(audits.length).toBeGreaterThanOrEqual(1);
      expect(audits[0]!.action).toBe('ATTENDANCE_RECORDED');
    });

    it('rolls back session completion and auto-absence if an error occurs during completion', async () => {
      const { session } = createTestFixture();

      vi.spyOn(AcademicAuditRepository.prototype, 'insert').mockImplementationOnce(() => {
        throw new Error('SIMULATED_AUDIT_FAILURE');
      });

      await expect(
        sessionService.completeSession({ sessionId: session.id }, ownerActor)
      ).rejects.toThrow('SIMULATED_AUDIT_FAILURE');

      // Check that session status rolled back and remains SCHEDULED
      const sessionAfter = sessionRepo.findById(session.id);
      expect(sessionAfter?.status).toBe('SCHEDULED');

      // Check that no attendance records were persisted
      const attendanceList = attendanceRepo.listBySessionId(session.id);
      expect(attendanceList).toHaveLength(0);
    });
  });

  describe('updateFollowUpStatus', () => {
    it('rejects unauthorized actor lacking ATTENDANCE_WRITE', async () => {
      const { session, student1 } = createTestFixture();
      const rec = await attendanceService.recordAttendance(
        { sessionId: session.id, studentId: student1.id, status: 'ABSENT' },
        ownerActor
      );

      const unauthorizedActor: AuthenticatedUser = {
        userId: crypto.randomUUID(),
        fullName: 'مساعد غير مصرح',
        role: 'ASSISTANT',
        permissions: ['GROUPS_READ'],
      };

      await expect(
        attendanceService.updateFollowUpStatus(
          { attendanceRecordId: rec.id, contactStatus: 'CONTACTED' },
          unauthorizedActor
        )
      ).rejects.toThrow(AttendanceError);
    });

    it('rejects non-existent attendanceRecordId', async () => {
      await expect(
        attendanceService.updateFollowUpStatus(
          { attendanceRecordId: crypto.randomUUID(), contactStatus: 'CONTACTED' },
          ownerActor
        )
      ).rejects.toThrow(/Attendance record not found/i);
    });

    it('updates follow up status and note with atomic audit log, and reflects in getEndOfDayFollowUp', async () => {
      const { session, student1 } = createTestFixture();
      const rec = await attendanceService.recordAttendance(
        { sessionId: session.id, studentId: student1.id, status: 'ABSENT' },
        ownerActor
      );

      // Initially getEndOfDayFollowUp shows UNCONTACTED
      const initialFollowUp = await attendanceService.getEndOfDayFollowUp('2026-10-01', ownerActor);
      const itemBefore = initialFollowUp.followUps.find((f) => f.attendanceRecordId === rec.id)!;
      expect(itemBefore.contactStatus).toBe('UNCONTACTED');
      expect(itemBefore.contactedAt).toBeNull();

      // Mutate to CONTACTED
      const updated = await attendanceService.updateFollowUpStatus(
        {
          attendanceRecordId: rec.id,
          contactStatus: 'CONTACTED',
          note: 'تم الاتصال بالأم وأفادت بمرض الطالب',
        },
        assistantActor
      );

      expect(updated.contactStatus).toBe('CONTACTED');
      expect(updated.note).toBe('تم الاتصال بالأم وأفادت بمرض الطالب');
      expect(updated.contactedAt).toBeDefined();
      expect(updated.contactedByUserId).toBe(assistantActor.userId);

      // Verify audit log
      const auditEntries = auditRepo.findByEntity('ATTENDANCE_FOLLOW_UP', updated.id);
      expect(auditEntries.length).toBeGreaterThanOrEqual(1);
      expect(auditEntries[0]!.action).toBe('FOLLOW_UP_STATUS_UPDATED');
      expect(auditEntries[0]!.afterJson).toContain('CONTACTED');

      // Verify subsequent getEndOfDayFollowUp shows updated status and note
      const followUpAfter = await attendanceService.getEndOfDayFollowUp('2026-10-01', ownerActor);
      const itemAfter = followUpAfter.followUps.find((f) => f.attendanceRecordId === rec.id)!;
      expect(itemAfter.contactStatus).toBe('CONTACTED');
      expect(itemAfter.contactNote).toBe('تم الاتصال بالأم وأفادت بمرض الطالب');
      expect(itemAfter.contactedAt).toBe(updated.contactedAt);
      expect(itemAfter.contactedByUserId).toBe(assistantActor.userId);
    });

    it('rolls back follow up update if audit log fails', async () => {
      const { session, student1 } = createTestFixture();
      const rec = await attendanceService.recordAttendance(
        { sessionId: session.id, studentId: student1.id, status: 'ABSENT' },
        ownerActor
      );

      vi.spyOn(AcademicAuditRepository.prototype, 'insert').mockImplementationOnce(() => {
        throw new Error('SIMULATED_AUDIT_FAILURE');
      });

      await expect(
        attendanceService.updateFollowUpStatus(
          { attendanceRecordId: rec.id, contactStatus: 'CONTACTED' },
          ownerActor
        )
      ).rejects.toThrow('SIMULATED_AUDIT_FAILURE');

      // Verify no follow-up was persisted
      const followUpAfter = await attendanceService.getEndOfDayFollowUp('2026-10-01', ownerActor);
      const item = followUpAfter.followUps.find((f) => f.attendanceRecordId === rec.id)!;
      expect(item.contactStatus).toBe('UNCONTACTED');
    });
  });
});

