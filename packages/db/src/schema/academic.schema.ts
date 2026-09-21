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
  LessonPlanStatus,
  ReflectionCompletionStatus,
  CaptureSessionStatus,
  CapturePageStatus,
  SubmissionStatus,
  GradingMethod,
  ExtractionStatus,
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

export const lessonPlans = sqliteTable(
  'lesson_plans',
  {
    id: text('id').primaryKey(),
    curriculumNodeId: text('curriculum_node_id').notNull(),
    title: text('title').notNull(),
    targetDurationMinutes: integer('target_duration_minutes').notNull().default(60),
    status: text('status', { enum: ['DRAFT', 'READY', 'ARCHIVED'] })
      .$type<LessonPlanStatus>()
      .notNull()
      .default('DRAFT'),
    version: integer('version').notNull().default(1),
    sectionsJson: text('sections_json').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxLessonPlansCurriculumNode: index('idx_lesson_plans_curriculum_node').on(t.curriculumNodeId),
    idxLessonPlansStatus: index('idx_lesson_plans_status').on(t.status),
  })
);

export const sessionReflections = sqliteTable(
  'session_reflections',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'restrict' }),
    lessonPlanId: text('lesson_plan_id'),
    lessonPlanSnapshotJson: text('lesson_plan_snapshot_json'),
    completionStatus: text('completion_status', {
      enum: ['COMPLETED', 'PARTIALLY_COMPLETED', 'POSTPONED'],
    })
      .$type<ReflectionCompletionStatus>()
      .notNull(),
    uncompletedItems: text('uncompleted_items'),
    topicsNeedingReview: text('topics_needing_review'),
    quickNotes: text('quick_notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxSessionReflectionsSession: uniqueIndex('idx_session_reflections_session').on(t.sessionId),
    idxSessionReflectionsStatus: index('idx_session_reflections_status').on(t.completionStatus),
  })
);

// Phase 4: Exam documents are Academic DB records. Question-bank IDs are stored
// as opaque snapshots because the bank belongs to the separate System DB.
export const exams = sqliteTable(
  'exams',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    blueprintJson: text('blueprint_json').notNull(),
    layoutJson: text('layout_json').notNull(),
    status: text('status', { enum: ['DRAFT', 'CONFIRMED', 'ARCHIVED'] }).notNull().default('DRAFT'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({ idxExamsStatus: index('idx_exams_status').on(t.status) })
);

export const examSections = sqliteTable(
  'exam_sections',
  {
    id: text('id').primaryKey(),
    examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    instructionsJson: text('instructions_json').notNull(),
    position: integer('position').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({ idxExamSectionsOrder: uniqueIndex('idx_exam_sections_order').on(t.examId, t.position) })
);

export const examQuestions = sqliteTable(
  'exam_questions',
  {
    id: text('id').primaryKey(),
    examSectionId: text('exam_section_id').notNull().references(() => examSections.id, { onDelete: 'cascade' }),
    questionIdSnapshot: text('question_id_snapshot'),
    provenance: text('provenance').notNull(),
    contentJson: text('content_json').notNull(),
    answerJson: text('answer_json'),
    curriculumNodeIdsJson: text('curriculum_node_ids_json').notNull(),
    sourceReferenceIdsJson: text('source_reference_ids_json').notNull(),
    marks: integer('marks').notNull(),
    answerSpaceLines: integer('answer_space_lines').notNull().default(0),
    position: integer('position').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    chkExamQuestionMarks: check('chk_exam_question_marks', sql`${t.marks} > 0`),
    chkExamQuestionSpace: check('chk_exam_question_space', sql`${t.answerSpaceLines} >= 0`),
    idxExamQuestionsOrder: uniqueIndex('idx_exam_questions_order').on(t.examSectionId, t.position),
  })
);

export const examVersions = sqliteTable(
  'exam_versions',
  {
    id: text('id').primaryKey(),
    examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    questionOrderJson: text('question_order_json').notNull(),
    answerKeyJson: text('answer_key_json').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({ idxExamVersionsLabel: uniqueIndex('idx_exam_versions_label').on(t.examId, t.label) })
);

export type LessonPlanRow = typeof lessonPlans.$inferSelect;
export type NewLessonPlanRow = typeof lessonPlans.$inferInsert;
export type SessionReflectionRow = typeof sessionReflections.$inferSelect;
export type NewSessionReflectionRow = typeof sessionReflections.$inferInsert;
export type ExamRow = typeof exams.$inferSelect;
export type NewExamRow = typeof exams.$inferInsert;
export type ExamSectionRow = typeof examSections.$inferSelect;
export type NewExamSectionRow = typeof examSections.$inferInsert;
export type ExamQuestionRow = typeof examQuestions.$inferSelect;
export type NewExamQuestionRow = typeof examQuestions.$inferInsert;
export type ExamVersionRow = typeof examVersions.$inferSelect;
export type NewExamVersionRow = typeof examVersions.$inferInsert;

// ============================================================================
// Phase 5: Paper Capture, Grading, and Analytics
// ============================================================================

export const captureSessions = sqliteTable(
  'capture_sessions',
  {
    id: text('id').primaryKey(),
    examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
    examFormLabel: text('exam_form_label').notNull(),
    status: text('status').$type<CaptureSessionStatus>().notNull().default('COLLECTING'),
    totalSubmissions: integer('total_submissions').notNull().default(0),
    completedSubmissions: integer('completed_submissions').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxCaptureSessionsExam: index('idx_capture_sessions_exam').on(t.examId),
    idxCaptureSessionsStatus: index('idx_capture_sessions_status').on(t.status),
  })
);

export const captureSubmissions = sqliteTable(
  'capture_submissions',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull().references(() => captureSessions.id, { onDelete: 'cascade' }),
    studentId: text('student_id').references(() => students.id, { onDelete: 'set null' }),
    studentNameSnapshot: text('student_name_snapshot'),
    studentCodeSnapshot: text('student_code_snapshot'),
    associationMethod: text('association_method').notNull().default('UNASSOCIATED'),
    status: text('status').$type<SubmissionStatus>().notNull().default('PENDING'),
    pageCount: integer('page_count').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxCaptureSubmissionsSession: index('idx_capture_submissions_session').on(t.sessionId),
    idxCaptureSubmissionsStudent: index('idx_capture_submissions_student').on(t.studentId),
    idxCaptureSubmissionsStatus: index('idx_capture_submissions_status').on(t.status),
  })
);

