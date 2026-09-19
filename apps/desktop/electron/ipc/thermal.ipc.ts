import net from 'net';
import { ipcMain, type BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  type PrinterInfo,
  type ThermalReceiptDto,
  type PrintThermalReceiptInput,
  type TestPrintInput,
  type EscPosGenerateInput,
  type EscPosNetworkPrintInput,
  PrintThermalReceiptInputSchema,
  TestPrintInputSchema,
  EscPosGenerateInputSchema,
  EscPosNetworkPrintInputSchema,
} from '@tibyan/contracts';
import { EscPosBuilder, ThermalReceiptService } from '@tibyan/core';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerThermalIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  function getThermalReceiptService(): ThermalReceiptService {
    runtime.requireActiveAcademicYear();
    if (!runtime.thermalReceiptService) {
      throw new Error('SERVICE_UNAVAILABLE: Thermal receipt service is not initialized');
    }
    return runtime.thermalReceiptService;
  }

  // 1. List installed system printers
  ipcMain.handle(IPC_CHANNELS.THERMAL_LIST_PRINTERS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async (): Promise<PrinterInfo[]> => {
      runtime.requireAuthenticatedActor();

      if (!mainWindow || !mainWindow.webContents) {
        return [];
      }

      try {
        const printers = await mainWindow.webContents.getPrintersAsync();
        return printers.map((p) => ({
          name: p.name,
          displayName: p.displayName || p.name,
          description: p.description || '',
          status: p.status,
          isDefault: p.isDefault,
        }));
      } catch {
        // Fallback for headless testing environments where printer subsystem is unmounted
        return [];
      }
    });
  });

  // 2. Authoritative receipt data loader (idempotent, pure read)
  ipcMain.handle(IPC_CHANNELS.THERMAL_GET_RECEIPT_DATA, async (event, paymentId: string) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async (): Promise<ThermalReceiptDto> => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getThermalReceiptService();
      return service.getThermalReceiptData(paymentId, actor);
    });
  });

  // 3. Print thermal receipt (System Driver or Network ESC/POS)
  ipcMain.handle(IPC_CHANNELS.THERMAL_PRINT_RECEIPT, async (event, rawInput: PrintThermalReceiptInput) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const service = getThermalReceiptService();
      const input = PrintThermalReceiptInputSchema.parse(rawInput);

      // Load authoritative receipt data (never creates duplicate payments)
      const receipt = await service.getThermalReceiptData(input.paymentId, actor);
      const settings = input.settings;
      const is58mm = settings?.paperWidth === '58mm';

      if (settings?.printMethod === 'ESCPOS_NETWORK') {
        const host = settings.networkHost;
        const port = settings.networkPort || 9100;
        if (!host) {
          throw new Error('NETWORK_PRINTER_HOST_REQUIRED: IP address or hostname is required for network printing');
        }

        const buffer = EscPosBuilder.buildReceipt(receipt, {
          paperWidth: is58mm ? '58mm' : '80mm',
          autoCut: settings.autoCut ?? true,
        });

        await sendBufferOverTcp(host, port, buffer);
        return { success: true, message: 'تم إرسال الإيصال إلى طابعة الشبكة بنجاح' };
      }

      // Default: System Driver via Electron webContents
      if (!mainWindow) {
        throw new Error('WINDOW_NOT_FOUND: Main window is not available for printing');
      }

      const printOptions = {
        silent: true,
        deviceName: settings?.printerName || undefined,
        copies: settings?.copies || 1,
        margins: { marginType: 'none' as const },
        pageSize: {
          width: is58mm ? 58000 : 80000, // microns (58mm or 80mm)
          height: 200000, // content-driven roll
        },
        printBackground: true,
      };

      try {
        mainWindow.webContents.print(printOptions, (success, failureReason) => {
          if (!success && failureReason) {
            console.warn('Thermal print warning:', failureReason);
          }
        });
      } catch (err: any) {
        throw new Error(`PRINT_FAILED: ${err.message || 'Failed to trigger system print'}`);
      }

      return { success: true, message: 'تم إرسال الإيصال إلى طابعة النظام بنجاح' };
    });
  });

  // 4. Test print (Zero DB mutation)
  ipcMain.handle(IPC_CHANNELS.THERMAL_TEST_PRINT, async (event, rawInput: TestPrintInput) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const input = TestPrintInputSchema.parse(rawInput || {});
      const paperWidth = input.paperWidth || input.settings?.paperWidth || '80mm';

      // Fallback service or active service
      let service: ThermalReceiptService;
      try {
        service = getThermalReceiptService();
      } catch {
        service = new ThermalReceiptService();
      }

      const testReceipt = service.generateTestReceiptData(paperWidth, actor.fullName);
      const settings = input.settings;
      const is58mm = paperWidth === '58mm';

      if (settings?.printMethod === 'ESCPOS_NETWORK') {
        const host = settings.networkHost;
        const port = settings.networkPort || 9100;
        if (!host) {
          throw new Error('NETWORK_PRINTER_HOST_REQUIRED: IP address or hostname is required for network printing');
        }

        const buffer = EscPosBuilder.buildReceipt(testReceipt, {
          paperWidth,
          autoCut: settings.autoCut ?? true,
        });

        await sendBufferOverTcp(host, port, buffer);
        return { success: true, message: 'تم إرسال إيصال الاختبار إلى طابعة الشبكة بنجاح' };
      }

      if (!mainWindow) {
        throw new Error('WINDOW_NOT_FOUND: Main window is not available for printing');
      }

      const printOptions = {
        silent: true,
        deviceName: settings?.printerName || undefined,
        copies: 1,
        margins: { marginType: 'none' as const },
        pageSize: {
          width: is58mm ? 58000 : 80000,
          height: 180000,
        },
        printBackground: true,
      };

      try {
        mainWindow.webContents.print(printOptions, (success, failureReason) => {
          if (!success && failureReason) {
            console.warn('Test print warning:', failureReason);
          }
        });
      } catch (err: any) {
        throw new Error(`PRINT_FAILED: ${err.message || 'Failed to trigger system test print'}`);
      }

      return { success: true, message: 'تم إرسال إيصال الاختبار بنجاح' };
    });
  });

  // 5. Generate raw ESC/POS byte buffer
  ipcMain.handle(IPC_CHANNELS.THERMAL_GENERATE_ESCPOS, async (event, rawInput: EscPosGenerateInput) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const input = EscPosGenerateInputSchema.parse(rawInput);
      const buffer = EscPosBuilder.buildReceipt(input.receipt, {
        paperWidth: input.paperWidth,
        autoCut: input.autoCut,
      });

      return {
        base64: buffer.toString('base64'),
        byteLength: buffer.length,
      };
    });
  });

  // 6. Direct Network ESC/POS Socket Dispatch
  ipcMain.handle(IPC_CHANNELS.THERMAL_PRINT_ESCPOS_NETWORK, async (event, rawInput: EscPosNetworkPrintInput) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const input = EscPosNetworkPrintInputSchema.parse(rawInput);
      const buffer = Buffer.from(input.payloadBase64, 'base64');

      await sendBufferOverTcp(input.host, input.port, buffer);
      return { success: true, message: 'تم إرسال أمر الطباعة عبر الشبكة بنجاح' };
    });
  });
}

