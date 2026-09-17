import { ipcMain, type BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  CreateBackupSchema,
  type BackupRecordDto,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerBackupIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  // 1. Trigger manual backup (protected: requires BACKUP_MANAGE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.BACKUP_TRIGGER, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      if (payload) {
        CreateBackupSchema.parse(payload);
      }
      return runtime.backupService.createManualBackup(actor);
    });
  });

  // 2. Get backup status (protected)
  ipcMain.handle(IPC_CHANNELS.BACKUP_GET_STATUS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(() => {
      runtime.requireAuthenticatedActor();
      return runtime.backupService.getBackupStatus();
    });
  });

  // 3. List recent backup records (protected)
  ipcMain.handle(IPC_CHANNELS.BACKUP_LIST_RECORDS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(() => {
      runtime.requireAuthenticatedActor();
      const records = runtime.backupRecordRepo.listRecent(50);
      const dtos: BackupRecordDto[] = records.map((r) => {
        let academicYearsIncluded: string[] = [];
        try {
          academicYearsIncluded = JSON.parse(r.academicYearsIncludedJson);
        } catch {
          academicYearsIncluded = [];
        }
        return {
          id: r.id,
          backupPath: r.backupPath,
          backupDate: r.backupDate,
          status: r.status as 'SUCCESS' | 'FAILED',
          sizeBytes: r.sizeBytes,
          academicYearsIncluded,
          createdAt: r.createdAt,
        };
      });
      return dtos;
    });
  });
}

export function unregisterBackupIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.BACKUP_TRIGGER);
  ipcMain.removeHandler(IPC_CHANNELS.BACKUP_GET_STATUS);
  ipcMain.removeHandler(IPC_CHANNELS.BACKUP_LIST_RECORDS);
}
