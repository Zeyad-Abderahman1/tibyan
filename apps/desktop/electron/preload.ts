import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  type TibyanApi,
  type IpcResult,
  type UserDto,
  type UserSessionDto,
  type LoginUserDto,
  type LoginWithPinInput,
  type BootstrapOwnerInput,
  type CreateUserInput,
  type UpdatePermissionsInput,
  type ChangeUserStatusInput,
  type ResetUserPinInput,
  type StudentDto,
  type StudentNoteDto,
  type CreateStudentInput,
  type UpdateStudentInput,
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
  type ListSessionsByDateRangeInput,
  type MaterializeSessionsResultDto,
  type TodayDashboardDto,
  type BackupRecordDto,
  type BackupStatusDto,
  type CreateBackupInput,
  type AppInfoDto,
  type GlobalSettingsDto,
  type SetupStateDto,
  type AcademicYearDto,
  type CreateAcademicYearInput,
  type SwitchAcademicYearInput,
  type UpdateThemeSettingInput,
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
    create(input: CreateStudentInput): Promise<IpcResult<StudentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_CREATE, input);
    },
    update(input: UpdateStudentInput): Promise<IpcResult<StudentDto>> {
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
  },

  dashboard: {
    getToday(): Promise<IpcResult<TodayDashboardDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_GET_TODAY);
    },
  },

  backup: {
    trigger(input?: CreateBackupInput): Promise<IpcResult<BackupRecordDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_TRIGGER, input);
    },
    getStatus(): Promise<IpcResult<BackupStatusDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_GET_STATUS);
    },
    listRecords(): Promise<IpcResult<BackupRecordDto[]>> {
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
