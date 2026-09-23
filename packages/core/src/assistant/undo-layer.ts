import type { ExecutionReceiptRecord, AuditRecord } from './execute-audit.js';

export interface UndoDeps {
  generateId: () => string;
  getReceipt: (receiptId: string) => ExecutionReceiptRecord | undefined;
  getUndoSnapshot: (receiptId: string) => unknown | undefined;
  persistAudit: (audit: AuditRecord) => void;
}

export interface UndoResult {
  success: boolean;
  receiptId: string;
  undoneAt: string;
  error?: string;
}

export type UndoExecutor = (receiptId: string, snapshot: unknown) => Promise<{ success: boolean; error?: string }>;

export async function executeUndo(
  deps: UndoDeps,
  receiptId: string,
  undoToken: string,
  sessionId: string,
  actorUserId: string,
  undoExecutor: UndoExecutor,
): Promise<UndoResult> {
  const receipt = deps.getReceipt(receiptId);

  if (!receipt) {
    return { success: false, receiptId, undoneAt: new Date().toISOString(), error: 'لم يتم العثور على الإيصال' };
  }

  if (!receipt.undoAvailable) {
    return { success: false, receiptId, undoneAt: new Date().toISOString(), error: 'هذا الإجراء لا يمكن التراجع عنه' };
  }

  if (receipt.undoToken !== undoToken) {
    return { success: false, receiptId, undoneAt: new Date().toISOString(), error: 'رمز التراجع غير صالح' };
  }

  const snapshot = deps.getUndoSnapshot(receiptId);
  if (snapshot === undefined) {
    return { success: false, receiptId, undoneAt: new Date().toISOString(), error: 'لم يتم العثور على بيانات الحالة السابقة' };
  }

  try {
    const result = await undoExecutor(receiptId, snapshot);
    const undoneAt = new Date().toISOString();

    deps.persistAudit({
      id: deps.generateId(),
      actorUserId,
      sessionId,
      toolName: receipt.toolName,
      action: 'UNDO',
      inputSummaryJson: JSON.stringify({ originalReceiptId: receiptId }),
      affectedEntitiesJson: '[]',
      outcome: result.success ? 'UNDO' : 'FAILED',
      receiptId,
      createdAt: undoneAt,
    });

    return {
      success: result.success,
      receiptId,
      undoneAt,
      error: result.error,
    };
  } catch (err) {
    return {
      success: false,
      receiptId,
      undoneAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'خطأ غير متوقع في التراجع',
    };
  }
}
