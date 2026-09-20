import { ipcMain, shell, type BrowserWindow } from 'electron';
import { z } from 'zod';
import {
  IPC_CHANNELS,
  ImportSourceDocumentSchema,
  UpdateSourceDocumentSchema,
  CreateSourceReferenceSchema,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerPdfSourceIpcHandlers(
  runtime: Runtime,
  mainWindow: BrowserWindow | null
): void {
  // 1. List Source Documents
  ipcMain.handle(IPC_CHANNELS.PDF_SOURCES_LIST, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const catalogId = z.string().uuid().optional().parse(payload);
      return runtime.pdfSourceService.listSources(catalogId);
    });
  });

  // 2. Get Source Document
  ipcMain.handle(IPC_CHANNELS.PDF_SOURCES_GET, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      return runtime.pdfSourceService.getSource(id);
    });
  });

  // 3. Import Source Document
  ipcMain.handle(IPC_CHANNELS.PDF_SOURCES_IMPORT, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const validated = ImportSourceDocumentSchema.parse(payload);
      return runtime.pdfSourceService.importSource(validated, actor);
    });
  });

  // 4. Update Source Document
  ipcMain.handle(IPC_CHANNELS.PDF_SOURCES_UPDATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const { id, input } = z
        .object({
          id: z.string().uuid(),
          input: UpdateSourceDocumentSchema.omit({ id: true }),
        })
        .parse(payload);
      return runtime.pdfSourceService.updateSource(id, { id, ...input }, actor);
    });
  });

  // 5. Delete Source Document
  ipcMain.handle(IPC_CHANNELS.PDF_SOURCES_DELETE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      runtime.pdfSourceService.deleteSource(id, actor);
    });
  });

  // 6. List Page References
  ipcMain.handle(IPC_CHANNELS.PDF_REFERENCES_LIST, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const sourceDocumentId = z.string().uuid().optional().parse(payload);
      return runtime.pdfSourceService.listReferences(sourceDocumentId);
    });
  });

  // 7. Create Page Reference
  ipcMain.handle(IPC_CHANNELS.PDF_REFERENCES_CREATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const validated = CreateSourceReferenceSchema.parse(payload);
      return runtime.pdfSourceService.createReference(validated, actor);
    });
  });

  // 8. Delete Page Reference
  ipcMain.handle(IPC_CHANNELS.PDF_REFERENCES_DELETE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      runtime.pdfSourceService.deleteReference(id, actor);
    });
  });

  // 9. Open Document Offline
  ipcMain.handle(IPC_CHANNELS.PDF_SOURCES_OPEN, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const { id } = z
        .object({
          id: z.string().uuid(),
          page: z.number().int().positive().optional(),
        })
        .parse(payload);
      const doc = await runtime.pdfSourceService.getSource(id);
      const fullPath = runtime.pdfSourceService.resolveAbsolutePath(doc.filePath);
      await shell.openPath(fullPath);
    });
  });
}

export function unregisterPdfSourceIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.PDF_SOURCES_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.PDF_SOURCES_GET);
  ipcMain.removeHandler(IPC_CHANNELS.PDF_SOURCES_IMPORT);
  ipcMain.removeHandler(IPC_CHANNELS.PDF_SOURCES_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.PDF_SOURCES_DELETE);
  ipcMain.removeHandler(IPC_CHANNELS.PDF_REFERENCES_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.PDF_REFERENCES_CREATE);
  ipcMain.removeHandler(IPC_CHANNELS.PDF_REFERENCES_DELETE);
}
