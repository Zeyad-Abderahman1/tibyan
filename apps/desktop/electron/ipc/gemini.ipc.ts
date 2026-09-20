import { ipcMain, type BrowserWindow } from 'electron';
import {
  GeminiConfigurationStatusSchema,
  GeminiCredentialInputSchema,
  IPC_CHANNELS,
} from '@tibyan/contracts';
import { requirePermission } from '@tibyan/core';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

/** Narrow Main-only credential boundary. No handler ever reads or returns a credential. */
export function registerGeminiIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  ipcMain.handle(IPC_CHANNELS.GEMINI_GET_STATUS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => GeminiConfigurationStatusSchema.parse(runtime.geminiCredentialService.status()));
  });

  ipcMain.handle(IPC_CHANNELS.GEMINI_SET_CREDENTIAL, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      const actor = runtime.requireAuthenticatedActor();
      requirePermission(actor.role, actor.permissions ?? [], 'SETTINGS_WRITE');
      runtime.geminiCredentialService.save(GeminiCredentialInputSchema.parse(payload).apiKey);
      return undefined;
    });
  });

  ipcMain.handle(IPC_CHANNELS.GEMINI_DELETE_CREDENTIAL, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      const actor = runtime.requireAuthenticatedActor();
      requirePermission(actor.role, actor.permissions ?? [], 'SETTINGS_WRITE');
      runtime.geminiCredentialService.clear();
      return undefined;
    });
  });
}

export function unregisterGeminiIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.GEMINI_GET_STATUS);
  ipcMain.removeHandler(IPC_CHANNELS.GEMINI_SET_CREDENTIAL);
  ipcMain.removeHandler(IPC_CHANNELS.GEMINI_DELETE_CREDENTIAL);
}
