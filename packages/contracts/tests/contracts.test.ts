import { describe, it, expect } from 'vitest';
import {
  PinSchema,
  EgyptianGuardianPhoneSchema,
  EducationSystemSchema,
  GradeLevelSchema,
  LanguageTrackSchema,
  MathBranchSchema,
  PaymentTypeSchema,
  UserRoleSchema,
  ActorTypeSchema,
  PermissionCodeSchema,
  StudentStatusSchema,
  StudentNoteTagSchema,
  SessionStatusSchema,
  WeekdaySchema,
  CreateStudentSchema,
  CreateGroupSchema,
  EnrollStudentSchema,
  RescheduleSessionSchema,
  CreateAuditEntrySchema,
  CreateAcademicYearSchema,
  CalendarDateSchema,
  isValidCalendarDate,
  normalizeEgyptianPhone,
  BootstrapOwnerSchema,
  LoginUserSchema,
  ManagedUserSchema,
  type LoginUserDto,
  type ManagedUserDto,
  AttendanceStatusSchema,
  AttendanceRecordDtoSchema,
  SessionRosterItemDtoSchema,
  SessionAttendanceRosterDtoSchema,
  RecordAttendanceInputSchema,
  BatchRecordAttendanceInputSchema,
  CompleteSessionInputSchema,
  EndOfDayFollowUpDtoSchema,
  IPC_CHANNELS,
} from '../src/index.js';

const VALID_UUID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

describe('Contracts — PIN Validation', () => {
  it('accepts valid 4-digit numeric PINs', () => {
    expect(PinSchema.parse('1234')).toBe('1234');
    expect(PinSchema.parse('0000')).toBe('0000');
    expect(PinSchema.parse('9876')).toBe('9876');
    expect(PinSchema.parse('0123')).toBe('0123');
  });

  it('rejects invalid PINs', () => {
    expect(() => PinSchema.parse('123')).toThrow(); // too short (3 digits)
    expect(() => PinSchema.parse('12345')).toThrow(); // too long (5 digits)
    expect(() => PinSchema.parse('abcd')).toThrow(); // alphabetic
    expect(() => PinSchema.parse('12a4')).toThrow(); // mixed alphanumeric
    expect(() => PinSchema.parse('')).toThrow(); // empty
    expect(() => PinSchema.parse('12.4')).toThrow(); // decimal
    expect(() => PinSchema.parse('-123')).toThrow(); // negative
  });
});

describe('Contracts — Egyptian Guardian Phone Validation', () => {
  it('accepts and normalizes local 11-digit Egyptian mobile numbers', () => {
    expect(EgyptianGuardianPhoneSchema.parse('01012345678')).toBe('01012345678');
    expect(EgyptianGuardianPhoneSchema.parse('01198765432')).toBe('01198765432');
    expect(EgyptianGuardianPhoneSchema.parse('01200000000')).toBe('01200000000');
    expect(EgyptianGuardianPhoneSchema.parse('01599999999')).toBe('01599999999');
  });

  it('accepts and normalizes international Egyptian mobile numbers (+20 and 0020)', () => {
    expect(EgyptianGuardianPhoneSchema.parse('+201012345678')).toBe('01012345678');
    expect(EgyptianGuardianPhoneSchema.parse('00201198765432')).toBe('01198765432');
    expect(EgyptianGuardianPhoneSchema.parse('+2001234567890')).toBe('01234567890');
  });

  it('rejects invalid mobile numbers and landlines', () => {
    expect(() => EgyptianGuardianPhoneSchema.parse('01312345678')).toThrow(); // 013 is Qalyubia landline
    expect(() => EgyptianGuardianPhoneSchema.parse('0223456789')).toThrow(); // Cairo landline
    expect(() => EgyptianGuardianPhoneSchema.parse('010123456')).toThrow(); // 9 digits (too short)
    expect(() => EgyptianGuardianPhoneSchema.parse('010123456789')).toThrow(); // 12 digits (too long)
    expect(() => EgyptianGuardianPhoneSchema.parse('abc')).toThrow();
    expect(() => EgyptianGuardianPhoneSchema.parse('+15551234567')).toThrow(); // US format
  });

  it('normalizes spaces and hyphens cleanly', () => {
    expect(normalizeEgyptianPhone('010-1234-5678')).toBe('01012345678');
    expect(normalizeEgyptianPhone('+20 11 9876 5432')).toBe('01198765432');
  });
});

