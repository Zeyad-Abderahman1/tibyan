import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopUtilityBar } from './TopUtilityBar.js';
import { RightMainSidebar } from './RightMainSidebar.js';

/**
 * AppShell:
 * Coordinates the 4-layer approved desktop architecture:
 * Layer 1: Top Utility Bar (Identity, Academic Year, Teacher Identity, Theme, Logout)
 * Layer 2: Right Collapsible Main Navigation (Physical RIGHT in RTL, 8 primary sections)
 * Layer 3: Contextual Dynamic Island (Rendered inside each page workspace)
 * Layer 4: Main Workspace (Authoritative single scrolling container)
 */
export function AppShell() {
  const [, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div
      className="h-screen w-full bg-[var(--color-bg-app)] text-[var(--color-text-primary)] flex flex-col overflow-hidden selection:bg-[var(--color-brand-primary)] selection:text-white"
      dir="rtl"
      data-testid="app-shell"
    >
      {/* Layer 1: Top Utility Bar */}
      <TopUtilityBar />

      {/* Main Container: Right Sidebar + Authoritative Workspace Stage */}
      <div className="flex-1 flex min-h-0 overflow-hidden" dir="rtl">
        {/* Layer 2: first in RTL flex order, therefore physically on the right */}
        <RightMainSidebar onCollapsedChange={setIsSidebarCollapsed} />

        {/* Layer 4: Authoritative Scrollable Workspace */}
        <main
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain py-6 px-6 min-[1500px]:px-8 max-w-[1600px] w-full mx-auto focus:outline-none transition-all duration-200"
          tabIndex={-1}
          role="main"
          data-testid="workspace-stage"
        >
          <div key={location.pathname} className="page-workspace-enter min-h-full">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}
