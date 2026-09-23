import type { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './tool-registry.js';
import type { ConfirmationRecord } from './confirmation-workflow.js';
import { validateConfirmation } from './confirmation-workflow.js';
import type { PreviewResult } from './preview-engine.js';

export interface ExecuteActionDeps {
  generateId: () => string;
  persistReceipt: (receipt: ExecutionReceiptRecord) => void;
  persistAudit: (audit: AuditRecord) => void;
  persistUndoSnapshot: (receiptId: string, snapshot: unknown) => void;
}

export interface ExecutionReceiptRecord {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  previewId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  undoAvailable: boolean;
  undoToken?: string;
  executedAt: string;
}

export interface AuditRecord {
  id: string;
  actorUserId: string;
  sessionId: string;
  toolName: string;
  action: string;
  inputSummaryJson: string;
  affectedEntitiesJson: string;
  outcome: 'SUCCESS' | 'FAILED' | 'CANCELED' | 'UNDO';
  receiptId?: string;
  createdAt: string;
}

export interface ExecuteResult {
  receipt?: ExecutionReceiptRecord;
  success: boolean;
  error?: string;
}

export async function executeConfirmedAction(
  deps: ExecuteActionDeps,
  tool: ToolDefinition,
  input: Record<string, unknown>,
  confirmation: ConfirmationRecord | undefined,
  preview: PreviewResult | undefined,
  context: ToolExecutionContext,
  sessionId: string,
  executor: (input: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<ToolExecutionResult>,
): Promise<ExecuteResult> {
  if (tool.confirmationPolicy === 'required') {
    const validation = validateConfirmation(confirmation, preview, tool.name, input);
    if (!validation.allowed) {
      return { success: false, error: validation.reason };
    }
  }

  try {
    const result = await executor(input, context);
    const receiptId = deps.generateId();
    const undoAvailable = tool.undoCapability !== 'none' && result.success && result.undoSnapshot !== undefined;
    const undoToken = undoAvailable ? deps.generateId() : undefined;

    const receipt: ExecutionReceiptRecord = {
      id: receiptId,
      toolName: tool.name,
      toolInput: input,
      previewId: preview?.id ?? '',
      success: result.success,
      result: result.data,
      error: result.error,
      undoAvailable,
      undoToken,
      executedAt: new Date().toISOString(),
    };

    deps.persistReceipt(receipt);

    if (undoAvailable && undoToken) {
      deps.persistUndoSnapshot(receiptId, result.undoSnapshot);
    }

    deps.persistAudit({
      id: deps.generateId(),
      actorUserId: context.actorUserId,
      sessionId,
      toolName: tool.name,
      action: 'EXECUTE',
      inputSummaryJson: JSON.stringify(input).slice(0, 2000),
      affectedEntitiesJson: JSON.stringify(result.affectedEntities ?? []),
      outcome: result.success ? 'SUCCESS' : 'FAILED',
      receiptId,
      createdAt: new Date().toISOString(),
    });

    if (confirmation) {
      confirmation.executed = true;
    }

    return { receipt, success: result.success, error: result.error };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'خطأ غير متوقع في تنفيذ الإجراء';

    deps.persistAudit({
      id: deps.generateId(),
      actorUserId: context.actorUserId,
      sessionId,
      toolName: tool.name,
      action: 'EXECUTE',
      inputSummaryJson: JSON.stringify(input).slice(0, 2000),
      affectedEntitiesJson: '[]',
      outcome: 'FAILED',
      createdAt: new Date().toISOString(),
    });

    return { success: false, error: errorMsg };
  }
}
