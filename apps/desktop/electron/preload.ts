import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  type TibyanApi,
  type IpcResult,
  type UserDto,
  type UserSessionDto,
  type LoginUserDto,
  type ManagedUserDto,
  type LoginWithPinInput,
  type BootstrapOwnerInput,
  type CreateUserInput,
  type UpdatePermissionsInput,
  type ChangeUserStatusInput,
  type ResetUserPinInput,
  type StudentDto,
  type StudentNoteDto,
  type CreateStudentIpcInput,
  type UpdateStudentIpcInput,
  type CreateStudentNoteInput,
  type StudentFilterInput,
  type PhotoSelectionDto,
  type GroupDto,
  type CreateGroupInput,
  type UpdateGroupInput,
  type SetGroupScheduleInput,
  type GroupEnrollmentDto,
  type EnrollStudentInput,
  type UpdateEnrollmentPaymentInput,
  type EndEnrollmentInput,
  type SessionDto,
  type RescheduleSessionInput,
  type CancelSessionInput,
  type CompleteSessionInput,
  type ListSessionsByDateRangeInput,
  type MaterializeSessionsResultDto,
  type AttendanceRecordDto,
  type AttendanceFollowUpDto,
  type UpdateFollowUpStatusInput,
  type SessionAttendanceRosterDto,
  type RecordAttendanceInput,
  type BatchRecordAttendanceInput,
  type EndOfDayFollowUpDto,
  type TodayDashboardDto,
  type BackupHistoryItemDto,
  type BackupStatusDto,
  type CreateBackupInput,
  type AppInfoDto,
  type GlobalSettingsDto,
  type SetupStateDto,
  type AcademicYearDto,
  type CreateAcademicYearInput,
  type SwitchAcademicYearInput,
  type UpdateThemeSettingInput,
  type PaymentDto,
  type RecordPaymentInput,
  type StudentDiscountDto,
  type ApplyDiscountInput,
  type InvoiceDto,
  type CreateInvoiceInput,
  type StudentFinancialSummaryDto,
  type OverallFinanceKpiDto,
  type FinancialStatus,
} from '@tibyan/contracts';

/**
 * Concrete implementation of the canonical TibyanApi.
 * Each method maps to exactly one fixed canonical IPC channel.
 */
