import { ipcMain, type BrowserWindow } from 'electron';
import { z } from 'zod';
import {
  IPC_CHANNELS,
  CreateLessonPlanSchema,
  UpdateLessonPlanSchema,
  LessonPlanFilterSchema,
  CreateSessionReflectionSchema,
  UpdateSessionReflectionSchema,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerLessonPlannerIpcHandlers(
  runtime: Runtime,
  mainWindow: BrowserWindow | null
): void {
  // ==========================================
  // Lesson Planner Handlers
  // ==========================================

  // 1. Create Lesson Plan
  ipcMain.handle(IPC_CHANNELS.LESSON_PLAN_CREATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = CreateLessonPlanSchema.parse(payload);
      return runtime.lessonPlannerService!.createLessonPlan(validated, actor);
    });
  });

  // 2. Update Lesson Plan
  ipcMain.handle(IPC_CHANNELS.LESSON_PLAN_UPDATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const { id, input } = z
        .object({
          id: z.string().uuid('Invalid lesson plan ID'),
          input: UpdateLessonPlanSchema,
        })
        .parse(payload);
      return runtime.lessonPlannerService!.updateLessonPlan(id, input, actor);
    });
  });

  // 3. Get Lesson Plan By ID
  ipcMain.handle(IPC_CHANNELS.LESSON_PLAN_GET, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const id = z.string().uuid('Invalid lesson plan ID').parse(payload);
      return runtime.lessonPlannerService!.getLessonPlanById(id, actor);
    });
  });

  // 4. List Lesson Plans By Curriculum Node ID
  ipcMain.handle(IPC_CHANNELS.LESSON_PLAN_LIST_BY_NODE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const nodeId = z.string().min(1).parse(payload);
      return runtime.lessonPlannerService!.listLessonPlansByNode(nodeId, actor);
    });
  });

  // 5. List Lesson Plans With Filters
  ipcMain.handle(IPC_CHANNELS.LESSON_PLAN_LIST, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const filter = payload ? LessonPlanFilterSchema.parse(payload) : undefined;
      return runtime.lessonPlannerService!.listLessonPlans(filter, actor);
    });
  });

  // 6. Archive Lesson Plan
  ipcMain.handle(IPC_CHANNELS.LESSON_PLAN_ARCHIVE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const id = z.string().uuid('Invalid lesson plan ID').parse(payload);
      return runtime.lessonPlannerService!.archiveLessonPlan(id, actor);
    });
  });

  // ==========================================
  // Session Reflection Handlers
  // ==========================================

  // 7. Create Session Reflection
  ipcMain.handle(IPC_CHANNELS.SESSION_REFLECTION_CREATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = CreateSessionReflectionSchema.parse(payload);
      return runtime.sessionReflectionService!.createReflection(validated, actor);
    });
  });

  // 8. Update Session Reflection
  ipcMain.handle(IPC_CHANNELS.SESSION_REFLECTION_UPDATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const { id, input } = z
        .object({
          id: z.string().uuid('Invalid session reflection ID'),
          input: UpdateSessionReflectionSchema,
        })
        .parse(payload);
      return runtime.sessionReflectionService!.updateReflection(id, input, actor);
    });
  });

  // 9. Get Reflection By Session ID
  ipcMain.handle(IPC_CHANNELS.SESSION_REFLECTION_GET_BY_SESSION, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const sessionId = z.string().min(1).parse(payload);
      return runtime.sessionReflectionService!.getReflectionBySessionId(sessionId, actor);
    });
  });

  // 10. Get Reflection By ID
  ipcMain.handle(IPC_CHANNELS.SESSION_REFLECTION_GET, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const id = z.string().uuid('Invalid session reflection ID').parse(payload);
      return runtime.sessionReflectionService!.getReflectionById(id, actor);
    });
  });
}

export function unregisterLessonPlannerIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.LESSON_PLAN_CREATE);
  ipcMain.removeHandler(IPC_CHANNELS.LESSON_PLAN_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.LESSON_PLAN_GET);
  ipcMain.removeHandler(IPC_CHANNELS.LESSON_PLAN_LIST_BY_NODE);
  ipcMain.removeHandler(IPC_CHANNELS.LESSON_PLAN_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.LESSON_PLAN_ARCHIVE);
  ipcMain.removeHandler(IPC_CHANNELS.SESSION_REFLECTION_CREATE);
  ipcMain.removeHandler(IPC_CHANNELS.SESSION_REFLECTION_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.SESSION_REFLECTION_GET_BY_SESSION);
  ipcMain.removeHandler(IPC_CHANNELS.SESSION_REFLECTION_GET);
}

