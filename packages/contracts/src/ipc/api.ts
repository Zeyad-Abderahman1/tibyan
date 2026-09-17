import { IpcResult } from '../common/result.js';
import {
  UserDto,
  UserSessionDto,
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
  CreateStudentInput,
  UpdateStudentInput,
  CreateStudentNoteInput,
  StudentFilterInput,
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
import { TodayDashboardDto } from '../models/dashboard.dto.js';
import {
  BackupRecordDto,
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

export interface TibyanApi {
  auth: {
    listUsers(): Promise<IpcResult<UserDto[]>>;
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
    create(input: CreateStudentInput): Promise<IpcResult<StudentDto>>;
    update(input: UpdateStudentInput): Promise<IpcResult<StudentDto>>;
    addNote(input: CreateStudentNoteInput): Promise<IpcResult<StudentNoteDto>>;
    listNotes(studentId: string): Promise<IpcResult<StudentNoteDto[]>>;
    choosePhotoDialog(): Promise<IpcResult<string | null>>;
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
  };
  dashboard: {
    getToday(): Promise<IpcResult<TodayDashboardDto>>;
  };
  backup: {
    trigger(input?: CreateBackupInput): Promise<IpcResult<BackupRecordDto>>;
    getStatus(): Promise<IpcResult<BackupStatusDto>>;
    listRecords(): Promise<IpcResult<BackupRecordDto[]>>;
  };
  system: {
    getInfo(): Promise<IpcResult<AppInfoDto>>;
    getSettings(): Promise<IpcResult<GlobalSettingsDto>>;
    getSetupState(): Promise<IpcResult<SetupStateDto>>;
    updateTheme(input: UpdateThemeSettingInput): Promise<IpcResult<void>>;
    listAcademicYears(): Promise<IpcResult<AcademicYearDto[]>>;
    createAcademicYear(input: CreateAcademicYearInput): Promise<IpcResult<AcademicYearDto>>;
    switchAcademicYear(input: SwitchAcademicYearInput): Promise<IpcResult<void>>;
  };
}

declare global {
  interface Window {
    tibyan: TibyanApi;
  }
}
