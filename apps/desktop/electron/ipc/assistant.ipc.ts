import { ipcMain, type BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  SendMessageInputSchema,
  CreateSessionInputSchema,
  ConfirmationInputSchema,
  UndoInputSchema,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';
import { archiveLessonPlanWithUndo, undoArchivedLessonPlan } from './assistant-lesson-plan-undo.js';

let orchestrator: import('@tibyan/core').AssistantOrchestrator | null = null;

function getOrchestrator(runtime: Runtime): import('@tibyan/core').AssistantOrchestrator {
  if (!orchestrator) {
    const { AssistantOrchestrator } = require('@tibyan/core');
    orchestrator = new AssistantOrchestrator({
      systemDb: runtime.systemDb,
      geminiCredentialService: runtime.geminiCredentialService,
      getActiveAcademicYear: () => runtime.activeAcademicYear ? { id: runtime.activeAcademicYear.id, name: runtime.activeAcademicYear.name } : null,
      resolveEntityLabel: async (scope: string, entityId: string) => {
        try {
          if (scope === 'student' && runtime.studentService) {
            const actor = runtime.requireAuthenticatedActor();
            const s = await runtime.studentService.getStudentById(entityId, actor);
            return s?.fullName ?? null;
          }
          if (scope === 'group' && runtime.groupService) {
            const actor = runtime.requireAuthenticatedActor();
            const g = await runtime.groupService.getGroupById(entityId, actor);
            return g?.name ?? null;
          }
          if (scope === 'exam' && runtime.examService) {
            const e = runtime.examService.getExam(entityId);
            return e?.title ?? null;
          }
          return null;
        } catch {
          return null;
        }
      },
      buildToolPreview: async (toolName: string, input: Record<string, unknown>, _ctx: import('@tibyan/core').ToolExecutionContext) => {
        const items: import('@tibyan/core').PreviewItem[] = [];
        if (toolName === 'create_lesson_plan') {
          items.push({
            entityLabel: (input.title as string) ?? 'خطة درس جديدة',
            changeKind: 'create',
            changes: [{ field: 'title', label: 'العنوان', after: input.title }],
          });
        } else if (toolName === 'enroll_student') {
          items.push({
            entityLabel: 'تسجيل طالب في مجموعة',
            changeKind: 'create',
            changes: [
              { field: 'studentId', label: 'الطالب', after: input.studentId },
              { field: 'groupId', label: 'المجموعة', after: input.groupId },
            ],
          });
        } else if (toolName === 'end_enrollment') {
          items.push({
            entityLabel: 'إنهاء تسجيل',
            changeKind: 'delete',
            changes: [{ field: 'enrollmentId', label: 'التسجيل', after: input.enrollmentId }],
            irreversible: true,
          });
        } else {
          items.push({
            entityLabel: toolName,
            changeKind: 'update',
            changes: [],
          });
        }
        return items;
      },
      executeTool: async (toolName: string, input: Record<string, unknown>, ctx: import('@tibyan/core').ToolExecutionContext) => {
        const actor = {
          userId: ctx.actorUserId,
          fullName: ctx.actorName,
          role: ctx.actorRole as any,
          permissions: ctx.permissions as any[],
        };
        try {
          if (toolName === 'find_students' && runtime.studentService) {
            const result = await runtime.studentService.searchStudents({ searchQuery: input.query as string }, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_student_details' && runtime.studentService) {
            const result = await runtime.studentService.getStudentById(input.studentId as string, actor);
            return { success: true, data: result };
          }
          if (toolName === 'list_groups' && runtime.groupService) {
            const result = await runtime.groupService.listGroups({}, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_group_enrollments' && runtime.enrollmentService) {
            const result = await runtime.enrollmentService.listGroupEnrollments(input.groupId as string, false, actor);
            return { success: true, data: result };
          }
          if (toolName === 'list_exams' && runtime.examService) {
            const result = runtime.examService.listExams();
            return { success: true, data: result };
          }
          if (toolName === 'get_exam_analytics' && runtime.analyticsService) {
            const result = runtime.analyticsService.getExamSummary(input.examId as string);
            return { success: true, data: result };
          }
          if (toolName === 'get_question_bank_stats' && runtime.questionBankService) {
            const questions = runtime.questionBankService.listQuestions();
            const byType: Record<string, number> = {};
            for (const q of questions) {
              byType[q.questionType] = (byType[q.questionType] ?? 0) + 1;
            }
            return { success: true, data: { totalQuestions: questions.length, byType } };
          }
          if (toolName === 'list_lesson_plans' && runtime.lessonPlannerService) {
            const result = runtime.lessonPlannerService.listLessonPlans();
            return { success: true, data: result };
          }
          if (toolName === 'get_dashboard_today' && runtime.dashboardService) {
            const result = await runtime.dashboardService.getTodayDashboard();
            return { success: true, data: result };
          }
          if (toolName === 'get_session_attendance' && runtime.attendanceService) {
            const result = await runtime.attendanceService.getSessionRoster(input.sessionId as string, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_financial_summary' && runtime.financeService) {
            const result = await runtime.financeService.getStudentFinancialSummary(input.studentId as string);
            return { success: true, data: result };
          }
          if (toolName === 'create_lesson_plan' && runtime.lessonPlannerService) {
            const result = runtime.lessonPlannerService.createLessonPlan(input as any, actor);
            return { success: true, data: result, affectedEntities: [{ entityType: 'lesson-plan', entityId: result.id, label: result.title }] };
          }
          if (toolName === 'update_lesson_plan' && runtime.lessonPlannerService) {
            const { planId, ...rest } = input;
            const result = runtime.lessonPlannerService.updateLessonPlan(planId as string, rest as any, actor);
            return { success: true, data: result, affectedEntities: [{ entityType: 'lesson-plan', entityId: result.id, label: result.title }] };
          }
          if (toolName === 'add_student_note' && runtime.studentService) {
            const result = await runtime.studentService.addStudentNote(input as any, actor);
            return { success: true, data: result };
          }
          if (toolName === 'record_attendance' && runtime.attendanceService) {
            const result = await runtime.attendanceService.recordAttendance(input as any, actor);
            return { success: true, data: result };
          }
          if (toolName === 'create_session_reflection' && runtime.sessionReflectionService) {
            const result = runtime.sessionReflectionService.createReflection(input as any, actor);
            return { success: true, data: result };
          }
          if (toolName === 'update_group_curriculum_progress' && runtime.curriculumService) {
            const result = runtime.curriculumService.updateGroupNodeProgress(input as any, actor);
            return { success: true, data: result };
          }
          if (toolName === 'archive_lesson_plan' && runtime.lessonPlannerService) {
            const { result, undoSnapshot } = archiveLessonPlanWithUndo(runtime.lessonPlannerService, input.planId as string, actor);
            return { success: true, data: result, undoSnapshot };
          }
          if (toolName === 'enroll_student' && runtime.enrollmentService) {
            const result = await runtime.enrollmentService.enrollStudent(input as any, actor);
            return { success: true, data: result };
          }
          if (toolName === 'end_enrollment' && runtime.enrollmentService) {
            const result = await runtime.enrollmentService.endEnrollment(input as any, actor);
            return { success: true, data: result };
          }
          if (toolName === 'update_student' && runtime.studentService) {
            const { studentId, ...rest } = input;
            const result = await runtime.studentService.updateStudent({ studentId: studentId as string, ...rest } as any, actor);
            return { success: true, data: result };
          }
          return { success: false, error: 'الأداة غير مدعومة' };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : 'خطأ غير متوقع' };
        }
      },
      undoTool: async (_receiptId: string, snapshot: unknown) => {
        try {
          if (!runtime.lessonPlannerService) throw new Error('خدمة خطط الدروس غير متاحة');
          const actor = runtime.requireAuthenticatedActor();
          undoArchivedLessonPlan(runtime.lessonPlannerService, snapshot, actor);
          return { success: true };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'تعذر التراجع' };
        }
      },
    });
  }
  return orchestrator!;
}

export function registerAssistantIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  ipcMain.handle(IPC_CHANNELS.ASSISTANT_CREATE_SESSION, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      const actor = runtime.requireAuthenticatedActor();
      const input = payload ? CreateSessionInputSchema.parse(payload) : {};
      const orch = getOrchestrator(runtime);
      return orch.createSession(actor.userId, input.title, input.context?.scope, input.context?.entityId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_LIST_SESSIONS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      const actor = runtime.requireAuthenticatedActor();
      return getOrchestrator(runtime).listSessions(actor.userId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_GET_SESSION, async (event, sessionId) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      const session = getOrchestrator(runtime).getSession(sessionId);
      if (!session) throw new Error('SESSION_NOT_FOUND');
      return session;
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_DELETE_SESSION, async (event, sessionId) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      getOrchestrator(runtime).deleteSession(sessionId);
      return undefined;
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_SEND_MESSAGE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const input = SendMessageInputSchema.parse(payload);
      const orch = getOrchestrator(runtime);
      return orch.sendMessage(
        input.sessionId,
        input.content,
        actor.userId,
        actor.fullName,
        actor.role,
        actor.permissions ?? [],
        input.context?.scope,
        input.context?.entityId,
      );
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_GET_HISTORY, async (event, sessionId, cursor) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      const messages = getOrchestrator(runtime).getHistory(sessionId, cursor);
      return { sessionId, messages, hasMore: messages.length === 100 };
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_CONFIRM_ACTION, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const input = ConfirmationInputSchema.parse(payload);
      const orch = getOrchestrator(runtime);
      const session = orch.listSessions(actor.userId)[0];
      if (!session) throw new Error('SESSION_NOT_FOUND');
      return orch.confirmAction(
        input.previewId,
        input.confirmed,
        actor.userId,
        actor.fullName,
        actor.role,
        actor.permissions ?? [],
        session.id,
      );
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_CANCEL_ACTION, async (event, previewId) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      getOrchestrator(runtime).cancelAction(previewId);
      return undefined;
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_UNDO_ACTION, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const input = UndoInputSchema.parse(payload);
      const orch = getOrchestrator(runtime);
      const session = orch.listSessions(actor.userId)[0];
      if (!session) throw new Error('SESSION_NOT_FOUND');
      return orch.undoAction(input.receiptId, input.undoToken, actor.userId, session.id);
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_GET_TOOLS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      return getOrchestrator(runtime).getTools();
    });
  });
}

export function unregisterAssistantIpcHandlers(): void {
  Object.values(IPC_CHANNELS).filter((ch) => typeof ch === 'string' && ch.startsWith('assistant:')).forEach((ch) => {
    ipcMain.removeHandler(ch as string);
  });
  orchestrator = null;
}
