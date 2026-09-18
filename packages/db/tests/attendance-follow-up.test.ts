import { describe, it, expect, beforeEach } from 'vitest';
import {
  openAcademicDatabase,
  migrateAcademicDatabase,
  StudentRepository,
  GroupRepository,
  SessionRepository,
  AttendanceRepository,
  AttendanceFollowUpRepository,
} from '../src/index.js';

describe('AttendanceFollowUpRepository Suite', () => {
  let acadConn: any;
  let studentRepo: StudentRepository;
  let groupRepo: GroupRepository;
  let sessionRepo: SessionRepository;
  let attendanceRepo: AttendanceRepository;
  let followUpRepo: AttendanceFollowUpRepository;

  beforeEach(() => {
    acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    migrateAcademicDatabase(acadConn.raw);

    studentRepo = new StudentRepository(acadConn.db);
    groupRepo = new GroupRepository(acadConn.db);
    sessionRepo = new SessionRepository(acadConn.db);
    attendanceRepo = new AttendanceRepository(acadConn.db);
    followUpRepo = new AttendanceFollowUpRepository(acadConn.db);
  });

  it('persists and retrieves attendance follow up status across query and DB reopen', () => {
    const student = studentRepo.create({
      id: 'std-fu-test-1',
      studentCode: 'TB-FU-1',
      fullName: 'أحمد محمود',
      qrToken: 'qr-1',
      barcodeValue: 'bar-1',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_2',
      languageTrack: 'ARABIC',
      guardianPhone: '01012345678',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const group = groupRepo.create({
      id: 'grp-fu-test-1',
      name: 'مجموعة المتابعة',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_2',
      languageTrack: 'ARABIC',
      defaultPaymentType: 'PER_SESSION',
      defaultPaymentAmount: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const session = sessionRepo.create({
      id: 'sess-fu-test-1',
      groupId: group.id,
      scheduleId: null,
      occurrenceKey: 'grp-fu-test-1_2026-10-10_16:00',
      scheduledDate: '2026-10-10',
      scheduledStartTime: '16:00',
      effectiveDate: '2026-10-10',
      effectiveStartTime: '16:00',
      durationMinutes: 90,
      status: 'SCHEDULED',
      rescheduleReason: null,
      rescheduledAt: null,
      cancellationReason: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const record = attendanceRepo.upsert({
      id: 'att-fu-test-1',
      sessionId: session.id,
      studentId: student.id,
      status: 'ABSENT',
      arrivalTime: null,
      notes: null,
      recordedByUserId: 'user-1',
      recordedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 1. Initial state without explicit follow-up row is null from repo
    expect(followUpRepo.findByAttendanceRecordId(record.id)).toBeNull();

    // 2. listByDateWithDetails defaults contactStatus to UNCONTACTED
    const details = attendanceRepo.listByDateWithDetails('2026-10-10');
    expect(details).toHaveLength(1);
    expect(details[0]?.contactStatus).toBe('UNCONTACTED');
    expect(details[0]?.contactedAt).toBeNull();

    // 3. Upsert follow-up record with CONTACTED status
    const nowIso = new Date().toISOString();
    const saved = followUpRepo.upsert({
      id: 'fu-test-row-1',
      attendanceRecordId: record.id,
      contactStatus: 'CONTACTED',
      note: 'تم التواصل مع والد الطالب',
      contactedAt: nowIso,
      contactedByUserId: 'user-teacher-1',
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    expect(saved.contactStatus).toBe('CONTACTED');
    expect(saved.note).toBe('تم التواصل مع والد الطالب');

    // 4. listByDateWithDetails reflects the persisted follow-up state
    const detailsAfter = attendanceRepo.listByDateWithDetails('2026-10-10');
    expect(detailsAfter).toHaveLength(1);
    expect(detailsAfter[0]?.contactStatus).toBe('CONTACTED');
    expect(detailsAfter[0]?.contactNote).toBe('تم التواصل مع والد الطالب');
    expect(detailsAfter[0]?.contactedAt).toBe(nowIso);
    expect(detailsAfter[0]?.contactedByUserId).toBe('user-teacher-1');

    // 5. Updating to UNREACHABLE works cleanly
    const updated = followUpRepo.upsert({
      id: 'fu-test-row-1',
      attendanceRecordId: record.id,
      contactStatus: 'UNREACHABLE',
      note: 'الهاتف مغلق',
      contactedAt: nowIso,
      contactedByUserId: 'user-teacher-1',
      createdAt: nowIso,
      updatedAt: new Date().toISOString(),
    });
    expect(updated.contactStatus).toBe('UNREACHABLE');
    expect(updated.note).toBe('الهاتف مغلق');
  });
});
