import { ipcMain, type BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  CreateBackupSchema,
  type BackupHistoryItemDto,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

function toSafeBackupItem(r: {
  id: string;
  backupDate: string;
  status: string;
  sizeBytes: number;
  academicYearsIncluded?: string[];
  academicYearsIncludedJson?: string;
  createdAt: string;
}): BackupHistoryItemDto {
  let academicYearsIncluded: string[] = [];
  if (Array.isArray(r.academicYearsIncluded)) {
    academicYearsIncluded = r.academicYearsIncluded;
  } else if (r.academicYearsIncludedJson) {
    try {
      academicYearsIncluded = JSON.parse(r.academicYearsIncludedJson);
    } catch {
      academicYearsIncluded = [];
    }
  }
  return {
    id: r.id,
    backupDate: r.backupDate,
    status: r.status as 'SUCCESS' | 'FAILED',
    sizeBytes: r.sizeBytes,
    academicYearsIncluded,
    createdAt: r.createdAt,
  };
}

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
      const record = await runtime.backupService.createManualBackup(actor);
      return toSafeBackupItem(record);
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

  // 3. List recent backup records (protected: returns safe projection without host backupPath)
  ipcMain.handle(IPC_CHANNELS.BACKUP_LIST_RECORDS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(() => {
      runtime.requireAuthenticatedActor();
      const records = runtime.backupRecordRepo.listRecent(50);
      return records.map(toSafeBackupItem);
    });
  });
}

export function unregisterBackupIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.BACKUP_TRIGGER);
  ipcMain.removeHandler(IPC_CHANNELS.BACKUP_GET_STATUS);
  ipcMain.removeHandler(IPC_CHANNELS.BACKUP_LIST_RECORDS);
}
