export type ToolRiskLevel = 'read-only' | 'low-risk' | 'sensitive' | 'prohibited';
export type ConfirmationPolicy = 'none' | 'optional' | 'required';
export type UndoCapability = 'none' | 'snapshot' | 'reverse';

export interface ToolDefinition {
  name: string;
  description: string;
  descriptionAr: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  riskLevel: ToolRiskLevel;
  confirmationPolicy: ConfirmationPolicy;
  undoCapability: UndoCapability;
  requiredPermissions: string[];
  category: string;
}

export interface ToolExecutionContext {
  actorUserId: string;
  actorName: string;
  actorRole: string;
  permissions: string[];
  activeAcademicYearId: string | null;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  affectedEntities?: Array<{ entityType: string; entityId: string; label: string }>;
  undoSnapshot?: unknown;
}

const registeredTools = new Map<string, ToolDefinition>();

export function registerTool(definition: ToolDefinition): void {
  if (registeredTools.has(definition.name)) {
    throw new Error(`TOOL_ALREADY_REGISTERED: ${definition.name}`);
  }
  if (definition.riskLevel === 'prohibited') {
    throw new Error(`PROHIBITED_TOOLS_CANNOT_BE_REGISTERED: ${definition.name}`);
  }
  registeredTools.set(definition.name, definition);
}

export function getTool(name: string): ToolDefinition | undefined {
  return registeredTools.get(name);
}

export function requireTool(name: string): ToolDefinition {
  const tool = registeredTools.get(name);
  if (!tool) throw new Error(`TOOL_NOT_FOUND: ${name}`);
  return tool;
}

export function listTools(): ToolDefinition[] {
  return Array.from(registeredTools.values());
}

export function listToolsSummary(): Array<{ name: string; description: string; riskLevel: string }> {
  return Array.from(registeredTools.values()).map((t) => ({
    name: t.name,
    description: t.descriptionAr,
    riskLevel: t.riskLevel,
  }));
}

export function isToolRegistered(name: string): boolean {
  return registeredTools.has(name);
}

export function clearAllTools(): void {
  registeredTools.clear();
}
