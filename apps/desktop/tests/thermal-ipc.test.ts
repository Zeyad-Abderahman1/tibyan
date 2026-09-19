import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IPC_CHANNELS } from '@tibyan/contracts';

const ipcHandlers = new Map<string, (event: any, payload?: any) => Promise<any>>();

let mockPrintCalled = false;
let mockPrintOptions: any = null;

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
  };
});

let senderValid = true;
vi.mock('../electron/security.js', () => ({
  validateIpcSender: vi.fn(() => senderValid),
}));

import {
  registerThermalIpcHandlers,
  unregisterThermalIpcHandlers,
} from '../electron/ipc/thermal.ipc.js';

describe('Thermal IPC Handlers Suite', () => {
  let mockRuntime: any;
  let mockMainWindow: any;
  const mockSender = { id: 1 };
  const mockEvent = { sender: mockSender };

  const ownerActor = {
    userId: 'usr-owner-1',
    fullName: 'الأستاذ أحمد الشريف',
    role: 'OWNER',
    permissions: ['PAYMENTS_READ', 'PAYMENTS_WRITE'],
  };

  const sampleReceipt = {
    paymentId: 'b0000000-0000-0000-0000-000000000001',
    receiptNumber: 'REC-2026-0042',
    studentId: 'a0000000-0000-0000-0000-000000000001',
    studentName: 'محمود السيد علي',
    studentCode: 'TB-4001',
    gradeLevel: 'PREP_1',
    gradeLevelNameAr: 'الصف الأول الإعدادي',
    groupName: 'مجموعة الجبر - أولى إعدادي',
    amountCents: 12000,
    amountFormatted: '١٢٠٫٠٠ ج.م',
    paymentMethod: 'CASH',
    paymentMethodNameAr: 'نقدي',
    paymentDate: '2026-10-01',
    periodMonth: '2026-10',
    remainingBalanceCents: 0,
    remainingBalanceFormatted: '٠٫٠٠ ج.م',
    teacherName: 'الأستاذ أحمد الشريف',
    operatorName: 'المسؤول',
    notes: 'دفعة شهر أكتوبر',
    issuedAt: new Date().toISOString(),
    isTestReceipt: false,
  };

  beforeEach(() => {
    ipcHandlers.clear();
    senderValid = true;
    mockPrintCalled = false;
    mockPrintOptions = null;

    mockMainWindow = {
      webContents: {
        getPrintersAsync: vi.fn(async () => [
          {
            name: 'Xprinter_XP-N160I',
            displayName: 'Xprinter Thermal Receipt',
            description: 'USB Thermal Printer',
            status: 0,
            isDefault: true,
          },
          {
            name: 'Microsoft_Print_to_PDF',
            displayName: 'Microsoft Print to PDF',
            description: 'Virtual PDF',
            status: 0,
            isDefault: false,
          },
        ]),
        print: vi.fn((opts, cb) => {
          mockPrintCalled = true;
          mockPrintOptions = opts;
          if (cb) cb(true);
        }),
      },
    };

    mockRuntime = {
      requireActiveAcademicYear: vi.fn(),
      requireAuthenticatedActor: vi.fn(() => ownerActor),
      thermalReceiptService: {
        getThermalReceiptData: vi.fn(() => sampleReceipt),
        generateTestReceiptData: vi.fn((_paperWidth, teacherName) => ({
          ...sampleReceipt,
          receiptNumber: 'TEST-0000',
          isTestReceipt: true,
          teacherName: teacherName || 'الأستاذ أحمد الشريف',
        })),
      },
    };

    registerThermalIpcHandlers(mockRuntime, mockMainWindow);
  });

  it('registers and unregisters all thermal IPC channels cleanly', () => {
    expect(ipcHandlers.has(IPC_CHANNELS.THERMAL_LIST_PRINTERS)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.THERMAL_GET_RECEIPT_DATA)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.THERMAL_PRINT_RECEIPT)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.THERMAL_TEST_PRINT)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.THERMAL_GENERATE_ESCPOS)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.THERMAL_PRINT_ESCPOS_NETWORK)).toBe(true);

    unregisterThermalIpcHandlers();

    expect(ipcHandlers.has(IPC_CHANNELS.THERMAL_LIST_PRINTERS)).toBe(false);
    expect(ipcHandlers.has(IPC_CHANNELS.THERMAL_PRINT_RECEIPT)).toBe(false);
  });

  it('rejects unauthorized IPC senders', async () => {
    senderValid = false;
    const handler = ipcHandlers.get(IPC_CHANNELS.THERMAL_LIST_PRINTERS)!;
    await expect(handler(mockEvent)).rejects.toThrow('UNAUTHORIZED_IPC_SENDER');
  });

  it('lists installed system printers with mapped structure', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.THERMAL_LIST_PRINTERS)!;
    const res = await handler(mockEvent);

    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
    expect(res.data[0].name).toBe('Xprinter_XP-N160I');
    expect(res.data[0].isDefault).toBe(true);
  });

  it('loads authoritative receipt data by paymentId', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.THERMAL_GET_RECEIPT_DATA)!;
    const res = await handler(mockEvent, sampleReceipt.paymentId);

    expect(res.success).toBe(true);
    expect(res.data.receiptNumber).toBe('REC-2026-0042');
    expect(res.data.studentName).toBe('محمود السيد علي');
    expect(mockRuntime.thermalReceiptService.getThermalReceiptData).toHaveBeenCalledWith(
      sampleReceipt.paymentId,
      ownerActor
    );
  });

  it('dispatches system driver print with exact thermal dimensions for 80mm and 58mm', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.THERMAL_PRINT_RECEIPT)!;

    // 80mm print
    const res80 = await handler(mockEvent, {
      paymentId: sampleReceipt.paymentId,
      settings: {
        printerName: 'Xprinter_XP-N160I',
        paperWidth: '80mm',
        printMethod: 'SYSTEM_DRIVER',
        copies: 1,
      },
    });

    expect(res80.success).toBe(true);
    expect(mockPrintCalled).toBe(true);
    expect(mockPrintOptions.silent).toBe(true);
    expect(mockPrintOptions.deviceName).toBe('Xprinter_XP-N160I');
    expect(mockPrintOptions.pageSize.width).toBe(80000); // 80mm in microns

    // 58mm print
    const res58 = await handler(mockEvent, {
      paymentId: sampleReceipt.paymentId,
      settings: {
        paperWidth: '58mm',
        printMethod: 'SYSTEM_DRIVER',
      },
    });

    expect(res58.success).toBe(true);
    expect(mockPrintOptions.pageSize.width).toBe(58000); // 58mm in microns
  });

  it('executes test print without mutating financial records', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.THERMAL_TEST_PRINT)!;
    const res = await handler(mockEvent, {
      paperWidth: '80mm',
    });

    expect(res.success).toBe(true);
    expect(mockPrintCalled).toBe(true);
    expect(mockRuntime.thermalReceiptService.generateTestReceiptData).toHaveBeenCalled();
  });

  it('generates raw ESC/POS payload via generateEscpos', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.THERMAL_GENERATE_ESCPOS)!;
    const res = await handler(mockEvent, {
      receipt: sampleReceipt,
      paperWidth: '80mm',
      autoCut: true,
    });

    expect(res.success).toBe(true);
    expect(typeof res.data.base64).toBe('string');
    expect(res.data.byteLength).toBeGreaterThan(50);
  });
});
