import { describe, it, expect, beforeEach, vi } from 'vitest';
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

let senderValid = true;
vi.mock('../electron/security.js', () => ({
  validateIpcSender: vi.fn(() => senderValid),
}));

import {
  registerFinanceIpcHandlers,
  unregisterFinanceIpcHandlers,
} from '../electron/ipc/finance.ipc.js';

describe('Finance IPC Handlers Suite', () => {
  let mockRuntime: any;
  let mockMainWindow: any;
  const mockSender = { id: 1 };
  const mockEvent = { sender: mockSender };

  const ownerActor = {
    userId: 'usr-owner-1',
    fullName: 'الأستاذ أحمد',
    role: 'OWNER',
    permissions: [
      'FINANCE_READ',
      'FINANCE_WRITE',
      'PAYMENTS_READ',
      'PAYMENTS_WRITE',
      'DISCOUNTS_READ',
      'DISCOUNTS_WRITE',
    ],
  };

  beforeEach(() => {
    ipcHandlers.clear();
    senderValid = true;
    mockPrintCalled = false;
    mockPrintToPdfCalled = false;

    mockMainWindow = {
      webContents: {
        print: vi.fn((_opts, cb) => {
          mockPrintCalled = true;
          if (cb) cb(true);
        }),
        printToPDF: vi.fn(async () => {
          mockPrintToPdfCalled = true;
          return Buffer.from('%PDF-1.4 Mock Invoice PDF');
        }),
      },
    };

    mockRuntime = {
      getMainWindow: vi.fn(() => mockMainWindow),
      requireActiveAcademicYear: vi.fn(),
      requireAuthenticatedActor: vi.fn(() => ownerActor),
      financeService: {
        recordPayment: vi.fn(async (input, actor) => ({
          id: 'pay-1',
          receiptNumber: 'REC-2026-0001',
          ...input,
          recordedByUserId: actor.userId,
        })),
        applyDiscount: vi.fn(async (input, _actor) => ({
          id: 'disc-1',
          ...input,
          status: 'ACTIVE',
        })),
        createInvoice: vi.fn(async (input, _actor) => ({
          id: 'inv-1',
          invoiceNumber: 'INV-2026-0001',
          ...input,
        })),
        getInvoice: vi.fn(async (id) => ({
          id,
          invoiceNumber: 'INV-2026-0001',
          totalCents: 15000,
          remainingCents: 0,
          items: [],
        })),
        getStudentFinancialSummary: vi.fn(async (studentId) => ({
          studentId,
          studentName: 'أحمد محمود',
          studentCode: 'TB-001',
          totalChargesCents: 20000,
          totalDiscountsCents: 0,
          netPayableCents: 20000,
          totalPaidCents: 20000,
          remainingBalanceCents: 0,
          status: 'PAID',
          subscriptions: [],
          recentPayments: [],
        })),
        listAllSummaries: vi.fn(async () => []),
        getOverallFinanceKpi: vi.fn(async () => ({
          totalChargesCents: 50000,
          totalCollectedCents: 40000,
          totalOutstandingCents: 10000,
          totalDiscountsCents: 2000,
          activeStudentsCount: 10,
          paidStudentsCount: 8,
          unpaidStudentsCount: 2,
        })),
        listStudentPayments: vi.fn(async () => []),
        listStudentInvoices: vi.fn(async () => []),
      },
    };

    registerFinanceIpcHandlers(mockRuntime, mockMainWindow);
  });

  it('registers all expected finance IPC handlers', () => {
    expect(ipcHandlers.has(IPC_CHANNELS.FINANCE_RECORD_PAYMENT)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.FINANCE_APPLY_DISCOUNT)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.FINANCE_CREATE_INVOICE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.FINANCE_GET_INVOICE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.FINANCE_GET_STUDENT_SUMMARY)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.FINANCE_LIST_ALL_SUMMARIES)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.FINANCE_GET_OVERALL_KPI)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.FINANCE_LIST_STUDENT_PAYMENTS)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.FINANCE_LIST_INVOICES)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.FINANCE_PRINT_INVOICE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.FINANCE_EXPORT_INVOICE_PDF)).toBe(true);
  });

  it('unregisters handlers cleanly', () => {
    unregisterFinanceIpcHandlers();
    expect(ipcHandlers.size).toBe(0);
  });

  it('rejects IPC call when sender is untrusted', async () => {
    senderValid = false;
    const handler = ipcHandlers.get(IPC_CHANNELS.FINANCE_GET_OVERALL_KPI)!;
    await expect(handler(mockEvent)).rejects.toThrow('UNAUTHORIZED_IPC_SENDER');
  });

  it('rejects IPC mutation when user is not authenticated', async () => {
    mockRuntime.requireAuthenticatedActor.mockImplementation(() => {
      throw new AuthError('PERMISSION_DENIED', 'Authentication required. No active session.');
    });

    const handler = ipcHandlers.get(IPC_CHANNELS.FINANCE_RECORD_PAYMENT)!;
    const res = await handler(mockEvent, {
      studentId: '123e4567-e89b-12d3-a456-426614174000',
      amountCents: 5000,
      paymentMethod: 'CASH',
      paymentDate: '2026-09-19',
    });
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('PERMISSION_DENIED');
  });

  it('handles record payment successfully with authenticated actor', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.FINANCE_RECORD_PAYMENT)!;
    const res = await handler(mockEvent, {
      studentId: '123e4567-e89b-12d3-a456-426614174000',
      amountCents: 10000,
      paymentMethod: 'CASH',
      paymentDate: '2026-09-19',
    });

    expect(res.success).toBe(true);
    expect(res.data.receiptNumber).toBe('REC-2026-0001');
    expect(mockRuntime.financeService.recordPayment).toHaveBeenCalled();
  });

  it('handles apply discount successfully', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.FINANCE_APPLY_DISCOUNT)!;
    const res = await handler(mockEvent, {
      studentId: '123e4567-e89b-12d3-a456-426614174000',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      reason: 'تفوق دراسي',
    });

    expect(res.success).toBe(true);
    expect(res.data.status).toBe('ACTIVE');
    expect(mockRuntime.financeService.applyDiscount).toHaveBeenCalled();
  });

  it('handles get student summary successfully', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.FINANCE_GET_STUDENT_SUMMARY)!;
    const res = await handler(mockEvent, 'stu-1');

    expect(res.success).toBe(true);
    expect(res.data.studentName).toBe('أحمد محمود');
    expect(res.data.status).toBe('PAID');
  });

  it('handles get overall KPI successfully', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.FINANCE_GET_OVERALL_KPI)!;
    const res = await handler(mockEvent);

    expect(res.success).toBe(true);
    expect(res.data.totalCollectedCents).toBe(40000);
  });

  it('handles invoice print successfully', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.FINANCE_PRINT_INVOICE)!;
    const res = await handler(mockEvent, 'inv-1');

    expect(res.success).toBe(true);
    expect(res.data.printed).toBe(true);
    expect(mockPrintCalled).toBe(true);
  });

  it('handles invoice PDF export successfully', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.FINANCE_EXPORT_INVOICE_PDF)!;
    const res = await handler(mockEvent, { defaultFilename: 'test-invoice.pdf' });

    expect(res.success).toBe(true);
    expect(mockPrintToPdfCalled).toBe(true);
  });
});
