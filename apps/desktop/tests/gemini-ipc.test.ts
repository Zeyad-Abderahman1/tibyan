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
      ownerPasswordService: { requireValid: vi.fn() },
      geminiCredentialService: {
        status: vi.fn(() => ({ configured: true, maskedKey: '****-key' })),
        get: vi.fn(() => 'test-key'),
        save: vi.fn(),
        clear: vi.fn(),
      },
    };
    registerGeminiIpcHandlers(runtime, { isDestroyed: () => false, webContents: { id: 1 } } as any);
  });

  it('returns a credential-safe status and never includes credential material', async () => {
    const handler = handlers.get(IPC_CHANNELS.GEMINI_GET_STATUS)!;
    const result: any = await handler(event);

    expect(result).toEqual({ success: true, data: { configured: true, maskedKey: '****-key' } });
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

  it('requires the owner password before replacing or removing a key', async () => {
    const setHandler = handlers.get(IPC_CHANNELS.GEMINI_SET_CREDENTIAL)!;
    runtime.ownerPasswordService.requireValid.mockImplementation(() => { throw new Error('كلمة المرور غير صحيحة.'); });
    const rejected: any = await setHandler(event, { apiKey: 'new-key', ownerPassword: 'wrong' });
    expect(rejected.success).toBe(false);
    expect(runtime.geminiCredentialService.save).not.toHaveBeenCalled();
    const deleteHandler = handlers.get(IPC_CHANNELS.GEMINI_DELETE_CREDENTIAL)!;
    const deleted: any = await deleteHandler(event, { ownerPassword: 'wrong' });
    expect(deleted.success).toBe(false);
    expect(runtime.geminiCredentialService.clear).not.toHaveBeenCalled();
  });

  it('permits an owner to set and delete after password verification', async () => {
    const setHandler = handlers.get(IPC_CHANNELS.GEMINI_SET_CREDENTIAL)!;
    expect((await setHandler(event, { apiKey: 'new-key', ownerPassword: 'correct' }) as any).success).toBe(true);
    expect(runtime.geminiCredentialService.save).toHaveBeenCalledWith('new-key');
    const deleteHandler = handlers.get(IPC_CHANNELS.GEMINI_DELETE_CREDENTIAL)!;
    expect((await deleteHandler(event, { ownerPassword: 'correct' }) as any).success).toBe(true);
    expect(runtime.geminiCredentialService.clear).toHaveBeenCalledOnce();
  });

  it('tests the saved key without returning it', async () => {
    const testHandler = handlers.get(IPC_CHANNELS.GEMINI_TEST_CONNECTION);
    expect(testHandler).toBeDefined();
    runtime.geminiCredentialService.get.mockReturnValue(null);
    const result: any = await testHandler!(event);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain('test-key');
  });
});
