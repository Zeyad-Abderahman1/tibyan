import { describe, it, expect, beforeEach } from 'vitest';
import { listTools, registerAllAssistantTools } from '@tibyan/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Assistant Tool Matrix & Zero Unimplemented Tools Invariant', () => {
  beforeEach(() => {
    registerAllAssistantTools();
  });

  it('verifies all registered tools have executeTool implementations in assistant.ipc.ts', () => {
    const allTools = listTools();
    expect(allTools.length).toBeGreaterThan(70);

    const ipcContent = fs.readFileSync(
      path.resolve(__dirname, '../electron/ipc/assistant.ipc.ts'),
      'utf-8'
    );

    const unimplementedTools: string[] = [];
    const matrix: Array<{
      name: string;
      category: string;
      riskLevel: string;
      permission: string;
      requiresConfirmation: boolean;
      undoCapability: string;
      implemented: boolean;
    }> = [];

    for (const tool of allTools) {
      // Check that the tool name is specifically handled in assistant.ipc.ts
      const isHandled = ipcContent.includes(`toolName === '${tool.name}'`);
      if (!isHandled) {
        unimplementedTools.push(tool.name);
      }

      matrix.push({
        name: tool.name,
        category: tool.category,
        riskLevel: tool.riskLevel,
        permission: tool.requiredPermissions.join(', '),
        requiresConfirmation: tool.confirmationPolicy === 'required',
        undoCapability: tool.undoCapability,
        implemented: isHandled,
      });
    }

    expect(unimplementedTools).toEqual([]);
    expect(matrix.every((m) => m.implemented)).toBe(true);

    const readTools = allTools.filter((t) => t.riskLevel === 'read-only');
    const mutationTools = allTools.filter((t) => t.riskLevel !== 'read-only');

    expect(readTools.length).toBe(49);
    expect(mutationTools.length).toBe(40);
    expect(allTools.length).toBe(89);
  });
});