describe('Contracts — EducationSystem & GradeLevel Independence', () => {
  it('accepts GENERAL and EGYPTIAN_BACCALAUREATE independently', () => {
    expect(EducationSystemSchema.parse('GENERAL')).toBe('GENERAL');
    expect(EducationSystemSchema.parse('EGYPTIAN_BACCALAUREATE')).toBe('EGYPTIAN_BACCALAUREATE');
  });

  it('rejects removed/unsupported baccalaureate formats', () => {
    expect(() => EducationSystemSchema.parse('FRENCH_BACCALAUREATE')).toThrow();
    expect(() => EducationSystemSchema.parse('BACCALAUREATE')).toThrow(); // Must be EGYPTIAN_BACCALAUREATE
  });

  it('accepts all standard grade levels independently from education system', () => {
    const grades = ['PREP_1', 'PREP_2', 'PREP_3', 'SEC_1', 'SEC_2', 'SEC_3'] as const;
    grades.forEach((g) => {
      expect(GradeLevelSchema.parse(g)).toBe(g);
    });
  });

  it('creates student with EducationSystem and GradeLevel modeled separately', () => {
    const student = CreateStudentSchema.parse({
      fullName: 'أحمد محمود',
      educationSystem: 'EGYPTIAN_BACCALAUREATE',
      gradeLevel: 'SEC_2',
      languageTrack: 'LANG_ENGLISH',
      guardianPhone: '01012345678',
    });

    expect(student.educationSystem).toBe('EGYPTIAN_BACCALAUREATE');
    expect(student.gradeLevel).toBe('SEC_2');
    expect(student.languageTrack).toBe('LANG_ENGLISH');
    expect(student.guardianPhone).toBe('01012345678');
  });
});

