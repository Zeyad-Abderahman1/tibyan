import { ipcMain, type BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerCaptureIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  function getCaptureService() {
    runtime.requireActiveAcademicYear();
    if (!runtime.captureService) {
      throw new Error('SERVICE_UNAVAILABLE: Capture service is not initialized');
    }
    return runtime.captureService;
  }

  ipcMain.handle(IPC_CHANNELS.CAPTURE_CREATE_SESSION, async (event, input) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.createSession(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_LIST_SESSIONS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.listSessions();
    });
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_GET_SESSION, async (event, id: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.getSession(id);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_DELETE_SESSION, async (event, id: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.deleteSession(id, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_IMPORT_FILES, async (event, input) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.importFiles(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_LIST_SUBMISSIONS, async (event, sessionId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.listSubmissions(sessionId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_GET_SUBMISSION, async (event, id: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.getSubmission(id);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_ASSOCIATE_SUBMISSION, async (event, input) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.associateSubmission(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_LIST_PAGES, async (event, submissionId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.listPages(submissionId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_ROTATE_PAGE, async (event, input) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.rotatePage(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_EXCLUDE_PAGE, async (event, input) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.excludePage(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_REASSIGN_PAGE, async (event, input) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.reassignPage(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_CHECK_DUPLICATE, async (event, fingerprint: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getCaptureService();
      return service.checkDuplicate(fingerprint);
    });
  });
}

export function unregisterCaptureIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_CREATE_SESSION);
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_LIST_SESSIONS);
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_GET_SESSION);
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_DELETE_SESSION);
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_IMPORT_FILES);
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_LIST_SUBMISSIONS);
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_GET_SUBMISSION);
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_ASSOCIATE_SUBMISSION);
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_LIST_PAGES);
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_ROTATE_PAGE);
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_EXCLUDE_PAGE);
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_REASSIGN_PAGE);
  ipcMain.removeHandler(IPC_CHANNELS.CAPTURE_CHECK_DUPLICATE);
}
