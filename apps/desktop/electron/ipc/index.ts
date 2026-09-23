import type { BrowserWindow } from 'electron';
import type { Runtime } from '../runtime.js';
import { registerAuthIpcHandlers, unregisterAuthIpcHandlers } from './auth.ipc.js';
import { registerStudentsIpcHandlers, unregisterStudentsIpcHandlers } from './students.ipc.js';
import { registerGroupsIpcHandlers, unregisterGroupsIpcHandlers } from './groups.ipc.js';
import { registerSessionsIpcHandlers, unregisterSessionsIpcHandlers } from './sessions.ipc.js';
import { registerDashboardIpcHandlers, unregisterDashboardIpcHandlers } from './dashboard.ipc.js';
import { registerBackupIpcHandlers, unregisterBackupIpcHandlers } from './backup.ipc.js';
import { registerSystemIpcHandlers, unregisterSystemIpcHandlers } from './system.ipc.js';
import { registerAttendanceIpcHandlers, unregisterAttendanceIpcHandlers } from './attendance.ipc.js';
import { registerFinanceIpcHandlers, unregisterFinanceIpcHandlers } from './finance.ipc.js';
import { registerThermalIpcHandlers, unregisterThermalIpcHandlers } from './thermal.ipc.js';
import { registerCurriculumIpcHandlers, unregisterCurriculumIpcHandlers } from './curriculum.ipc.js';
import { registerLessonPlannerIpcHandlers, unregisterLessonPlannerIpcHandlers } from './lesson-planner.ipc.js';
import { registerPdfSourceIpcHandlers, unregisterPdfSourceIpcHandlers } from './pdf-sources.ipc.js';
import { registerQuestionBankIpcHandlers, unregisterQuestionBankIpcHandlers } from './question-bank.ipc.js';
import { registerGeminiIpcHandlers, unregisterGeminiIpcHandlers } from './gemini.ipc.js';
import { registerExamIpcHandlers, unregisterExamIpcHandlers } from './exam.ipc.js';
import { registerCaptureIpcHandlers, unregisterCaptureIpcHandlers } from './capture.ipc.js';
import { registerGradingIpcHandlers, unregisterGradingIpcHandlers } from './grading.ipc.js';
import { registerAnalyticsIpcHandlers, unregisterAnalyticsIpcHandlers } from './analytics.ipc.js';
import { registerAssistantIpcHandlers, unregisterAssistantIpcHandlers } from './assistant.ipc.js';
import { registerSlideIpcHandlers, unregisterSlideIpcHandlers } from './slides.ipc.js';
import { registerCurriculumLibraryIpcHandlers, unregisterCurriculumLibraryIpcHandlers } from './curriculum-library.ipc.js';
import { registerTibyanWorkspaceIpcHandlers, unregisterTibyanWorkspaceIpcHandlers } from './tibyan-workspace.ipc.js';

/**
 * Registers all typed IPC domain handlers against the electron ipcMain dispatcher.
 * Unregisters any prior registrations first to guarantee idempotency.
 */
export function registerAllIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  unregisterAllIpcHandlers();

  registerAuthIpcHandlers(runtime, mainWindow);
  registerStudentsIpcHandlers(runtime, mainWindow);
  registerGroupsIpcHandlers(runtime, mainWindow);
  registerSessionsIpcHandlers(runtime, mainWindow);
  registerAttendanceIpcHandlers(runtime, mainWindow);
  registerFinanceIpcHandlers(runtime, mainWindow);
  registerThermalIpcHandlers(runtime, mainWindow);
  registerCurriculumIpcHandlers(runtime, mainWindow);
  registerLessonPlannerIpcHandlers(runtime, mainWindow);
  registerPdfSourceIpcHandlers(runtime, mainWindow);
  registerQuestionBankIpcHandlers(runtime, mainWindow);
  registerDashboardIpcHandlers(runtime, mainWindow);
  registerBackupIpcHandlers(runtime, mainWindow);
  registerSystemIpcHandlers(runtime, mainWindow);
  registerGeminiIpcHandlers(runtime, mainWindow);
  registerExamIpcHandlers(runtime, mainWindow);
  registerCaptureIpcHandlers(runtime, mainWindow);
  registerGradingIpcHandlers(runtime, mainWindow);
  registerAnalyticsIpcHandlers(runtime, mainWindow);
  registerAssistantIpcHandlers(runtime, mainWindow);
  registerSlideIpcHandlers(runtime, mainWindow);
  registerCurriculumLibraryIpcHandlers(runtime, mainWindow);
  registerTibyanWorkspaceIpcHandlers(runtime, mainWindow);
}

/**
 * Cleans up all registered IPC handlers. Useful during application quit or test resets.
 */
export function unregisterAllIpcHandlers(): void {
  unregisterAuthIpcHandlers();
  unregisterStudentsIpcHandlers();
  unregisterGroupsIpcHandlers();
  unregisterSessionsIpcHandlers();
  unregisterAttendanceIpcHandlers();
  unregisterFinanceIpcHandlers();
  unregisterThermalIpcHandlers();
  unregisterCurriculumIpcHandlers();
  unregisterLessonPlannerIpcHandlers();
  unregisterPdfSourceIpcHandlers();
  unregisterQuestionBankIpcHandlers();
  unregisterDashboardIpcHandlers();
  unregisterBackupIpcHandlers();
  unregisterSystemIpcHandlers();
  unregisterGeminiIpcHandlers();
  unregisterExamIpcHandlers();
  unregisterCaptureIpcHandlers();
  unregisterGradingIpcHandlers();
  unregisterAnalyticsIpcHandlers();
  unregisterAssistantIpcHandlers();
  unregisterSlideIpcHandlers();
  unregisterCurriculumLibraryIpcHandlers();
  unregisterTibyanWorkspaceIpcHandlers();
}

export * from './errors.js';
export * from './auth.ipc.js';
export * from './students.ipc.js';
export * from './groups.ipc.js';
export * from './sessions.ipc.js';
export * from './attendance.ipc.js';
export * from './finance.ipc.js';
export * from './thermal.ipc.js';
export * from './curriculum.ipc.js';
export * from './lesson-planner.ipc.js';
export * from './pdf-sources.ipc.js';
export * from './question-bank.ipc.js';
export * from './dashboard.ipc.js';
export * from './backup.ipc.js';
export * from './system.ipc.js';
export * from './gemini.ipc.js';
export * from './exam.ipc.js';
export * from './capture.ipc.js';
export * from './grading.ipc.js';
export * from './analytics.ipc.js';
export * from './assistant.ipc.js';
export * from './slides.ipc.js';


