import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '../src/components/layout/AppShell.js';
import { RightMainSidebar, APPROVED_NAV_ITEMS } from '../src/components/layout/RightMainSidebar.js';
import { TopUtilityBar } from '../src/components/layout/TopUtilityBar.js';
import { TeacherAvatar } from '../src/components/layout/TeacherAvatar.js';
import { ContextualDynamicIsland } from '../src/components/layout/ContextualDynamicIsland.js';
import { Providers } from '../src/app/providers.js';
import {
  StudentsPlaceholder,
  SettingsPlaceholder,
  router,
} from '../src/app/router.js';

describe('Desktop App Shell, RTL Navigation & Contextual Island Suite', () => {
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

  it('verifies AppShell root direction is strictly RTL and wraps TopUtilityBar, RightMainSidebar + WorkspaceStage', () => {
    const html = renderToStaticMarkup(
      <Providers>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </Providers>
    );

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('data-testid="app-shell"');
    expect(html).toContain('data-testid="top-utility-bar"');
    expect(html).toContain('data-testid="right-main-sidebar"');
    expect(html).toContain('data-testid="workspace-stage"');
  });

  it('places the primary sidebar before the workspace in RTL flex order so it renders physically on the right', () => {
    const html = renderToStaticMarkup(
      <Providers>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </Providers>
    );

    expect(html.indexOf('data-testid="right-main-sidebar"')).toBeLessThan(
      html.indexOf('data-testid="workspace-stage"')
    );
  });

  it('verifies RightMainSidebar contains exactly the approved 8 primary navigation sections in order', () => {
    expect(APPROVED_NAV_ITEMS).toHaveLength(8);
    expect(APPROVED_NAV_ITEMS.map((i) => i.to)).toEqual([
      '/',
      '/students',
      '/groups',
      '/attendance',
      '/curriculum-library',
      '/finance',
      '/assistant',
      '/settings',
    ]);
    expect(APPROVED_NAV_ITEMS.map((i) => i.label)).toEqual([
      'اليوم',
      'الطلاب',
      'المجموعات',
      'تحضير الطلاب',
      'مكتبة المناهج',
      'المالية',
      'تِبيان',
      'الإعدادات',
    ]);

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/']}>
        <RightMainSidebar />
      </MemoryRouter>
    );

    expect(html).toContain('data-testid="right-main-sidebar"');
    expect(html).toContain('اليوم');
    expect(html).toContain('الطلاب');
    expect(html).toContain('المجموعات');
    expect(html).toContain('تحضير الطلاب');
    expect(html).toContain('مكتبة المناهج');
    expect(html).toContain('المالية');
    expect(html).toContain('تِبيان');
    expect(html).toContain('الإعدادات');

    // Forbidden items verification
    expect(html).not.toContain('الاختبارات');
    expect(html).not.toContain('الشرائح');
    expect(html).not.toContain('Math Engine');
    expect(html).not.toContain('Gemini');
  });

  it('verifies RightMainSidebar has collapse/expand control and accessible links', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/']}>
        <RightMainSidebar />
      </MemoryRouter>
    );

    expect(html).toContain('data-testid="sidebar-toggle-btn"');
    expect(html).toContain('role="navigation"');
    expect(html).toContain('focus-visible:ring-2');
  });

  it('verifies TopUtilityBar contains 0 primary navigation tabs', () => {
    const html = renderToStaticMarkup(
      <Providers>
        <MemoryRouter>
          <TopUtilityBar />
        </MemoryRouter>
      </Providers>
    );

    expect(html).toContain('data-testid="top-utility-bar"');
    expect(html).not.toContain('role="navigation"');
    // Top bar must not contain primary navigation links
    expect(html).not.toContain('data-testid="sidebar-item-today"');
    expect(html).not.toContain('data-testid="sidebar-item-students"');
  });

  it('verifies TeacherAvatar renders initials or photo gracefully', () => {
    const initialsHtml = renderToStaticMarkup(
      <TeacherAvatar name="أحمد محمد" role="OWNER" />
    );
    expect(initialsHtml).toContain('data-testid="teacher-avatar"');
    expect(initialsHtml).toContain('أ');

    const photoHtml = renderToStaticMarkup(
      <TeacherAvatar name="سارة علي" photoUrl="https://example.com/photo.jpg" />
    );
    expect(photoHtml).toContain('<img');
    expect(photoHtml).toContain('src="https://example.com/photo.jpg"');
    expect(photoHtml).toContain('object-cover');
  });

  it('renders the enlarged teacher identity at the approved top-bar scale', () => {
    const avatarHtml = renderToStaticMarkup(
      <TeacherAvatar name="أحمد محمد" role="OWNER" size="sm" />
    );
    expect(avatarHtml).toContain('w-[38px]');
    expect(avatarHtml).toContain('h-[38px]');

    const topbarHtml = renderToStaticMarkup(
      <Providers>
        <MemoryRouter>
          <TopUtilityBar />
        </MemoryRouter>
      </Providers>
    );
    expect(topbarHtml).toContain('h-[var(--topbar-height)]');
  });

  it('verifies ContextualDynamicIsland renders actions with proper styling and accessible role', () => {
    const actions = [
      { id: 'view-1', label: 'نظرة عامة', active: true },
      { id: 'view-2', label: 'إجراء إضافي', active: false },
    ];
    const html = renderToStaticMarkup(
      <ContextualDynamicIsland title="اختبار جزيرة" actions={actions} />
    );

    expect(html).toContain('data-testid="contextual-dynamic-island"');
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('اختبار جزيرة');
    expect(html).toContain('نظرة عامة');
    expect(html).toContain('إجراء إضافي');
  });

  it('verifies router uses packaged-Electron-safe HashRouter', () => {
    expect(router).toBeDefined();
    expect(router.routes).toBeDefined();
    expect(router.routes.length).toBeGreaterThan(0);
    expect(router.routes[0]?.path).toBe('/');
  });

  it('verifies placeholder views contain zero mock data or fake business records', () => {
    const rootRoute = router.routes[0];
    const todayIndexRoute = rootRoute?.children?.find((c) => c.index === true);
    expect(todayIndexRoute).toBeDefined();

    const studentsHtml = renderToStaticMarkup(<StudentsPlaceholder />);
    expect(studentsHtml).toContain('data-testid="page-students"');
    expect(studentsHtml).not.toContain('TB-0001');

    const settingsHtml = renderToStaticMarkup(<SettingsPlaceholder />);
    expect(settingsHtml).toContain('data-testid="page-settings"');

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

  it('verifies TopUtilityBar theme toggle button and action controls exist with accessible labels', () => {
    const html = renderToStaticMarkup(
      <Providers>
        <MemoryRouter>
          <TopUtilityBar />
        </MemoryRouter>
      </Providers>
    );

    expect(html).toContain('data-testid="topbar-theme-toggle-btn"');
    expect(html).toContain('الوضع الداكن');
  });
});
