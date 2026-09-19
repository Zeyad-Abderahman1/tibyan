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
  PaymentMethod,
  DiscountType,
  InvoiceStatus,
  InvoiceItemType,
  StudentStatus,
  StudentNoteTag,
  SessionStatus,
  Weekday,
  ActorType,
  AttendanceStatus,
  FollowUpContactStatus,
  CurriculumProgressStatus,
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
    status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).$type<StudentStatus>().notNull().default('ACTIVE'),
    qrToken: text('qr_token').notNull().unique(),
    barcodeValue: text('barcode_value').notNull().unique(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    chkStudentStatus: check('chk_students_status', sql`"status" IN ('ACTIVE', 'INACTIVE')`),
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
      .references(() => groups.id, { onDelete: 'restrict' }),
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
    occurrenceKey: text('occurrence_key').notNull(),
    scheduledDate: text('scheduled_date').notNull(),       // YYYY-MM-DD
    scheduledStartTime: text('scheduled_start_time').notNull(), // HH:mm
    
    // Mutable effective execution slot
    effectiveDate: text('effective_date').notNull(),       // YYYY-MM-DD
    effectiveStartTime: text('effective_start_time').notNull(), // HH:mm
    durationMinutes: integer('duration_minutes').notNull(),
    
    status: text('status').$type<SessionStatus>().notNull().default('SCHEDULED'),
    rescheduleReason: text('reschedule_reason'),
    rescheduledAt: text('rescheduled_at'),
    cancellationReason: text('cancellation_reason'),
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

export const attendanceRecords = sqliteTable(
  'attendance_records',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'restrict' }),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    status: text('status').$type<AttendanceStatus>().notNull(),
    arrivalTime: text('arrival_time'), // 'HH:mm'
    notes: text('notes'),
    recordedByUserId: text('recorded_by_user_id'), // Deliberately decoupled from system DB: NO FK
    recordedAt: text('recorded_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    chkAttendanceStatus: check(
      'chk_attendance_status',
      sql`"status" IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')`
    ),
    chkAttendanceArrivalTime: check(
      'chk_attendance_arrival_time',
      sql`("status" = 'LATE' AND "arrival_time" IS NOT NULL AND ("arrival_time" GLOB '[0-1][0-9]:[0-5][0-9]' OR "arrival_time" GLOB '2[0-3]:[0-5][0-9]'))
        OR ("status" = 'PRESENT' AND ("arrival_time" IS NULL OR "arrival_time" GLOB '[0-1][0-9]:[0-5][0-9]' OR "arrival_time" GLOB '2[0-3]:[0-5][0-9]'))
        OR ("status" IN ('ABSENT', 'EXCUSED') AND "arrival_time" IS NULL)`
    ),
    idxAttendanceSessionStudent: uniqueIndex('idx_attendance_session_student').on(
      t.sessionId,
      t.studentId
    ),
    idxAttendanceSession: index('idx_attendance_session').on(t.sessionId),
    idxAttendanceStudent: index('idx_attendance_student').on(t.studentId),
  })
);

