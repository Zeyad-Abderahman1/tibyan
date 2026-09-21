export const IPC_CHANNELS = {
  // Auth
  AUTH_LIST_USERS: 'auth:listUsers',
  AUTH_LIST_MANAGEMENT_USERS: 'auth:listManagementUsers',
  AUTH_LOGIN_PIN: 'auth:loginPin',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_GET_SESSION: 'auth:getSession',
  AUTH_BOOTSTRAP_OWNER: 'auth:bootstrapOwner',
  AUTH_CREATE_USER: 'auth:createUser',
  AUTH_UPDATE_PERMISSIONS: 'auth:updatePermissions',
  AUTH_CHANGE_STATUS: 'auth:changeStatus',
  AUTH_RESET_PIN: 'auth:resetPin',

  // Students
  STUDENTS_LIST: 'students:list',
  STUDENTS_GET_BY_ID: 'students:getById',
  STUDENTS_CREATE: 'students:create',
  STUDENTS_UPDATE: 'students:update',
  STUDENTS_ADD_NOTE: 'students:addNote',
  STUDENTS_LIST_NOTES: 'students:listNotes',
  STUDENTS_CHOOSE_PHOTO_DIALOG: 'students:choosePhotoDialog',
  STUDENTS_PRINT_CARDS: 'students:printCards',
  STUDENTS_EXPORT_CARDS_PDF: 'students:exportCardsPdf',

  // Groups
  GROUPS_LIST: 'groups:list',
  GROUPS_GET_BY_ID: 'groups:getById',
  GROUPS_CREATE: 'groups:create',
  GROUPS_UPDATE: 'groups:update',
  GROUPS_SET_SCHEDULE: 'groups:setSchedule',

  // Enrollments
  ENROLLMENTS_LIST_BY_GROUP: 'enrollments:listByGroup',
  ENROLLMENTS_ENROLL: 'enrollments:enroll',
  ENROLLMENTS_UPDATE_PAYMENT: 'enrollments:updatePayment',
  ENROLLMENTS_END: 'enrollments:end',

  // Sessions & Rescheduling
  SESSIONS_MATERIALIZE: 'sessions:materialize',
  SESSIONS_LIST_BY_RANGE: 'sessions:listByRange',
  SESSIONS_RESCHEDULE: 'sessions:reschedule',
  SESSIONS_CANCEL: 'sessions:cancel',
  SESSIONS_COMPLETE: 'sessions:complete',

  // Attendance
  ATTENDANCE_GET_ROSTER: 'attendance:getRoster',
  ATTENDANCE_RECORD: 'attendance:record',
  ATTENDANCE_BATCH_RECORD: 'attendance:batchRecord',
  ATTENDANCE_GET_END_OF_DAY: 'attendance:getEndOfDay',
  ATTENDANCE_UPDATE_FOLLOW_UP_STATUS: 'attendance:updateFollowUpStatus',

  // Dashboard
  DASHBOARD_GET_TODAY: 'dashboard:getToday',

  // Backup
  BACKUP_TRIGGER: 'backup:trigger',
  BACKUP_GET_STATUS: 'backup:getStatus',
  BACKUP_LIST_RECORDS: 'backup:listRecords',

  // System & Academic Year
  SYSTEM_GET_INFO: 'system:getInfo',
  SYSTEM_GET_SETTINGS: 'system:getSettings',
  SYSTEM_GET_SETUP_STATE: 'system:getSetupState',
  SYSTEM_UPDATE_THEME: 'system:updateTheme',
  SYSTEM_LIST_ACADEMIC_YEARS: 'system:listAcademicYears',
  SYSTEM_CREATE_ACADEMIC_YEAR: 'system:createAcademicYear',
  SYSTEM_SWITCH_ACADEMIC_YEAR: 'system:switchAcademicYear',
  SYSTEM_OPEN_WHATSAPP: 'system:openWhatsApp',

  // Gemini configuration (credential material is accepted only by Main and never returned)
  GEMINI_GET_STATUS: 'gemini:getStatus',
  GEMINI_SET_CREDENTIAL: 'gemini:setCredential',
  GEMINI_DELETE_CREDENTIAL: 'gemini:deleteCredential',

  // Finance
  FINANCE_RECORD_PAYMENT: 'finance:recordPayment',
  FINANCE_LIST_STUDENT_PAYMENTS: 'finance:listStudentPayments',
  FINANCE_GET_STUDENT_SUMMARY: 'finance:getStudentSummary',
  FINANCE_LIST_ALL_SUMMARIES: 'finance:listAllSummaries',
  FINANCE_GET_OVERALL_KPI: 'finance:getOverallKpi',
  FINANCE_CREATE_INVOICE: 'finance:createInvoice',
  FINANCE_GET_INVOICE: 'finance:getInvoice',
  FINANCE_LIST_INVOICES: 'finance:listInvoices',
  FINANCE_APPLY_DISCOUNT: 'finance:applyDiscount',
  FINANCE_LIST_DISCOUNTS: 'finance:listDiscounts',
  FINANCE_PRINT_INVOICE: 'finance:printInvoice',
  FINANCE_EXPORT_INVOICE_PDF: 'finance:exportInvoicePdf',

  // Thermal Printing
  THERMAL_LIST_PRINTERS: 'thermal:listPrinters',
  THERMAL_GET_RECEIPT_DATA: 'thermal:getReceiptData',
  THERMAL_PRINT_RECEIPT: 'thermal:printReceipt',
  THERMAL_TEST_PRINT: 'thermal:testPrint',
  THERMAL_GENERATE_ESCPOS: 'thermal:generateEscpos',
  THERMAL_PRINT_ESCPOS_NETWORK: 'thermal:printEscposNetwork',

  // Curriculum & Group Progress
  CURRICULUM_LIST_CATALOGS: 'curriculum:listCatalogs',
  CURRICULUM_GET_CATALOG: 'curriculum:getCatalog',
  CURRICULUM_CREATE_CATALOG: 'curriculum:createCatalog',
  CURRICULUM_UPDATE_CATALOG: 'curriculum:updateCatalog',
  CURRICULUM_PUBLISH_CATALOG: 'curriculum:publishCatalog',
  CURRICULUM_REVISE_CATALOG: 'curriculum:reviseCatalog',
  CURRICULUM_GET_TREE: 'curriculum:getTree',
  CURRICULUM_CREATE_NODE: 'curriculum:createNode',
  CURRICULUM_UPDATE_NODE: 'curriculum:updateNode',
  CURRICULUM_DELETE_NODE: 'curriculum:deleteNode',
  CURRICULUM_REORDER_NODES: 'curriculum:reorderNodes',
  CURRICULUM_GET_GROUP_OVERVIEW: 'curriculum:getGroupOverview',
  CURRICULUM_ASSIGN_GROUP_CATALOG: 'curriculum:assignGroupCatalog',
  CURRICULUM_UPDATE_GROUP_PROGRESS: 'curriculum:updateGroupProgress',
  CURRICULUM_GET_GROUP_PROGRESS_MAP: 'curriculum:getGroupProgressMap',

  // Lesson Planner
  LESSON_PLAN_CREATE: 'lessonPlanner:createPlan',
  LESSON_PLAN_UPDATE: 'lessonPlanner:updatePlan',
  LESSON_PLAN_GET: 'lessonPlanner:getPlan',
  LESSON_PLAN_LIST_BY_NODE: 'lessonPlanner:listByNode',
  LESSON_PLAN_LIST: 'lessonPlanner:list',
  LESSON_PLAN_ARCHIVE: 'lessonPlanner:archivePlan',

  // Session Reflection
  SESSION_REFLECTION_CREATE: 'sessionReflection:create',
  SESSION_REFLECTION_UPDATE: 'sessionReflection:update',
  SESSION_REFLECTION_GET_BY_SESSION: 'sessionReflection:getBySession',
  SESSION_REFLECTION_GET: 'sessionReflection:get',

  // PDF Sources & Page References (Phase 3 Task 4)
  PDF_SOURCES_LIST: 'pdfSources:list',
  PDF_SOURCES_GET: 'pdfSources:get',
  PDF_SOURCES_IMPORT: 'pdfSources:import',
  PDF_SOURCES_UPDATE: 'pdfSources:update',
  PDF_SOURCES_DELETE: 'pdfSources:delete',
  PDF_REFERENCES_LIST: 'pdfSources:listReferences',
  PDF_REFERENCES_CREATE: 'pdfSources:createReference',
  PDF_REFERENCES_DELETE: 'pdfSources:deleteReference',
  PDF_SOURCES_OPEN: 'pdfSources:openDocument',

  // Question Bank & Deduplication / Ingestion (Phase 3 Tasks 5 & 6)
  QUESTION_BANK_LIST: 'questionBank:list',
  QUESTION_BANK_GET: 'questionBank:get',
  QUESTION_BANK_CREATE: 'questionBank:create',
  QUESTION_BANK_UPDATE: 'questionBank:update',
  QUESTION_BANK_DELETE: 'questionBank:delete',
  QUESTION_BANK_ARCHIVE: 'questionBank:archive',
  QUESTION_BANK_CHECK_DUPLICATE: 'questionBank:checkDuplicate',
  QUESTION_BANK_PREVIEW_BULK: 'questionBank:previewBulk',
  QUESTION_BANK_COMMIT_BULK: 'questionBank:commitBulk',
  QUESTION_BANK_LINK_SOURCES: 'questionBank:linkSources',
  QUESTION_BANK_UNLINK_SOURCE: 'questionBank:unlinkSource',

  // Exam Engine & AI Builder (Phase 4)
  EXAMS_LIST: 'exams:list',
  EXAMS_GET: 'exams:get',
  EXAMS_PREVIEW_ASSEMBLY: 'exams:previewAssembly',
  EXAMS_CONFIRM_ASSEMBLY: 'exams:confirmAssembly',
  EXAMS_UNDO_LAST_MUTATION: 'exams:undoLastMutation',
  EXAMS_PREVIEW_AI_CANDIDATES: 'exams:previewAiCandidates',
  EXAMS_RENDER_LAYOUT: 'exams:renderLayout',
  EXAMS_EXPORT_PDF: 'exams:exportPdf',
  EXAMS_PRINT: 'exams:print',

  // Paper Capture (Phase 5)
  CAPTURE_CREATE_SESSION: 'capture:createSession',
  CAPTURE_LIST_SESSIONS: 'capture:listSessions',
  CAPTURE_GET_SESSION: 'capture:getSession',
  CAPTURE_DELETE_SESSION: 'capture:deleteSession',
  CAPTURE_IMPORT_FILES: 'capture:importFiles',
  CAPTURE_LIST_SUBMISSIONS: 'capture:listSubmissions',
  CAPTURE_GET_SUBMISSION: 'capture:getSubmission',
  CAPTURE_ASSOCIATE_SUBMISSION: 'capture:associateSubmission',
  CAPTURE_LIST_PAGES: 'capture:listPages',
  CAPTURE_ROTATE_PAGE: 'capture:rotatePage',
  CAPTURE_EXCLUDE_PAGE: 'capture:excludePage',
  CAPTURE_REASSIGN_PAGE: 'capture:reassignPage',
  CAPTURE_CHECK_DUPLICATE: 'capture:checkDuplicate',

  // Grading (Phase 5)
  GRADING_EXTRACT_ANSWERS: 'grading:extractAnswers',
  GRADE_SUBMISSION: 'grading:gradeSubmission',
  GRADE_SUBMISSION_AI: 'grading:gradeSubmissionAi',
  GRADE_GET_DECISIONS: 'grading:getDecisions',
  GRADE_OVERRIDE_DECISION: 'grading:overrideDecision',
  GRADE_REVIEW_ANSWER: 'grading:reviewAnswer',
  GRADE_FINALIZE: 'grading:finalize',
  GRADE_REGRADE: 'grading:regrade',
  GRADE_GET_RUNS: 'grading:getRuns',
  GRADE_GET_SUBMISSION_STATUS: 'grading:getSubmissionStatus',

  // Analytics (Phase 5)
  ANALYTICS_GET_EXAM_SUMMARY: 'analytics:getExamSummary',
  ANALYTICS_GET_SCORE_DISTRIBUTION: 'analytics:getScoreDistribution',
  ANALYTICS_GET_QUESTION_PERFORMANCE: 'analytics:getQuestionPerformance',
  ANALYTICS_GET_SKILL_PERFORMANCE: 'analytics:getSkillPerformance',
  ANALYTICS_GET_STUDENT_RESULT: 'analytics:getStudentResult',
  ANALYTICS_LIST_STUDENT_RESULTS: 'analytics:listStudentResults',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];


