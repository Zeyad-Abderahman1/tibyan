import React from 'react';
import { cn } from '@tibyan/design-system';

export interface WorkspaceStageProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * WorkspaceStage provides an open, spacious application canvas.
 * Implements approximately 40-64px horizontal breathing room at 1920x1080,
 * generous vertical clearance for the floating navigation island,
 * and expands data-heavy productivity views without boxing the app into a rigid card.
 */
export function WorkspaceStage({ children, className }: WorkspaceStageProps) {
  return (
    <main
      className={cn(
        'flex-1 pt-24 px-6 sm:px-10 lg:px-14 xl:px-16 pb-12 w-full max-w-[1600px] mx-auto focus:outline-none transition-opacity duration-200',
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