export const attendanceFollowUps = sqliteTable(
  'attendance_follow_ups',
  {
    id: text('id').primaryKey(),
    attendanceRecordId: text('attendance_record_id')
      .notNull()
      .references(() => attendanceRecords.id, { onDelete: 'restrict' }),
    contactStatus: text('contact_status').$type<FollowUpContactStatus>().notNull().default('UNCONTACTED'),
    note: text('note'),
    contactedAt: text('contacted_at'), // ISO datetime
    contactedByUserId: text('contacted_by_user_id'), // Deliberately decoupled from system DB: NO FK
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    chkContactStatus: check(
      'chk_contact_status',
      sql`"contact_status" IN ('UNCONTACTED', 'CONTACTED', 'UNREACHABLE')`
    ),
    idxAttendanceFollowUpRecord: uniqueIndex('idx_attendance_follow_up_record').on(t.attendanceRecordId),
    idxAttendanceFollowUpStatus: index('idx_attendance_follow_up_status').on(t.contactStatus),
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

export const studentDiscounts = sqliteTable(
  'student_discounts',
  {
    id: text('id').primaryKey(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    groupId: text('group_id').references(() => groups.id, { onDelete: 'set null' }),
    discountType: text('discount_type').$type<DiscountType>().notNull(),
    discountValue: integer('discount_value').notNull(),
    reason: text('reason').notNull(),
    status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull().default('ACTIVE'),
    appliedByUserId: text('applied_by_user_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    chkDiscountValue: check('chk_discounts_value', sql`"discount_value" > 0`),
    idxDiscountsStudent: index('idx_discounts_student').on(t.studentId),
    idxDiscountsStatus: index('idx_discounts_status').on(t.status),
  })
);

export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    receiptNumber: text('receipt_number').notNull().unique(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    groupId: text('group_id').references(() => groups.id, { onDelete: 'set null' }),
    amountCents: integer('amount_cents').notNull(),
    paymentMethod: text('payment_method').$type<PaymentMethod>().notNull().default('CASH'),
    paymentDate: text('payment_date').notNull(), // YYYY-MM-DD
    periodMonth: text('period_month'), // YYYY-MM
    notes: text('notes'),
    recordedByUserId: text('recorded_by_user_id').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    chkPaymentAmount: check('chk_payments_amount', sql`"amount_cents" > 0`),
    idxPaymentsReceipt: uniqueIndex('idx_payments_receipt').on(t.receiptNumber),
    idxPaymentsStudent: index('idx_payments_student').on(t.studentId),
    idxPaymentsDate: index('idx_payments_date').on(t.paymentDate),
  })
);

export const invoices = sqliteTable(
  'invoices',
  {
    id: text('id').primaryKey(),
    invoiceNumber: text('invoice_number').notNull().unique(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    groupId: text('group_id').references(() => groups.id, { onDelete: 'set null' }),
    issueDate: text('issue_date').notNull(),
    dueDate: text('due_date'),
    periodMonth: text('period_month'),
    subtotalCents: integer('subtotal_cents').notNull(),
    discountCents: integer('discount_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
    paidCents: integer('paid_cents').notNull().default(0),
    remainingCents: integer('remaining_cents').notNull().default(0),
    status: text('status').$type<InvoiceStatus>().notNull().default('UNPAID'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    chkInvoiceSubtotal: check('chk_invoices_subtotal', sql`"subtotal_cents" >= 0`),
    chkInvoiceTotal: check('chk_invoices_total', sql`"total_cents" >= 0`),
    chkInvoicePaid: check('chk_invoices_paid', sql`"paid_cents" >= 0`),
    idxInvoicesNumber: uniqueIndex('idx_invoices_number').on(t.invoiceNumber),
    idxInvoicesStudent: index('idx_invoices_student').on(t.studentId),
    idxInvoicesStatus: index('idx_invoices_status').on(t.status),
  })
);

export const invoiceItems = sqliteTable(
  'invoice_items',
  {
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    itemType: text('item_type').$type<InvoiceItemType>().notNull().default('CUSTOM'),
    quantity: integer('quantity').notNull().default(1),
    unitPriceCents: integer('unit_price_cents').notNull(),
    amountCents: integer('amount_cents').notNull(),
    sessionId: text('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  },
  (t) => ({
    chkItemQuantity: check('chk_invoice_items_quantity', sql`"quantity" > 0`),
    chkItemUnitPrice: check('chk_invoice_items_unit_price', sql`"unit_price_cents" >= 0`),
    chkItemAmount: check('chk_invoice_items_amount', sql`"amount_cents" >= 0`),
    idxInvoiceItemsInvoice: index('idx_invoice_items_invoice').on(t.invoiceId),
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
export type AttendanceRecordRow = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecordRow = typeof attendanceRecords.$inferInsert;
export type AttendanceFollowUpRow = typeof attendanceFollowUps.$inferSelect;
export type NewAttendanceFollowUpRow = typeof attendanceFollowUps.$inferInsert;
export type AcademicAuditLogRow = typeof academicAuditLog.$inferSelect;
export type NewAcademicAuditLogRow = typeof academicAuditLog.$inferInsert;
export type StudentDiscountRow = typeof studentDiscounts.$inferSelect;
export type NewStudentDiscountRow = typeof studentDiscounts.$inferInsert;
export type PaymentRow = typeof payments.$inferSelect;
export type NewPaymentRow = typeof payments.$inferInsert;
export type InvoiceRow = typeof invoices.$inferSelect;
export type NewInvoiceRow = typeof invoices.$inferInsert;
export type InvoiceItemRow = typeof invoiceItems.$inferSelect;
export type NewInvoiceItemRow = typeof invoiceItems.$inferInsert;

export const groupCurriculumAssignments = sqliteTable(
  'group_curriculum_assignments',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    catalogId: text('catalog_id').notNull(), // External ID to system DB
    catalogVersion: integer('catalog_version').notNull(),
    assignedAt: text('assigned_at').notNull(),
    assignedByUserId: text('assigned_by_user_id'),
    assignedByNameSnapshot: text('assigned_name_snapshot').notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxGroupCurriculumAssignmentGroup: uniqueIndex('idx_group_curriculum_assignment_group').on(t.groupId),
    idxGroupCurriculumAssignmentCatalog: index('idx_group_curriculum_assignment_catalog').on(t.catalogId),
  })
);

export const groupCurriculumProgress = sqliteTable(
  'group_curriculum_progress',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    catalogId: text('catalog_id').notNull(), // External ID to system DB
    nodeId: text('node_id').notNull(), // External ID to system DB
    status: text('status', { enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] })
      .$type<CurriculumProgressStatus>()
      .notNull()
      .default('NOT_STARTED'),
    completedAt: text('completed_at'),
    updatedByUserId: text('updated_by_user_id'),
    updatedByNameSnapshot: text('updated_name_snapshot').notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxGroupCurriculumProgressGroupNode: uniqueIndex('idx_group_curriculum_progress_group_node').on(
      t.groupId,
      t.nodeId
    ),
    idxGroupCurriculumProgressGroupStatus: index('idx_group_curriculum_progress_group_status').on(
      t.groupId,
      t.status
    ),
  })
);

export type GroupCurriculumAssignmentRow = typeof groupCurriculumAssignments.$inferSelect;
export type NewGroupCurriculumAssignmentRow = typeof groupCurriculumAssignments.$inferInsert;
export type GroupCurriculumProgressRow = typeof groupCurriculumProgress.$inferSelect;
export type NewGroupCurriculumProgressRow = typeof groupCurriculumProgress.$inferInsert;