export const capturePages = sqliteTable(
  'capture_pages',
  {
    id: text('id').primaryKey(),
    submissionId: text('submission_id').notNull().references(() => captureSubmissions.id, { onDelete: 'cascade' }),
    sessionId: text('session_id').notNull().references(() => captureSessions.id, { onDelete: 'cascade' }),
    pageOrder: integer('page_order').notNull().default(0),
    source: text('source').notNull().default('IMAGE'),
    originalFilePath: text('original_file_path').notNull(),
    originalFileName: text('original_file_name').notNull(),
    originalFileSizeBytes: integer('original_file_size_bytes').notNull(),
    fingerprintSha256: text('fingerprint_sha256').notNull(),
    normalizedFilePath: text('normalized_file_path'),
    status: text('status').$type<CapturePageStatus>().notNull().default('IMPORTED'),
    rotationDegrees: integer('rotation_degrees').notNull().default(0),
    excluded: integer('excluded', { mode: 'boolean' }).notNull().default(false),
    failureReason: text('failure_reason'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxCapturePagesSubmission: index('idx_capture_pages_submission').on(t.submissionId),
    idxCapturePagesSession: index('idx_capture_pages_session').on(t.sessionId),
    idxCapturePagesFingerprint: index('idx_capture_pages_fingerprint').on(t.fingerprintSha256),
    idxCapturePagesStatus: index('idx_capture_pages_status').on(t.status),
  })
);

export const extractedAnswers = sqliteTable(
  'extracted_answers',
  {
    id: text('id').primaryKey(),
    submissionId: text('submission_id').notNull().references(() => captureSubmissions.id, { onDelete: 'cascade' }),
    examQuestionId: text('exam_question_id').notNull().references(() => examQuestions.id, { onDelete: 'cascade' }),
    examVersionLabel: text('exam_version_label'),
    recognizedResponse: text('recognized_response'),
    recognizedOptionLabel: text('recognized_option_label'),
    extractionMethod: text('extraction_method').notNull().default('DETERMINISTIC'),
    confidence: real('confidence'),
    evidenceRefJson: text('evidence_ref_json'),
    rawExtractionJson: text('raw_extraction_json'),
    status: text('status').$type<ExtractionStatus>().notNull().default('PENDING'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxExtractedAnswersSubmission: index('idx_extracted_answers_submission').on(t.submissionId),
    idxExtractedAnswersQuestion: index('idx_extracted_answers_question').on(t.examQuestionId),
    idxExtractedAnswersStatus: index('idx_extracted_answers_status').on(t.status),
  })
);

export const gradingRuns = sqliteTable(
  'grading_runs',
  {
    id: text('id').primaryKey(),
    submissionId: text('submission_id').notNull().references(() => captureSubmissions.id, { onDelete: 'cascade' }),
    method: text('method').$type<GradingMethod>().notNull(),
    triggeredByUserId: text('triggered_by_user_id'),
    startedAt: text('started_at').notNull(),
    completedAt: text('completed_at'),
    questionCount: integer('question_count').notNull().default(0),
    gradedCount: integer('graded_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    status: text('status', { enum: ['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] }).notNull().default('RUNNING'),
  },
  (t) => ({
    idxGradingRunsSubmission: index('idx_grading_runs_submission').on(t.submissionId),
    idxGradingRunsStatus: index('idx_grading_runs_status').on(t.status),
  })
);

