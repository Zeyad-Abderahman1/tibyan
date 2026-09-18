import { ipcMain, type BrowserWindow } from 'electron';
import { z } from 'zod';
import {
  IPC_CHANNELS,
  RecordAttendanceInputSchema,
  BatchRecordAttendanceInputSchema,
  CalendarDateSchema,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerAttendanceIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  // 1. Get session roster
  ipcMain.handle(IPC_CHANNELS.ATTENDANCE_GET_ROSTER, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const sessionId = z.string().uuid('Invalid session ID format').parse(payload);
      return runtime.attendanceService!.getSessionRoster(sessionId, actor);
    });
  });

  // 2. Record attendance (single)
  ipcMain.handle(IPC_CHANNELS.ATTENDANCE_RECORD, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = RecordAttendanceInputSchema.parse(payload);
      return runtime.attendanceService!.recordAttendance(validated, actor);
    });
  });

  // 3. Batch record attendance
  ipcMain.handle(IPC_CHANNELS.ATTENDANCE_BATCH_RECORD, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = BatchRecordAttendanceInputSchema.parse(payload);
      return runtime.attendanceService!.batchRecordAttendance(validated, actor);
    });
  });

  // 4. Get End-of-Day Follow-Up
  ipcMain.handle(IPC_CHANNELS.ATTENDANCE_GET_END_OF_DAY, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const date = CalendarDateSchema.parse(payload);
      return runtime.attendanceService!.getEndOfDayFollowUp(date, actor);
    });
  });
}

export function unregisterAttendanceIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.ATTENDANCE_GET_ROSTER);
  ipcMain.removeHandler(IPC_CHANNELS.ATTENDANCE_RECORD);
  ipcMain.removeHandler(IPC_CHANNELS.ATTENDANCE_BATCH_RECORD);
  ipcMain.removeHandler(IPC_CHANNELS.ATTENDANCE_GET_END_OF_DAY);
}
