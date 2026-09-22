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
import { GeminiCredentialInput, GeminiCredentialDeleteInput, GeminiConfigurationStatus, GeminiConnectionResult } from '../models/gemini-configuration.dto.js';
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
import {
  CurriculumCatalogDto,
  CreateCurriculumCatalogDto,
  UpdateCurriculumCatalogDto,
  CurriculumCatalogFilter,
  CurriculumNodeDto,
  CreateCurriculumNodeDto,
  UpdateCurriculumNodeDto,
  ReorderCurriculumNodesDto,
  CurriculumTreeNodeDto,
  GroupCurriculumOverviewDto,
  GroupCurriculumAssignmentDto,
  AssignGroupCatalogDto,
  GroupNodeProgressDto,
  UpdateGroupNodeProgressDto,
} from '../models/curriculum.dto.js';
import {
  LessonPlanDto,
  CreateLessonPlanDto,
  UpdateLessonPlanDto,
  LessonPlanFilter,
} from '../models/lesson-plan.dto.js';
import {
  SessionReflectionDto,
  CreateSessionReflectionDto,
  UpdateSessionReflectionDto,
} from '../models/session-reflection.dto.js';
import {
  SourceDocumentDto,
  ImportSourceDocumentDto,
  UpdateSourceDocumentDto,
  SourceReferenceDto,
  CreateSourceReferenceDto,
  UpdateSourceReferenceDto,
} from '../models/source-document.dto.js';
import {
  QuestionDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionFilterDto,
  DuplicateCheckResultDto,
  BulkQuestionItemDto,
  BulkImportReviewItemDto,
  CommitBulkImportInputDto,
} from '../models/question-bank.dto.js';
import {
  ExamDto,
  ExamBlueprint,
  ConfirmAssemblyInput,
  AssemblyPreviewResult,
  AiGenerateCandidatesInput,
  AiExamCandidate,
} from '../models/exam.dto.js';
import {
  CaptureSessionDto,
  CreateCaptureSessionDto,
  CaptureSubmissionDto,
  CapturePageDto,
  ImportCaptureFilesInput,
  AssociateSubmissionInput,
  ReassignPageInput,
  ExcludePageInput,
  RotatePageInput,
} from '../models/capture.dto.js';
import {
  GradingDecisionDto,
  GradingRunDto,
  ExtractedAnswerDto,
  GradeSubmissionInput,
  OverrideGradingDecisionInput,
  ReviewExtractedAnswerInput,
  FinalizeSubmissionInput,
  RegradeSubmissionInput,
} from '../models/grading.dto.js';
import { type SubmissionStatus } from '../enums/capture.js';
import {
  ExamAnalyticsSummaryDto,
  ScoreDistributionDto,
  QuestionPerformanceDto,
  SkillPerformanceDto,
  StudentExamResultDto,
} from '../models/analytics.dto.js';
import {
  AssistantSession,
  ConversationHistory,
  AssistantResponse,
  SendMessageInput,
  CreateSessionInput,
  ConfirmationInput,
  UndoInput,
} from '../models/assistant.dto.js';
import type { ExamGenerationRequest, SlidesGenerationRequest, ReviewGenerationRequest, NotesGenerationRequest, GeneratedExamContent, ReviewArtifactDto, NotesArtifactDto, ReviewGenerationResult, NotesGenerationResult } from '../models/ai-generation.dto.js';
import {
  CurriculumGradeGroup,
  ImportCurriculumLibraryInput,
  UpdateCurriculumLibraryInput,
  CurriculumLibraryFilter,
} from '../models/curriculum-library.dto.js';
import {
  SlideDeckDto,
  SlideDeckWithSlides,
  CreateSlideDeckInput,
  UpdateSlideDeckInput,
  SlideDto,
  CreateSlideInput,
  UpdateSlideInput,
  ReorderSlidesInput,
  SlideBlockDto,
  CreateSlideBlockInput,
  UpdateSlideBlockInput,
  ReorderSlideBlocksInput,
  MoveSlideBlockInput,
  SlidePresentation,
} from '../models/slide.dto.js';

