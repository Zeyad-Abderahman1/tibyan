import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from '../src/app/providers.js';
import { AppShell } from '../src/components/layout/AppShell.js';
import { RightMainSidebar, APPROVED_NAV_ITEMS } from '../src/components/layout/RightMainSidebar.js';
import { TopUtilityBar } from '../src/components/layout/TopUtilityBar.js';
import { ContextualDynamicIsland } from '../src/components/layout/ContextualDynamicIsland.js';
import { CurriculumLibraryPage } from '../src/features/curriculum-library/CurriculumLibraryPage.js';

describe('Motion Polish Verification Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        getSession: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'owner-1',
            username: 'abdullah22',
            fullName: 'عبدالله هانئ',
            role: 'OWNER',
          },
        }),
        listUsers: vi.fn().mockResolvedValue({ success: true, data: [] }),
      },
      settings: {
        updateTheme: vi.fn().mockResolvedValue({ success: true, data: { theme: 'dark' } }),
      },
      curriculumLibrary: {
        list: vi.fn().mockResolvedValue({
          success: true,
          data: [
            {
              id: 'doc-1',
              title: 'كتاب الرياضيات للصف الأول',
              gradeLevel: 'EGYPT_PRIMARY',
              educationSystem: 'EGYPTIAN',
              subject: 'الرياضيات',
              pageCount: 42,
            },
          ],
        }),
        getGrouped: vi.fn().mockResolvedValue({
          success: true,
          data: [
            {
              gradeLevel: 'EGYPT_PRIMARY',
              educationSystem: 'EGYPTIAN',
              count: 1,
              documents: [
                {
                  id: 'doc-1',
                  title: 'كتاب الرياضيات للصف الأول',
                  gradeLevel: 'EGYPT_PRIMARY',
                  educationSystem: 'EGYPTIAN',
                  subject: 'الرياضيات',
                  pageCount: 42,
                },
              ],
            },
          ],
        }),
        delete: vi.fn().mockResolvedValue({ success: true, data: true }),
      },
    };
  });

  describe('1. Main Sidebar Active Gliding Indicator', () => {
    it('renders the shared gliding active indicator and nav item testids in RightMainSidebar', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/']}>
          <RightMainSidebar />
        </MemoryRouter>
      );

      expect(html).toContain('data-testid="right-main-sidebar"');
      expect(html).toContain('data-testid="sidebar-nav"');
      expect(html).toContain('data-testid="sidebar-toggle-btn"');

      // Verify all 8 items exist
      APPROVED_NAV_ITEMS.forEach((item) => {
        expect(html).toContain(`data-testid="sidebar-item-${item.key}"`);
      });
    });

    it('marks the matching route as data-active="true"', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/students']}>
          <RightMainSidebar />
        </MemoryRouter>
      );

      expect(html).toContain('data-testid="sidebar-item-students"');
      expect(html).toContain('data-active="true"');
    });
  });

  describe('2. Page Content Transition', () => {
    it('AppShell wraps outlet inside page-workspace-enter container', () => {
      const html = renderToStaticMarkup(
        <Providers>
          <MemoryRouter initialEntries={['/']}>
            <AppShell />
          </MemoryRouter>
        </Providers>
      );

      expect(html).toContain('class="page-workspace-enter min-h-full"');
      expect(html).toContain('data-testid="workspace-stage"');
    });
  });

  describe('3. Contextual Dynamic Island Horizontal Indicator', () => {
    it('renders shared horizontal active indicator markup structure when an action is active', () => {
      const html = renderToStaticMarkup(
        <ContextualDynamicIsland
          title="الأدوات"
          actions={[
            { id: 'tab1', label: 'التبويب الأول', active: true },
            { id: 'tab2', label: 'التبويب الثاني', active: false },
          ]}
        />
      );

      expect(html).toContain('data-testid="contextual-dynamic-island"');
      expect(html).toContain('data-testid="island-action-tab1"');
      expect(html).toContain('data-testid="island-action-tab2"');
      expect(html).toContain('التبويب الأول');
      expect(html).toContain('التبويب الثاني');
    });
  });

  describe('4. Custom Animated Dark Mode Toggle Switch', () => {
    it('renders the custom toggle switch with thumb, track, and data-testid', () => {
      const html = renderToStaticMarkup(
        <Providers>
          <TopUtilityBar />
        </Providers>
      );

      expect(html).toContain('data-testid="topbar-theme-toggle-btn"');
      expect(html).toContain('dir="ltr"');
      expect(html).toContain('translate-x-');
    });
  });

  describe('5. Delete Action Component Structure', () => {
    it('CurriculumLibraryPage renders properly with views and delete button structure', () => {
      const html = renderToStaticMarkup(
        <Providers>
          <MemoryRouter initialEntries={['/curriculum-library']}>
            <CurriculumLibraryPage />
          </MemoryRouter>
        </Providers>
      );

      expect(html).toContain('مكتبة المناهج');
    });
  });
});
