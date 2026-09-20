import { ipcMain, type BrowserWindow } from 'electron';
import { z } from 'zod';
import {
  IPC_CHANNELS,
  CreateQuestionSchema,
  UpdateQuestionSchema,
  QuestionFilterSchema,
  CommitBulkImportInputSchema,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerQuestionBankIpcHandlers(
  runtime: Runtime,
  mainWindow: BrowserWindow | null
): void {
  // 1. List Questions
  ipcMain.handle(IPC_CHANNELS.QUESTION_BANK_LIST, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const filter = payload ? QuestionFilterSchema.parse(payload) : undefined;
      return runtime.questionBankService.listQuestions(filter);
    });
  });

  // 2. Get Question
  ipcMain.handle(IPC_CHANNELS.QUESTION_BANK_GET, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      return runtime.questionBankService.getQuestion(id);
    });
  });

  // 3. Create Question
  ipcMain.handle(IPC_CHANNELS.QUESTION_BANK_CREATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const validated = CreateQuestionSchema.parse(payload);
      return runtime.questionBankService.createQuestion(validated, actor);
    });
  });

  // 4. Update Question
  ipcMain.handle(IPC_CHANNELS.QUESTION_BANK_UPDATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const { id, input } = z
        .object({
          id: z.string().uuid(),
          input: UpdateQuestionSchema.omit({ id: true }),
        })
        .parse(payload);
      return runtime.questionBankService.updateQuestion(id, { id, ...input }, actor);
    });
  });

  // 5. Archive Question
  ipcMain.handle(IPC_CHANNELS.QUESTION_BANK_ARCHIVE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      runtime.questionBankService.archiveQuestion(id, actor);
    });
  });

  // 6. Check Duplicate
  ipcMain.handle(IPC_CHANNELS.QUESTION_BANK_CHECK_DUPLICATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const { body, curriculumNodeIds } = z
        .object({
          body: z.any(),
          curriculumNodeIds: z.array(z.string().uuid()).default([]),
        })
        .parse(payload);
      return runtime.questionBankService.checkDuplicate(body, curriculumNodeIds);
    });
  });

  // 7. Preview Bulk
  ipcMain.handle(IPC_CHANNELS.QUESTION_BANK_PREVIEW_BULK, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const items = z.array(z.unknown()).parse(payload);
      return runtime.questionBankService.previewBulk(items);
    });
  });

  // 8. Commit Bulk
  ipcMain.handle(IPC_CHANNELS.QUESTION_BANK_COMMIT_BULK, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const validated = CommitBulkImportInputSchema.parse(payload);
      return runtime.questionBankService.commitBulk(validated, actor);
    });
  });
  // 9. Delete Question
  ipcMain.handle(IPC_CHANNELS.QUESTION_BANK_DELETE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      runtime.questionBankService.deleteQuestion(id, actor);
    });
  });

  // 10. Link Sources
  ipcMain.handle(IPC_CHANNELS.QUESTION_BANK_LINK_SOURCES, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const { questionId, sourceReferenceIds } = z
        .object({
          questionId: z.string().uuid(),
          sourceReferenceIds: z.array(z.string().uuid()),
        })
        .parse(payload);
      return runtime.questionBankService.linkSources(questionId, sourceReferenceIds, actor);
    });
  });

  // 11. Unlink Source
  ipcMain.handle(IPC_CHANNELS.QUESTION_BANK_UNLINK_SOURCE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const { questionId, sourceReferenceId } = z
        .object({
          questionId: z.string().uuid(),
          sourceReferenceId: z.string().uuid(),
        })
        .parse(payload);
      return runtime.questionBankService.unlinkSource(questionId, sourceReferenceId, actor);
    });
  });
}

export function unregisterQuestionBankIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.QUESTION_BANK_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.QUESTION_BANK_GET);
  ipcMain.removeHandler(IPC_CHANNELS.QUESTION_BANK_CREATE);
  ipcMain.removeHandler(IPC_CHANNELS.QUESTION_BANK_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.QUESTION_BANK_DELETE);
  ipcMain.removeHandler(IPC_CHANNELS.QUESTION_BANK_ARCHIVE);
  ipcMain.removeHandler(IPC_CHANNELS.QUESTION_BANK_CHECK_DUPLICATE);
  ipcMain.removeHandler(IPC_CHANNELS.QUESTION_BANK_PREVIEW_BULK);
  ipcMain.removeHandler(IPC_CHANNELS.QUESTION_BANK_COMMIT_BULK);
  ipcMain.removeHandler(IPC_CHANNELS.QUESTION_BANK_LINK_SOURCES);
  ipcMain.removeHandler(IPC_CHANNELS.QUESTION_BANK_UNLINK_SOURCE);
}
