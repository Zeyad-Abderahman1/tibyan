import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import {
  EducationSystem,
  GradeLevel,
  LanguageTrack,
  MathBranch,
  PaymentType,
  StudentStatus,
  StudentNoteTag,
  SessionStatus,
  Weekday,
  ActorType,
} from '@tibyan/contracts';

export const students = sqliteTable(
  'students',
  {
    id: text('id').primaryKey(),
    studentCode: text('student_code').notNull().unique(),
    fullName: text('full_name').notNull(),
    photoPath: text('photo_path'),
    educationSystem: text('education_system').$type<EducationSystem>().notNull(),
    gradeLevel: text('grade_level').$type<GradeLevel>().notNull(),
    languageTrack: text('language_track').$type<LanguageTrack>().notNull(),
    guardianPhone: text('guardian_phone').notNull(),
    status: text('status').$type<StudentStatus>().notNull().default('ACTIVE'),
    qrToken: text('qr_token').notNull().unique(),
    barcodeValue: text('barcode_value').notNull().unique(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxStudentsStatus: index('idx_students_status').on(t.status),
    idxStudentsGrade: index('idx_students_grade').on(t.gradeLevel, t.educationSystem),
    idxStudentsTrack: index('idx_students_track').on(t.languageTrack),
  })
);

export const studentNotes = sqliteTable(
  'student_notes',
  {
    id: text('id').primaryKey(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    authorUserId: text('author_user_id'), // Deliberately decoupled from system DB: NO FK
    authorNameSnapshot: text('author_name_snapshot').notNull(),
    noteText: text('note_text').notNull(),
    tag: text('tag').$type<StudentNoteTag>().notNull().default('GENERAL'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    idxNotesStudent: index('idx_notes_student').on(t.studentId),
  })
);

export const groups = sqliteTable(
  'groups',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    educationSystem: text('education_system').$type<EducationSystem>().notNull(),
    gradeLevel: text('grade_level').$type<GradeLevel>().notNull(),
    languageTrack: text('language_track').$type<LanguageTrack>().notNull(),
    focusMathBranch: text('focus_math_branch').$type<MathBranch | null>(),
    defaultPaymentType: text('default_payment_type').$type<PaymentType>().notNull(),
    defaultPaymentAmount: real('default_payment_amount').notNull(),
    status: text('status', { enum: ['ACTIVE', 'ARCHIVED'] }).notNull().default('ACTIVE'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    chkDefaultPaymentAmount: check(
      'chk_groups_default_payment_amount',
      sql`"default_payment_amount" >= 0`
    ),
    idxGroupsStatus: index('idx_groups_status').on(t.status),
    idxGroupsGrade: index('idx_groups_grade').on(t.gradeLevel, t.educationSystem),
  })
);

export const groupEnrollments = sqliteTable(
  'group_enrollments',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'restrict' }),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    enrolledAt: text('enrolled_at').notNull(),
    leftAt: text('left_at'),
    status: text('status', { enum: ['ACTIVE', 'ENDED'] }).notNull().default('ACTIVE'),
    paymentTypeOverride: text('payment_type_override').$type<PaymentType | null>(),
    paymentAmountOverride: real('payment_amount_override'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    chkPaymentAmountOverride: check(
      'chk_enrollment_payment_amount_override',
      sql`"payment_amount_override" IS NULL OR "payment_amount_override" >= 0`
    ),
    // Partial unique index allows student departure and subsequent re-enrollment,
    // but prevents multiple simultaneous ACTIVE enrollments for the same student and group.
    idxGroupEnrollmentsActive: uniqueIndex('idx_group_enrollments_active')
      .on(t.groupId, t.studentId)
      .where(sql`"status" = 'ACTIVE'`),
    idxEnrollmentsStudent: index('idx_enrollments_student').on(t.studentId),
    idxEnrollmentsGroup: index('idx_enrollments_group').on(t.groupId),
  })
);

export const groupSchedules = sqliteTable(
  'group_schedules',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    weekday: integer('weekday').$type<Weekday>().notNull(),
    startTime: text('start_time').notNull(), // 'HH:mm'
    durationMinutes: integer('duration_minutes').notNull().default(120),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    chkWeekdayRange: check('chk_schedule_weekday', sql`"weekday" BETWEEN 0 AND 6`),
    chkDurationMinutes: check('chk_schedule_duration', sql`"duration_minutes" > 0`),
    idxSchedulesGroup: index('idx_schedules_group').on(t.groupId),
  })
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'restrict' }),
    scheduleId: text('schedule_id').references(() => groupSchedules.id, { onDelete: 'set null' }),
    
    // Immutable occurrence identity
    occurrenceKey: text('occurrence_key').notNull().unique(),
    scheduledDate: text('scheduled_date').notNull(),       // YYYY-MM-DD
    scheduledStartTime: text('scheduled_start_time').notNull(), // HH:mm
    
    // Mutable effective execution slot
    effectiveDate: text('effective_date').notNull(),       // YYYY-MM-DD
    effectiveStartTime: text('effective_start_time').notNull(), // HH:mm
    durationMinutes: integer('duration_minutes').notNull(),
    
    status: text('status').$type<SessionStatus>().notNull().default('SCHEDULED'),
    rescheduleReason: text('reschedule_reason'),
    rescheduledAt: text('rescheduled_at'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    chkSessionDuration: check('chk_session_duration', sql`"duration_minutes" > 0`),
    idxSessionsOccurrence: uniqueIndex('idx_sessions_occurrence').on(t.occurrenceKey),
    idxSessionsEffectiveSlot: index('idx_sessions_effective_slot').on(
      t.groupId,
      t.effectiveDate,
      t.effectiveStartTime
    ),
    idxSessionsEffectiveDate: index('idx_sessions_effective_date').on(t.effectiveDate),
  })
);

export const academicAuditLog = sqliteTable(
  'academic_audit_log',
  {
    id: text('id').primaryKey(),
    actorType: text('actor_type').$type<ActorType>().notNull().default('USER'),
    actorUserId: text('actor_user_id'), // Deliberately decoupled from system DB: NO FK
    actorNameSnapshot: text('actor_name_snapshot').notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    beforeJson: text('before_json'),
    afterJson: text('after_json'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    actorInvariantCheck: check(
      'chk_academic_audit_actor_invariant',
      sql`("actor_type" = 'USER' AND "actor_user_id" IS NOT NULL) OR ("actor_type" = 'SYSTEM' AND "actor_user_id" IS NULL)`
    ),
    idxAcademicAuditCreated: index('idx_academic_audit_created').on(t.createdAt),
    idxAcademicAuditEntity: index('idx_academic_audit_entity').on(t.entityType, t.entityId),
  })
);

export type StudentRow = typeof students.$inferSelect;
export type NewStudentRow = typeof students.$inferInsert;
export type StudentNoteRow = typeof studentNotes.$inferSelect;
export type NewStudentNoteRow = typeof studentNotes.$inferInsert;
export type GroupRow = typeof groups.$inferSelect;
export type NewGroupRow = typeof groups.$inferInsert;
export type GroupEnrollmentRow = typeof groupEnrollments.$inferSelect;
export type NewGroupEnrollmentRow = typeof groupEnrollments.$inferInsert;
export type GroupScheduleRow = typeof groupSchedules.$inferSelect;
export type NewGroupScheduleRow = typeof groupSchedules.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type AcademicAuditLogRow = typeof academicAuditLog.$inferSelect;
export type NewAcademicAuditLogRow = typeof academicAuditLog.$inferInsert;