import { CurriculumProgressStatus } from '../enums/curriculum.js';
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
  gemini: {
    getStatus(): Promise<IpcResult<GeminiConfigurationStatus>>;
    setCredential(input: GeminiCredentialInput): Promise<IpcResult<void>>;
    deleteCredential(input: GeminiCredentialDeleteInput): Promise<IpcResult<void>>;
    testConnection(): Promise<IpcResult<GeminiConnectionResult>>;
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
  curriculum: {
    listCatalogs(filter?: CurriculumCatalogFilter): Promise<IpcResult<CurriculumCatalogDto[]>>;
    getCatalog(id: string): Promise<IpcResult<CurriculumCatalogDto>>;
    createCatalog(input: CreateCurriculumCatalogDto): Promise<IpcResult<CurriculumCatalogDto>>;
    updateCatalog(id: string, input: UpdateCurriculumCatalogDto): Promise<IpcResult<CurriculumCatalogDto>>;
    publishCatalog(id: string): Promise<IpcResult<CurriculumCatalogDto>>;
    reviseCatalog(id: string): Promise<IpcResult<CurriculumCatalogDto>>;
    getTree(catalogId: string): Promise<IpcResult<CurriculumTreeNodeDto[]>>;
    createNode(input: CreateCurriculumNodeDto): Promise<IpcResult<CurriculumNodeDto>>;
    updateNode(id: string, input: UpdateCurriculumNodeDto): Promise<IpcResult<CurriculumNodeDto>>;
    deleteNode(id: string): Promise<IpcResult<void>>;
    reorderNodes(input: ReorderCurriculumNodesDto): Promise<IpcResult<void>>;
    getGroupOverview(groupId: string): Promise<IpcResult<GroupCurriculumOverviewDto>>;
    assignGroupCatalog(input: AssignGroupCatalogDto): Promise<IpcResult<GroupCurriculumAssignmentDto>>;
    updateGroupProgress(input: UpdateGroupNodeProgressDto): Promise<IpcResult<GroupNodeProgressDto>>;
    getGroupProgressMap(groupId: string): Promise<IpcResult<Record<string, CurriculumProgressStatus>>>;
  };
  lessonPlanner: {
    createLessonPlan(input: CreateLessonPlanDto): Promise<IpcResult<LessonPlanDto>>;
    updateLessonPlan(id: string, input: UpdateLessonPlanDto): Promise<IpcResult<LessonPlanDto>>;
    getLessonPlan(id: string): Promise<IpcResult<LessonPlanDto>>;
    listLessonPlansByNode(curriculumNodeId: string): Promise<IpcResult<LessonPlanDto[]>>;
    listLessonPlans(filter?: LessonPlanFilter): Promise<IpcResult<LessonPlanDto[]>>;
    archiveLessonPlan(id: string): Promise<IpcResult<LessonPlanDto>>;
  };
  sessionReflection: {
    createReflection(input: CreateSessionReflectionDto): Promise<IpcResult<SessionReflectionDto>>;
    updateReflection(id: string, input: UpdateSessionReflectionDto): Promise<IpcResult<SessionReflectionDto>>;
    getReflectionBySession(sessionId: string): Promise<IpcResult<SessionReflectionDto | null>>;
    getReflection(id: string): Promise<IpcResult<SessionReflectionDto>>;
  };
  pdfSources: {
    listSources(catalogId?: string): Promise<IpcResult<SourceDocumentDto[]>>;
    getSource(id: string): Promise<IpcResult<SourceDocumentDto>>;
    importSource(input: ImportSourceDocumentDto): Promise<IpcResult<SourceDocumentDto>>;
    updateSource(id: string, input: UpdateSourceDocumentDto): Promise<IpcResult<SourceDocumentDto>>;
    deleteSource(id: string): Promise<IpcResult<void>>;
    listReferences(sourceDocumentId?: string): Promise<IpcResult<SourceReferenceDto[]>>;
    createReference(input: CreateSourceReferenceDto): Promise<IpcResult<SourceReferenceDto>>;
    updateReference(id: string, input: UpdateSourceReferenceDto): Promise<IpcResult<SourceReferenceDto>>;
    deleteReference(id: string): Promise<IpcResult<void>>;
    openDocument(id: string, page?: number): Promise<IpcResult<void>>;
  };
  questionBank: {
    listQuestions(filter?: QuestionFilterDto): Promise<IpcResult<QuestionDto[]>>;
    getQuestion(id: string): Promise<IpcResult<QuestionDto>>;
    createQuestion(input: CreateQuestionDto): Promise<IpcResult<QuestionDto>>;
    updateQuestion(id: string, input: UpdateQuestionDto): Promise<IpcResult<QuestionDto>>;
    deleteQuestion(id: string): Promise<IpcResult<void>>;
    archiveQuestion(id: string): Promise<IpcResult<void>>;
    linkSources(questionId: string, sourceReferenceIds: string[]): Promise<IpcResult<void>>;
    unlinkSource(questionId: string, sourceReferenceId: string): Promise<IpcResult<void>>;
    checkDuplicate(body: unknown, excludeQuestionId?: string): Promise<IpcResult<DuplicateCheckResultDto>>;
    previewBulk(items: BulkQuestionItemDto[]): Promise<IpcResult<BulkImportReviewItemDto[]>>;
    commitBulk(input: CommitBulkImportInputDto): Promise<IpcResult<{ createdCount: number; linkedCount: number; dismissedCount: number }>>;
  };
  exams: {
    list(): Promise<IpcResult<ExamDto[]>>;
    get(id: string): Promise<IpcResult<ExamDto>>;
    previewAssembly(blueprint: ExamBlueprint): Promise<IpcResult<AssemblyPreviewResult>>;
    confirmAssembly(input: ConfirmAssemblyInput): Promise<IpcResult<ExamDto>>;
    undoLastMutation(examId: string): Promise<IpcResult<void>>;
    previewAiCandidates(input: AiGenerateCandidatesInput): Promise<IpcResult<{ candidates: AiExamCandidate[] }>>;
    renderLayout(input: { examId: string; kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY'; versionLabel?: 'A' | 'B' | 'C' | 'D' }): Promise<IpcResult<string>>;
    exportPdf(input: { examId: string; kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY'; versionLabel?: 'A' | 'B' | 'C' | 'D'; defaultFilename?: string }): Promise<IpcResult<{ canceled: boolean; filePath: string }>>;
    print(input: { examId: string; kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY'; versionLabel?: 'A' | 'B' | 'C' | 'D' }): Promise<IpcResult<{ success: boolean; message?: string }>>;
  };
  capture: {
    createSession(input: CreateCaptureSessionDto): Promise<IpcResult<CaptureSessionDto>>;
    listSessions(): Promise<IpcResult<CaptureSessionDto[]>>;
    getSession(id: string): Promise<IpcResult<CaptureSessionDto>>;
    deleteSession(id: string): Promise<IpcResult<void>>;
    importFiles(input: ImportCaptureFilesInput): Promise<IpcResult<{ pages: CapturePageDto[]; duplicates: Array<{ isDuplicate: boolean; existingPageId?: string; existingSubmissionId?: string }> }>>;
    listSubmissions(sessionId: string): Promise<IpcResult<CaptureSubmissionDto[]>>;
    getSubmission(id: string): Promise<IpcResult<CaptureSubmissionDto>>;
    associateSubmission(input: AssociateSubmissionInput): Promise<IpcResult<CaptureSubmissionDto>>;
    listPages(submissionId: string): Promise<IpcResult<CapturePageDto[]>>;
    rotatePage(input: RotatePageInput): Promise<IpcResult<CapturePageDto>>;
    excludePage(input: ExcludePageInput): Promise<IpcResult<CapturePageDto>>;
    reassignPage(input: ReassignPageInput): Promise<IpcResult<CapturePageDto>>;
    checkDuplicate(fingerprintSha256: string): Promise<IpcResult<{ isDuplicate: boolean; existingPageId?: string; existingSubmissionId?: string }>>;
  };
  grading: {
    extractAnswers(submissionId: string): Promise<IpcResult<ExtractedAnswerDto[]>>;
    gradeSubmission(input: GradeSubmissionInput): Promise<IpcResult<GradingRunDto>>;
    gradeSubmissionAi(input: GradeSubmissionInput): Promise<IpcResult<GradingRunDto>>;
    getDecisions(submissionId: string): Promise<IpcResult<GradingDecisionDto[]>>;
    overrideDecision(input: OverrideGradingDecisionInput): Promise<IpcResult<GradingDecisionDto>>;
    reviewAnswer(input: ReviewExtractedAnswerInput): Promise<IpcResult<ExtractedAnswerDto>>;
    finalize(input: FinalizeSubmissionInput): Promise<IpcResult<void>>;
    regrade(input: RegradeSubmissionInput): Promise<IpcResult<GradingRunDto>>;
    getRuns(submissionId: string): Promise<IpcResult<GradingRunDto[]>>;
    getSubmissionStatus(submissionId: string): Promise<IpcResult<{ status: SubmissionStatus; totalAwarded: number; totalMax: number }>>;
  };
  analytics: {
    getExamSummary(examId: string): Promise<IpcResult<ExamAnalyticsSummaryDto>>;
    getScoreDistribution(examId: string): Promise<IpcResult<ScoreDistributionDto>>;
    getQuestionPerformance(examId: string): Promise<IpcResult<QuestionPerformanceDto[]>>;
    getSkillPerformance(examId: string): Promise<IpcResult<SkillPerformanceDto[]>>;
    getStudentResult(submissionId: string): Promise<IpcResult<StudentExamResultDto>>;
    listStudentResults(examId: string): Promise<IpcResult<StudentExamResultDto[]>>;
  };
  assistant: {
    createSession(input?: CreateSessionInput): Promise<IpcResult<AssistantSession>>;
    listSessions(): Promise<IpcResult<AssistantSession[]>>;
    getSession(sessionId: string): Promise<IpcResult<AssistantSession>>;
    deleteSession(sessionId: string): Promise<IpcResult<void>>;
    sendMessage(input: SendMessageInput): Promise<IpcResult<AssistantResponse>>;
    getHistory(sessionId: string, cursor?: string): Promise<IpcResult<ConversationHistory>>;
    confirmAction(input: ConfirmationInput): Promise<IpcResult<AssistantResponse>>;
    cancelAction(previewId: string): Promise<IpcResult<void>>;
    undoAction(input: UndoInput): Promise<IpcResult<AssistantResponse>>;
    getTools(): Promise<IpcResult<Array<{ name: string; description: string; riskLevel: string }>>>;
  };
  slides: {
    listDecks(): Promise<IpcResult<SlideDeckDto[]>>;
    getDeck(id: string): Promise<IpcResult<SlideDeckWithSlides>>;
    createDeck(input: CreateSlideDeckInput): Promise<IpcResult<SlideDeckDto>>;
    updateDeck(id: string, input: UpdateSlideDeckInput): Promise<IpcResult<SlideDeckDto>>;
    deleteDeck(id: string): Promise<IpcResult<void>>;
    addSlide(input: CreateSlideInput): Promise<IpcResult<SlideDto>>;
    updateSlide(id: string, input: UpdateSlideInput): Promise<IpcResult<SlideDto>>;
    deleteSlide(id: string): Promise<IpcResult<void>>;
    duplicateSlide(id: string): Promise<IpcResult<SlideDto>>;
    reorderSlides(input: ReorderSlidesInput): Promise<IpcResult<void>>;
    addBlock(input: CreateSlideBlockInput): Promise<IpcResult<SlideBlockDto>>;
    updateBlock(id: string, input: UpdateSlideBlockInput): Promise<IpcResult<SlideBlockDto>>;
    deleteBlock(id: string): Promise<IpcResult<void>>;
    reorderBlocks(input: ReorderSlideBlocksInput): Promise<IpcResult<void>>;
    moveBlock(input: MoveSlideBlockInput): Promise<IpcResult<SlideBlockDto>>;
    getPresentation(deckId: string): Promise<IpcResult<SlidePresentation>>;
  };
  curriculumLibrary: {
    list(filter?: CurriculumLibraryFilter): Promise<IpcResult<SourceDocumentDto[]>>;
    listGrouped(): Promise<IpcResult<CurriculumGradeGroup[]>>;
    import(input: ImportCurriculumLibraryInput): Promise<IpcResult<SourceDocumentDto>>;
    update(input: UpdateCurriculumLibraryInput): Promise<IpcResult<SourceDocumentDto>>;
    delete(id: string): Promise<IpcResult<void>>;
    get(id: string): Promise<IpcResult<SourceDocumentDto>>;
    viewPdf(request: { id: string; page?: number }): Promise<IpcResult<{ filePath: string; pageCount: number }>>;
    openExternal(id: string): Promise<IpcResult<void>>;
    browseAndImport(): Promise<IpcResult<{ filePath: string; fileName: string } | null>>;
    resolveDataUrl(id: string): Promise<IpcResult<{ dataUrl: string; pageCount: number; title: string }>>;
  };
  tibyan: {
    createTaskSession(input: { taskType: string; title?: string }): Promise<IpcResult<AssistantSession>>;
    listHistory(): Promise<IpcResult<AssistantSession[]>>;
    getHistoryItem(sessionId: string): Promise<IpcResult<ConversationHistory>>;
    deleteHistoryItem(sessionId: string): Promise<IpcResult<void>>;
    renameHistoryItem(sessionId: string, title: string): Promise<IpcResult<void>>;
  };
  ai: {
    generateReview(input: ReviewGenerationRequest): Promise<IpcResult<ReviewArtifactDto>>;
    generateNotes(input: NotesGenerationRequest): Promise<IpcResult<NotesArtifactDto>>;
    listReviews(): Promise<IpcResult<ReviewArtifactDto[]>>;
    getReview(id: string): Promise<IpcResult<ReviewArtifactDto | null>>;
    saveReview(id: string, content: ReviewGenerationResult): Promise<IpcResult<ReviewArtifactDto>>;
    listNotes(): Promise<IpcResult<NotesArtifactDto[]>>;
    getNotes(id: string): Promise<IpcResult<NotesArtifactDto | null>>;
    saveNotes(id: string, content: NotesGenerationResult): Promise<IpcResult<NotesArtifactDto>>;
    generateSlides(input: SlidesGenerationRequest): Promise<IpcResult<SlideDeckWithSlides>>;
    generateExam(input: ExamGenerationRequest): Promise<IpcResult<GeneratedExamContent>>;
  };
}


declare global {
  interface Window {
    tibyan: TibyanApi;
  }
}