/**
 * Sends a raw binary buffer to a network ESC/POS printer over TCP socket with timeout
 */
function sendBufferOverTcp(host: string, port: number, buffer: Buffer, timeoutMs: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let isSettled = false;

    socket.setTimeout(timeoutMs);

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.on('connect', () => {
      socket.write(buffer, (err) => {
        if (err) {
          if (!isSettled) {
            isSettled = true;
            cleanup();
            reject(new Error(`PRINTER_WRITE_ERROR: ${err.message}`));
          }
          return;
        }
        socket.end(() => {
          if (!isSettled) {
            isSettled = true;
            cleanup();
            resolve();
          }
        });
      });
    });

    socket.on('timeout', () => {
      if (!isSettled) {
        isSettled = true;
        cleanup();
        reject(new Error(`PRINTER_CONNECTION_TIMEOUT: Connection to printer at ${host}:${port} timed out after ${timeoutMs}ms`));
      }
    });

    socket.on('error', (err) => {
      if (!isSettled) {
        isSettled = true;
        cleanup();
        reject(new Error(`PRINTER_NETWORK_ERROR: Unable to connect to printer at ${host}:${port} (${err.message})`));
      }
    });

    socket.connect(port, host);
  });
}

export function unregisterThermalIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.THERMAL_LIST_PRINTERS);
  ipcMain.removeHandler(IPC_CHANNELS.THERMAL_GET_RECEIPT_DATA);
  ipcMain.removeHandler(IPC_CHANNELS.THERMAL_PRINT_RECEIPT);
  ipcMain.removeHandler(IPC_CHANNELS.THERMAL_TEST_PRINT);
  ipcMain.removeHandler(IPC_CHANNELS.THERMAL_GENERATE_ESCPOS);
  ipcMain.removeHandler(IPC_CHANNELS.THERMAL_PRINT_ESCPOS_NETWORK);
}