describe('Contracts — Core Domain Enums Validation', () => {
  it('validates LanguageTrack values', () => {
    expect(LanguageTrackSchema.parse('ARABIC')).toBe('ARABIC');
    expect(LanguageTrackSchema.parse('LANG_ENGLISH')).toBe('LANG_ENGLISH');
    expect(() => LanguageTrackSchema.parse('FRENCH')).toThrow();
  });

  it('validates MathBranch values', () => {
    const branches = [
      'GENERAL_MATH',
      'ALGEBRA',
      'GEOMETRY',
      'TRIGONOMETRY',
      'CALCULUS',
      'STATISTICS',
      'APPLIED_MATH',
    ] as const;
    branches.forEach((b) => {
      expect(MathBranchSchema.parse(b)).toBe(b);
    });
    expect(() => MathBranchSchema.parse('PHYSICS')).toThrow();
  });

  it('validates PaymentType values', () => {
    expect(PaymentTypeSchema.parse('MONTHLY')).toBe('MONTHLY');
    expect(PaymentTypeSchema.parse('PER_SESSION')).toBe('PER_SESSION');
    expect(() => PaymentTypeSchema.parse('YEARLY')).toThrow();
  });

  it('validates UserRole and ActorType values', () => {
    expect(UserRoleSchema.parse('OWNER')).toBe('OWNER');
    expect(UserRoleSchema.parse('ASSISTANT')).toBe('ASSISTANT');
    expect(() => UserRoleSchema.parse('ADMIN')).toThrow();

    expect(ActorTypeSchema.parse('USER')).toBe('USER');
    expect(ActorTypeSchema.parse('SYSTEM')).toBe('SYSTEM');
    expect(() => ActorTypeSchema.parse('BOT')).toThrow();
  });

  it('validates PermissionCode values', () => {
    const permissions = [
      'STUDENTS_READ',
      'STUDENTS_WRITE',
      'GROUPS_READ',
      'GROUPS_WRITE',
      'SESSIONS_MANAGE',
      'ATTENDANCE_WRITE',
      'PAYMENTS_READ',
      'PAYMENTS_WRITE',
      'REPORTS_READ',
      'SETTINGS_WRITE',
      'USERS_MANAGE',
      'BACKUP_MANAGE',
    ] as const;
    permissions.forEach((p) => {
      expect(PermissionCodeSchema.parse(p)).toBe(p);
    });
    expect(() => PermissionCodeSchema.parse('INVALID_PERMISSION')).toThrow();
  });

  it('validates StudentStatus and StudentNoteTag values', () => {
    expect(StudentStatusSchema.parse('ACTIVE')).toBe('ACTIVE');
    expect(StudentStatusSchema.parse('INACTIVE')).toBe('INACTIVE');
    expect(() => StudentStatusSchema.parse('SUSPENDED')).toThrow();

    const tags = ['GENERAL', 'ACADEMIC_WEAKNESS', 'EXCELLENT', 'BEHAVIOR', 'NEEDS_FOLLOW_UP'] as const;
    tags.forEach((t) => {
      expect(StudentNoteTagSchema.parse(t)).toBe(t);
    });
  });

  it('validates SessionStatus and Weekday values', () => {
    const statuses = ['SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED_BY_TEACHER'] as const;
    statuses.forEach((s) => {
      expect(SessionStatusSchema.parse(s)).toBe(s);
    });

    for (let day = 0; day <= 6; day++) {
      expect(WeekdaySchema.parse(day)).toBe(day);
    }
    expect(() => WeekdaySchema.parse(7)).toThrow();
    expect(() => WeekdaySchema.parse(-1)).toThrow();
  });
});

describe('Contracts — Enrollment Payment Overrides', () => {
  it('defaults payment overrides to null on enrollment', () => {
    const enrollment = EnrollStudentSchema.parse({
      groupId: VALID_UUID,
      studentId: VALID_UUID,
    });

    expect(enrollment.paymentTypeOverride).toBeNull();
    expect(enrollment.paymentAmountOverride).toBeNull();
  });

  it('allows explicit payment overrides on enrollment', () => {
    const enrollment = EnrollStudentSchema.parse({
      groupId: VALID_UUID,
      studentId: VALID_UUID,
      paymentTypeOverride: 'PER_SESSION',
      paymentAmountOverride: 175.5,
    });

    expect(enrollment.paymentTypeOverride).toBe('PER_SESSION');
    expect(enrollment.paymentAmountOverride).toBe(175.5);
  });

  it('rejects negative payment amounts on overrides', () => {
    expect(() =>
      EnrollStudentSchema.parse({
        groupId: VALID_UUID,
        studentId: VALID_UUID,
        paymentAmountOverride: -50,
      })
    ).toThrow();
  });

  it('rejects negative default payment amount on groups', () => {
    expect(() =>
      CreateGroupSchema.parse({
        name: 'مجموعة 3ث لغات',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_3',
        languageTrack: 'LANG_ENGLISH',
        defaultPaymentType: 'MONTHLY',
        defaultPaymentAmount: -300,
      })
    ).toThrow();
  });
});

