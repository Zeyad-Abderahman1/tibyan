import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  openSystemDatabase,
  openAcademicDatabase,
  closeAllDatabases,
  closeAcademicDatabase,
  createRawDatabase,
} from '../src/connection.js';
import {
  migrateSystemDatabase,
  migrateAcademicDatabase,
  getAppliedMigrations,
} from '../src/migrations/migrator.js';
import {
  UserRepository,
  AcademicYearRepository,
  SystemAuditRepository,
  GlobalSettingsRepository,
  StudentRepository,
  GroupRepository,
  EnrollmentRepository,
  SessionRepository,
  AcademicAuditRepository,
} from '../src/repositories/index.js';
import { students, groupEnrollments } from '../src/schema/index.js';

describe('Task 3: Dual Database Architecture, Drizzle Schemas & Immutability Triggers', () => {
  let tempDir: string;

  beforeEach(() => {
    closeAllDatabases();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-db-test-'));
  });

  afterEach(() => {
    closeAllDatabases();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Test 1: System and academic databases are physically separate
  it('1. System and academic databases are physically separate', () => {
    const sysPath = path.join(tempDir, 'tibyan-system.sqlite');
    const acadPath = path.join(tempDir, 'tibyan-2026-2027.sqlite');

    const sysConn = openSystemDatabase({ filePath: sysPath });
    const acadConn = openAcademicDatabase('2026-2027', { filePath: acadPath });

    expect(sysConn.filePath).not.toBe(acadConn.filePath);
    expect(fs.existsSync(sysPath)).toBe(true);
    expect(fs.existsSync(acadPath)).toBe(true);

    // System tables exist in system DB, but not in academic DB
    const sysTables = sysConn.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r: any) => r.name);
    expect(sysTables).toContain('users');
    expect(sysTables).toContain('academic_years');
    expect(sysTables).not.toContain('students');
    expect(sysTables).not.toContain('groups');

    // Academic tables exist in academic DB, but not in system DB
    const acadTables = acadConn.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r: any) => r.name);
    expect(acadTables).toContain('students');
    expect(acadTables).toContain('groups');
    expect(acadTables).not.toContain('users');
    expect(acadTables).not.toContain('academic_years');
  });

  // Test 2: Both migration sets execute successfully on fresh databases
  it('2. Both migration sets execute successfully on fresh databases', () => {
    const sysRaw = createRawDatabase(':memory:');
    const acadRaw = createRawDatabase(':memory:');

    const appliedSys = migrateSystemDatabase(sysRaw);
    expect(appliedSys).toEqual(['0000_initial_schema', '0001_audit_triggers']);

    const appliedAcad = migrateAcademicDatabase(acadRaw);
    expect(appliedAcad).toEqual(['0000_initial_schema', '0001_audit_triggers', '0002_glamorous_sunspot']);

    expect(getAppliedMigrations(sysRaw)).toEqual(['0000_initial_schema', '0001_audit_triggers']);
    expect(getAppliedMigrations(acadRaw)).toEqual(['0000_initial_schema', '0001_audit_triggers', '0002_glamorous_sunspot']);

    sysRaw.close();
    acadRaw.close();
  });

  // Test 3: Running the migrator again does not duplicate schema or corrupt migration state
  it('3. Running the migrator again does not duplicate schema or corrupt migration state', () => {
    const sysRaw = createRawDatabase(':memory:');
    const acadRaw = createRawDatabase(':memory:');

    migrateSystemDatabase(sysRaw);
    migrateAcademicDatabase(acadRaw);

    // Run again
    const secondSys = migrateSystemDatabase(sysRaw);
    const secondAcad = migrateAcademicDatabase(acadRaw);

    expect(secondSys).toEqual([]);
    expect(secondAcad).toEqual([]);

    expect(getAppliedMigrations(sysRaw)).toEqual(['0000_initial_schema', '0001_audit_triggers']);
    expect(getAppliedMigrations(acadRaw)).toEqual(['0000_initial_schema', '0001_audit_triggers', '0002_glamorous_sunspot']);

    sysRaw.close();
    acadRaw.close();
  });

  // Test 4: Foreign keys are enabled
  it('4. Foreign keys are enabled and enforce integrity', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const fkStatus = acadConn.raw.pragma('foreign_keys', { simple: true });
    expect(fkStatus).toBe(1);

    // Attempting to insert a student note for a non-existent student must throw foreign key constraint violation
    expect(() => {
      acadConn.raw
        .prepare(
          `INSERT INTO student_notes (id, student_id, author_user_id, author_name_snapshot, note_text, tag, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run('note-1', 'non-existent-student', null, 'System', 'Test note', 'GENERAL', new Date().toISOString());
    }).toThrow(/FOREIGN KEY/i);
  });

  // Test 5: Audit UPDATE is rejected by SQLite trigger
  it('5. Audit UPDATE is rejected by SQLite trigger', () => {
    const sysConn = openSystemDatabase({ filePath: ':memory:' });
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });

    const now = new Date().toISOString();

    // Insert valid audit rows directly
    sysConn.raw
      .prepare(
        `INSERT INTO system_audit_log (id, actor_type, actor_user_id, actor_name_snapshot, action, entity_type, entity_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run('sys-audit-1', 'USER', 'user-1', 'Admin', 'LOGIN', 'USER', 'user-1', now);

    acadConn.raw
      .prepare(
        `INSERT INTO academic_audit_log (id, actor_type, actor_user_id, actor_name_snapshot, action, entity_type, entity_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run('acad-audit-1', 'USER', 'user-1', 'Admin', 'CREATE_STUDENT', 'STUDENT', 'std-1', now);

    // UPDATE on system audit must be rejected by trigger
    expect(() => {
      sysConn.raw
        .prepare(`UPDATE system_audit_log SET action = 'MODIFIED' WHERE id = 'sys-audit-1'`)
        .run();
    }).toThrow(/immutable and cannot be updated/i);

    // UPDATE on academic audit must be rejected by trigger
    expect(() => {
      acadConn.raw
        .prepare(`UPDATE academic_audit_log SET action = 'MODIFIED' WHERE id = 'acad-audit-1'`)
        .run();
    }).toThrow(/immutable and cannot be updated/i);
  });

  // Test 6: Audit DELETE is rejected by SQLite trigger
  it('6. Audit DELETE is rejected by SQLite trigger', () => {
    const sysConn = openSystemDatabase({ filePath: ':memory:' });
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });

    const now = new Date().toISOString();

    sysConn.raw
      .prepare(
        `INSERT INTO system_audit_log (id, actor_type, actor_user_id, actor_name_snapshot, action, entity_type, entity_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run('sys-audit-2', 'USER', 'user-1', 'Admin', 'LOGIN', 'USER', 'user-1', now);

    acadConn.raw
      .prepare(
        `INSERT INTO academic_audit_log (id, actor_type, actor_user_id, actor_name_snapshot, action, entity_type, entity_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run('acad-audit-2', 'USER', 'user-1', 'Admin', 'CREATE_STUDENT', 'STUDENT', 'std-1', now);

    // DELETE on system audit must be rejected by trigger
    expect(() => {
      sysConn.raw.prepare(`DELETE FROM system_audit_log WHERE id = 'sys-audit-2'`).run();
    }).toThrow(/immutable and cannot be deleted/i);

    // DELETE on academic audit must be rejected by trigger
    expect(() => {
      acadConn.raw.prepare(`DELETE FROM academic_audit_log WHERE id = 'acad-audit-2'`).run();
    }).toThrow(/immutable and cannot be deleted/i);
  });

  // Test 7: SYSTEM audit row with null actorUserId succeeds
  it('7. SYSTEM audit row with null actorUserId succeeds', () => {
    const sysConn = openSystemDatabase({ filePath: ':memory:' });
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const now = new Date().toISOString();

    expect(() => {
      sysConn.raw
        .prepare(
          `INSERT INTO system_audit_log (id, actor_type, actor_user_id, actor_name_snapshot, action, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('audit-sys-ok', 'SYSTEM', null, 'Automated Job', 'CLEANUP', 'SYSTEM', 'job-1', now);
    }).not.toThrow();

    expect(() => {
      acadConn.raw
        .prepare(
          `INSERT INTO academic_audit_log (id, actor_type, actor_user_id, actor_name_snapshot, action, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('audit-acad-ok', 'SYSTEM', null, 'Automated Job', 'MATERIALIZE', 'SESSION', 's-1', now);
    }).not.toThrow();
  });

  // Test 8: SYSTEM audit row with non-null actorUserId fails at database level
  it('8. SYSTEM audit row with non-null actorUserId fails at database level', () => {
    const sysConn = openSystemDatabase({ filePath: ':memory:' });
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const now = new Date().toISOString();

    expect(() => {
      sysConn.raw
        .prepare(
          `INSERT INTO system_audit_log (id, actor_type, actor_user_id, actor_name_snapshot, action, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('bad-sys', 'SYSTEM', 'illegal-user-id', 'System', 'BACKUP', 'SYSTEM', 'b-1', now);
    }).toThrow(/CHECK constraint/i);

    expect(() => {
      acadConn.raw
        .prepare(
          `INSERT INTO academic_audit_log (id, actor_type, actor_user_id, actor_name_snapshot, action, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('bad-acad', 'SYSTEM', 'illegal-user-id', 'System', 'BACKUP', 'SYSTEM', 'b-1', now);
    }).toThrow(/CHECK constraint/i);
  });

  // Test 9: USER audit row with non-null actorUserId succeeds
  it('9. USER audit row with non-null actorUserId succeeds', () => {
    const sysConn = openSystemDatabase({ filePath: ':memory:' });
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const now = new Date().toISOString();

    expect(() => {
      sysConn.raw
        .prepare(
          `INSERT INTO system_audit_log (id, actor_type, actor_user_id, actor_name_snapshot, action, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('user-audit-ok-1', 'USER', 'user-uuid-123', 'Ahmed', 'UPDATE', 'USER', 'user-uuid-123', now);
    }).not.toThrow();

    expect(() => {
      acadConn.raw
        .prepare(
          `INSERT INTO academic_audit_log (id, actor_type, actor_user_id, actor_name_snapshot, action, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('user-audit-ok-2', 'USER', 'user-uuid-123', 'Ahmed', 'CREATE', 'STUDENT', 'std-123', now);
    }).not.toThrow();
  });

  // Test 10: USER audit row with null actorUserId fails at database level
  it('10. USER audit row with null actorUserId fails at database level', () => {
    const sysConn = openSystemDatabase({ filePath: ':memory:' });
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const now = new Date().toISOString();

    expect(() => {
      sysConn.raw
        .prepare(
          `INSERT INTO system_audit_log (id, actor_type, actor_user_id, actor_name_snapshot, action, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('user-audit-bad-1', 'USER', null, 'Ahmed', 'UPDATE', 'USER', 'user-123', now);
    }).toThrow(/CHECK constraint/i);

    expect(() => {
      acadConn.raw
        .prepare(
          `INSERT INTO academic_audit_log (id, actor_type, actor_user_id, actor_name_snapshot, action, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('user-audit-bad-2', 'USER', null, 'Ahmed', 'CREATE', 'STUDENT', 'std-123', now);
    }).toThrow(/CHECK constraint/i);
  });

  // Test 11: Duplicate ACTIVE enrollment for same student/group fails
  it('11. Duplicate ACTIVE enrollment for same student/group fails', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const studentRepo = new StudentRepository(acadConn.db);
    const groupRepo = new GroupRepository(acadConn.db);
    const enrollRepo = new EnrollmentRepository(acadConn.db);
    const now = new Date().toISOString();

    studentRepo.create({
      id: 'student-1',
      studentCode: 'ST-001',
      fullName: 'Youssef Ali',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01012345678',
      status: 'ACTIVE',
      qrToken: 'qr-st-001',
      barcodeValue: 'bar-st-001',
      createdAt: now,
      updatedAt: now,
    });

    groupRepo.create({
      id: 'group-1',
      name: 'Sec 1 Group A',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      focusMathBranch: null,
      defaultPaymentType: 'PER_SESSION',
      defaultPaymentAmount: 150,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    // First active enrollment succeeds
    enrollRepo.create({
      id: 'enroll-1',
      groupId: 'group-1',
      studentId: 'student-1',
      enrolledAt: now,
      status: 'ACTIVE',
      createdAt: now,
    });

    // Attempting a second simultaneous ACTIVE enrollment for the same student + group must fail
    expect(() => {
      enrollRepo.create({
        id: 'enroll-2',
        groupId: 'group-1',
        studentId: 'student-1',
        enrolledAt: now,
        status: 'ACTIVE',
        createdAt: now,
      });
    }).toThrow(/UNIQUE constraint failed/i);
  });

  // Test 12: An ENDED enrollment allows a new ACTIVE enrollment for the same student/group
  it('12. An ENDED enrollment allows a new ACTIVE enrollment for the same student/group', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const studentRepo = new StudentRepository(acadConn.db);
    const groupRepo = new GroupRepository(acadConn.db);
    const enrollRepo = new EnrollmentRepository(acadConn.db);
    const now = new Date().toISOString();

    studentRepo.create({
      id: 'student-reenroll',
      studentCode: 'ST-002',
      fullName: 'Omar Khaled',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01011112222',
      status: 'ACTIVE',
      qrToken: 'qr-st-002',
      barcodeValue: 'bar-st-002',
      createdAt: now,
      updatedAt: now,
    });

    groupRepo.create({
      id: 'group-reenroll',
      name: 'Sec 1 Group B',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      focusMathBranch: null,
      defaultPaymentType: 'PER_SESSION',
      defaultPaymentAmount: 150,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    // Initial enrollment
    const e1 = enrollRepo.create({
      id: 'enroll-r1',
      groupId: 'group-reenroll',
      studentId: 'student-reenroll',
      enrolledAt: '2026-10-01T10:00:00Z',
      status: 'ACTIVE',
      createdAt: now,
    });

    // Student leaves -> status changes to ENDED
    enrollRepo.endEnrollment(e1.id, '2026-11-01T10:00:00Z');

    // Re-enrollment into same group with status ACTIVE must now succeed
    const e2 = enrollRepo.create({
      id: 'enroll-r2',
      groupId: 'group-reenroll',
      studentId: 'student-reenroll',
      enrolledAt: '2026-12-01T10:00:00Z',
      status: 'ACTIVE',
      createdAt: now,
    });

    expect(e2.id).toBe('enroll-r2');
    expect(e2.status).toBe('ACTIVE');

    const history = enrollRepo.listByStudent('student-reenroll');
    expect(history.length).toBe(2);
  });

  // Test 13: Payment overrides exist on enrollment and not on student
  it('13. Payment overrides exist on enrollment and not on student', () => {
    // Assert against table column definitions in Drizzle schemas
    const studentCols = Object.keys(students);
    expect(studentCols).not.toContain('paymentTypeOverride');
    expect(studentCols).not.toContain('paymentAmountOverride');
    expect(studentCols).not.toContain('payment_type_override');
    expect(studentCols).not.toContain('payment_amount_override');

    const enrollCols = Object.keys(groupEnrollments);
    expect(enrollCols).toContain('paymentTypeOverride');
    expect(enrollCols).toContain('paymentAmountOverride');
  });

  // Test 14: Negative payment amount is rejected
  it('14. Negative payment amount is rejected at database level', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const now = new Date().toISOString();

    // Group with negative default payment amount fails
    expect(() => {
      acadConn.raw
        .prepare(
          `INSERT INTO groups (id, name, education_system, grade_level, language_track, default_payment_type, default_payment_amount, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('grp-neg', 'Negative Math', 'GENERAL', 'SEC_1', 'ARABIC', 'PER_SESSION', -50, 'ACTIVE', now, now);
    }).toThrow(/CHECK constraint/i);

    // Group with 0 or positive succeeds
    expect(() => {
      acadConn.raw
        .prepare(
          `INSERT INTO groups (id, name, education_system, grade_level, language_track, default_payment_type, default_payment_amount, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('grp-pos', 'Positive Math', 'GENERAL', 'SEC_1', 'ARABIC', 'PER_SESSION', 0, 'ACTIVE', now, now);
    }).not.toThrow();

    // Insert student for enrollment test
    acadConn.raw
      .prepare(
        `INSERT INTO students (id, student_code, full_name, education_system, grade_level, language_track, guardian_phone, status, qr_token, barcode_value, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run('std-neg', 'ST-NEG', 'Neg Test', 'GENERAL', 'SEC_1', 'ARABIC', '01000000000', 'ACTIVE', 'qr-neg', 'bar-neg', now, now);

    // Enrollment with negative payment amount override fails
    expect(() => {
      acadConn.raw
        .prepare(
          `INSERT INTO group_enrollments (id, group_id, student_id, enrolled_at, status, payment_amount_override, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run('enr-neg', 'grp-pos', 'std-neg', now, 'ACTIVE', -20, now);
    }).toThrow(/CHECK constraint/i);
  });

  // Test 15: Session occurrenceKey uniqueness is enforced
  it('15. Session occurrenceKey uniqueness is enforced', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const now = new Date().toISOString();

    acadConn.raw
      .prepare(
        `INSERT INTO groups (id, name, education_system, grade_level, language_track, default_payment_type, default_payment_amount, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run('grp-occ', 'Occ Group', 'GENERAL', 'SEC_1', 'ARABIC', 'PER_SESSION', 100, 'ACTIVE', now, now);

    acadConn.raw
      .prepare(
        `INSERT INTO sessions (id, group_id, occurrence_key, scheduled_date, scheduled_start_time, effective_date, effective_start_time, duration_minutes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run('sess-1', 'grp-occ', 'occ-key-1001', '2026-10-01', '16:00', '2026-10-01', '16:00', 120, 'SCHEDULED', now, now);

    // Attempting duplicate occurrenceKey must fail
    expect(() => {
      acadConn.raw
        .prepare(
          `INSERT INTO sessions (id, group_id, occurrence_key, scheduled_date, scheduled_start_time, effective_date, effective_start_time, duration_minutes, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('sess-2', 'grp-occ', 'occ-key-1001', '2026-10-01', '16:00', '2026-10-01', '16:00', 120, 'SCHEDULED', now, now);
    }).toThrow(/UNIQUE constraint failed/i);
  });

  // Test 16: A session can retain scheduledDate while having a different effectiveDate
  it('16. A session can retain scheduledDate while having a different effectiveDate', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const groupRepo = new GroupRepository(acadConn.db);
    const sessionRepo = new SessionRepository(acadConn.db);
    const now = new Date().toISOString();

    groupRepo.create({
      id: 'grp-resched',
      name: 'Resched Group',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_2',
      languageTrack: 'ARABIC',
      focusMathBranch: 'ALGEBRA',
      defaultPaymentType: 'PER_SESSION',
      defaultPaymentAmount: 200,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    const originalSession = sessionRepo.create({
      id: 'session-resched',
      groupId: 'grp-resched',
      occurrenceKey: 'occ-resched-2026-10-05',
      scheduledDate: '2026-10-05',
      scheduledStartTime: '16:00',
      effectiveDate: '2026-10-05',
      effectiveStartTime: '16:00',
      durationMinutes: 120,
      status: 'SCHEDULED',
      createdAt: now,
      updatedAt: now,
    });

    expect(originalSession.scheduledDate).toBe('2026-10-05');
    expect(originalSession.effectiveDate).toBe('2026-10-05');

    // Reschedule session to a different date and time
    const updated = sessionRepo.update('session-resched', {
      effectiveDate: '2026-10-07',
      effectiveStartTime: '18:30',
      status: 'RESCHEDULED',
      rescheduleReason: 'National holiday rescheduling',
      rescheduledAt: new Date().toISOString(),
    });

    expect(updated).not.toBeNull();
    // The original scheduled identity is strictly retained
    expect(updated?.scheduledDate).toBe('2026-10-05');
    expect(updated?.scheduledStartTime).toBe('16:00');
    expect(updated?.occurrenceKey).toBe('occ-resched-2026-10-05');

    // The effective execution slot is modified
    expect(updated?.effectiveDate).toBe('2026-10-07');
    expect(updated?.effectiveStartTime).toBe('18:30');
    expect(updated?.status).toBe('RESCHEDULED');
    expect(updated?.rescheduleReason).toBe('National holiday rescheduling');
  });

  // Test 17: Two separate academic-year database files do not share academic rows
  it('17. Two separate academic-year database files do not share academic rows', () => {
    const path26 = path.join(tempDir, 'tibyan-2026-2027.sqlite');
    const path27 = path.join(tempDir, 'tibyan-2027-2028.sqlite');

    // Connect to 2026-2027 and insert a student
    const conn26 = openAcademicDatabase('2026-2027', { filePath: path26 });
    const repo26 = new StudentRepository(conn26.db);
    const now = new Date().toISOString();

    repo26.create({
      id: 'student-2026',
      studentCode: 'ST-2026-001',
      fullName: 'Student Year 2026',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01099998888',
      status: 'ACTIVE',
      qrToken: 'qr-2026',
      barcodeValue: 'bar-2026',
      createdAt: now,
      updatedAt: now,
    });

    closeAcademicDatabase();

    // Connect to 2027-2028 and verify student from 2026-2027 does NOT exist
    const conn27 = openAcademicDatabase('2027-2028', { filePath: path27 });
    const repo27 = new StudentRepository(conn27.db);

    const foundIn27 = repo27.findById('student-2026');
    expect(foundIn27).toBeNull();
    expect(repo27.list()).toHaveLength(0);

    closeAcademicDatabase();

    // Reopen 2026-2027 and verify the student is still there
    const reopenedConn26 = openAcademicDatabase('2026-2027', { filePath: path26 });
    const reopenedRepo26 = new StudentRepository(reopenedConn26.db);
    expect(reopenedRepo26.findById('student-2026')).not.toBeNull();
  });

  // Test 18: System DB users remain independent of academic-year databases
  it('18. System DB users remain independent of academic-year databases', () => {
    const sysPath = path.join(tempDir, 'tibyan-system.sqlite');
    const acadPath1 = path.join(tempDir, 'tibyan-2026-2027.sqlite');
    const acadPath2 = path.join(tempDir, 'tibyan-2027-2028.sqlite');

    const sysConn = openSystemDatabase({ filePath: sysPath });
    const userRepo = new UserRepository(sysConn.db);
    const now = new Date().toISOString();

    userRepo.create({
      id: 'owner-1',
      fullName: 'Master Teacher',
      username: 'master_teacher',
      pinHash: 'hashed-pin-1234',
      salt: 'random-salt-1234',
      role: 'OWNER',
      status: 'ACTIVE',
      failedAttempts: 0,
      createdAt: now,
      updatedAt: now,
    });

    expect(userRepo.findById('owner-1')).not.toBeNull();

    // Open first academic year and close it
    openAcademicDatabase('2026-2027', { filePath: acadPath1 });
    closeAcademicDatabase();

    // Open second academic year and close it
    openAcademicDatabase('2027-2028', { filePath: acadPath2 });
    closeAcademicDatabase();

    // Verify system DB user is completely intact and unaffected
    const sysUser = userRepo.findById('owner-1');
    expect(sysUser).not.toBeNull();
    expect(sysUser?.fullName).toBe('Master Teacher');
    expect(sysUser?.username).toBe('master_teacher');
    expect(sysUser?.role).toBe('OWNER');
  });

  // Additional Test: Persistent on-disk PRAGMAs (WAL mode, synchronous = NORMAL, busy_timeout = 5000)
  it('Persistent on-disk PRAGMAs are correctly set', () => {
    const diskPath = path.join(tempDir, 'pragma-test.sqlite');
    const db = createRawDatabase(diskPath);

    expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
    // In SQLite, synchronous = NORMAL is returned as 1
    expect(db.pragma('synchronous', { simple: true })).toBe(1);
    expect(db.pragma('busy_timeout', { simple: true })).toBe(5000);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);

    db.close();
  });

  // Additional Test: Only one academic year can be active at a time at database level
  it('Enforces that only one academic year can be active at a time at database level', () => {
    const sysConn = openSystemDatabase({ filePath: ':memory:' });
    const yearRepo = new AcademicYearRepository(sysConn.db);
    const now = new Date().toISOString();

    yearRepo.create({
      id: 'ay-1',
      name: '2026-2027',
      dbFilename: 'tibyan-2026-2027.sqlite',
      isActive: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    yearRepo.create({
      id: 'ay-2',
      name: '2027-2028',
      dbFilename: 'tibyan-2027-2028.sqlite',
      isActive: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    // Attempting to directly insert a second active year fails due to partial unique index
    expect(() => {
      sysConn.raw
        .prepare(
          `INSERT INTO academic_years (id, name, db_filename, is_active, is_archived, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run('ay-3', '2028-2029', 'tibyan-2028-2029.sqlite', 1, 0, now, now);
    }).toThrow(/UNIQUE constraint failed/i);

    // Using setActiveYear safely transitions active year in transaction
    yearRepo.setActiveYear('ay-2');
    expect(yearRepo.findActive()?.id).toBe('ay-2');
    expect(yearRepo.findById('ay-1')?.isActive).toBe(false);
  });

  // Additional Test: SystemAuditRepository and GlobalSettingsRepository
  it('SystemAuditRepository and GlobalSettingsRepository work correctly', () => {
    const sysConn = openSystemDatabase({ filePath: ':memory:' });
    const auditRepo = new SystemAuditRepository(sysConn.db);
    const settingsRepo = new GlobalSettingsRepository(sysConn.db);
    const now = new Date().toISOString();

    // System audit insert and query
    auditRepo.insert({
      id: 'sys-repo-audit-1',
      actorType: 'USER',
      actorUserId: 'user-audit-1',
      actorNameSnapshot: 'Teacher',
      action: 'LOGIN',
      entityType: 'USER',
      entityId: 'user-audit-1',
      createdAt: now,
    });

    const recent = auditRepo.listRecent(10);
    expect(recent).toHaveLength(1);
    expect(recent[0]!.id).toBe('sys-repo-audit-1');

    const byEntity = auditRepo.findByEntity('USER', 'user-audit-1');
    expect(byEntity).toHaveLength(1);

    // Global settings get and set
    settingsRepo.set('theme', JSON.stringify({ mode: 'dark' }));
    expect(settingsRepo.get('theme')).toBe(JSON.stringify({ mode: 'dark' }));

    // Upsert setting
    settingsRepo.set('theme', JSON.stringify({ mode: 'emerald' }));
    expect(settingsRepo.get('theme')).toBe(JSON.stringify({ mode: 'emerald' }));
    expect(settingsRepo.listAll()).toHaveLength(1);
  });

  // Additional Test: AcademicAuditRepository
  it('AcademicAuditRepository works correctly', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const auditRepo = new AcademicAuditRepository(acadConn.db);
    const now = new Date().toISOString();

    auditRepo.insert({
      id: 'acad-repo-audit-1',
      actorType: 'SYSTEM',
      actorUserId: null,
      actorNameSnapshot: 'Automated Session Engine',
      action: 'GENERATE_SESSIONS',
      entityType: 'SESSION',
      entityId: 'sess-bulk-1',
      createdAt: now,
    });

    const recent = auditRepo.listRecent(10);
    expect(recent).toHaveLength(1);
    expect(recent[0]!.actorType).toBe('SYSTEM');
    expect(recent[0]!.actorUserId).toBeNull();

    const byEntity = auditRepo.findByEntity('SESSION', 'sess-bulk-1');
    expect(byEntity).toHaveLength(1);
  });

  // Test: StudentStatus accepts only ACTIVE and INACTIVE and rejects ARCHIVED at database level
  it('Student status accepts only ACTIVE and INACTIVE and rejects ARCHIVED at database level', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const studentRepo = new StudentRepository(acadConn.db);
    const now = new Date().toISOString();

    // ACTIVE is accepted
    const activeStudent = studentRepo.create({
      id: 'std-active',
      studentCode: 'ST-ACT-1',
      fullName: 'Active Student',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01011111111',
      status: 'ACTIVE',
      qrToken: 'qr-act',
      barcodeValue: 'bar-act',
      createdAt: now,
      updatedAt: now,
    });
    expect(activeStudent.status).toBe('ACTIVE');

    // INACTIVE is accepted
    const inactiveStudent = studentRepo.create({
      id: 'std-inactive',
      studentCode: 'ST-INACT-1',
      fullName: 'Inactive Student',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01022222222',
      status: 'INACTIVE',
      qrToken: 'qr-inact',
      barcodeValue: 'bar-inact',
      createdAt: now,
      updatedAt: now,
    });
    expect(inactiveStudent.status).toBe('INACTIVE');

    // ARCHIVED is rejected by check constraint
    expect(() => {
      acadConn.raw
        .prepare(
          `INSERT INTO students (id, student_code, full_name, education_system, grade_level, language_track, guardian_phone, status, qr_token, barcode_value, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('std-archived', 'ST-ARCH-1', 'Archived Student', 'GENERAL', 'SEC_1', 'ARABIC', '01033333333', 'ARCHIVED', 'qr-arch', 'bar-arch', now, now);
    }).toThrow(/CHECK constraint/i);
  });

  // Test: Physical deletion of a group with schedules is prevented by foreign key RESTRICT
  it('Physical deletion of a group with schedules is prevented by foreign key RESTRICT', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const groupRepo = new GroupRepository(acadConn.db);
    const now = new Date().toISOString();

    const grp = groupRepo.create({
      id: 'grp-restrict-test',
      name: 'Group with Schedules',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      focusMathBranch: null,
      defaultPaymentType: 'PER_SESSION',
      defaultPaymentAmount: 100,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    groupRepo.addSchedule({
      id: 'sched-restrict-1',
      groupId: grp.id,
      weekday: 1,
      startTime: '16:00',
      durationMinutes: 120,
      createdAt: now,
      updatedAt: now,
    });

    // Attempting physical deletion of the group must be rejected by foreign key RESTRICT
    expect(() => {
      acadConn.raw.prepare('DELETE FROM groups WHERE id = ?').run(grp.id);
    }).toThrow(/FOREIGN KEY constraint failed/i);

    // Soft-state archiving of the group succeeds without deleting schedule history
    expect(() => {
      groupRepo.update(grp.id, { status: 'ARCHIVED' });
    }).not.toThrow();

    const archivedGroup = groupRepo.findById(grp.id);
    expect(archivedGroup?.status).toBe('ARCHIVED');
    const schedules = groupRepo.getSchedules(grp.id);
    expect(schedules).toHaveLength(1);
  });
});
