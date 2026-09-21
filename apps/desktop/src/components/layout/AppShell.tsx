import { Outlet } from 'react-router-dom';
import { DynamicIslandShell } from './DynamicIslandShell.js';
import { WorkspaceStage } from './WorkspaceStage.js';

export function AppShell() {
  return (
    <div
      className="h-screen w-full bg-[var(--color-bg-app)] text-[var(--color-text-primary)] flex flex-col overflow-hidden selection:bg-[var(--color-brand-primary)] selection:text-white"
      dir="rtl"
      data-testid="app-shell"
    >
      {/* Floating Dynamic Island Navigation Header */}
      <DynamicIslandShell />

      {/* Open, Spacious Workspace Stage */}
      <WorkspaceStage>
        <Outlet />
      </WorkspaceStage>
    </div>
  );
}
