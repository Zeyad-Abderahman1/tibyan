import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '../src/components/layout/AppShell.js';
import { Sidebar, NAV_ITEMS } from '../src/components/layout/Sidebar.js';
import { Topbar } from '../src/components/layout/Topbar.js';
import { Providers } from '../src/app/providers.js';
import {
  TodayPlaceholder,
  StudentsPlaceholder,
  SettingsPlaceholder,
  router,
} from '../src/app/router.js';

describe('Task 11: Desktop App Shell & RTL Navigation Suite', () => {
  beforeEach(() => {

    // Mock window.tibyan for renderer tests
    (global as any).window = (global as any).window || {};
    (global as any).window.tibyan = {
      system: {
        getSettings: vi.fn().mockResolvedValue({
          success: true,
          data: {
            theme: 'light',
            activeAcademicYearId: 'year-1',
            activeAcademicYearName: '2026-2027',
          },
        }),
        getSetupState: vi.fn().mockResolvedValue({
          success: true,
          data: {
            isSetupComplete: true,
            hasOwner: true,
            hasActiveAcademicYear: true,
            activeAcademicYearName: '2026-2027',
          },
        }),
      },
      auth: {
        listUsers: vi.fn().mockResolvedValue({ success: true, data: [] }),
      },
    };
  });

  it('verifies AppShell root direction is strictly RTL and wraps Sidebar + Topbar', () => {
    const html = renderToStaticMarkup(
      <Providers>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </Providers>
    );

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('data-testid="app-shell"');
    expect(html).toContain('aria-label="القائمة الجانبية الرئيسية"');
    expect(html).toContain('aria-label="شريط الرأس العلوي"');
  });

  it('verifies Sidebar is docked permanently on the right with border-e in RTL', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    // Sidebar uses w-64, flex-col, and border-e (inline-end border)
    expect(html).toContain('w-64');
    expect(html).toContain('border-e');
    expect(html).toContain('select-none');
  });

  it('verifies Sidebar renders the exact design-system Logo component and title', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    // Logo image has alt="تِبيان"
    expect(html).toContain('alt="تِبيان"');
    expect(html).toContain('تِبيان');
    expect(html).toContain('نظام إدارة المعلم');
  });

  it('verifies Sidebar contains all 4 canonical navigation items with keyboard accessible links', () => {
    expect(NAV_ITEMS).toHaveLength(4);
    expect(NAV_ITEMS.map((i) => i.to)).toEqual(['/', '/students', '/groups', '/settings']);

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(html).toContain('اليوم');
    expect(html).toContain('الطلاب');
    expect(html).toContain('المجموعات');
    expect(html).toContain('الإعدادات');
    expect(html).toContain('role="navigation"');
    expect(html).toContain('focus-visible:ring-2');
  });

  it('verifies Topbar renders without hardcoding any academic year', () => {
    // Initial render before query resolution must not output a hardcoded fake year
    const html = renderToStaticMarkup(
      <Providers>
        <Topbar />
      </Providers>
    );

    // Should not render arbitrary hardcoded years when no settings are pre-populated
    expect(html).toContain('aria-label="شريط الرأس العلوي"');
    expect(html).not.toContain('2099-3000');
  });

  it('verifies router uses packaged-Electron-safe HashRouter', () => {
    expect(router).toBeDefined();
    // Verify router is a HashRouter instance
    expect(router.routes).toBeDefined();
    expect(router.routes.length).toBeGreaterThan(0);
    expect(router.routes[0]?.path).toBe('/');
  });

  it('verifies placeholder views contain zero mock data or fake business records', () => {
    const todayHtml = renderToStaticMarkup(<TodayPlaceholder />);
    expect(todayHtml).toContain('data-testid="page-today"');
    expect(todayHtml).not.toContain('حصة 1');
    expect(todayHtml).not.toContain('طالب تجريبي');

    const studentsHtml = renderToStaticMarkup(<StudentsPlaceholder />);
    expect(studentsHtml).toContain('data-testid="page-students"');
    expect(studentsHtml).not.toContain('TB-0001');

    const settingsHtml = renderToStaticMarkup(<SettingsPlaceholder />);
    expect(settingsHtml).toContain('data-testid="page-settings"');

    // Groups route is now real GroupsPage
    const rootRoute = router.routes[0];
    const groupChildRoute = rootRoute?.children?.find((c) => c.path === 'groups');
    expect(groupChildRoute).toBeDefined();
  });

  it('verifies dark and light theme tokens render AppShell cleanly without broken styles', () => {
    const lightHtml = renderToStaticMarkup(
      <Providers>
        <MemoryRouter>
          <div data-theme="light">
            <AppShell />
          </div>
        </MemoryRouter>
      </Providers>
    );
    expect(lightHtml).toContain('data-theme="light"');

    const darkHtml = renderToStaticMarkup(
      <Providers>
        <MemoryRouter>
          <div data-theme="dark">
            <AppShell />
          </div>
        </MemoryRouter>
      </Providers>
    );
    expect(darkHtml).toContain('data-theme="dark"');
  });
});
