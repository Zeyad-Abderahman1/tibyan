import { ipcMain, type BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerDashboardIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  // 1. Get Today Dashboard (protected: strictly read-only, never mutates state)
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_GET_TODAY, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(() => {
      runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      return runtime.dashboardService!.getTodayDashboard();
    });
  });
}

export function unregisterDashboardIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.DASHBOARD_GET_TODAY);
}
