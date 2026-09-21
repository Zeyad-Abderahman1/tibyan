import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS } from '@tibyan/contracts';

const handlers = new Map<string, (event: unknown, payload?: unknown) => Promise<unknown>>();
let senderValid = true;

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (event: unknown, payload?: unknown) => Promise<unknown>) => handlers.set(channel, handler)),
    removeHandler: vi.fn((channel: string) => handlers.delete(channel)),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((value: string) => Buffer.from(value)),
    decryptString: vi.fn((value: Buffer) => value.toString()),
  },
}));

vi.mock('../electron/security.js', () => ({ validateIpcSender: vi.fn(() => senderValid) }));

import { registerGeminiIpcHandlers, unregisterGeminiIpcHandlers } from '../electron/ipc/gemini.ipc.js';

describe('Gemini credential IPC', () => {
  const event = { sender: { id: 1 }, senderFrame: { parent: null } };
  let runtime: any;

  beforeEach(() => {
    handlers.clear();
    senderValid = true;
    runtime = {
      requireAuthenticatedActor: vi.fn(() => ({ role: 'OWNER', permissions: [] })),
      geminiCredentialService: {
        status: vi.fn(() => ({ configured: true })),
        save: vi.fn(),
        clear: vi.fn(),
      },
    };
    registerGeminiIpcHandlers(runtime, { isDestroyed: () => false, webContents: { id: 1 } } as any);
  });

  it('returns a credential-safe status and never includes credential material', async () => {
    const handler = handlers.get(IPC_CHANNELS.GEMINI_GET_STATUS)!;
    const result: any = await handler(event);

    expect(result).toEqual({ success: true, data: { configured: true } });
    expect(JSON.stringify(result)).not.toContain('apiKey');
  });

  it('validates Main-only credential updates and rejects an untrusted sender', async () => {
    const setHandler = handlers.get(IPC_CHANNELS.GEMINI_SET_CREDENTIAL)!;
    const invalid: any = await setHandler(event, { apiKey: '  ' });
    expect(invalid.success).toBe(false);

    senderValid = false;
    await expect(setHandler(event, { apiKey: 'secret' })).rejects.toThrow('UNAUTHORIZED_IPC_SENDER');
  });

  it('removes registered handlers at shutdown', () => {
    unregisterGeminiIpcHandlers();
    expect(handlers.size).toBe(0);
  });
});
