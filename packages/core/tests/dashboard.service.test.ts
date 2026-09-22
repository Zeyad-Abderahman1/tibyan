import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  openAcademicDatabase,
  closeAllDatabases,
  GroupRepository,
  StudentRepository,
  EnrollmentRepository,
  SessionRepository,
  type AcademicDatabaseConnection,
  type NewGroupRow,
  type NewStudentRow,
  type NewGroupEnrollmentRow,
  type NewSessionRow,
  type NewStudentNoteRow,
} from '@tibyan/db';
import {
  DashboardService,
  DashboardError,
  getArabicWeekday,
} from '../src/dashboard/dashboard.service.js';
import { FixedDateProvider } from '../src/common/date-provider.js';

describe('Task 8: Today Dashboard Aggregation Service (DashboardService)', () => {
  let tempDir: string;
  let acadConn: AcademicDatabaseConnection;
  let dashboardService: DashboardService;
  let groupRepo: GroupRepository;
  let studentRepo: StudentRepository;
  let enrollmentRepo: EnrollmentRepository;
  let sessionRepo: SessionRepository;
  let dateProvider: FixedDateProvider;

  // Helpers to seed test rows
  function createGroup(overrides?: Partial<NewGroupRow>) {
    return groupRepo.create({
      id: crypto.randomUUID(),
      name: `Group ${Math.random().toString(36).slice(2, 6)}`,
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      defaultPaymentType: 'PER_SESSION',
      defaultPaymentAmount: 100,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    });
  }

  function createStudent(overrides?: Partial<NewStudentRow>) {
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const code = `TB-${codeNum}`;
    return studentRepo.create({
      id: crypto.randomUUID(),
      studentCode: code,
      fullName: `Student ${codeNum}`,
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01012345678',
      status: 'ACTIVE',
      qrToken: `qr_${crypto.randomUUID()}`,
      barcodeValue: code,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    });
  }

  function createEnrollment(groupId: string, studentId: string, overrides?: Partial<NewGroupEnrollmentRow>) {
    return enrollmentRepo.create({
      id: crypto.randomUUID(),
      groupId,
      studentId,
      status: 'ACTIVE',
      enrolledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...overrides,
    });
  }

  function createSession(groupId: string, overrides?: Partial<NewSessionRow>) {
    const scheduledDate = overrides?.scheduledDate ?? '2026-10-15';
    const scheduledStartTime = overrides?.scheduledStartTime ?? '10:00';
    return sessionRepo.create({
      id: crypto.randomUUID(),
      groupId,
      occurrenceKey: `occ_${crypto.randomUUID()}`,
      scheduledDate,
      scheduledStartTime,
      effectiveDate: overrides?.effectiveDate ?? scheduledDate,
      effectiveStartTime: overrides?.effectiveStartTime ?? scheduledStartTime,
      durationMinutes: 120,
      status: 'SCHEDULED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    });
  }

  function createNote(studentId: string, overrides?: Partial<NewStudentNoteRow>) {
    return studentRepo.addNote({
      id: crypto.randomUUID(),
      studentId,
      authorNameSnapshot: 'المعلم أحمد',
      noteText: 'ملاحظة للمتابعة',
      tag: 'NEEDS_FOLLOW_UP',
      createdAt: new Date().toISOString(),
      ...overrides,
    });
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-dashboard-test-'));
    const dbPath = path.join(tempDir, 'academic.db');
    acadConn = openAcademicDatabase(dbPath);

    // Default test day: 2026-10-15 (Thursday / الخميس)
    dateProvider = new FixedDateProvider('2026-10-15', '09:00');
    dashboardService = new DashboardService(acadConn.db, { dateProvider });

    groupRepo = new GroupRepository(acadConn.db);
    studentRepo = new StudentRepository(acadConn.db);
    enrollmentRepo = new EnrollmentRepository(acadConn.db);
    sessionRepo = new SessionRepository(acadConn.db);
  });

  afterEach(() => {
    closeAllDatabases();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // 1. Requested date returns only sessions whose effectiveDate equals that date.
  it('1. Requested date returns only sessions whose effectiveDate equals that date', async () => {
    const group = createGroup({ name: 'مجموعة النخبة' });
    const s1 = createSession(group.id, { effectiveDate: '2026-10-15', scheduledDate: '2026-10-15' });
    createSession(group.id, { effectiveDate: '2026-10-16', scheduledDate: '2026-10-16' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.classes).toHaveLength(1);
    expect(dashboard.classes[0]!.sessionId).toBe(s1.id);
  });

  // 2. Session scheduled today but rescheduled to tomorrow is excluded from today's dashboard.
  it("2. Session scheduled today but rescheduled to tomorrow is excluded from today's dashboard", async () => {
    const group = createGroup();
    // Originally scheduled today (2026-10-15), moved away to tomorrow (2026-10-16)
    createSession(group.id, {
      scheduledDate: '2026-10-15',
      scheduledStartTime: '10:00',
      effectiveDate: '2026-10-16',
      effectiveStartTime: '10:00',
      status: 'RESCHEDULED',
      rescheduledAt: '2026-10-14T10:00:00Z',
      rescheduleReason: 'Moved to tomorrow',
    });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.classes).toHaveLength(0);
  });

  // 3. Session scheduled yesterday but rescheduled into today is included today.
  it('3. Session scheduled yesterday but rescheduled into today is included today', async () => {
    const group = createGroup({ name: 'مجموعة الرياضيات' });
    // Originally scheduled yesterday (2026-10-14), rescheduled into today (2026-10-15)
    const session = createSession(group.id, {
      scheduledDate: '2026-10-14',
      scheduledStartTime: '10:00',
      effectiveDate: '2026-10-15',
      effectiveStartTime: '14:00',
      status: 'RESCHEDULED',
      rescheduledAt: '2026-10-13T10:00:00Z',
      rescheduleReason: 'Moved to today afternoon',
    });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.classes).toHaveLength(1);
    expect(dashboard.classes[0]!.sessionId).toBe(session.id);
    expect(dashboard.classes[0]!.originalScheduledDate).toBe('2026-10-14');
    expect(dashboard.classes[0]!.effectiveStartTime).toBe('14:00');
  });

  // 4. Classes are ordered ascending by effectiveStartTime.
  it('4. Classes are ordered ascending by effectiveStartTime', async () => {
    const g1 = createGroup({ name: 'مجموعة 1' });
    const g2 = createGroup({ name: 'مجموعة 2' });
    const g3 = createGroup({ name: 'مجموعة 3' });

    createSession(g1.id, { effectiveDate: '2026-10-15', effectiveStartTime: '16:00' });
    createSession(g2.id, { effectiveDate: '2026-10-15', effectiveStartTime: '10:00' });
    createSession(g3.id, { effectiveDate: '2026-10-15', effectiveStartTime: '13:30' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.classes.map((c) => c.effectiveStartTime)).toEqual(['10:00', '13:30', '16:00']);
  });

  // 5. Equal-time classes have deterministic secondary ordering.
  it('5. Equal-time classes have deterministic secondary ordering', async () => {
    const gA = createGroup({ name: 'مجموعة أ' });
    const gB = createGroup({ name: 'مجموعة ب' });

    createSession(gB.id, { effectiveDate: '2026-10-15', effectiveStartTime: '10:00' });
    createSession(gA.id, { effectiveDate: '2026-10-15', effectiveStartTime: '10:00' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.classes).toHaveLength(2);
    expect(dashboard.classes[0]!.groupName).toBe('مجموعة أ');
    expect(dashboard.classes[1]!.groupName).toBe('مجموعة ب');
  });

  // 6. Normal non-rescheduled session is not marked as rescheduled.
  it('6. Normal non-rescheduled session is not marked as rescheduled', async () => {
    const group = createGroup();
    createSession(group.id, {
      scheduledDate: '2026-10-15',
      scheduledStartTime: '10:00',
      effectiveDate: '2026-10-15',
      effectiveStartTime: '10:00',
      rescheduledAt: null,
      status: 'SCHEDULED',
    });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.classes[0]!.isRescheduled).toBe(false);
  });

  // 7. Rescheduled session exposes original scheduledDate and scheduledStartTime.
  it('7. Rescheduled session exposes original scheduledDate and scheduledStartTime', async () => {
    const group = createGroup();
    createSession(group.id, {
      scheduledDate: '2026-10-12',
      scheduledStartTime: '11:00',
      effectiveDate: '2026-10-15',
      effectiveStartTime: '15:30',
      rescheduledAt: '2026-10-11T12:00:00Z',
      status: 'RESCHEDULED',
    });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.classes[0]!.isRescheduled).toBe(true);
    expect(dashboard.classes[0]!.originalScheduledDate).toBe('2026-10-12');
    expect(dashboard.classes[0]!.originalScheduledTime).toBe('11:00');
  });

  // 8. Rescheduled session uses effectiveStartTime as its current displayed time.
  it('8. Rescheduled session uses effectiveStartTime as its current displayed time', async () => {
    const group = createGroup();
    createSession(group.id, {
      scheduledDate: '2026-10-15',
      scheduledStartTime: '09:00',
      effectiveDate: '2026-10-15',
      effectiveStartTime: '17:00',
      rescheduledAt: '2026-10-14T10:00:00Z',
      status: 'RESCHEDULED',
    });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.classes[0]!.effectiveStartTime).toBe('17:00');
    expect(dashboard.classes[0]!.originalScheduledTime).toBe('09:00');
    expect(dashboard.classes[0]!.isRescheduled).toBe(true);
  });

  // 9. A rescheduled-then-cancelled session still preserves detectable original schedule information.
  it('9. A rescheduled-then-cancelled session still preserves detectable original schedule information', async () => {
    const group = createGroup();
    createSession(group.id, {
      scheduledDate: '2026-10-10',
      scheduledStartTime: '08:00',
      effectiveDate: '2026-10-15',
      effectiveStartTime: '12:00',
      rescheduledAt: '2026-10-11T09:00:00Z',
      status: 'CANCELLED_BY_TEACHER',
      cancellationReason: 'ظرف طارئ للمعلم',
    });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.classes[0]!.status).toBe('CANCELLED_BY_TEACHER');
    expect(dashboard.classes[0]!.isRescheduled).toBe(true);
    expect(dashboard.classes[0]!.originalScheduledDate).toBe('2026-10-10');
    expect(dashboard.classes[0]!.originalScheduledTime).toBe('08:00');
  });

  // 10. COMPLETED and CANCELLED concrete sessions retain their real status if included by the current DTO.
  it('10. COMPLETED and CANCELLED concrete sessions retain their real status if included by the current DTO', async () => {
    const g1 = createGroup({ name: 'مجموعة 1' });
    const g2 = createGroup({ name: 'مجموعة 2' });

    createSession(g1.id, {
      effectiveDate: '2026-10-15',
      effectiveStartTime: '09:00',
      status: 'COMPLETED',
    });
    createSession(g2.id, {
      effectiveDate: '2026-10-15',
      effectiveStartTime: '11:00',
      status: 'CANCELLED_BY_TEACHER',
    });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.classes).toHaveLength(2);
    expect(dashboard.classes[0]!.status).toBe('COMPLETED');
    expect(dashboard.classes[1]!.status).toBe('CANCELLED_BY_TEACHER');
  });

  // 11. Class enrolled/student count uses ACTIVE enrollments only.
  it('11. Class enrolled/student count uses ACTIVE enrollments only', async () => {
    const group = createGroup();
    const st1 = createStudent();
    const st2 = createStudent();
    const st3 = createStudent();

    createEnrollment(group.id, st1.id, { status: 'ACTIVE' });
    createEnrollment(group.id, st2.id, { status: 'ACTIVE' });
    createEnrollment(group.id, st3.id, { status: 'ENDED', leftAt: '2026-10-01T00:00:00Z' });

    createSession(group.id, { effectiveDate: '2026-10-15' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.classes[0]!.enrolledCount).toBe(2);
  });

  // 12. ENDED enrollment history does not inflate today's expected student count.
  it("12. ENDED enrollment history does not inflate today's expected student count", async () => {
    const group = createGroup();
    const activeStudent = createStudent();
    const departedStudent = createStudent();

    createEnrollment(group.id, activeStudent.id, { status: 'ACTIVE' });
    createEnrollment(group.id, departedStudent.id, { status: 'ENDED' });

    createSession(group.id, { effectiveDate: '2026-10-15' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.totalStudentsExpectedToday).toBe(1);
  });

  // 13. Archived groups are not counted as active groups in aggregate stats.
  it('13. Archived groups are not counted as active groups in aggregate stats', async () => {
    createGroup({ status: 'ACTIVE' });
    createGroup({ status: 'ACTIVE' });
    createGroup({ status: 'ARCHIVED' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.activeGroupsCount).toBe(2);
  });

  it('counts every active student even when the student has no active group enrollment', async () => {
    const enrolledStudent = createStudent({ fullName: 'طالب مقيد بمجموعة', status: 'ACTIVE' });
    createStudent({ fullName: 'طالب نشط بلا مجموعة', status: 'ACTIVE' });
    createStudent({ fullName: 'طالب غير نشط', status: 'INACTIVE' });
    const group = createGroup();
    createEnrollment(group.id, enrolledStudent.id, { status: 'ACTIVE' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');

    expect(dashboard.totalEnrolledStudents).toBe(2);
  });

  // 14. NEEDS_FOLLOW_UP note causes the student to appear in needsAttention.
  it('14. NEEDS_FOLLOW_UP note causes the student to appear in needsAttention', async () => {
    const group = createGroup({ name: 'المجموعة الأولى' });
    const student = createStudent({ fullName: 'طارق عبد الله' });
    createEnrollment(group.id, student.id, { status: 'ACTIVE' });
    createNote(student.id, { tag: 'NEEDS_FOLLOW_UP', noteText: 'يحتاج لمتابعة واجب الجبر' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.needsAttention).toHaveLength(1);
    expect(dashboard.needsAttention[0]!.studentId).toBe(student.id);
    expect(dashboard.needsAttention[0]!.studentName).toBe('طارق عبد الله');
    expect(dashboard.needsAttention[0]!.groupName).toBe('المجموعة الأولى');
    expect(dashboard.needsAttention[0]!.latestNote).toBe('يحتاج لمتابعة واجب الجبر');
    expect(dashboard.needsAttention[0]!.tag).toBe('NEEDS_FOLLOW_UP');
  });

  // 15. GENERAL note alone does not cause needsAttention.
  it('15. GENERAL note alone does not cause needsAttention', async () => {
    const student = createStudent();
    createNote(student.id, { tag: 'GENERAL', noteText: 'ملاحظة عامة' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.needsAttention).toHaveLength(0);
  });

  // 16. EXCELLENT note alone does not cause needsAttention.
  it('16. EXCELLENT note alone does not cause needsAttention', async () => {
    const student = createStudent();
    createNote(student.id, { tag: 'EXCELLENT', noteText: 'أداء ممتاز' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.needsAttention).toHaveLength(0);
  });

  // 17. BEHAVIOR note alone does not cause needsAttention.
  it('17. BEHAVIOR note alone does not cause needsAttention', async () => {
    const student = createStudent();
    createNote(student.id, { tag: 'BEHAVIOR', noteText: 'سلوك جيد' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.needsAttention).toHaveLength(0);
  });

  // 18. ACADEMIC_WEAKNESS alone does not imply NEEDS_FOLLOW_UP unless the current approved contract explicitly states otherwise.
  it('18. ACADEMIC_WEAKNESS alone does not imply NEEDS_FOLLOW_UP', async () => {
    const student = createStudent();
    createNote(student.id, { tag: 'ACADEMIC_WEAKNESS', noteText: 'ضعف في الهندسة الفراغية' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.needsAttention).toHaveLength(0);
  });

  // 19. Multiple NEEDS_FOLLOW_UP notes for one student produce deterministic non-duplicated output.
  it('19. Multiple NEEDS_FOLLOW_UP notes for one student produce deterministic non-duplicated output', async () => {
    const student = createStudent({ fullName: 'عمرو دياب' });
    createNote(student.id, {
      tag: 'NEEDS_FOLLOW_UP',
      noteText: 'ملاحظة قديمة',
      createdAt: '2026-10-01T10:00:00Z',
    });
    createNote(student.id, {
      tag: 'NEEDS_FOLLOW_UP',
      noteText: 'ملاحظة أحدث',
      createdAt: '2026-10-10T10:00:00Z',
    });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.needsAttention).toHaveLength(1);
    expect(dashboard.needsAttention[0]!.latestNote).toBe('ملاحظة أحدث');
    expect(dashboard.needsAttention[0]!.createdAt).toBe('2026-10-10T10:00:00Z');
  });

  // 20. Inactive student is excluded from actionable needsAttention.
  it('20. Inactive student is excluded from actionable needsAttention', async () => {
    const student = createStudent({ status: 'INACTIVE' });
    createNote(student.id, { tag: 'NEEDS_FOLLOW_UP', noteText: 'متابعة طالب غير نشط' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.needsAttention).toHaveLength(0);
  });

  // 21. NeedsAttention output contains no guardian phone or unrelated PII.
  it('21. NeedsAttention output contains no guardian phone or unrelated PII', async () => {
    const student = createStudent({ guardianPhone: '01099998888' });
    createNote(student.id, { tag: 'NEEDS_FOLLOW_UP' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.needsAttention).toHaveLength(1);
    const item = dashboard.needsAttention[0] as any;
    expect(item.guardianPhone).toBeUndefined();
    expect(item.photoPath).toBeUndefined();
    expect(item.qrToken).toBeUndefined();
    expect(item.barcodeValue).toBeUndefined();
    expect(Object.keys(item).sort()).toEqual([
      'createdAt',
      'gradeLevel',
      'groupName',
      'latestNote',
      'studentCode',
      'studentId',
      'studentName',
      'tag',
    ]);
  });

  // 22. Empty date returns valid empty classes with correctly calculated zero/current real aggregates.
  it('22. Empty date returns valid empty classes with correctly calculated zero/current real aggregates', async () => {
    createGroup({ status: 'ACTIVE' });
    const student = createStudent();
    const group = createGroup({ status: 'ACTIVE' });
    createEnrollment(group.id, student.id, { status: 'ACTIVE' });

    const dashboard = await dashboardService.getTodayDashboard('2026-10-15');
    expect(dashboard.currentDate).toBe('2026-10-15');
    expect(dashboard.weekdayArabic).toBe('الخميس');
    expect(dashboard.classes).toEqual([]);
    expect(dashboard.totalStudentsExpectedToday).toBe(0);
    expect(dashboard.activeGroupsCount).toBe(2);
    expect(dashboard.totalEnrolledStudents).toBe(1);
    expect(dashboard.needsAttention).toEqual([]);
  });

  // 23. Invalid calendar date is rejected.
  it('23. Invalid calendar date is rejected', async () => {
    await expect(dashboardService.getTodayDashboard('2026-02-30')).rejects.toThrowError(
      DashboardError
    );
    await expect(dashboardService.getTodayDashboard('invalid-date')).rejects.toThrowError(
      DashboardError
    );
  });

  // 24. Arabic weekday is correct for the requested local calendar date.
  it('24. Arabic weekday is correct for the requested local calendar date', async () => {
    // 2026-10-01 is Thursday
    expect(getArabicWeekday('2026-10-01')).toBe('الخميس');
    expect(getArabicWeekday('2026-10-02')).toBe('الجمعة');
    expect(getArabicWeekday('2026-10-03')).toBe('السبت');
    expect(getArabicWeekday('2026-10-04')).toBe('الأحد');
    expect(getArabicWeekday('2026-10-05')).toBe('الإثنين');
    expect(getArabicWeekday('2026-10-06')).toBe('الثلاثاء');
    expect(getArabicWeekday('2026-10-07')).toBe('الأربعاء');
  });

  // 25. Local calendar date calculation is not shifted by UTC conversion.
  it('25. Local calendar date calculation is not shifted by UTC conversion', async () => {
    // Test end-of-year leap/boundary dates
    expect(getArabicWeekday('2026-12-31')).toBe('الخميس');
    expect(getArabicWeekday('2027-01-01')).toBe('الجمعة');

    // When no date passed, uses injected dateProvider.today()
    dateProvider.setDate('2026-12-31');
    const dashboard = await dashboardService.getTodayDashboard();
    expect(dashboard.currentDate).toBe('2026-12-31');
    expect(dashboard.weekdayArabic).toBe('الخميس');
  });

  // 26. Calling dashboard aggregation twice does not modify database row counts or audit logs.
  it('26. Calling dashboard aggregation twice does not modify database row counts or audit logs', async () => {
    const group = createGroup();
    const student = createStudent();
    createEnrollment(group.id, student.id);
    createSession(group.id, { effectiveDate: '2026-10-15' });
    createNote(student.id, { tag: 'NEEDS_FOLLOW_UP' });

    function getDbSnapshots() {
      const raw = acadConn.raw;
      return {
        sessions: (raw.prepare('SELECT count(*) as count FROM sessions').get() as any)?.count,
        groups: (raw.prepare('SELECT count(*) as count FROM groups').get() as any)?.count,
        enrollments: (raw.prepare('SELECT count(*) as count FROM group_enrollments').get() as any)?.count,
        students: (raw.prepare('SELECT count(*) as count FROM students').get() as any)?.count,
        notes: (raw.prepare('SELECT count(*) as count FROM student_notes').get() as any)?.count,
        audits: (raw.prepare('SELECT count(*) as count FROM academic_audit_log').get() as any)?.count,
      };
    }

    const before = getDbSnapshots();
    const res1 = await dashboardService.getTodayDashboard('2026-10-15');
    const res2 = await dashboardService.getTodayDashboard('2026-10-15');
    const after = getDbSnapshots();

    expect(after).toEqual(before);
    expect(res1).toEqual(res2);
    expect(after.audits).toBe(0);
  });
});
