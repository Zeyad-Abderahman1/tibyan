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
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
