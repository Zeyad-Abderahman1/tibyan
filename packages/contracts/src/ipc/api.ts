import { IpcResult } from '../common/result.js';
import {
  UserDto,
  UserSessionDto,
  LoginUserDto,
  ManagedUserDto,
  LoginWithPinInput,
  BootstrapOwnerInput,
  CreateUserInput,
  UpdatePermissionsInput,
  ChangeUserStatusInput,
  ResetUserPinInput,
} from '../models/auth.dto.js';
import {
  StudentDto,
  StudentNoteDto,
  CreateStudentIpcInput,
  UpdateStudentIpcInput,
  CreateStudentNoteInput,
  StudentFilterInput,
  PhotoSelectionDto,
} from '../models/student.dto.js';
import {
  GroupDto,
  CreateGroupInput,
  UpdateGroupInput,
  SetGroupScheduleInput,
} from '../models/group.dto.js';
import {
  GroupEnrollmentDto,
  EnrollStudentInput,
  UpdateEnrollmentPaymentInput,
  EndEnrollmentInput,
} from '../models/enrollment.dto.js';
import {
  SessionDto,
  RescheduleSessionInput,
  CancelSessionInput,
  ListSessionsByDateRangeInput,
  MaterializeSessionsResultDto,
} from '../models/session.dto.js';
import {
  AttendanceRecordDto,
  SessionAttendanceRosterDto,
  RecordAttendanceInput,
  BatchRecordAttendanceInput,
  CompleteSessionInput,
  EndOfDayFollowUpDto,
  AttendanceFollowUpDto,
  UpdateFollowUpStatusInput,
} from '../models/attendance.dto.js';
import { TodayDashboardDto } from '../models/dashboard.dto.js';
import {
  BackupHistoryItemDto,
  BackupStatusDto,
  CreateBackupInput,
} from '../models/backup.dto.js';
import {
  AppInfoDto,
  GlobalSettingsDto,
  SetupStateDto,
  AcademicYearDto,
  CreateAcademicYearInput,
  SwitchAcademicYearInput,
  UpdateThemeSettingInput,
} from '../models/system.dto.js';
import {
  PaymentDto,
  RecordPaymentInput,
  StudentDiscountDto,
  ApplyDiscountInput,
  InvoiceDto,
  CreateInvoiceInput,
  StudentFinancialSummaryDto,
  OverallFinanceKpiDto,
} from '../models/finance.dto.js';
import {
  PrinterInfo,
  ThermalReceiptDto,
  PrintThermalReceiptInput,
  TestPrintInput,
  EscPosGenerateInput,
  EscPosNetworkPrintInput,
} from '../models/thermal-receipt.dto.js';
import { FinancialStatus } from '../enums/payment.js';

