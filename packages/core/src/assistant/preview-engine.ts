import type { ToolDefinition } from './tool-registry.js';
import { classifyConfirmationPolicy } from './risk-classifier.js';

export interface PreviewItem {
  entityLabel: string;
  entityId?: string;
  changeKind: 'create' | 'update' | 'delete' | 'bulk-update' | 'reassign';
  changes: Array<{ field: string; label: string; before?: unknown; after?: unknown }>;
  irreversible?: boolean;
}

export interface PreviewActionProposal {
  toolName: string;
  toolInput: Record<string, unknown>;
}

export interface PreviewResult {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  actions?: PreviewActionProposal[];
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
    actions: [{ toolName: tool.name, toolInput: input }],
    summary: deps.buildSummary(tool.name, items),
    items,
    requiresConfirmation,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function generateCombinedPreview(
  deps: PreviewEngineDeps,
  proposals: Array<{ tool: ToolDefinition; input: Record<string, unknown> }>,
): Promise<PreviewResult> {
  if (proposals.length === 1) {
    return generatePreview(deps, proposals[0]!.tool, proposals[0]!.input);
  }

  const allItems: PreviewItem[] = [];
  const actions: PreviewActionProposal[] = [];
  let requiresConfirmation = false;

  for (const p of proposals) {
    actions.push({ toolName: p.tool.name, toolInput: p.input });
    const items = await deps.buildPreview(p.tool.name, p.input);
    allItems.push(...items);
    if (classifyConfirmationPolicy(p.tool, p.input) === 'required') {
      requiresConfirmation = true;
    }
  }

  const primaryTool = proposals[0]!.tool;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

  // Group summary for bulk actions
  const entityLabels = allItems.map((i) => i.entityLabel).filter(Boolean);
  let summary = '';
  if (proposals.every((p) => p.tool.name === 'create_group')) {
    summary = `إنشاء ${proposals.length} مجموعات دراسية: ${entityLabels.join('، ')}`;
  } else if (proposals.every((p) => p.tool.name === 'create_student')) {
    summary = `إضافة ${proposals.length} طلاب: ${entityLabels.join('، ')}`;
  } else {
    summary = `إجراء جماعي (${proposals.length} عمليات): ${entityLabels.join('، ')}`;
  }

  return {
    id: deps.generateId(),
    toolName: primaryTool.name,
    toolInput: proposals[0]!.input,
    actions,
    summary,
    items: allItems,
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
