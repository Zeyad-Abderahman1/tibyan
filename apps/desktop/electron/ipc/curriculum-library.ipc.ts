import { ipcMain, shell, dialog, type BrowserWindow } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import {
  IPC_CHANNELS,
  CurriculumLibraryFilterSchema,
  UpdateCurriculumLibraryInputSchema,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerCurriculumLibraryIpcHandlers(
  runtime: Runtime,
  mainWindow: BrowserWindow | null
): void {
  // 1. List all curriculum library documents
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_LIST, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const filter = payload ? CurriculumLibraryFilterSchema.parse(payload) : undefined;
      return runtime.curriculumLibraryService.list(filter);
    });
  });

  // 2. List grouped by grade
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_LIST_GROUPED, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      return runtime.curriculumLibraryService.listGrouped();
    });
  });

  // 3. Import curriculum document
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_IMPORT, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      return runtime.curriculumLibraryService.importCurriculum(payload, actor);
    });
  });

  // 4. Update curriculum metadata
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_UPDATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const validated = UpdateCurriculumLibraryInputSchema.parse(payload);
      const { id, ...input } = validated;
      return runtime.curriculumLibraryService.update(id, input as any, actor);
    });
  });

  // 5. Delete curriculum document
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_DELETE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      runtime.curriculumLibraryService.delete(id, actor);
    });
  });

  // 6. Get single document
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_GET, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      return runtime.curriculumLibraryService.get(id);
    });
  });

  // 7. View PDF (returns resolved file path)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_VIEW_PDF, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const { id } = z
        .object({
          id: z.string().uuid(),
          page: z.number().int().positive().optional(),
        })
        .parse(payload);
      return runtime.curriculumLibraryService.resolvePdfPath(id);
    });
  });

  // 8. Open document in external viewer
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_OPEN_EXTERNAL, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      const { filePath } = runtime.curriculumLibraryService.resolvePdfPath(id);
      await shell.openPath(filePath);
    });
  });

  // 9. Browse and import — opens native file picker, returns selected file info
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_BROWSE_AND_IMPORT, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const result = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            title: 'اختر ملف المنهج',
            properties: ['openFile'],
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
          })
        : { canceled: true, filePaths: [] };

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const filePath = path.resolve(result.filePaths[0]!);
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        throw new Error('الملف المحدد غير صالح');
      }

      const fileName = path.basename(filePath);
      return { filePath, fileName };
    });
  });

  // 10. Resolve PDF as data URL for in-app viewing
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_RESOLVE_DATA_URL, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      const doc = runtime.curriculumLibraryService.get(id);
      const { filePath, pageCount } = runtime.curriculumLibraryService.resolvePdfPath(id);

      const fileBuffer = fs.readFileSync(filePath);
      const base64 = fileBuffer.toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64}`;

      return { dataUrl, pageCount, title: doc.title };
    });
  });
}

export function unregisterCurriculumLibraryIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_LIBRARY_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_LIBRARY_LIST_GROUPED);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_LIBRARY_IMPORT);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_LIBRARY_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_LIBRARY_DELETE);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_LIBRARY_GET);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_LIBRARY_VIEW_PDF);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_LIBRARY_OPEN_EXTERNAL);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_LIBRARY_BROWSE_AND_IMPORT);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_LIBRARY_RESOLVE_DATA_URL);
}
