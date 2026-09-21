import fs from 'fs';
import { ipcMain, dialog, type BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  type ConfirmAssemblyInput,
  type AiGenerateCandidatesInput,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerExamIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  function getExamService() {
    runtime.requireActiveAcademicYear();
    if (!runtime.examService) {
      throw new Error('SERVICE_UNAVAILABLE: Exam service is not initialized');
    }
    return runtime.examService;
  }

  ipcMain.handle(IPC_CHANNELS.EXAMS_LIST, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getExamService();
      return service.listExams();
    });
  });

  ipcMain.handle(IPC_CHANNELS.EXAMS_GET, async (event, examId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getExamService();
      return service.getExam(examId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.EXAMS_PREVIEW_ASSEMBLY, async (event, blueprintInput: unknown) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getExamService();
      return service.previewAssembly(blueprintInput);
    });
  });

  ipcMain.handle(IPC_CHANNELS.EXAMS_CONFIRM_ASSEMBLY, async (event, input: ConfirmAssemblyInput) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getExamService();
      return service.confirmAssembly(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.EXAMS_UNDO_LAST_MUTATION, async (event, examId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getExamService();
      service.undoLastMutation(examId, actor);
      return undefined;
    });
  });

  ipcMain.handle(IPC_CHANNELS.EXAMS_PREVIEW_AI_CANDIDATES, async (event, input: AiGenerateCandidatesInput) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      return runtime.aiExamService.previewCandidates(input, actor);
    });
  });

  ipcMain.handle(
    IPC_CHANNELS.EXAMS_RENDER_LAYOUT,
    async (
      event,
      input: { examId: string; kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY'; versionLabel?: 'A' | 'B' | 'C' | 'D' }
    ) => {
      if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
      return safeIpcCall(async () => {
        runtime.requireAuthenticatedActor();
        const service = getExamService();
        return service.renderPrintableHtml(input.examId, input.kind, input.versionLabel);
      });
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXAMS_PRINT,
    async (
      event,
      input: { examId: string; kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY'; versionLabel?: 'A' | 'B' | 'C' | 'D' }
    ) => {
      if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
      return safeIpcCall(async () => {
        runtime.requireAuthenticatedActor();
        if (!mainWindow) throw new Error('WINDOW_NOT_FOUND: Main window is not available for printing');
        const service = getExamService();
        service.renderPrintableHtml(input.examId, input.kind, input.versionLabel);
        // Electron webContents print
        await mainWindow.webContents.print({
          silent: false,
          printBackground: true,
        });
        return { success: true };
      });
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXAMS_EXPORT_PDF,
    async (
      event,
      input: {
        examId: string;
        kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY';
        versionLabel?: 'A' | 'B' | 'C' | 'D';
        defaultFilename?: string;
        targetPath?: string;
      }
    ) => {
      if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
      return safeIpcCall(async () => {
        runtime.requireAuthenticatedActor();
        if (!mainWindow) throw new Error('WINDOW_NOT_FOUND: Main window is not available for PDF export');
        const pdfBuffer = await mainWindow.webContents.printToPDF({
          pageSize: 'A4',
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        let destinationPath = input?.targetPath;
        if (!destinationPath) {
          const defaultName = input?.defaultFilename || `اختبار_${input.examId.slice(0, 8)}.pdf`;
          const saveRes = await dialog.showSaveDialog(mainWindow, {
            title: 'تصدير الاختبار كملف PDF',
            defaultPath: defaultName,
            filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
          });
          if (saveRes.canceled || !saveRes.filePath) {
            return { canceled: true, filePath: '' };
          }
          destinationPath = saveRes.filePath;
        }

        await fs.promises.writeFile(destinationPath, pdfBuffer);
        return { canceled: false, filePath: destinationPath };
      });
    }
  );
}

export function unregisterExamIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.EXAMS_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.EXAMS_GET);
  ipcMain.removeHandler(IPC_CHANNELS.EXAMS_PREVIEW_ASSEMBLY);
  ipcMain.removeHandler(IPC_CHANNELS.EXAMS_CONFIRM_ASSEMBLY);
  ipcMain.removeHandler(IPC_CHANNELS.EXAMS_UNDO_LAST_MUTATION);
  ipcMain.removeHandler(IPC_CHANNELS.EXAMS_PREVIEW_AI_CANDIDATES);
  ipcMain.removeHandler(IPC_CHANNELS.EXAMS_RENDER_LAYOUT);
  ipcMain.removeHandler(IPC_CHANNELS.EXAMS_PRINT);
  ipcMain.removeHandler(IPC_CHANNELS.EXAMS_EXPORT_PDF);
}