export const tibyanApi: TibyanApi = {
  auth: {
    listUsers(): Promise<IpcResult<LoginUserDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTH_LIST_USERS);
    },
    listManagementUsers(): Promise<IpcResult<ManagedUserDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTH_LIST_MANAGEMENT_USERS);
    },
    loginWithPin(input: LoginWithPinInput): Promise<IpcResult<UserSessionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, input);
    },
    logout(): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT);
    },
    getSession(): Promise<IpcResult<UserSessionDto | null>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_SESSION);
    },
    bootstrapOwner(input: BootstrapOwnerInput): Promise<IpcResult<UserDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, input);
    },
    createUser(input: CreateUserInput): Promise<IpcResult<UserDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTH_CREATE_USER, input);
    },
    updatePermissions(input: UpdatePermissionsInput): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTH_UPDATE_PERMISSIONS, input);
    },
    changeUserStatus(input: ChangeUserStatusInput): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHANGE_STATUS, input);
    },
    resetPin(input: ResetUserPinInput): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTH_RESET_PIN, input);
    },
  },

  students: {
    list(filter?: StudentFilterInput): Promise<IpcResult<StudentDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_LIST, filter);
    },
    getById(studentId: string): Promise<IpcResult<StudentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_GET_BY_ID, studentId);
    },
    create(input: CreateStudentIpcInput): Promise<IpcResult<StudentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_CREATE, input);
    },
    update(input: UpdateStudentIpcInput): Promise<IpcResult<StudentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_UPDATE, input);
    },
    addNote(input: CreateStudentNoteInput): Promise<IpcResult<StudentNoteDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_ADD_NOTE, input);
    },
    listNotes(studentId: string): Promise<IpcResult<StudentNoteDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_LIST_NOTES, studentId);
    },
    choosePhotoDialog(): Promise<IpcResult<PhotoSelectionDto | null>> {
      return ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_CHOOSE_PHOTO_DIALOG);
    },
    printCards(): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_PRINT_CARDS);
    },
    exportCardsPdf(input?: { defaultFilename?: string; targetPath?: string }): Promise<IpcResult<{ canceled: boolean; filePath: string }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_EXPORT_CARDS_PDF, input);
    },
  },

  groups: {
    list(): Promise<IpcResult<GroupDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GROUPS_LIST);
    },
    getById(groupId: string): Promise<IpcResult<GroupDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GROUPS_GET_BY_ID, groupId);
    },
    create(input: CreateGroupInput): Promise<IpcResult<GroupDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GROUPS_CREATE, input);
    },
    update(input: UpdateGroupInput): Promise<IpcResult<GroupDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GROUPS_UPDATE, input);
    },
    setSchedule(input: SetGroupScheduleInput): Promise<IpcResult<GroupDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GROUPS_SET_SCHEDULE, input);
    },
  },

  enrollments: {
    listByGroup(groupId: string): Promise<IpcResult<GroupEnrollmentDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ENROLLMENTS_LIST_BY_GROUP, groupId);
    },
    enroll(input: EnrollStudentInput): Promise<IpcResult<GroupEnrollmentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ENROLLMENTS_ENROLL, input);
    },
    updatePayment(input: UpdateEnrollmentPaymentInput): Promise<IpcResult<GroupEnrollmentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ENROLLMENTS_UPDATE_PAYMENT, input);
    },
    end(input: EndEnrollmentInput): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ENROLLMENTS_END, input);
    },
  },

  sessions: {
    materializeRollingSessions(): Promise<IpcResult<MaterializeSessionsResultDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_MATERIALIZE);
    },
    listByRange(input: ListSessionsByDateRangeInput): Promise<IpcResult<SessionDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_LIST_BY_RANGE, input);
    },
    reschedule(input: RescheduleSessionInput): Promise<IpcResult<SessionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_RESCHEDULE, input);
    },
    cancel(input: CancelSessionInput): Promise<IpcResult<SessionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_CANCEL, input);
    },
    complete(input: CompleteSessionInput): Promise<IpcResult<SessionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_COMPLETE, input);
    },
  },

  attendance: {
    getRoster(sessionId: string): Promise<IpcResult<SessionAttendanceRosterDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ATTENDANCE_GET_ROSTER, sessionId);
    },
    record(input: RecordAttendanceInput): Promise<IpcResult<AttendanceRecordDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ATTENDANCE_RECORD, input);
    },
    batchRecord(input: BatchRecordAttendanceInput): Promise<IpcResult<AttendanceRecordDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ATTENDANCE_BATCH_RECORD, input);
    },
    getEndOfDay(date: string): Promise<IpcResult<EndOfDayFollowUpDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ATTENDANCE_GET_END_OF_DAY, date);
    },
    updateFollowUpStatus(input: UpdateFollowUpStatusInput): Promise<IpcResult<AttendanceFollowUpDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ATTENDANCE_UPDATE_FOLLOW_UP_STATUS, input);
    },
  },

  dashboard: {
    getToday(): Promise<IpcResult<TodayDashboardDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_GET_TODAY);
    },
  },

  backup: {
    trigger(input?: CreateBackupInput): Promise<IpcResult<BackupHistoryItemDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_TRIGGER, input);
    },
    getStatus(): Promise<IpcResult<BackupStatusDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_GET_STATUS);
    },
    listRecords(): Promise<IpcResult<BackupHistoryItemDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_LIST_RECORDS);
    },
  },

  system: {
    getInfo(): Promise<IpcResult<AppInfoDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_INFO);
    },
    getSettings(): Promise<IpcResult<GlobalSettingsDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_SETTINGS);
    },
    getSetupState(): Promise<IpcResult<SetupStateDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_SETUP_STATE);
    },
    updateTheme(input: UpdateThemeSettingInput): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_UPDATE_THEME, input);
    },
    listAcademicYears(): Promise<IpcResult<AcademicYearDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_LIST_ACADEMIC_YEARS);
    },
    createAcademicYear(input: CreateAcademicYearInput): Promise<IpcResult<AcademicYearDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, input);
    },
    switchAcademicYear(input: SwitchAcademicYearInput): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SWITCH_ACADEMIC_YEAR, input);
    },
    openWhatsApp(input: { phone: string; message: string }): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_WHATSAPP, input);
    },
  },

  finance: {
    recordPayment(input: RecordPaymentInput): Promise<IpcResult<PaymentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.FINANCE_RECORD_PAYMENT, input);
    },
    listStudentPayments(studentId: string): Promise<IpcResult<PaymentDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.FINANCE_LIST_STUDENT_PAYMENTS, studentId);
    },
    getStudentSummary(studentId: string): Promise<IpcResult<StudentFinancialSummaryDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.FINANCE_GET_STUDENT_SUMMARY, studentId);
    },
    listAllSummaries(filter?: { groupId?: string; status?: FinancialStatus; search?: string }): Promise<IpcResult<StudentFinancialSummaryDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.FINANCE_LIST_ALL_SUMMARIES, filter);
    },
    getOverallKpi(): Promise<IpcResult<OverallFinanceKpiDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.FINANCE_GET_OVERALL_KPI);
    },
    createInvoice(input: CreateInvoiceInput): Promise<IpcResult<InvoiceDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.FINANCE_CREATE_INVOICE, input);
    },
    getInvoice(invoiceId: string): Promise<IpcResult<InvoiceDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.FINANCE_GET_INVOICE, invoiceId);
    },
    listInvoices(studentId?: string): Promise<IpcResult<InvoiceDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.FINANCE_LIST_INVOICES, studentId);
    },
    applyDiscount(input: ApplyDiscountInput): Promise<IpcResult<StudentDiscountDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.FINANCE_APPLY_DISCOUNT, input);
    },
    listDiscounts(studentId: string): Promise<IpcResult<StudentDiscountDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.FINANCE_LIST_DISCOUNTS, studentId);
    },
    printInvoice(invoiceId: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.FINANCE_PRINT_INVOICE, invoiceId);
    },
    exportInvoicePdf(input: { invoiceId: string; defaultFilename?: string; targetPath?: string }): Promise<IpcResult<{ canceled: boolean; filePath: string }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.FINANCE_EXPORT_INVOICE_PDF, input);
    },
  },
};

// Safely expose exclusively under the 'tibyan' namespace in the isolated renderer world
try {
  contextBridge.exposeInMainWorld('tibyan', tibyanApi);
} catch {
  // Graceful fallback for non-isolated test environments
  if (typeof window !== 'undefined') {
    (window as any).tibyan = tibyanApi;
  }
}
