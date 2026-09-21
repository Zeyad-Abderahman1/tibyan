import type { ToolDefinition } from './tool-registry.js';
import { classifyConfirmationPolicy } from './risk-classifier.js';

export interface PreviewItem {
  entityLabel: string;
  entityId?: string;
  changeKind: 'create' | 'update' | 'delete' | 'bulk-update' | 'reassign';
  changes: Array<{ field: string; label: string; before?: unknown; after?: unknown }>;
  irreversible?: boolean;
}

export interface PreviewResult {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  summary: string;
  items: PreviewItem[];
  requiresConfirmation: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface PreviewEngineDeps {
  generateId: () => string;
  buildPreview: (toolName: string, input: Record<string, unknown>) => Promise<PreviewItem[]>;
  buildSummary: (toolName: string, items: PreviewItem[]) => string;
}

export async function generatePreview(
  deps: PreviewEngineDeps,
  tool: ToolDefinition,
  input: Record<string, unknown>,
): Promise<PreviewResult> {
  const items = await deps.buildPreview(tool.name, input);
  const requiresConfirmation = classifyConfirmationPolicy(tool, input) === 'required';
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

  return {
    id: deps.generateId(),
    toolName: tool.name,
    toolInput: input,
    summary: deps.buildSummary(tool.name, items),
    items,
    requiresConfirmation,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export function isPreviewExpired(preview: PreviewResult): boolean {
  return new Date(preview.expiresAt) < new Date();
}

export function previewMatchesInput(
  preview: PreviewResult,
  toolName: string,
  input: Record<string, unknown>,
): boolean {
  return preview.toolName === toolName && JSON.stringify(preview.toolInput) === JSON.stringify(input);
}