export interface TibyanApi {
  auth: {
    listUsers(): Promise<IpcResult<LoginUserDto[]>>;
    listManagementUsers(): Promise<IpcResult<ManagedUserDto[]>>;
    loginWithPin(input: LoginWithPinInput): Promise<IpcResult<UserSessionDto>>;
    logout(): Promise<IpcResult<void>>;
    getSession(): Promise<IpcResult<UserSessionDto | null>>;
    bootstrapOwner(input: BootstrapOwnerInput): Promise<IpcResult<UserDto>>;
    createUser(input: CreateUserInput): Promise<IpcResult<UserDto>>;
    updatePermissions(input: UpdatePermissionsInput): Promise<IpcResult<void>>;
    changeUserStatus(input: ChangeUserStatusInput): Promise<IpcResult<void>>;
    resetPin(input: ResetUserPinInput): Promise<IpcResult<void>>;
  };
  students: {
    list(filter?: StudentFilterInput): Promise<IpcResult<StudentDto[]>>;
    getById(studentId: string): Promise<IpcResult<StudentDto>>;
    create(input: CreateStudentIpcInput): Promise<IpcResult<StudentDto>>;
    update(input: UpdateStudentIpcInput): Promise<IpcResult<StudentDto>>;
    addNote(input: CreateStudentNoteInput): Promise<IpcResult<StudentNoteDto>>;
    listNotes(studentId: string): Promise<IpcResult<StudentNoteDto[]>>;
    choosePhotoDialog(): Promise<IpcResult<PhotoSelectionDto | null>>;
    printCards(): Promise<IpcResult<void>>;
    exportCardsPdf(input?: { defaultFilename?: string; targetPath?: string }): Promise<IpcResult<{ canceled: boolean; filePath: string }>>;
  };
  groups: {
    list(): Promise<IpcResult<GroupDto[]>>;
    getById(groupId: string): Promise<IpcResult<GroupDto>>;
    create(input: CreateGroupInput): Promise<IpcResult<GroupDto>>;
    update(input: UpdateGroupInput): Promise<IpcResult<GroupDto>>;
    setSchedule(input: SetGroupScheduleInput): Promise<IpcResult<GroupDto>>;
  };
  enrollments: {
    listByGroup(groupId: string): Promise<IpcResult<GroupEnrollmentDto[]>>;
    enroll(input: EnrollStudentInput): Promise<IpcResult<GroupEnrollmentDto>>;
    updatePayment(input: UpdateEnrollmentPaymentInput): Promise<IpcResult<GroupEnrollmentDto>>;
    end(input: EndEnrollmentInput): Promise<IpcResult<void>>;
  };
  sessions: {
    materializeRollingSessions(): Promise<IpcResult<MaterializeSessionsResultDto>>;
    listByRange(input: ListSessionsByDateRangeInput): Promise<IpcResult<SessionDto[]>>;
    reschedule(input: RescheduleSessionInput): Promise<IpcResult<SessionDto>>;
    cancel(input: CancelSessionInput): Promise<IpcResult<SessionDto>>;
    complete(input: CompleteSessionInput): Promise<IpcResult<SessionDto>>;
  };
  attendance: {
    getRoster(sessionId: string): Promise<IpcResult<SessionAttendanceRosterDto>>;
    record(input: RecordAttendanceInput): Promise<IpcResult<AttendanceRecordDto>>;
    batchRecord(input: BatchRecordAttendanceInput): Promise<IpcResult<AttendanceRecordDto[]>>;
    getEndOfDay(date: string): Promise<IpcResult<EndOfDayFollowUpDto>>;
    updateFollowUpStatus(input: UpdateFollowUpStatusInput): Promise<IpcResult<AttendanceFollowUpDto>>;
  };
  dashboard: {
    getToday(): Promise<IpcResult<TodayDashboardDto>>;
  };
  backup: {
    trigger(input?: CreateBackupInput): Promise<IpcResult<BackupHistoryItemDto>>;
    getStatus(): Promise<IpcResult<BackupStatusDto>>;
    listRecords(): Promise<IpcResult<BackupHistoryItemDto[]>>;
  };
  system: {
    getInfo(): Promise<IpcResult<AppInfoDto>>;
    getSettings(): Promise<IpcResult<GlobalSettingsDto>>;
    getSetupState(): Promise<IpcResult<SetupStateDto>>;
    updateTheme(input: UpdateThemeSettingInput): Promise<IpcResult<void>>;
    listAcademicYears(): Promise<IpcResult<AcademicYearDto[]>>;
    createAcademicYear(input: CreateAcademicYearInput): Promise<IpcResult<AcademicYearDto>>;
    switchAcademicYear(input: SwitchAcademicYearInput): Promise<IpcResult<void>>;
    openWhatsApp(input: { phone: string; message: string }): Promise<IpcResult<void>>;
  };
  finance: {
    recordPayment(input: RecordPaymentInput): Promise<IpcResult<PaymentDto>>;
    listStudentPayments(studentId: string): Promise<IpcResult<PaymentDto[]>>;
    getStudentSummary(studentId: string): Promise<IpcResult<StudentFinancialSummaryDto>>;
    listAllSummaries(filter?: { groupId?: string; status?: FinancialStatus; search?: string }): Promise<IpcResult<StudentFinancialSummaryDto[]>>;
    getOverallKpi(): Promise<IpcResult<OverallFinanceKpiDto>>;
    createInvoice(input: CreateInvoiceInput): Promise<IpcResult<InvoiceDto>>;
    getInvoice(invoiceId: string): Promise<IpcResult<InvoiceDto>>;
    listInvoices(studentId?: string): Promise<IpcResult<InvoiceDto[]>>;
    applyDiscount(input: ApplyDiscountInput): Promise<IpcResult<StudentDiscountDto>>;
    listDiscounts(studentId: string): Promise<IpcResult<StudentDiscountDto[]>>;
    printInvoice(invoiceId: string): Promise<IpcResult<void>>;
    exportInvoicePdf(input: { invoiceId: string; defaultFilename?: string; targetPath?: string }): Promise<IpcResult<{ canceled: boolean; filePath: string }>>;
  };
  thermal: {
    listPrinters(): Promise<IpcResult<PrinterInfo[]>>;
    getReceiptData(paymentId: string): Promise<IpcResult<ThermalReceiptDto>>;
    printReceipt(input: PrintThermalReceiptInput): Promise<IpcResult<{ success: boolean; message?: string }>>;
    testPrint(input: TestPrintInput): Promise<IpcResult<{ success: boolean; message?: string }>>;
    generateEscpos(input: EscPosGenerateInput): Promise<IpcResult<{ base64: string; byteLength: number }>>;
    printEscposNetwork(input: EscPosNetworkPrintInput): Promise<IpcResult<{ success: boolean; message?: string }>>;
  };
}

declare global {
  interface Window {
    tibyan: TibyanApi;
  }
}
