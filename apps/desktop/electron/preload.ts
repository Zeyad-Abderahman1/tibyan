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
  type PrinterInfo,
  type ThermalReceiptDto,
  type PrintThermalReceiptInput,
  type TestPrintInput,
  type EscPosGenerateInput,
  type EscPosNetworkPrintInput,
  type CurriculumCatalogDto,
  type CurriculumTreeNodeDto,
  type CurriculumNodeDto,
  type GroupCurriculumOverviewDto,
  type GroupCurriculumAssignmentDto,
  type GroupNodeProgressDto,
  type CurriculumProgressStatus,
  type CurriculumCatalogFilter,
  type CreateCurriculumCatalogDto,
  type UpdateCurriculumCatalogDto,
  type CreateCurriculumNodeDto,
  type UpdateCurriculumNodeDto,
  type ReorderCurriculumNodesDto,
  type AssignGroupCatalogDto,
  type UpdateGroupNodeProgressDto,
  type LessonPlanDto,
  type CreateLessonPlanDto,
  type UpdateLessonPlanDto,
  type LessonPlanFilter,
  type SessionReflectionDto,
  type CreateSessionReflectionDto,
  type UpdateSessionReflectionDto,
  type SourceDocumentDto,
  type ImportSourceDocumentDto,
  type UpdateSourceDocumentDto,
  type SourceReferenceDto,
  type CreateSourceReferenceDto,
  type UpdateSourceReferenceDto,
  type QuestionDto,
  type CreateQuestionDto,
  type UpdateQuestionDto,
  type QuestionFilterDto,
  type DuplicateCheckResultDto,
  type BulkQuestionItemDto,
  type BulkImportReviewItemDto,
  type CommitBulkImportInputDto,
  type GeminiCredentialInput,
  type GeminiConfigurationStatus,
  type ExamDto,
  type ExamBlueprint,
  type ConfirmAssemblyInput,
  type AssemblyPreviewResult,
  type AiGenerateCandidatesInput,
  type AiExamCandidate,
  type CaptureSessionDto,
  type CreateCaptureSessionDto,
  type CaptureSubmissionDto,
  type CapturePageDto,
  type ImportCaptureFilesInput,
  type AssociateSubmissionInput,
  type ReassignPageInput,
  type ExcludePageInput,
  type RotatePageInput,
  type GradingDecisionDto,
  type GradingRunDto,
  type ExtractedAnswerDto,
  type GradeSubmissionInput,
  type OverrideGradingDecisionInput,
  type ReviewExtractedAnswerInput,
  type FinalizeSubmissionInput,
  type RegradeSubmissionInput,
  type SubmissionStatus,
  type ExamAnalyticsSummaryDto,
  type ScoreDistributionDto,
  type QuestionPerformanceDto,
  type SkillPerformanceDto,
  type StudentExamResultDto,
  type AssistantSession,
  type ConversationHistory,
  type AssistantResponse,
  type SendMessageInput,
  type CreateSessionInput,
  type ConfirmationInput,
  type UndoInput,
  type ExecutionReceipt,
  type SlideDeckDto,
  type SlideDeckWithSlides,
  type CreateSlideDeckInput,
  type UpdateSlideDeckInput,
  type SlideDto,
  type CreateSlideInput,
  type UpdateSlideInput,
  type ReorderSlidesInput,
  type SlideBlockDto,
  type CreateSlideBlockInput,
  type UpdateSlideBlockInput,
  type ReorderSlideBlocksInput,
  type MoveSlideBlockInput,
  type SlidePresentation,
  type ImportCurriculumLibraryInput,
  type UpdateCurriculumLibraryInput,
  type CurriculumGradeGroup,
  type CurriculumLibraryFilter,
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

  gemini: {
    getStatus(): Promise<IpcResult<GeminiConfigurationStatus>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GEMINI_GET_STATUS);
    },
    setCredential(input: GeminiCredentialInput): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GEMINI_SET_CREDENTIAL, input);
    },
    deleteCredential(): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GEMINI_DELETE_CREDENTIAL);
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
  thermal: {
    listPrinters(): Promise<IpcResult<PrinterInfo[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.THERMAL_LIST_PRINTERS);
    },
    getReceiptData(paymentId: string): Promise<IpcResult<ThermalReceiptDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.THERMAL_GET_RECEIPT_DATA, paymentId);
    },
    printReceipt(input: PrintThermalReceiptInput): Promise<IpcResult<{ success: boolean; message?: string }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.THERMAL_PRINT_RECEIPT, input);
    },
    testPrint(input: TestPrintInput): Promise<IpcResult<{ success: boolean; message?: string }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.THERMAL_TEST_PRINT, input);
    },
    generateEscpos(input: EscPosGenerateInput): Promise<IpcResult<{ base64: string; byteLength: number }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.THERMAL_GENERATE_ESCPOS, input);
    },
    printEscposNetwork(input: EscPosNetworkPrintInput): Promise<IpcResult<{ success: boolean; message?: string }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.THERMAL_PRINT_ESCPOS_NETWORK, input);
    },
  },
  curriculum: {
    listCatalogs(filter?: CurriculumCatalogFilter): Promise<IpcResult<CurriculumCatalogDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_LIST_CATALOGS, filter);
    },
    getCatalog(id: string): Promise<IpcResult<CurriculumCatalogDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_GET_CATALOG, id);
    },
    createCatalog(input: CreateCurriculumCatalogDto): Promise<IpcResult<CurriculumCatalogDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_CREATE_CATALOG, input);
    },
    updateCatalog(id: string, input: UpdateCurriculumCatalogDto): Promise<IpcResult<CurriculumCatalogDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_UPDATE_CATALOG, { id, input });
    },
    publishCatalog(id: string): Promise<IpcResult<CurriculumCatalogDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_PUBLISH_CATALOG, id);
    },
    reviseCatalog(id: string): Promise<IpcResult<CurriculumCatalogDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_REVISE_CATALOG, id);
    },
    getTree(catalogId: string): Promise<IpcResult<CurriculumTreeNodeDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_GET_TREE, catalogId);
    },
    createNode(input: CreateCurriculumNodeDto): Promise<IpcResult<CurriculumNodeDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_CREATE_NODE, input);
    },
    updateNode(id: string, input: UpdateCurriculumNodeDto): Promise<IpcResult<CurriculumNodeDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_UPDATE_NODE, { id, input });
    },
    deleteNode(id: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_DELETE_NODE, id);
    },
    reorderNodes(input: ReorderCurriculumNodesDto): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_REORDER_NODES, input);
    },
    getGroupOverview(groupId: string): Promise<IpcResult<GroupCurriculumOverviewDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_GET_GROUP_OVERVIEW, groupId);
    },
    assignGroupCatalog(input: AssignGroupCatalogDto): Promise<IpcResult<GroupCurriculumAssignmentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_ASSIGN_GROUP_CATALOG, input);
    },
    updateGroupProgress(input: UpdateGroupNodeProgressDto): Promise<IpcResult<GroupNodeProgressDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_UPDATE_GROUP_PROGRESS, input);
    },
    getGroupProgressMap(groupId: string): Promise<IpcResult<Record<string, CurriculumProgressStatus>>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_GET_GROUP_PROGRESS_MAP, groupId);
    },
  },
  lessonPlanner: {
    createLessonPlan(input: CreateLessonPlanDto): Promise<IpcResult<LessonPlanDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.LESSON_PLAN_CREATE, input);
    },
    updateLessonPlan(id: string, input: UpdateLessonPlanDto): Promise<IpcResult<LessonPlanDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.LESSON_PLAN_UPDATE, { id, input });
    },
    getLessonPlan(id: string): Promise<IpcResult<LessonPlanDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.LESSON_PLAN_GET, id);
    },
    listLessonPlansByNode(curriculumNodeId: string): Promise<IpcResult<LessonPlanDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.LESSON_PLAN_LIST_BY_NODE, curriculumNodeId);
    },
    listLessonPlans(filter?: LessonPlanFilter): Promise<IpcResult<LessonPlanDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.LESSON_PLAN_LIST, filter);
    },
    archiveLessonPlan(id: string): Promise<IpcResult<LessonPlanDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.LESSON_PLAN_ARCHIVE, id);
    },
  },
  sessionReflection: {
    createReflection(input: CreateSessionReflectionDto): Promise<IpcResult<SessionReflectionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SESSION_REFLECTION_CREATE, input);
    },
    updateReflection(id: string, input: UpdateSessionReflectionDto): Promise<IpcResult<SessionReflectionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SESSION_REFLECTION_UPDATE, { id, input });
    },
    getReflectionBySession(sessionId: string): Promise<IpcResult<SessionReflectionDto | null>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SESSION_REFLECTION_GET_BY_SESSION, sessionId);
    },
    getReflection(id: string): Promise<IpcResult<SessionReflectionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SESSION_REFLECTION_GET, id);
    },
  },
  pdfSources: {
    listSources(catalogId?: string): Promise<IpcResult<SourceDocumentDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.PDF_SOURCES_LIST, catalogId);
    },
    getSource(id: string): Promise<IpcResult<SourceDocumentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.PDF_SOURCES_GET, id);
    },
    importSource(input: ImportSourceDocumentDto): Promise<IpcResult<SourceDocumentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.PDF_SOURCES_IMPORT, input);
    },
    updateSource(id: string, input: UpdateSourceDocumentDto): Promise<IpcResult<SourceDocumentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.PDF_SOURCES_UPDATE, { id, input });
    },
    deleteSource(id: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.PDF_SOURCES_DELETE, id);
    },
    listReferences(sourceDocumentId?: string): Promise<IpcResult<SourceReferenceDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.PDF_REFERENCES_LIST, sourceDocumentId);
    },
    createReference(input: CreateSourceReferenceDto): Promise<IpcResult<SourceReferenceDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.PDF_REFERENCES_CREATE, input);
    },
    updateReference(id: string, input: UpdateSourceReferenceDto): Promise<IpcResult<SourceReferenceDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.PDF_SOURCES_UPDATE, { id, input });
    },
    deleteReference(id: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.PDF_REFERENCES_DELETE, id);
    },
    openDocument(id: string, page?: number): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.PDF_SOURCES_OPEN, { id, page });
    },
  },
  questionBank: {
    listQuestions(filter?: QuestionFilterDto): Promise<IpcResult<QuestionDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.QUESTION_BANK_LIST, filter);
    },
    getQuestion(id: string): Promise<IpcResult<QuestionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.QUESTION_BANK_GET, id);
    },
    createQuestion(input: CreateQuestionDto): Promise<IpcResult<QuestionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.QUESTION_BANK_CREATE, input);
    },
    updateQuestion(id: string, input: UpdateQuestionDto): Promise<IpcResult<QuestionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.QUESTION_BANK_UPDATE, { id, input });
    },
    deleteQuestion(id: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.QUESTION_BANK_DELETE, id);
    },
    archiveQuestion(id: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.QUESTION_BANK_ARCHIVE, id);
    },
    linkSources(questionId: string, sourceReferenceIds: string[]): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.QUESTION_BANK_LINK_SOURCES, { questionId, sourceReferenceIds });
    },
    unlinkSource(questionId: string, sourceReferenceId: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.QUESTION_BANK_UNLINK_SOURCE, { questionId, sourceReferenceId });
    },
    checkDuplicate(body: unknown, excludeQuestionId?: string): Promise<IpcResult<DuplicateCheckResultDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.QUESTION_BANK_CHECK_DUPLICATE, { body, excludeQuestionId });
    },
    previewBulk(items: BulkQuestionItemDto[]): Promise<IpcResult<BulkImportReviewItemDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.QUESTION_BANK_PREVIEW_BULK, items);
    },
    commitBulk(input: CommitBulkImportInputDto): Promise<IpcResult<{ createdCount: number; linkedCount: number; dismissedCount: number }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.QUESTION_BANK_COMMIT_BULK, input);
    },
  },

  exams: {
    list(): Promise<IpcResult<ExamDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.EXAMS_LIST);
    },
    get(id: string): Promise<IpcResult<ExamDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.EXAMS_GET, id);
    },
    previewAssembly(blueprint: ExamBlueprint): Promise<IpcResult<AssemblyPreviewResult>> {
      return ipcRenderer.invoke(IPC_CHANNELS.EXAMS_PREVIEW_ASSEMBLY, blueprint);
    },
    confirmAssembly(input: ConfirmAssemblyInput): Promise<IpcResult<ExamDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.EXAMS_CONFIRM_ASSEMBLY, input);
    },
    undoLastMutation(examId: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.EXAMS_UNDO_LAST_MUTATION, examId);
    },
    previewAiCandidates(input: AiGenerateCandidatesInput): Promise<IpcResult<{ candidates: AiExamCandidate[] }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.EXAMS_PREVIEW_AI_CANDIDATES, input);
    },
    renderLayout(input: { examId: string; kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY'; versionLabel?: 'A' | 'B' | 'C' | 'D' }): Promise<IpcResult<string>> {
      return ipcRenderer.invoke(IPC_CHANNELS.EXAMS_RENDER_LAYOUT, input);
    },
    exportPdf(input: { examId: string; kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY'; versionLabel?: 'A' | 'B' | 'C' | 'D'; defaultFilename?: string }): Promise<IpcResult<{ canceled: boolean; filePath: string }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.EXAMS_EXPORT_PDF, input);
    },
    print(input: { examId: string; kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY'; versionLabel?: 'A' | 'B' | 'C' | 'D' }): Promise<IpcResult<{ success: boolean; message?: string }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.EXAMS_PRINT, input);
    },
  },

  capture: {
    createSession(input: CreateCaptureSessionDto): Promise<IpcResult<CaptureSessionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_CREATE_SESSION, input);
    },
    listSessions(): Promise<IpcResult<CaptureSessionDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_LIST_SESSIONS);
    },
    getSession(id: string): Promise<IpcResult<CaptureSessionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_GET_SESSION, id);
    },
    deleteSession(id: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_DELETE_SESSION, id);
    },
    importFiles(input: ImportCaptureFilesInput): Promise<IpcResult<{ pages: CapturePageDto[]; duplicates: Array<{ isDuplicate: boolean; existingPageId?: string; existingSubmissionId?: string }> }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_IMPORT_FILES, input);
    },
    listSubmissions(sessionId: string): Promise<IpcResult<CaptureSubmissionDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_LIST_SUBMISSIONS, sessionId);
    },
    getSubmission(id: string): Promise<IpcResult<CaptureSubmissionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_GET_SUBMISSION, id);
    },
    associateSubmission(input: AssociateSubmissionInput): Promise<IpcResult<CaptureSubmissionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_ASSOCIATE_SUBMISSION, input);
    },
    listPages(submissionId: string): Promise<IpcResult<CapturePageDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_LIST_PAGES, submissionId);
    },
    rotatePage(input: RotatePageInput): Promise<IpcResult<CapturePageDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_ROTATE_PAGE, input);
    },
    excludePage(input: ExcludePageInput): Promise<IpcResult<CapturePageDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_EXCLUDE_PAGE, input);
    },
    reassignPage(input: ReassignPageInput): Promise<IpcResult<CapturePageDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_REASSIGN_PAGE, input);
    },
    checkDuplicate(fingerprintSha256: string): Promise<IpcResult<{ isDuplicate: boolean; existingPageId?: string; existingSubmissionId?: string }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_CHECK_DUPLICATE, fingerprintSha256);
    },
  },

  grading: {
    extractAnswers(submissionId: string): Promise<IpcResult<ExtractedAnswerDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GRADING_EXTRACT_ANSWERS, submissionId);
    },
    gradeSubmission(input: GradeSubmissionInput): Promise<IpcResult<GradingRunDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GRADE_SUBMISSION, input);
    },
    gradeSubmissionAi(input: GradeSubmissionInput): Promise<IpcResult<GradingRunDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GRADE_SUBMISSION_AI, input);
    },
    getDecisions(submissionId: string): Promise<IpcResult<GradingDecisionDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GRADE_GET_DECISIONS, submissionId);
    },
    overrideDecision(input: OverrideGradingDecisionInput): Promise<IpcResult<GradingDecisionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GRADE_OVERRIDE_DECISION, input);
    },
    reviewAnswer(input: ReviewExtractedAnswerInput): Promise<IpcResult<ExtractedAnswerDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GRADE_REVIEW_ANSWER, input);
    },
    finalize(input: FinalizeSubmissionInput): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GRADE_FINALIZE, input);
    },
    regrade(input: RegradeSubmissionInput): Promise<IpcResult<GradingRunDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GRADE_REGRADE, input);
    },
    getRuns(submissionId: string): Promise<IpcResult<GradingRunDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GRADE_GET_RUNS, submissionId);
    },
    getSubmissionStatus(submissionId: string): Promise<IpcResult<{ status: SubmissionStatus; totalAwarded: number; totalMax: number }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.GRADE_GET_SUBMISSION_STATUS, submissionId);
    },
  },

  analytics: {
    getExamSummary(examId: string): Promise<IpcResult<ExamAnalyticsSummaryDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_GET_EXAM_SUMMARY, examId);
    },
    getScoreDistribution(examId: string): Promise<IpcResult<ScoreDistributionDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_GET_SCORE_DISTRIBUTION, examId);
    },
    getQuestionPerformance(examId: string): Promise<IpcResult<QuestionPerformanceDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_GET_QUESTION_PERFORMANCE, examId);
    },
    getSkillPerformance(examId: string): Promise<IpcResult<SkillPerformanceDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_GET_SKILL_PERFORMANCE, examId);
    },
    getStudentResult(submissionId: string): Promise<IpcResult<StudentExamResultDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_GET_STUDENT_RESULT, submissionId);
    },
    listStudentResults(examId: string): Promise<IpcResult<StudentExamResultDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_LIST_STUDENT_RESULTS, examId);
    },
  },

  assistant: {
    createSession(input?: CreateSessionInput): Promise<IpcResult<AssistantSession>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSISTANT_CREATE_SESSION, input);
    },
    listSessions(): Promise<IpcResult<AssistantSession[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSISTANT_LIST_SESSIONS);
    },
    getSession(sessionId: string): Promise<IpcResult<AssistantSession>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSISTANT_GET_SESSION, sessionId);
    },
    deleteSession(sessionId: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSISTANT_DELETE_SESSION, sessionId);
    },
    sendMessage(input: SendMessageInput): Promise<IpcResult<AssistantResponse>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSISTANT_SEND_MESSAGE, input);
    },
    getHistory(sessionId: string, cursor?: string): Promise<IpcResult<ConversationHistory>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSISTANT_GET_HISTORY, sessionId, cursor);
    },
    confirmAction(input: ConfirmationInput): Promise<IpcResult<AssistantResponse>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSISTANT_CONFIRM_ACTION, input);
    },
    cancelAction(previewId: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSISTANT_CANCEL_ACTION, previewId);
    },
    undoAction(input: UndoInput): Promise<IpcResult<ExecutionReceipt>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSISTANT_UNDO_ACTION, input);
    },
    getTools(): Promise<IpcResult<Array<{ name: string; description: string; riskLevel: string }>>> {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSISTANT_GET_TOOLS);
    },
  },

  slides: {
    listDecks(): Promise<IpcResult<SlideDeckDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_LIST_DECKS);
    },
    getDeck(id: string): Promise<IpcResult<SlideDeckWithSlides>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_GET_DECK, id);
    },
    createDeck(input: CreateSlideDeckInput): Promise<IpcResult<SlideDeckDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_CREATE_DECK, input);
    },
    updateDeck(id: string, input: UpdateSlideDeckInput): Promise<IpcResult<SlideDeckDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_UPDATE_DECK, { id, input });
    },
    deleteDeck(id: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_DELETE_DECK, id);
    },
    addSlide(input: CreateSlideInput): Promise<IpcResult<SlideDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_ADD_SLIDE, input);
    },
    updateSlide(id: string, input: UpdateSlideInput): Promise<IpcResult<SlideDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_UPDATE_SLIDE, { id, input });
    },
    deleteSlide(id: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_DELETE_SLIDE, id);
    },
    duplicateSlide(id: string): Promise<IpcResult<SlideDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_DUPLICATE_SLIDE, id);
    },
    reorderSlides(input: ReorderSlidesInput): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_REORDER_SLIDES, input);
    },
    addBlock(input: CreateSlideBlockInput): Promise<IpcResult<SlideBlockDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_ADD_BLOCK, input);
    },
    updateBlock(id: string, input: UpdateSlideBlockInput): Promise<IpcResult<SlideBlockDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_UPDATE_BLOCK, { id, input });
    },
    deleteBlock(id: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_DELETE_BLOCK, id);
    },
    reorderBlocks(input: ReorderSlideBlocksInput): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_REORDER_BLOCKS, input);
    },
    moveBlock(input: MoveSlideBlockInput): Promise<IpcResult<SlideBlockDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_MOVE_BLOCK, input);
    },
    getPresentation(deckId: string): Promise<IpcResult<SlidePresentation>> {
      return ipcRenderer.invoke(IPC_CHANNELS.SLIDES_GET_PRESENTATION, deckId);
    },
  },

  curriculumLibrary: {
    list(filter?: CurriculumLibraryFilter): Promise<IpcResult<SourceDocumentDto[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_LIBRARY_LIST, filter);
    },
    listGrouped(): Promise<IpcResult<CurriculumGradeGroup[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_LIBRARY_LIST_GROUPED);
    },
    import(input: ImportCurriculumLibraryInput): Promise<IpcResult<SourceDocumentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_LIBRARY_IMPORT, input);
    },
    update(input: UpdateCurriculumLibraryInput): Promise<IpcResult<SourceDocumentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_LIBRARY_UPDATE, input);
    },
    delete(id: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_LIBRARY_DELETE, id);
    },
    get(id: string): Promise<IpcResult<SourceDocumentDto>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_LIBRARY_GET, id);
    },
    viewPdf(request: { id: string; page?: number }): Promise<IpcResult<{ filePath: string; pageCount: number }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_LIBRARY_VIEW_PDF, request);
    },
    openExternal(id: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_LIBRARY_OPEN_EXTERNAL, id);
    },
    browseAndImport(): Promise<IpcResult<{ filePath: string; fileName: string } | null>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_LIBRARY_BROWSE_AND_IMPORT);
    },
    resolveDataUrl(id: string): Promise<IpcResult<{ dataUrl: string; pageCount: number; title: string }>> {
      return ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_LIBRARY_RESOLVE_DATA_URL, id);
    },
  },

  tibyan: {
    createTaskSession(input: { taskType: string; title?: string }): Promise<IpcResult<AssistantSession>> {
      return ipcRenderer.invoke(IPC_CHANNELS.TIBYAN_CREATE_TASK_SESSION, input);
    },
    listHistory(): Promise<IpcResult<AssistantSession[]>> {
      return ipcRenderer.invoke(IPC_CHANNELS.TIBYAN_LIST_HISTORY);
    },
    getHistoryItem(sessionId: string): Promise<IpcResult<ConversationHistory>> {
      return ipcRenderer.invoke(IPC_CHANNELS.TIBYAN_GET_HISTORY_ITEM, sessionId);
    },
    deleteHistoryItem(sessionId: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.TIBYAN_DELETE_HISTORY_ITEM, sessionId);
    },
    renameHistoryItem(sessionId: string, title: string): Promise<IpcResult<void>> {
      return ipcRenderer.invoke(IPC_CHANNELS.TIBYAN_RENAME_HISTORY_ITEM, { sessionId, title });
    },
  },

  ai: {
    generateReview(input: { sourceId: string; scope?: string }): Promise<IpcResult<import('@tibyan/contracts').GeneratedReviewContent>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_REVIEW, input);
    },
    generateNotes(input: { sourceId: string; scope?: string }): Promise<IpcResult<import('@tibyan/contracts').GeneratedNotesContent>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_NOTES, input);
    },
    generateSlides(input: import('@tibyan/contracts').SlidesGenerationRequest): Promise<IpcResult<SlideDeckWithSlides>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_SLIDES, input);
    },
    generateExam(input: import('@tibyan/contracts').ExamGenerationRequest): Promise<IpcResult<import('@tibyan/contracts').GeneratedExamContent>> {
      return ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_EXAM, input);
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
