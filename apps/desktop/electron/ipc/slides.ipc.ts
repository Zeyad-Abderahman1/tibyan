import { ipcMain, type BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  CreateSlideDeckSchema,
  UpdateSlideDeckSchema,
  CreateSlideSchema,
  UpdateSlideSchema,
  ReorderSlidesSchema,
  CreateSlideBlockSchema,
  UpdateSlideBlockSchema,
  ReorderSlideBlocksSchema,
  MoveSlideBlockSchema,
} from '@tibyan/contracts';
import { SlideService } from '@tibyan/core';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

function getService(runtime: Runtime): SlideService {
  runtime.requireActiveAcademicYear();
  return new SlideService(runtime.academicDb!.db);
}

export function registerSlideIpcHandlers(
  runtime: Runtime,
  mainWindow: BrowserWindow | null
): void {
  ipcMain.handle(IPC_CHANNELS.SLIDES_LIST_DECKS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      return getService(runtime).listDecks();
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_GET_DECK, async (event, payload: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      return getService(runtime).getDeck(payload);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_CREATE_DECK, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      const input = CreateSlideDeckSchema.parse(payload);
      return getService(runtime).createDeck(input);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_UPDATE_DECK, async (event, payload: { id: string; input: unknown }) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      const input = UpdateSlideDeckSchema.parse(payload.input);
      return getService(runtime).updateDeck(payload.id, input);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_DELETE_DECK, async (event, payload: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      getService(runtime).deleteDeck(payload);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_ADD_SLIDE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      const input = CreateSlideSchema.parse(payload);
      return getService(runtime).addSlide(input);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_UPDATE_SLIDE, async (event, payload: { id: string; input: unknown }) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      const input = UpdateSlideSchema.parse(payload.input);
      return getService(runtime).updateSlide(payload.id, input);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_DELETE_SLIDE, async (event, payload: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      getService(runtime).deleteSlide(payload);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_DUPLICATE_SLIDE, async (event, payload: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      return getService(runtime).duplicateSlide(payload);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_REORDER_SLIDES, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      const input = ReorderSlidesSchema.parse(payload);
      getService(runtime).reorderSlides(input);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_ADD_BLOCK, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      const input = CreateSlideBlockSchema.parse(payload);
      return getService(runtime).addBlock(input);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_UPDATE_BLOCK, async (event, payload: { id: string; input: unknown }) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      const input = UpdateSlideBlockSchema.parse(payload.input);
      return getService(runtime).updateBlock(payload.id, input);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_DELETE_BLOCK, async (event, payload: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      getService(runtime).deleteBlock(payload);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_REORDER_BLOCKS, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      const input = ReorderSlideBlocksSchema.parse(payload);
      getService(runtime).reorderBlocks(input);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_MOVE_BLOCK, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      const input = MoveSlideBlockSchema.parse(payload);
      return getService(runtime).moveBlock(input);
    });
  });

  ipcMain.handle(IPC_CHANNELS.SLIDES_GET_PRESENTATION, async (event, payload: string) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      void runtime.requireAuthenticatedActor();
      return getService(runtime).getPresentation(payload);
    });
  });
}

export function unregisterSlideIpcHandlers(): void {
  Object.values(IPC_CHANNELS)
    .filter((ch) => typeof ch === 'string' && ch.startsWith('slides:'))
    .forEach((ch) => ipcMain.removeHandler(ch as string));
}
