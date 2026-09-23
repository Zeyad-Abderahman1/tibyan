import type { PreviewResult } from './preview-engine.js';
import { isPreviewExpired, previewMatchesInput } from './preview-engine.js';

export interface ConfirmationRecord {
  previewId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  summary: string;
  confirmed: boolean;
  executed: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface ConfirmActionResult {
  allowed: boolean;
  reason?: string;
}

export function validateConfirmation(
  confirmation: ConfirmationRecord | undefined,
  preview: PreviewResult | undefined,
  toolName: string,
  toolInput: Record<string, unknown>,
): ConfirmActionResult {
  if (!confirmation) {
    return { allowed: false, reason: 'لم يتم العثور على تأكيد لهذا الإجراء' };
  }

  if (isPreviewExpired(preview!)) {
    return { allowed: false, reason: 'انتهت صلاحية المعاينة. يرجى إعادة المحاولة' };
  }

  if (confirmation.executed) {
    return { allowed: false, reason: 'تم تنفيذ هذا الإجراء بالفعل' };
  }

  if (!confirmation.confirmed) {
    return { allowed: false, reason: 'لم يتم تأكيد هذا الإجراء بعد' };
  }

  if (!previewMatchesInput(preview!, toolName, toolInput)) {
    return { allowed: false, reason: 'المدخلات غير متطابقة مع المعاينة الأصلية' };
  }

  return { allowed: true };
}

export function createConfirmationRecord(preview: PreviewResult): ConfirmationRecord {
  return {
    previewId: preview.id,
    toolName: preview.toolName,
    toolInput: preview.toolInput,
    summary: preview.summary,
    confirmed: false,
    executed: false,
    expiresAt: preview.expiresAt,
    createdAt: new Date().toISOString(),
  };
}
