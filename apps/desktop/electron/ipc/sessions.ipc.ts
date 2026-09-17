import { ipcMain, type BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  ListSessionsByDateRangeSchema,
  RescheduleSessionSchema,
  CancelSessionSchema,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerSessionsIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  // 1. List sessions by date range (protected)
  ipcMain.handle(IPC_CHANNELS.SESSIONS_LIST_BY_RANGE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = ListSessionsByDateRangeSchema.parse(payload);
      return runtime.sessionService!.listSessionsForDateRange(validated, actor);
    });
  });

  // 2. Reschedule session (protected: requires SESSIONS_MANAGE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.SESSIONS_RESCHEDULE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = RescheduleSessionSchema.parse(payload);
      return runtime.sessionService!.rescheduleSession(validated, actor);
    });
  });

  // 3. Cancel session (protected: requires SESSIONS_MANAGE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.SESSIONS_CANCEL, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = CancelSessionSchema.parse(payload);
      return runtime.sessionService!.cancelSession(validated, actor);
    });
  });
}

export function unregisterSessionsIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.SESSIONS_LIST_BY_RANGE);
  ipcMain.removeHandler(IPC_CHANNELS.SESSIONS_RESCHEDULE);
  ipcMain.removeHandler(IPC_CHANNELS.SESSIONS_CANCEL);
}
