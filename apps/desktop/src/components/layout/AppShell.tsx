import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { Topbar } from './Topbar.js';

export function AppShell() {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg-app)] text-[var(--color-text-primary)]"
      dir="rtl"
      data-testid="app-shell"
    >
      {/* Permanent Right-Docked Sidebar in RTL */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <Topbar />
        <main
          className="flex-1 overflow-y-auto p-6 min-w-0 focus:outline-none"
          tabIndex={-1}
          role="main"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
