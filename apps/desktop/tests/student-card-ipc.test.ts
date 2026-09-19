import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS } from '@tibyan/contracts';
import { AuthError } from '@tibyan/core';

const ipcHandlers = new Map<string, (event: any, payload?: any) => Promise<any>>();

let mockPrintCalled = false;
let mockPrintToPdfCalled = false;
let mockDialogSaveResult: any = { canceled: false, filePath: '' };

vi.mock('electron', () => {
  return {
    ipcMain: {
      handle: vi.fn((channel: string, handler: (event: any, payload?: any) => Promise<any>) => {
        ipcHandlers.set(channel, handler);
      }),
      removeHandler: vi.fn((channel: string) => {
        ipcHandlers.delete(channel);
      }),
    },
    dialog: {
      showSaveDialog: vi.fn(async () => mockDialogSaveResult),
      showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] })),
    },
  };
});

// Mock security validator to pass in test
vi.mock('../electron/security.js', () => ({
  validateIpcSender: vi.fn(() => true),
}));

import {
  registerStudentsIpcHandlers,
  unregisterStudentsIpcHandlers,
} from '../electron/ipc/students.ipc.js';

describe('Student Card Print & PDF Export IPC Suite (TDD)', () => {
  let tempDir: string;
  let mockRuntime: any;
  let mockMainWindow: any;

  beforeEach(() => {
    ipcHandlers.clear();
    mockPrintCalled = false;
    mockPrintToPdfCalled = false;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-card-ipc-test-'));

    mockMainWindow = {
      webContents: {
        print: vi.fn((_opts, cb) => {
          mockPrintCalled = true;
          if (cb) cb(true);
        }),
        printToPDF: vi.fn(async () => {
          mockPrintToPdfCalled = true;
          return Buffer.from('%PDF-1.4 Mock PDF Content');
        }),
      },
    };

    mockRuntime = {
      requireAuthenticatedActor: vi.fn(() => ({
        userId: 'owner-id',
        username: 'teacher',
        role: 'OWNER',
        permissions: ['STUDENTS_READ', 'STUDENTS_WRITE'],
      })),
      requireActiveAcademicYear: vi.fn(),
      activeAcademicYear: { id: 'year-1', name: '2026-2027' },
      studentRepo: {},
      academicAuditRepo: {},
    };

    registerStudentsIpcHandlers(mockRuntime, mockMainWindow);
  });

  afterEach(() => {
    unregisterStudentsIpcHandlers();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it('students:printCards requires authenticated actor and triggers webContents.print', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.STUDENTS_PRINT_CARDS);
    expect(handler).toBeDefined();

    const res = await handler!({ sender: {} });
    expect(res.success).toBe(true);
    expect(mockPrintCalled).toBe(true);
    expect(mockRuntime.requireAuthenticatedActor).toHaveBeenCalledTimes(1);
  });

  it('students:printCards fails if actor is unauthenticated', async () => {
    mockRuntime.requireAuthenticatedActor.mockImplementationOnce(() => {
      throw new AuthError('PERMISSION_DENIED', 'Authentication required for printing cards');
    });

    const handler = ipcHandlers.get(IPC_CHANNELS.STUDENTS_PRINT_CARDS);
    const res = await handler!({ sender: {} });
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('PERMISSION_DENIED');
  });

  it('students:exportCardsPdf with targetPath writes PDF buffer to target file directly', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.STUDENTS_EXPORT_CARDS_PDF);
    expect(handler).toBeDefined();

    const targetFile = path.join(tempDir, 'output-cards.pdf');
    const res = await handler!({ sender: {} }, { targetPath: targetFile });

    expect(res.success).toBe(true);
    expect(res.data.canceled).toBe(false);
    expect(res.data.filePath).toBe(targetFile);
    expect(mockPrintToPdfCalled).toBe(true);
    expect(fs.existsSync(targetFile)).toBe(true);
    const content = fs.readFileSync(targetFile, 'utf8');
    expect(content).toContain('%PDF-1.4');
  });

  it('students:exportCardsPdf handles user cancellation gracefully', async () => {
    mockDialogSaveResult = { canceled: true, filePath: '' };
    const handler = ipcHandlers.get(IPC_CHANNELS.STUDENTS_EXPORT_CARDS_PDF);

    const res = await handler!({ sender: {} });
    expect(res.success).toBe(true);
    expect(res.data.canceled).toBe(true);
    expect(res.data.filePath).toBe('');
  });
});
