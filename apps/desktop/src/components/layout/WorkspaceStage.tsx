import React from 'react';
import { cn } from '@tibyan/design-system';

export interface WorkspaceStageProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * WorkspaceStage provides an open, spacious application canvas.
 * Controls top clearance for the floating DynamicIslandShell, spacing, and width constraints
 * without boxing the entire page into a single rigid card.
 */
export function WorkspaceStage({ children, className }: WorkspaceStageProps) {
  return (
    <main
      className={cn(
        'flex-1 pt-20 px-6 pb-8 max-w-7xl w-full mx-auto focus:outline-none transition-opacity duration-200',
        className
      )}
      tabIndex={-1}
      role="main"
      data-testid="workspace-stage"
    >
      {children}
    </main>
  );
}
