import { ipcMain, type BrowserWindow } from 'electron';
import { z } from 'zod';
import { IPC_CHANNELS, ExamGenerationRequestSchema, SlidesGenerationRequestSchema, ReviewGenerationRequestSchema, NotesGenerationRequestSchema, ReviewArtifactSchema, NotesArtifactSchema, SaveReviewArtifactSchema, SaveNotesArtifactSchema } from '@tibyan/contracts';
import { SlideService, ReviewService, NotesService } from '@tibyan/core';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

function reviewDto(value: ReturnType<ReviewService['createGenerated']>) {
  const { contentJson: _contentJson, ...dto } = value;
  return ReviewArtifactSchema.parse(dto);
}
function notesDto(value: ReturnType<NotesService['createGenerated']>) {
  const { contentJson: _contentJson, ...dto } = value;
  return NotesArtifactSchema.parse(dto);
}

// Reuse the same lazy orchestrator pattern from assistant.ipc.ts
let orchestrator: import('@tibyan/core').AssistantOrchestrator | null = null;

function getOrchestrator(runtime: Runtime): import('@tibyan/core').AssistantOrchestrator {
  if (!orchestrator) {
    const { AssistantOrchestrator } = require('@tibyan/core');
    orchestrator = new AssistantOrchestrator({
      systemDb: runtime.systemDb,
      geminiCredentialService: runtime.geminiCredentialService,
      getActiveAcademicYear: () =>
        runtime.activeAcademicYear
          ? { id: runtime.activeAcademicYear.id, name: runtime.activeAcademicYear.name }
          : null,
      resolveEntityLabel: async () => null,
      buildToolPreview: async () => [],
      executeTool: async () => ({ success: false, error: 'Tool execution not implemented in workspace' }),
      undoTool: async () => ({ success: false, error: 'Undo not implemented in workspace' }),
    });
  }
  return orchestrator!;
}