describe('Contracts — Audit Actor Invariants (Discriminated Union)', () => {
  it('SYSTEM actor with actorUserId null passes.', () => {
    const entry = CreateAuditEntrySchema.parse({
      actorType: 'SYSTEM',
      actorUserId: null,
      actorNameSnapshot: 'BackupEngine',
      action: 'BACKUP_CREATE',
      entityType: 'SYSTEM',
      entityId: 'backup-001',
    });

    expect(entry.actorType).toBe('SYSTEM');
    expect(entry.actorUserId).toBeNull();
    expect(entry.actorNameSnapshot).toBe('BackupEngine');
  });

  it('SYSTEM actor with non-null actorUserId fails.', () => {
    expect(() =>
      CreateAuditEntrySchema.parse({
        actorType: 'SYSTEM',
        actorUserId: VALID_UUID,
        actorNameSnapshot: 'BackupEngine',
        action: 'BACKUP_CREATE',
        entityType: 'SYSTEM',
        entityId: 'backup-001',
      })
    ).toThrow();
  });

  it('USER actor with valid UUID passes.', () => {
    const entry = CreateAuditEntrySchema.parse({
      actorType: 'USER',
      actorUserId: VALID_UUID,
      actorNameSnapshot: 'الأستاذ أحمد',
      action: 'STUDENT_CREATE',
      entityType: 'STUDENT',
      entityId: VALID_UUID,
    });

    expect(entry.actorType).toBe('USER');
    expect(entry.actorUserId).toBe(VALID_UUID);
  });

  it('USER actor with null actorUserId fails.', () => {
    expect(() =>
      CreateAuditEntrySchema.parse({
        actorType: 'USER',
        actorUserId: null,
        actorNameSnapshot: 'الأستاذ أحمد',
        action: 'STUDENT_CREATE',
        entityType: 'STUDENT',
        entityId: VALID_UUID,
      })
    ).toThrow();
  });
});

describe('Contracts — Real Calendar Date Validation', () => {
  it('Date 2026-02-30 fails.', () => {
    expect(isValidCalendarDate('2026-02-30')).toBe(false);
    expect(() => CalendarDateSchema.parse('2026-02-30')).toThrow();
  });

  it('Date 2028-02-29 passes.', () => {
    expect(isValidCalendarDate('2028-02-29')).toBe(true);
    expect(CalendarDateSchema.parse('2028-02-29')).toBe('2028-02-29');
  });

  it('Date 2027-02-29 fails.', () => {
    expect(isValidCalendarDate('2027-02-29')).toBe(false);
    expect(() => CalendarDateSchema.parse('2027-02-29')).toThrow();
  });

  it('rejects impossible months like 2026-13-01 and 2026-00-10', () => {
    expect(isValidCalendarDate('2026-13-01')).toBe(false);
    expect(isValidCalendarDate('2026-00-10')).toBe(false);
    expect(() => CalendarDateSchema.parse('2026-13-01')).toThrow();
    expect(() => CalendarDateSchema.parse('2026-00-10')).toThrow();
  });
});

describe('Contracts — Session Rescheduling & Date/Time Validation', () => {
  it('validates correct rescheduling inputs', () => {
    const reschedule = RescheduleSessionSchema.parse({
      sessionId: VALID_UUID,
      newEffectiveDate: '2026-10-18',
      newEffectiveStartTime: '17:30',
      reason: 'سفر مفاجئ للمدرس',
    });

    expect(reschedule.newEffectiveDate).toBe('2026-10-18');
    expect(reschedule.newEffectiveStartTime).toBe('17:30');
    expect(reschedule.reason).toBe('سفر مفاجئ للمدرس');
  });

  it('rejects invalid dates or times in session rescheduling', () => {
    // Non-existent date 2026-02-30
    expect(() =>
      RescheduleSessionSchema.parse({
        sessionId: VALID_UUID,
        newEffectiveDate: '2026-02-30',
        newEffectiveStartTime: '17:30',
        reason: 'سبب',
      })
    ).toThrow();

    // Invalid hour
    expect(() =>
      RescheduleSessionSchema.parse({
        sessionId: VALID_UUID,
        newEffectiveDate: '2026-10-18',
        newEffectiveStartTime: '25:00',
        reason: 'سبب',
      })
    ).toThrow();

    // Whitespace only reason
    expect(() =>
      RescheduleSessionSchema.parse({
        sessionId: VALID_UUID,
        newEffectiveDate: '2026-10-18',
        newEffectiveStartTime: '17:30',
        reason: '   ',
      })
    ).toThrow();
  });
});

