import { ipcMain, type BrowserWindow } from 'electron';
import {
  GeminiConfigurationStatusSchema,
  GeminiCredentialInputSchema,
  GeminiCredentialDeleteInputSchema,
  IPC_CHANNELS,
} from '@tibyan/contracts';
import { requirePermission, GeminiExamProvider } from '@tibyan/core';
import { successResult, errorResult, GeminiConnectionResultSchema } from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall, mapGeminiConnectionError } from './errors.js';
import { validateIpcSender } from '../security.js';

/** Narrow Main-only credential boundary. No handler ever reads or returns a credential. */
export function registerGeminiIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  ipcMain.handle(IPC_CHANNELS.GEMINI_GET_STATUS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      runtime.requireAuthenticatedActor();
      return GeminiConfigurationStatusSchema.parse(runtime.geminiCredentialService.status());
    });
  });

  ipcMain.handle(IPC_CHANNELS.GEMINI_SET_CREDENTIAL, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      const actor = runtime.requireAuthenticatedActor();
      requirePermission(actor.role, actor.permissions ?? [], 'SETTINGS_WRITE');
      if (actor.role !== 'OWNER') throw new Error('PERMISSION_DENIED');
      const input = GeminiCredentialInputSchema.parse(payload);
      runtime.ownerPasswordService.requireValid(input.ownerPassword);
      runtime.geminiCredentialService.save(input.apiKey);
      return undefined;
    });
  });

  ipcMain.handle(IPC_CHANNELS.GEMINI_DELETE_CREDENTIAL, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      const actor = runtime.requireAuthenticatedActor();
      requirePermission(actor.role, actor.permissions ?? [], 'SETTINGS_WRITE');
      if (actor.role !== 'OWNER') throw new Error('PERMISSION_DENIED');
      runtime.ownerPasswordService.requireValid(GeminiCredentialDeleteInputSchema.parse(payload).ownerPassword);
      runtime.geminiCredentialService.clear();
      return undefined;
    });
  });

  ipcMain.handle(IPC_CHANNELS.GEMINI_TEST_CONNECTION, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    try {
      const actor = runtime.requireAuthenticatedActor();
      requirePermission(actor.role, actor.permissions ?? [], 'SETTINGS_WRITE');
      const key = runtime.geminiCredentialService.get();
      if (!key) return errorResult('AI_NOT_CONFIGURED', 'لم يتم إعداد مفتاح تِبيان الذكي.');
      await new GeminiExamProvider().testConnection(key);
      return successResult(GeminiConnectionResultSchema.parse({ message: 'تم الاتصال بخدمة تِبيان بنجاح.' }));
    } catch (error) {
      return mapGeminiConnectionError(error);
    }
  });
}

export function unregisterGeminiIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.GEMINI_GET_STATUS);
  ipcMain.removeHandler(IPC_CHANNELS.GEMINI_SET_CREDENTIAL);
  ipcMain.removeHandler(IPC_CHANNELS.GEMINI_DELETE_CREDENTIAL);
  ipcMain.removeHandler(IPC_CHANNELS.GEMINI_TEST_CONNECTION);
}
