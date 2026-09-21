import { ipcMain, type BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerAnalyticsIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  function getAnalyticsService() {
    runtime.requireActiveAcademicYear();
    if (!runtime.analyticsService) {
      throw new Error('SERVICE_UNAVAILABLE: Analytics service is not initialized');
    }
    return runtime.analyticsService;
  }

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_GET_EXAM_SUMMARY, async (event, examId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getAnalyticsService();
      return service.getExamSummary(examId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_GET_SCORE_DISTRIBUTION, async (event, examId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getAnalyticsService();
      return service.getScoreDistribution(examId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_GET_QUESTION_PERFORMANCE, async (event, examId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getAnalyticsService();
      return service.getQuestionPerformance(examId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_GET_SKILL_PERFORMANCE, async (event, examId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getAnalyticsService();
      return service.getSkillPerformance(examId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_GET_STUDENT_RESULT, async (event, submissionId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getAnalyticsService();
      return service.getStudentResult(submissionId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_LIST_STUDENT_RESULTS, async (event, examId: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const service = getAnalyticsService();
      return service.listStudentResults(examId);
    });
  });
}

export function unregisterAnalyticsIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.ANALYTICS_GET_EXAM_SUMMARY);
  ipcMain.removeHandler(IPC_CHANNELS.ANALYTICS_GET_SCORE_DISTRIBUTION);
  ipcMain.removeHandler(IPC_CHANNELS.ANALYTICS_GET_QUESTION_PERFORMANCE);
  ipcMain.removeHandler(IPC_CHANNELS.ANALYTICS_GET_SKILL_PERFORMANCE);
  ipcMain.removeHandler(IPC_CHANNELS.ANALYTICS_GET_STUDENT_RESULT);
  ipcMain.removeHandler(IPC_CHANNELS.ANALYTICS_LIST_STUDENT_RESULTS);
}
