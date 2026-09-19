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
  runMigrations,
  ACADEMIC_MIGRATIONS,
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
  AttendanceRepository,
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
    expect(appliedSys).toEqual(['0000_initial_schema', '0001_audit_triggers', '0002_overrated_naoko']);

    const appliedAcad = migrateAcademicDatabase(acadRaw);
    expect(appliedAcad).toEqual([
      '0000_initial_schema',
      '0001_audit_triggers',
      '0002_glamorous_sunspot',
      '0003_neat_krista_starr',
      '0004_cold_bullseye',
      '0005_rainy_silvermane',
      '0006_parched_xavin',
      '0007_awesome_sunspot',
    ]);

    expect(getAppliedMigrations(sysRaw)).toEqual(['0000_initial_schema', '0001_audit_triggers', '0002_overrated_naoko']);
    expect(getAppliedMigrations(acadRaw)).toEqual([
      '0000_initial_schema',
      '0001_audit_triggers',
      '0002_glamorous_sunspot',
      '0003_neat_krista_starr',
      '0004_cold_bullseye',
      '0005_rainy_silvermane',
      '0006_parched_xavin',
      '0007_awesome_sunspot',
    ]);

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

    expect(getAppliedMigrations(sysRaw)).toEqual(['0000_initial_schema', '0001_audit_triggers', '0002_overrated_naoko']);
    expect(getAppliedMigrations(acadRaw)).toEqual([
      '0000_initial_schema',
      '0001_audit_triggers',
      '0002_glamorous_sunspot',
      '0003_neat_krista_starr',
      '0004_cold_bullseye',
      '0005_rainy_silvermane',
      '0006_parched_xavin',
      '0007_awesome_sunspot',
    ]);

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

  // Test: Upgrading an existing academic database from pre-0002 preserves pre-existing session rows
  it('Academic database cleanly upgrades from pre-0002 schema preserving pre-existing session rows', () => {
    const rawDb = createRawDatabase(':memory:');

    // 1. Create/apply migrations through 0000_initial_schema and 0001_audit_triggers only
    const pre0002Migrations = ACADEMIC_MIGRATIONS.slice(0, 2);
    const initialApplied = runMigrations(rawDb, pre0002Migrations);
    expect(initialApplied).toEqual(['0000_initial_schema', '0001_audit_triggers']);
    expect(getAppliedMigrations(rawDb)).toEqual(['0000_initial_schema', '0001_audit_triggers']);

    // Verify cancellation_reason column does not exist yet
    const colsBefore = rawDb.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
    expect(colsBefore.map((c) => c.name)).not.toContain('cancellation_reason');

    // 2. Insert prerequisite group, schedule, and representative session row before applying 0002
    const now = '2026-10-01T10:00:00.000Z';
    rawDb.prepare(`
      INSERT INTO groups (id, name, education_system, grade_level, language_track, default_payment_type, default_payment_amount, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('grp-upg-1', 'مجموعة ترقية قاعدة البيانات', 'GENERAL', 'SEC_1', 'ARABIC', 'PER_SESSION', 150, 'ACTIVE', now, now);

    rawDb.prepare(`
      INSERT INTO group_schedules (id, group_id, weekday, start_time, duration_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('sched-upg-1', 'grp-upg-1', 0, '16:00', 90, now, now);

    const originalSession = {
      id: 'sess-pre-0002',
      groupId: 'grp-upg-1',
      scheduleId: 'sched-upg-1',
      occurrenceKey: 'sched-upg-1_2026-10-04',
      scheduledDate: '2026-10-04',
      scheduledStartTime: '16:00',
      effectiveDate: '2026-10-04',
      effectiveStartTime: '16:00',
      durationMinutes: 90,
      status: 'SCHEDULED',
      rescheduleReason: null,
      rescheduledAt: null,
      notes: 'ملاحظة عامة قبل تطبيق ترقية سبب الإلغاء',
      createdAt: now,
      updatedAt: now,
    };

    rawDb.prepare(`
      INSERT INTO sessions (
        id, group_id, schedule_id, occurrence_key,
        scheduled_date, scheduled_start_time,
        effective_date, effective_start_time,
        duration_minutes, status, reschedule_reason, rescheduled_at,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      originalSession.id,
      originalSession.groupId,
      originalSession.scheduleId,
      originalSession.occurrenceKey,
      originalSession.scheduledDate,
      originalSession.scheduledStartTime,
      originalSession.effectiveDate,
      originalSession.effectiveStartTime,
      originalSession.durationMinutes,
      originalSession.status,
      originalSession.rescheduleReason,
      originalSession.rescheduledAt,
      originalSession.notes,
      originalSession.createdAt,
      originalSession.updatedAt,
    );

    // 3. Run the normal migrator
    const appliedDuringUpgrade = migrateAcademicDatabase(rawDb);

    // 4. Verify 0002, 0003, 0004, 0005, 0006, and 0007 are applied
    expect(appliedDuringUpgrade).toEqual(['0002_glamorous_sunspot', '0003_neat_krista_starr', '0004_cold_bullseye', '0005_rainy_silvermane', '0006_parched_xavin', '0007_awesome_sunspot']);
    const colsAfter = rawDb.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
    expect(colsAfter.map((c) => c.name)).toContain('cancellation_reason');

    // 5. Verify the pre-existing session row remains intact with all original occurrence, scheduled, effective, status, and notes values preserved
    const upgradedRow = rawDb.prepare('SELECT * FROM sessions WHERE id = ?').get('sess-pre-0002') as any;
    expect(upgradedRow).toBeDefined();
    expect(upgradedRow.id).toBe(originalSession.id);
    expect(upgradedRow.group_id).toBe(originalSession.groupId);
    expect(upgradedRow.schedule_id).toBe(originalSession.scheduleId);
    expect(upgradedRow.occurrence_key).toBe(originalSession.occurrenceKey);
    expect(upgradedRow.scheduled_date).toBe(originalSession.scheduledDate);
    expect(upgradedRow.scheduled_start_time).toBe(originalSession.scheduledStartTime);
    expect(upgradedRow.effective_date).toBe(originalSession.effectiveDate);
    expect(upgradedRow.effective_start_time).toBe(originalSession.effectiveStartTime);
    expect(upgradedRow.duration_minutes).toBe(originalSession.durationMinutes);
    expect(upgradedRow.status).toBe(originalSession.status);
    expect(upgradedRow.notes).toBe(originalSession.notes);
    expect(upgradedRow.created_at).toBe(originalSession.createdAt);
    expect(upgradedRow.updated_at).toBe(originalSession.updatedAt);

    // 6. Verify cancellation_reason is NULL for the pre-existing row
    expect(upgradedRow.cancellation_reason).toBeNull();

    // 7. Verify migrations are recorded exactly once in migration history
    expect(getAppliedMigrations(rawDb)).toEqual([
      '0000_initial_schema',
      '0001_audit_triggers',
      '0002_glamorous_sunspot',
      '0003_neat_krista_starr',
      '0004_cold_bullseye',
      '0005_rainy_silvermane',
      '0006_parched_xavin',
      '0007_awesome_sunspot',
    ]);
    const migrationRecords = rawDb
      .prepare("SELECT COUNT(*) as count FROM __tibyan_migrations WHERE id = '0002_glamorous_sunspot'")
      .get() as { count: number };
    expect(migrationRecords.count).toBe(1);

    // 8. Run the migrator again and confirm it is idempotent and does not reapply or corrupt data
    const secondRunApplied = migrateAcademicDatabase(rawDb);
    expect(secondRunApplied).toEqual([]);

    const reloadedAfterSecondMigrate = rawDb.prepare('SELECT * FROM sessions WHERE id = ?').get('sess-pre-0002') as any;
    expect(reloadedAfterSecondMigrate).toEqual(upgradedRow);

    rawDb.close();
  });

  it('Migration 0003 creates attendance_records table with foreign keys and unique constraint', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    migrateAcademicDatabase(acadConn.raw);

    // Verify table exists
    const tables = acadConn.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance_records'")
      .all() as Array<{ name: string }>;
    expect(tables.length).toBe(1);

    // Verify column definitions
    const cols = acadConn.raw.prepare("PRAGMA table_info(attendance_records)").all() as Array<{ name: string }>;
    const colNames = cols.map((c) => c.name);
    expect(colNames).toContain('id');
    expect(colNames).toContain('session_id');
    expect(colNames).toContain('student_id');
    expect(colNames).toContain('status');
    expect(colNames).toContain('arrival_time');
    expect(colNames).toContain('notes');
    expect(colNames).toContain('recorded_by_user_id');
    expect(colNames).toContain('recorded_at');
    expect(colNames).toContain('updated_at');

    // Verify unique index on (session_id, student_id)
    const indices = acadConn.raw.prepare("PRAGMA index_list(attendance_records)").all() as Array<{ name: string; unique: number }>;
    const uniqueIdx = indices.find((idx) => idx.name === 'idx_attendance_session_student');
    expect(uniqueIdx).toBeDefined();
    expect(uniqueIdx?.unique).toBe(1);
  });

  it('AttendanceRepository upsert, batchUpsert, query, and SessionRepository.updateStatus work cleanly', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    migrateAcademicDatabase(acadConn.raw);

    const studentRepo = new StudentRepository(acadConn.db);
    const groupRepo = new GroupRepository(acadConn.db);
    const sessionRepo = new SessionRepository(acadConn.db);
    const attendanceRepo = new AttendanceRepository(acadConn.db);

    const student1 = studentRepo.create({
      id: 'std-1',
      studentCode: 'STU-001',
      fullName: 'علي حسن',
      qrToken: 'qr-std-1',
      barcodeValue: 'bar-std-1',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01011111111',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const student2 = studentRepo.create({
      id: 'std-2',
      studentCode: 'STU-002',
      fullName: 'سارة أحمد',
      qrToken: 'qr-std-2',
      barcodeValue: 'bar-std-2',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01022222222',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const group = groupRepo.create({
      id: 'grp-1',
      name: 'مجموعة 1ث - السبت',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 350,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const session = sessionRepo.create({
      id: 'sess-1',
      groupId: group.id,
      scheduleId: null,
      occurrenceKey: 'grp-1_2026-10-03_16:00',
      scheduledDate: '2026-10-03',
      scheduledStartTime: '16:00',
      effectiveDate: '2026-10-03',
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

    // 1. Upsert attendance for student1 (PRESENT)
    const rec1 = attendanceRepo.upsert({
      id: 'att-1',
      sessionId: session.id,
      studentId: student1.id,
      status: 'PRESENT',
      arrivalTime: '16:05',
      notes: 'حضر في الموعد',
      recordedByUserId: 'usr-teacher',
      recordedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(rec1.status).toBe('PRESENT');
    expect(rec1.arrivalTime).toBe('16:05');

    // 2. Upsert again for student1 (update status to LATE) — must not duplicate
    const updatedRec1 = attendanceRepo.upsert({
      id: 'att-1-alt',
      sessionId: session.id,
      studentId: student1.id,
      status: 'LATE',
      arrivalTime: '16:25',
      notes: 'تأخر 25 دقيقة',
      recordedByUserId: 'usr-teacher',
      recordedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(updatedRec1.status).toBe('LATE');
    expect(updatedRec1.notes).toBe('تأخر 25 دقيقة');

    const allSessionRecords = attendanceRepo.listBySessionId(session.id);
    expect(allSessionRecords.length).toBe(1);

    // 3. Batch upsert for student2
    attendanceRepo.batchUpsert([
      {
        id: 'att-2',
        sessionId: session.id,
        studentId: student2.id,
        status: 'ABSENT',
        arrivalTime: null,
        notes: 'غياب بدون عذر',
        recordedByUserId: 'usr-teacher',
        recordedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    // 4. Count by status
    const summary = attendanceRepo.countByStatusForSession(session.id);
    expect(summary.total).toBe(2);
    expect(summary.present).toBe(0);
    expect(summary.late).toBe(1);
    expect(summary.absent).toBe(1);
    expect(summary.excused).toBe(0);

    // 5. listByDateWithDetails
    const details = attendanceRepo.listByDateWithDetails('2026-10-03');
    expect(details.length).toBe(2);
    const absentDetail = details.find((d) => d.studentId === student2.id);
    expect(absentDetail).toBeDefined();
    expect(absentDetail?.studentName).toBe('سارة أحمد');
    expect(absentDetail?.guardianPhone).toBe('01022222222');
    expect(absentDetail?.groupName).toBe('مجموعة 1ث - السبت');
    expect(absentDetail?.status).toBe('ABSENT');

    // 6. SessionRepository.updateStatus
    const completedSession = sessionRepo.updateStatus(session.id, 'COMPLETED', 'تم الانتهاء بنجاح');
    expect(completedSession?.status).toBe('COMPLETED');
    expect(completedSession?.notes).toBe('تم الانتهاء بنجاح');
  });

  it('enforces SQLite CHECK constraints on attendance_records (status and 24h arrival_time rules)', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    migrateAcademicDatabase(acadConn.raw);

    const studentRepo = new StudentRepository(acadConn.db);
    const groupRepo = new GroupRepository(acadConn.db);
    const sessionRepo = new SessionRepository(acadConn.db);

    const student = studentRepo.create({
      id: 'std-chk-1',
      studentCode: 'STU-CHK-1',
      fullName: 'طالب الفحص',
      qrToken: 'qr-chk-1',
      barcodeValue: 'bar-chk-1',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01011111111',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const group = groupRepo.create({
      id: 'grp-chk-1',
      name: 'مجموعة فحص القيود',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 300,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const session = sessionRepo.create({
      id: 'sess-chk-1',
      groupId: group.id,
      scheduleId: null,
      occurrenceKey: 'grp-chk-1_2026-10-05_16:00',
      scheduledDate: '2026-10-05',
      scheduledStartTime: '16:00',
      effectiveDate: '2026-10-05',
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

    const insertRaw = (status: string, arrivalTime: string | null) => {
      acadConn.raw.prepare(`
        INSERT INTO attendance_records (id, session_id, student_id, status, arrival_time, recorded_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), session.id, student.id, status, arrivalTime, new Date().toISOString(), new Date().toISOString());
    };

    // 1. Invalid status fails chk_attendance_status
    expect(() => insertRaw('UNKNOWN', null)).toThrow(/CHECK constraint failed/i);

    // 2. LATE without arrival_time fails chk_attendance_arrival_time
    expect(() => insertRaw('LATE', null)).toThrow(/CHECK constraint failed/i);

    // 3. LATE with invalid times fails chk_attendance_arrival_time
    expect(() => insertRaw('LATE', '88:99')).toThrow(/CHECK constraint failed/i);
    expect(() => insertRaw('LATE', '24:00')).toThrow(/CHECK constraint failed/i);
    expect(() => insertRaw('LATE', '12:75')).toThrow(/CHECK constraint failed/i);

    // 4. ABSENT with arrival_time fails chk_attendance_arrival_time
    expect(() => insertRaw('ABSENT', '16:00')).toThrow(/CHECK constraint failed/i);

    // 5. EXCUSED with arrival_time fails chk_attendance_arrival_time
    expect(() => insertRaw('EXCUSED', '16:00')).toThrow(/CHECK constraint failed/i);

    // 6. Valid entries succeed
    expect(() => insertRaw('PRESENT', null)).not.toThrow();
  });

  it('Migration 0005 creates attendance_follow_ups with foreign key, unique constraint, and status CHECK', () => {
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    migrateAcademicDatabase(acadConn.raw);

    const studentRepo = new StudentRepository(acadConn.db);
    const groupRepo = new GroupRepository(acadConn.db);
    const sessionRepo = new SessionRepository(acadConn.db);

    const student = studentRepo.create({
      id: 'std-fu-1',
      studentCode: 'STU-FU-1',
      fullName: 'طالب المتابعة',
      qrToken: 'qr-fu-1',
      barcodeValue: 'bar-fu-1',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01011111111',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const group = groupRepo.create({
      id: 'grp-fu-1',
      name: 'مجموعة المتابعة',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      defaultPaymentType: 'PER_SESSION',
      defaultPaymentAmount: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const session = sessionRepo.create({
      id: 'sess-fu-1',
      groupId: group.id,
      scheduleId: null,
      occurrenceKey: 'grp-fu-1_2026-10-05_16:00',
      scheduledDate: '2026-10-05',
      scheduledStartTime: '16:00',
      effectiveDate: '2026-10-05',
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

    // Create an attendance record
    const recordId = crypto.randomUUID();
    acadConn.raw.prepare(`
      INSERT INTO attendance_records (id, session_id, student_id, status, arrival_time, recorded_at, updated_at)
      VALUES (?, ?, ?, 'ABSENT', NULL, ?, ?)
    `).run(recordId, session.id, student.id, new Date().toISOString(), new Date().toISOString());

    // 1. Valid follow up insert succeeds
    const followUpId = crypto.randomUUID();
    acadConn.raw.prepare(`
      INSERT INTO attendance_follow_ups (id, attendance_record_id, contact_status, note, contacted_at, contacted_by_user_id, created_at, updated_at)
      VALUES (?, ?, 'UNCONTACTED', NULL, NULL, NULL, ?, ?)
    `).run(followUpId, recordId, new Date().toISOString(), new Date().toISOString());

    // 2. Duplicate follow up for the same attendance_record_id fails unique constraint
    expect(() => {
      acadConn.raw.prepare(`
        INSERT INTO attendance_follow_ups (id, attendance_record_id, contact_status, note, contacted_at, contacted_by_user_id, created_at, updated_at)
        VALUES (?, ?, 'CONTACTED', 'تم الاتصال', ?, ?, ?, ?)
      `).run(crypto.randomUUID(), recordId, new Date().toISOString(), crypto.randomUUID(), new Date().toISOString(), new Date().toISOString());
    }).toThrow(/UNIQUE constraint failed/i);

    // 3. Invalid contact_status fails CHECK constraint
    expect(() => {
      acadConn.raw.prepare(`
        INSERT INTO attendance_follow_ups (id, attendance_record_id, contact_status, created_at, updated_at)
        VALUES (?, ?, 'INVALID_STATUS', ?, ?)
      `).run(crypto.randomUUID(), crypto.randomUUID(), new Date().toISOString(), new Date().toISOString());
    }).toThrow(/CHECK constraint failed/i);

    // 4. Non-existent attendance_record_id fails FOREIGN KEY constraint
    expect(() => {
      acadConn.raw.prepare(`
        INSERT INTO attendance_follow_ups (id, attendance_record_id, contact_status, created_at, updated_at)
        VALUES (?, ?, 'UNCONTACTED', ?, ?)
      `).run(crypto.randomUUID(), 'non-existent-record-id', new Date().toISOString(), new Date().toISOString());
    }).toThrow(/FOREIGN KEY constraint failed/i);
  });
});