describe('Contracts — Academic Year Semantic Validation', () => {
  it('Academic year 2026-2027 passes.', () => {
    expect(CreateAcademicYearSchema.parse({ name: '2026-2027' }).name).toBe('2026-2027');
  });

  it('Academic year 2026-2028 fails.', () => {
    expect(() => CreateAcademicYearSchema.parse({ name: '2026-2028' })).toThrow(
      /Ending year must equal starting year \+ 1/
    );
  });

  it('Academic year 2026-2026 fails.', () => {
    expect(() => CreateAcademicYearSchema.parse({ name: '2026-2026' })).toThrow(
      /Ending year must equal starting year \+ 1/
    );
  });

  it('rejects reversed academic year ranges like 2027-2026', () => {
    expect(() => CreateAcademicYearSchema.parse({ name: '2027-2026' })).toThrow(
      /Ending year must equal starting year \+ 1/
    );
  });

  it('rejects malformed academic year strings', () => {
    expect(() => CreateAcademicYearSchema.parse({ name: '2026' })).toThrow();
    expect(() => CreateAcademicYearSchema.parse({ name: '2026/2027' })).toThrow();
    expect(() => CreateAcademicYearSchema.parse({ name: '26-27' })).toThrow();
  });
});

describe('Contracts — IPC Channels & BootstrapOwner Schema', () => {
  it('validates correct BootstrapOwner input', () => {
    const input = BootstrapOwnerSchema.parse({
      fullName: 'الأستاذ أحمد الشريف',
      username: 'teacher',
      pin: '1234',
    });
    expect(input.fullName).toBe('الأستاذ أحمد الشريف');
    expect(input.username).toBe('teacher');
    expect(input.pin).toBe('1234');
  });

  it('rejects invalid BootstrapOwner input (short username, invalid PIN, empty name)', () => {
    expect(() =>
      BootstrapOwnerSchema.parse({
        fullName: '',
        username: 'teacher',
        pin: '1234',
      })
    ).toThrow();

    expect(() =>
      BootstrapOwnerSchema.parse({
        fullName: 'أحمد',
        username: 'te',
        pin: '1234',
      })
    ).toThrow();

    expect(() =>
      BootstrapOwnerSchema.parse({
        fullName: 'أحمد',
        username: 'teacher',
        pin: '12',
      })
    ).toThrow();
  });

  it('ensures all canonical IPC channels are unique and non-empty', () => {
    const values = Object.values(IPC_CHANNELS);
    expect(values.length).toBeGreaterThan(25);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
    expect(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER).toBe('auth:bootstrapOwner');
    expect(IPC_CHANNELS.SYSTEM_GET_SETUP_STATE).toBe('system:getSetupState');
  });
});

describe('Contracts — Safe Pre-Authentication LoginUserDto', () => {
  it('LoginUserSchema accepts valid pre-auth user projection', () => {
    const valid: LoginUserDto = {
      id: VALID_UUID,
      fullName: 'الأستاذ أحمد الشريف',
      username: 'teacher',
      role: 'OWNER',
    };
    const parsed = LoginUserSchema.parse(valid);
    expect(parsed.id).toBe(VALID_UUID);
    expect(parsed.fullName).toBe('الأستاذ أحمد الشريف');
    expect(parsed.username).toBe('teacher');
    expect(parsed.role).toBe('OWNER');
  });

  it('LoginUserDto strictly exposes only id, fullName, username, role and strips/rejects non-public fields', () => {
    const rawWithSensitiveFields = {
      id: VALID_UUID,
      fullName: 'الأستاذ أحمد الشريف',
      username: 'teacher',
      role: 'OWNER',
      // Fields that must NEVER be exposed pre-auth
      status: 'ACTIVE',
      permissions: ['ALL'],
      pinHash: 'sensitive-hash',
      salt: 'sensitive-salt',
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-09-17T00:00:00.000Z',
      updatedAt: '2026-09-17T00:00:00.000Z',
    };

    // Parse strips extra keys by default in Zod
    const parsed = LoginUserSchema.parse(rawWithSensitiveFields);
    const keys = Object.keys(parsed).sort();
    expect(keys).toEqual(['fullName', 'id', 'role', 'username']);

    // Ensure sensitive fields are not in the parsed contract object
    expect((parsed as any).pinHash).toBeUndefined();
    expect((parsed as any).salt).toBeUndefined();
    expect((parsed as any).status).toBeUndefined();
    expect((parsed as any).permissions).toBeUndefined();
    expect((parsed as any).failedAttempts).toBeUndefined();
    expect((parsed as any).lockedUntil).toBeUndefined();
  });

  it('LoginUserSchema rejects invalid UUID or empty fullName or short username', () => {
    expect(() =>
      LoginUserSchema.parse({
        id: 'invalid-id',
        fullName: 'أحمد',
        username: 'teacher',
        role: 'OWNER',
      })
    ).toThrow();

    expect(() =>
      LoginUserSchema.parse({
        id: VALID_UUID,
        fullName: '',
        username: 'teacher',
        role: 'OWNER',
      })
    ).toThrow();

    expect(() =>
      LoginUserSchema.parse({
        id: VALID_UUID,
        fullName: 'أحمد',
        username: 'te',
        role: 'OWNER',
      })
    ).toThrow();
  });
});

