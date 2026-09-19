import fs from 'fs';
import { ipcMain, dialog, type BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  type RecordPaymentInput,
  type CreateInvoiceInput,
  type ApplyDiscountInput,
  type FinancialStatus,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerFinanceIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  function getFinanceService() {
    runtime.requireActiveAcademicYear();
    if (!runtime.financeService) {
      throw new Error('SERVICE_UNAVAILABLE: Finance service is not initialized');
    }
    return runtime.financeService;
  }

  // --- Payments ---

  ipcMain.handle(IPC_CHANNELS.FINANCE_RECORD_PAYMENT, async (event, input: RecordPaymentInput) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const finance = getFinanceService();
      return finance.recordPayment(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.FINANCE_LIST_STUDENT_PAYMENTS, async (event, studentId: string) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const finance = getFinanceService();
      return finance.listStudentPayments(studentId);
    });
  });

  // --- Summaries & KPI ---

  ipcMain.handle(IPC_CHANNELS.FINANCE_GET_STUDENT_SUMMARY, async (event, studentId: string) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const finance = getFinanceService();
      return finance.getStudentFinancialSummary(studentId);
    });
  });

  ipcMain.handle(
    IPC_CHANNELS.FINANCE_LIST_ALL_SUMMARIES,
    async (
      event,
      filter?: { groupId?: string; status?: FinancialStatus; search?: string }
    ) => {
      if (!validateIpcSender(event, mainWindow)) {
        throw new Error('UNAUTHORIZED_IPC_SENDER');
      }
      return safeIpcCall(async () => {
        runtime.requireAuthenticatedActor();
        const finance = getFinanceService();
        return finance.listAllSummaries(filter);
      });
    }
  );

  ipcMain.handle(IPC_CHANNELS.FINANCE_GET_OVERALL_KPI, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const finance = getFinanceService();
      return finance.getOverallFinanceKpi();
    });
  });

  // --- Discounts ---

  ipcMain.handle(IPC_CHANNELS.FINANCE_APPLY_DISCOUNT, async (event, input: ApplyDiscountInput) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const finance = getFinanceService();
      return finance.applyDiscount(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.FINANCE_LIST_DISCOUNTS, async (event, studentId: string) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const finance = getFinanceService();
      return finance.listDiscounts(studentId);
    });
  });

  // --- Invoicing ---

  ipcMain.handle(IPC_CHANNELS.FINANCE_CREATE_INVOICE, async (event, input: CreateInvoiceInput) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const finance = getFinanceService();
      return finance.createInvoice(input, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.FINANCE_GET_INVOICE, async (event, invoiceId: string) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const finance = getFinanceService();
      return finance.getInvoice(invoiceId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.FINANCE_LIST_INVOICES, async (event, studentId?: string) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const finance = getFinanceService();
      if (studentId) {
        return finance.listStudentInvoices(studentId);
      }
      return finance.invoiceRepo.listAll().map(({ invoice, items }) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        studentId: invoice.studentId,
        groupId: invoice.groupId,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        periodMonth: invoice.periodMonth,
        subtotalCents: invoice.subtotalCents,
        discountCents: invoice.discountCents,
        totalCents: invoice.totalCents,
        paidCents: invoice.paidCents,
        remainingCents: invoice.remainingCents,
        status: invoice.status,
        notes: invoice.notes,
        items: items.map((i) => ({
          id: i.id,
          invoiceId: i.invoiceId,
          description: i.description,
          itemType: i.itemType,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
          amountCents: i.amountCents,
          sessionId: i.sessionId,
        })),
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      }));
    });
  });

  // --- Print & PDF Export ---

  ipcMain.handle(IPC_CHANNELS.FINANCE_PRINT_INVOICE, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      if (!mainWindow) {
        throw new Error('WINDOW_NOT_FOUND: Main window is not available for printing');
      }
      mainWindow.webContents.print({
        silent: false,
        printBackground: true,
      });
      return { printed: true };
    });
  });

  ipcMain.handle(
    IPC_CHANNELS.FINANCE_EXPORT_INVOICE_PDF,
    async (
      event,
      input?: { defaultFilename?: string; targetPath?: string }
    ) => {
      if (!validateIpcSender(event, mainWindow)) {
        throw new Error('UNAUTHORIZED_IPC_SENDER');
      }
      return safeIpcCall(async () => {
        runtime.requireAuthenticatedActor();
        if (!mainWindow) {
          throw new Error('WINDOW_NOT_FOUND: Main window is not available for PDF export');
        }
        const pdfBuffer = await mainWindow.webContents.printToPDF({
          pageSize: 'A4',
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        let destinationPath = input?.targetPath;
        if (!destinationPath) {
          const defaultName = input?.defaultFilename || 'فاتورة_طالب.pdf';
          const saveRes = await dialog.showSaveDialog(mainWindow, {
            title: 'حفظ الفاتورة بصيغة PDF',
            defaultPath: defaultName,
            filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
          });
          if (saveRes.canceled || !saveRes.filePath) {
            return { canceled: true, filePath: '' };
          }
          destinationPath = saveRes.filePath;
        }

        await fs.promises.writeFile(destinationPath, pdfBuffer);
        return { canceled: false, filePath: destinationPath };
      });
    }
  );
}

export function unregisterFinanceIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.FINANCE_RECORD_PAYMENT);
  ipcMain.removeHandler(IPC_CHANNELS.FINANCE_LIST_STUDENT_PAYMENTS);
  ipcMain.removeHandler(IPC_CHANNELS.FINANCE_GET_STUDENT_SUMMARY);
  ipcMain.removeHandler(IPC_CHANNELS.FINANCE_LIST_ALL_SUMMARIES);
  ipcMain.removeHandler(IPC_CHANNELS.FINANCE_GET_OVERALL_KPI);
  ipcMain.removeHandler(IPC_CHANNELS.FINANCE_CREATE_INVOICE);
  ipcMain.removeHandler(IPC_CHANNELS.FINANCE_GET_INVOICE);
  ipcMain.removeHandler(IPC_CHANNELS.FINANCE_LIST_INVOICES);
  ipcMain.removeHandler(IPC_CHANNELS.FINANCE_APPLY_DISCOUNT);
  ipcMain.removeHandler(IPC_CHANNELS.FINANCE_LIST_DISCOUNTS);
  ipcMain.removeHandler(IPC_CHANNELS.FINANCE_PRINT_INVOICE);
  ipcMain.removeHandler(IPC_CHANNELS.FINANCE_EXPORT_INVOICE_PDF);
}