export function registerTibyanWorkspaceIpcHandlers(
  runtime: Runtime,
  mainWindow: BrowserWindow | null
): void {
  // ─── Workspace task session management ──────────────────────────────

  ipcMain.handle(IPC_CHANNELS.TIBYAN_CREATE_TASK_SESSION, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const { taskType, title } = z
        .object({
          taskType: z.string().min(1),
          title: z.string().optional(),
        })
        .parse(payload);
      const orch = getOrchestrator(runtime);
      return orch.createSession(actor.userId, title || `مهمة ${taskType}`, taskType);
    });
  });

  ipcMain.handle(IPC_CHANNELS.TIBYAN_LIST_HISTORY, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const orch = getOrchestrator(runtime);
      return orch.listSessions(actor.userId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.TIBYAN_GET_HISTORY_ITEM, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const sessionId = z.string().uuid().parse(payload);
      const orch = getOrchestrator(runtime);
      return orch.getHistory(sessionId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.TIBYAN_DELETE_HISTORY_ITEM, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const sessionId = z.string().uuid().parse(payload);
      const orch = getOrchestrator(runtime);
      orch.deleteSession(sessionId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.TIBYAN_RENAME_HISTORY_ITEM, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const { sessionId, title } = z
        .object({
          sessionId: z.string().uuid(),
          title: z.string().min(1).max(200),
        })
        .parse(payload);
      const orch = getOrchestrator(runtime);
      // renameSession doesn't exist on the orchestrator — skip for now
      // The session title is set at creation time
      void orch;
      void sessionId;
      void title;
    });
  });

  // ─── AI Content Generation ──────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.AI_GENERATE_REVIEW, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const request = ReviewGenerationRequestSchema.parse(payload);
      const generated = await runtime.aiContentService.generateReview(request);
      return reviewDto(new ReviewService(runtime.academicDb!.db).createGenerated(request, generated.data));
    });
  });

  ipcMain.handle(IPC_CHANNELS.AI_GENERATE_NOTES, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const request = NotesGenerationRequestSchema.parse(payload);
      const generated = await runtime.aiContentService.generateNotes(request);
      return notesDto(new NotesService(runtime.academicDb!.db).createGenerated(request, generated.data));
    });
  });

  ipcMain.handle(IPC_CHANNELS.AI_GENERATE_SLIDES, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const request = SlidesGenerationRequestSchema.parse(payload);
      const generated = await runtime.aiContentService.generateSlides(request);
      return new SlideService(runtime.academicDb!.db).createGeneratedDeck(request, generated.data);
    });
  });

  ipcMain.handle(IPC_CHANNELS.AI_GENERATE_EXAM, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const { sourceId, config } = ExamGenerationRequestSchema.parse(payload);
      return runtime.aiContentService.generateExamFromSource(
        { sourceDocumentId: sourceId },
        config
      );
    });
  });

  const reviewService = () => { runtime.requireAuthenticatedActor(); runtime.requireActiveAcademicYear(); return new ReviewService(runtime.academicDb!.db); };
  const notesService = () => { runtime.requireAuthenticatedActor(); runtime.requireActiveAcademicYear(); return new NotesService(runtime.academicDb!.db); };
  ipcMain.handle(IPC_CHANNELS.AI_LIST_REVIEWS, (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => reviewService().list().map(reviewDto));
  });
  ipcMain.handle(IPC_CHANNELS.AI_GET_REVIEW, (event, id) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => { const row = reviewService().get(z.string().uuid().parse(id)); return row ? reviewDto(row) : null; });
  });
  ipcMain.handle(IPC_CHANNELS.AI_SAVE_REVIEW, (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => { const {id, content} = SaveReviewArtifactSchema.parse(payload); return reviewDto(reviewService().saveContent(id, content)); });
  });
  ipcMain.handle(IPC_CHANNELS.AI_LIST_NOTES, (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => notesService().list().map(notesDto));
  });
  ipcMain.handle(IPC_CHANNELS.AI_GET_NOTES, (event, id) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => { const row = notesService().get(z.string().uuid().parse(id)); return row ? notesDto(row) : null; });
  });
  ipcMain.handle(IPC_CHANNELS.AI_SAVE_NOTES, (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => { const {id, content} = SaveNotesArtifactSchema.parse(payload); return notesDto(notesService().saveContent(id, content)); });
  });
}

export function unregisterTibyanWorkspaceIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.TIBYAN_CREATE_TASK_SESSION);
  ipcMain.removeHandler(IPC_CHANNELS.TIBYAN_LIST_HISTORY);
  ipcMain.removeHandler(IPC_CHANNELS.TIBYAN_GET_HISTORY_ITEM);
  ipcMain.removeHandler(IPC_CHANNELS.TIBYAN_DELETE_HISTORY_ITEM);
  ipcMain.removeHandler(IPC_CHANNELS.TIBYAN_RENAME_HISTORY_ITEM);
  ipcMain.removeHandler(IPC_CHANNELS.AI_GENERATE_REVIEW);
  ipcMain.removeHandler(IPC_CHANNELS.AI_GENERATE_NOTES);
  ipcMain.removeHandler(IPC_CHANNELS.AI_GENERATE_SLIDES);
  ipcMain.removeHandler(IPC_CHANNELS.AI_GENERATE_EXAM);
  ipcMain.removeHandler(IPC_CHANNELS.AI_LIST_REVIEWS);
  ipcMain.removeHandler(IPC_CHANNELS.AI_GET_REVIEW);
  ipcMain.removeHandler(IPC_CHANNELS.AI_SAVE_REVIEW);
  ipcMain.removeHandler(IPC_CHANNELS.AI_LIST_NOTES);
  ipcMain.removeHandler(IPC_CHANNELS.AI_GET_NOTES);
  ipcMain.removeHandler(IPC_CHANNELS.AI_SAVE_NOTES);
}
