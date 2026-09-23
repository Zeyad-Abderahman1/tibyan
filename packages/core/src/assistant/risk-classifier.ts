import type { ToolDefinition, ToolRiskLevel, ConfirmationPolicy } from './tool-registry.js';

export function classifyConfirmationPolicy(tool: ToolDefinition, input: Record<string, unknown>): ConfirmationPolicy {
  if (tool.riskLevel === 'read-only') return 'none';
  if (tool.confirmationPolicy === 'required') return 'required';

  if (tool.riskLevel === 'sensitive') return 'required';

  if (tool.riskLevel === 'low-risk') {
    if (isBulkOperation(input)) return 'required';
    return tool.confirmationPolicy;
  }

  return 'none';
}

export function isBulkOperation(input: Record<string, unknown>): boolean {
  const items = input.items ?? input.records ?? input.ids;
  if (Array.isArray(items) && items.length > 5) return true;
  return false;
}

export function summarizeRiskLevel(level: ToolRiskLevel): string {
  switch (level) {
    case 'read-only': return 'قراءة فقط';
    case 'low-risk': return 'تعديل منخفض المخاطر';
    case 'sensitive': return 'تعديل حساس';
    case 'prohibited': return 'محظور';
  }
}

export function isIrreversible(tool: ToolDefinition): boolean {
  return tool.undoCapability === 'none' && (tool.riskLevel === 'sensitive' || tool.name.includes('delete'));
}
