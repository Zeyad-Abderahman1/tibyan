import { ipcMain, type BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerGradingIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  function getGradingService() {
    runtime.requireActiveAcademicYear();
    if (!runtime.gradingService) {
      throw new Error('SERVICE_UNAVAILABLE: Grading service is not initialized');
    }
    return runtime.gradingService;
  }

  ipcMain.handle(IPC_CHANNELS.GRADING_EXTRACT_ANSWERS, async (event, submissionId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getGradingService();
      return service.extractAnswers(submissionId, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.GRADE_SUBMISSION, async (event, input) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getGradingService();
      return service.gradeSubmission(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.GRADE_SUBMISSION_AI, async (event, input) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getGradingService();
      return service.gradeSubmissionAi(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.GRADE_GET_DECISIONS, async (event, submissionId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getGradingService();
      return service.getDecisions(submissionId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.GRADE_OVERRIDE_DECISION, async (event, input) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getGradingService();
      return service.overrideDecision(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.GRADE_REVIEW_ANSWER, async (event, input) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getGradingService();
      return service.reviewAnswer(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.GRADE_FINALIZE, async (event, input) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getGradingService();
      return service.finalize(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.GRADE_REGRADE, async (event, input) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getGradingService();
      return service.regrade(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.GRADE_GET_RUNS, async (event, submissionId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getGradingService();
      return service.getRuns(submissionId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.GRADE_GET_SUBMISSION_STATUS, async (event, submissionId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getGradingService();
      return service.getSubmissionStatus(submissionId);
    });
  });
}

export function unregisterGradingIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.GRADING_EXTRACT_ANSWERS);
  ipcMain.removeHandler(IPC_CHANNELS.GRADE_SUBMISSION);
  ipcMain.removeHandler(IPC_CHANNELS.GRADE_SUBMISSION_AI);
  ipcMain.removeHandler(IPC_CHANNELS.GRADE_GET_DECISIONS);
  ipcMain.removeHandler(IPC_CHANNELS.GRADE_OVERRIDE_DECISION);
  ipcMain.removeHandler(IPC_CHANNELS.GRADE_REVIEW_ANSWER);
  ipcMain.removeHandler(IPC_CHANNELS.GRADE_FINALIZE);
  ipcMain.removeHandler(IPC_CHANNELS.GRADE_REGRADE);
  ipcMain.removeHandler(IPC_CHANNELS.GRADE_GET_RUNS);
  ipcMain.removeHandler(IPC_CHANNELS.GRADE_GET_SUBMISSION_STATUS);
}