export const gradingDecisions = sqliteTable(
  'grading_decisions',
  {
    id: text('id').primaryKey(),
    submissionId: text('submission_id').notNull().references(() => captureSubmissions.id, { onDelete: 'cascade' }),
    examQuestionId: text('exam_question_id').notNull().references(() => examQuestions.id, { onDelete: 'cascade' }),
    questionPosition: integer('question_position').notNull(),
    questionMarks: integer('question_marks').notNull(),
    awardedMarks: integer('awarded_marks').notNull().default(0),
    gradingMethod: text('grading_method').$type<GradingMethod>().notNull(),
    rubricResultsJson: text('rubric_results_json'),
    teacherOverride: integer('teacher_override', { mode: 'boolean' }).notNull().default(false),
    teacherOverrideAt: text('teacher_override_at'),
    aiProposalJson: text('ai_proposal_json'),
    gradingRunId: text('grading_run_id').references(() => gradingRuns.id, { onDelete: 'set null' }),
    status: text('status').$type<GradingDecisionStatus>().notNull().default('PENDING'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    chkGradingDecisionAwarded: check('chk_grading_decision_awarded', sql`"awarded_marks" >= 0`),
    chkGradingDecisionQuestionMarks: check('chk_grading_decision_question_marks', sql`"question_marks" > 0`),
    chkGradingDecisionAwardedMax: check('chk_grading_decision_awarded_max', sql`"awarded_marks" <= "question_marks"`),
    idxGradingDecisionsSubmission: index('idx_grading_decisions_submission').on(t.submissionId),
    idxGradingDecisionsQuestion: index('idx_grading_decisions_question').on(t.examQuestionId),
    idxGradingDecisionsRun: index('idx_grading_decisions_run').on(t.gradingRunId),
    idxGradingDecisionsStatus: index('idx_grading_decisions_status').on(t.status),
  })
);

export type GradingDecisionStatus = 'PENDING' | 'GRADED' | 'REVIEWED' | 'FINALIZED' | 'OVERRIDDEN';

export type CaptureSessionRow = typeof captureSessions.$inferSelect;
export type NewCaptureSessionRow = typeof captureSessions.$inferInsert;
export type CaptureSubmissionRow = typeof captureSubmissions.$inferSelect;
export type NewCaptureSubmissionRow = typeof captureSubmissions.$inferInsert;
export type CapturePageRow = typeof capturePages.$inferSelect;
export type NewCapturePageRow = typeof capturePages.$inferInsert;
export type ExtractedAnswerRow = typeof extractedAnswers.$inferSelect;
export type NewExtractedAnswerRow = typeof extractedAnswers.$inferInsert;
export type GradingRunRow = typeof gradingRuns.$inferSelect;
export type NewGradingRunRow = typeof gradingRuns.$inferInsert;
export type GradingDecisionRow = typeof gradingDecisions.$inferSelect;
export type NewGradingDecisionRow = typeof gradingDecisions.$inferInsert;

// ─── Slide Decks ─────────────────────────────────────────────────────────────

export const slideDecks = sqliteTable(
  'slide_decks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    curriculumNodeId: text('curriculum_node_id'),
    groupId: text('group_id'),
    status: text('status').notNull().default('DRAFT'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxSlideDecksStatus: index('idx_slide_decks_status').on(t.status),
    idxSlideDecksCurriculum: index('idx_slide_decks_curriculum').on(t.curriculumNodeId),
    idxSlideDecksGroup: index('idx_slide_decks_group').on(t.groupId),
  })
);

export const slides = sqliteTable(
  'slides',
  {
    id: text('id').primaryKey(),
    deckId: text('deck_id').notNull().references(() => slideDecks.id, { onDelete: 'cascade' }),
    title: text('title'),
    position: integer('position').notNull().default(0),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    idxSlidesDeck: index('idx_slides_deck').on(t.deckId),
  })
);

export const slideBlocks = sqliteTable(
  'slide_blocks',
  {
    id: text('id').primaryKey(),
    slideId: text('slide_id').notNull().references(() => slides.id, { onDelete: 'cascade' }),
    blockType: text('block_type').notNull(),
    contentJson: text('content_json').notNull(),
    questionId: text('question_id'),
    position: integer('position').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    idxSlideBlocksSlide: index('idx_slide_blocks_slide').on(t.slideId),
  })
);

export type SlideDeckRow = typeof slideDecks.$inferSelect;
export type NewSlideDeckRow = typeof slideDecks.$inferInsert;
export type SlideRow = typeof slides.$inferSelect;
export type NewSlideRow = typeof slides.$inferInsert;
export type SlideBlockRow = typeof slideBlocks.$inferSelect;
export type NewSlideBlockRow = typeof slideBlocks.$inferInsert;

export const reviewArtifacts = sqliteTable('review_artifacts', {
  id: text('id').primaryKey(), sourceDocumentId: text('source_document_id').notNull(),
  title: text('title').notNull(), reviewType: text('review_type').notNull(), detailLevel: text('detail_level').notNull(),
  scope: text('scope'), questionCount: integer('question_count').notNull(), includeModelAnswers: integer('include_model_answers', { mode: 'boolean' }).notNull(),
  contentJson: text('content_json').notNull(), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});
export type ReviewArtifactRow = typeof reviewArtifacts.$inferSelect;
export type NewReviewArtifactRow = typeof reviewArtifacts.$inferInsert;