describe('Contracts — ManagedUserSchema & Channels', () => {
  it('ManagedUserSchema accepts valid managed user record with status and permissions', () => {
    const valid: ManagedUserDto = {
      id: VALID_UUID,
      fullName: 'مساعد أول',
      username: 'assistant1',
      role: 'ASSISTANT',
      status: 'INACTIVE',
      permissions: ['STUDENTS_READ', 'GROUPS_READ'],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    const parsed = ManagedUserSchema.parse(valid);
    expect(parsed.id).toBe(VALID_UUID);
    expect(parsed.status).toBe('INACTIVE');
    expect(parsed.permissions).toEqual(['STUDENTS_READ', 'GROUPS_READ']);

    // Ensure pinHash and salt are not defined on parsed object
    expect((parsed as any).pinHash).toBeUndefined();
    expect((parsed as any).salt).toBeUndefined();
    expect((parsed as any).failedAttempts).toBeUndefined();
    expect((parsed as any).lockedUntil).toBeUndefined();
  });

  it('verifies AUTH_LIST_MANAGEMENT_USERS channel is present in IPC_CHANNELS', () => {
    expect(IPC_CHANNELS.AUTH_LIST_MANAGEMENT_USERS).toBe('auth:listManagementUsers');
  });
});

describe('Contracts — Attendance Enums & DTOs', () => {
  it('validates AttendanceStatusSchema values', () => {
    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;
    validStatuses.forEach((status) => {
      expect(AttendanceStatusSchema.parse(status)).toBe(status);
    });
    expect(() => AttendanceStatusSchema.parse('UNKNOWN')).toThrow();
    expect(() => AttendanceStatusSchema.parse('present')).toThrow();
  });

  it('validates AttendanceRecordDtoSchema', () => {
    const record = AttendanceRecordDtoSchema.parse({
      id: VALID_UUID,
      sessionId: VALID_UUID,
      studentId: VALID_UUID,
      status: 'PRESENT',
      arrivalTime: '14:30',
      notes: 'حضر في الموعد',
      recordedByUserId: VALID_UUID,
      recordedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(record.status).toBe('PRESENT');
    expect(record.arrivalTime).toBe('14:30');
  });

  it('validates RecordAttendanceInputSchema and time formats', () => {
    const valid = RecordAttendanceInputSchema.parse({
      sessionId: VALID_UUID,
      studentId: VALID_UUID,
      status: 'LATE',
      arrivalTime: '09:05',
    });
    expect(valid.status).toBe('LATE');

    // Invalid time
    expect(() =>
      RecordAttendanceInputSchema.parse({
        sessionId: VALID_UUID,
        studentId: VALID_UUID,
        status: 'LATE',
        arrivalTime: '25:00',
      })
    ).toThrow();
  });

  it('validates BatchRecordAttendanceInputSchema requires at least 1 record', () => {
    expect(() =>
      BatchRecordAttendanceInputSchema.parse({
        sessionId: VALID_UUID,
        records: [],
      })
    ).toThrow();

    const batch = BatchRecordAttendanceInputSchema.parse({
      sessionId: VALID_UUID,
      records: [
        { studentId: VALID_UUID, status: 'PRESENT' },
        { studentId: VALID_UUID, status: 'ABSENT', notes: 'لم يحضر' },
      ],
    });
    expect(batch.records.length).toBe(2);
  });

  it('validates SessionRosterItemDtoSchema', () => {
    const item = SessionRosterItemDtoSchema.parse({
      studentId: VALID_UUID,
      studentName: 'محمد أحمد',
      guardianPhone: '01012345678',
      enrollmentId: VALID_UUID,
      paymentType: 'MONTHLY',
      paymentAmount: 400,
      attendanceRecord: null,
    });
    expect(item.studentName).toBe('محمد أحمد');
    expect(item.attendanceRecord).toBeNull();
  });

  it('validates SessionAttendanceRosterDtoSchema', () => {
    const roster = SessionAttendanceRosterDtoSchema.parse({
      session: {
        id: VALID_UUID,
        groupId: VALID_UUID,
        groupName: 'مجموعة 1ث لغات',
        occurrenceKey: `${VALID_UUID}_2026-10-01_16:00`,
        scheduledDate: '2026-10-01',
        scheduledStartTime: '16:00',
        effectiveDate: '2026-10-01',
        effectiveStartTime: '16:00',
        durationMinutes: 90,
        status: 'SCHEDULED',
        rescheduleReason: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      groupName: 'مجموعة 1ث لغات',
      roster: [
        {
          studentId: VALID_UUID,
          studentName: 'محمد أحمد',
          guardianPhone: '01012345678',
          enrollmentId: VALID_UUID,
          paymentType: 'MONTHLY',
          paymentAmount: 400,
          attendanceRecord: null,
        },
      ],
      summary: {
        totalStudents: 1,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        unmarked: 1,
      },
    });
    expect(roster.summary.unmarked).toBe(1);
  });

  it('validates CompleteSessionInputSchema', () => {
    const input = CompleteSessionInputSchema.parse({
      sessionId: VALID_UUID,
      notes: 'تم إنهاء الحصة بنجاح وشرح درس المصفوفات',
    });
    expect(input.sessionId).toBe(VALID_UUID);
  });

  it('validates EndOfDayFollowUpDtoSchema', () => {
    const followUp = EndOfDayFollowUpDtoSchema.parse({
      date: '2026-10-01',
      totalSessions: 3,
      totalAbsent: 2,
      totalLate: 1,
      followUps: [
        {
          studentId: VALID_UUID,
          studentName: 'أحمد محمود',
          guardianPhone: '01012345678',
          sessionId: VALID_UUID,
          groupName: 'مجموعة 2ث',
          status: 'ABSENT',
          sessionDate: '2026-10-01',
          sessionStartTime: '16:00',
          whatsappMessage: 'نحيطكم علماً بغياب الطالب أحمد محمود عن حصة الرياضيات',
        },
      ],
    });
    expect(followUp.followUps.length).toBe(1);
  });

  it('verifies attendance and session complete IPC channels are registered in IPC_CHANNELS', () => {
    expect(IPC_CHANNELS.ATTENDANCE_GET_ROSTER).toBe('attendance:getRoster');
    expect(IPC_CHANNELS.ATTENDANCE_RECORD).toBe('attendance:record');
    expect(IPC_CHANNELS.ATTENDANCE_BATCH_RECORD).toBe('attendance:batchRecord');
    expect(IPC_CHANNELS.ATTENDANCE_GET_END_OF_DAY).toBe('attendance:getEndOfDay');
    expect(IPC_CHANNELS.SESSIONS_COMPLETE).toBe('sessions:complete');
  });
});


