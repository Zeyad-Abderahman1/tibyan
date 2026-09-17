import {
  createHashRouter,
  createMemoryRouter,
  Navigate,
  type RouteObject,
  type RouterProviderProps,
} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../components/layout/AppShell.js';
import { FirstRunWizard } from '../features/onboarding/FirstRunWizard.js';
import { Card } from '@tibyan/design-system';

/**
 * Root Controller: Checks authoritative persisted SQLite setup state.
 * Directs fresh installations or interrupted setups to FirstRunWizard,
 * and configured installations to AppShell.
 */
export function RootLayout() {
  const {
    data: setupState,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['setupState'],
    queryFn: async () => {
      if (typeof window !== 'undefined' && window.tibyan?.system?.getSetupState) {
        const res = await window.tibyan.system.getSetupState();
        if (res.success) {
          return res.data;
        }
      }
      return null;
    },
    staleTime: 1000 * 10,
  });

  if (isLoading) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center bg-[var(--color-bg-app)] text-[var(--color-text-primary)]"
        dir="rtl"
        data-testid="app-loading"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
          <span className="text-sm text-[var(--color-text-secondary)] font-medium">جاري تشغيل تِبيان...</span>
        </div>
      </div>
    );
  }

  // If setup is incomplete (no Owner OR no active academic year), render FirstRunWizard
  if (!setupState?.isSetupComplete) {
    return <FirstRunWizard setupState={setupState} onComplete={() => refetch()} />;
  }

  // Once setup is authoritatively complete, render the AppShell
  return <AppShell />;
}

/**
 * Placeholder Views for Shell-Level Navigation
 * No mock data, no premature feature logic belonging to later tasks.
 */
export function TodayPlaceholder() {
  return (
    <div className="space-y-4" data-testid="page-today">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-subtle)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">اليوم</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">متابعة حصص ومواعيد اليوم الحالي</p>
        </div>
      </div>
      <Card variant="default" className="p-8 text-center text-[var(--color-text-secondary)] space-y-2">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">مرحباً بك في تِبيان</h2>
        <p className="text-sm max-w-md mx-auto">
          تم إعداد النظام بنجاح. سيتم عرض حصص وجداول اليوم تلقائياً فور تسجيل المجموعات والطلاب.
        </p>
      </Card>
    </div>
  );
}

export function StudentsPlaceholder() {
  return (
    <div className="space-y-4" data-testid="page-students">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-subtle)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">إدارة الطلاب</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">سجل بيانات واشتراكات الطلاب</p>
        </div>
      </div>
      <Card variant="default" className="p-8 text-center text-[var(--color-text-secondary)] space-y-2">
        <p className="text-sm max-w-md mx-auto">
          واجهة إدارة الطلاب وقوائم التسجيل ستكتمل في المرحلة المخصصة للطلاب.
        </p>
      </Card>
    </div>
  );
}

export function GroupsPlaceholder() {
  return (
    <div className="space-y-4" data-testid="page-groups">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-subtle)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">إدارة المجموعات</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">تنظيم المجموعات والجداول الأسبوعية</p>
        </div>
      </div>
      <Card variant="default" className="p-8 text-center text-[var(--color-text-secondary)] space-y-2">
        <p className="text-sm max-w-md mx-auto">
          واجهة إنشاء المجموعات وضبط مواعيد الحصص ستكتمل في المرحلة المخصصة للمجموعات.
        </p>
      </Card>
    </div>
  );
}

export function SettingsPlaceholder() {
  return (
    <div className="space-y-4" data-testid="page-settings">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-subtle)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">الإعدادات</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">إعدادات النظام والنسخ الاحتياطي</p>
        </div>
      </div>
      <Card variant="default" className="p-8 text-center text-[var(--color-text-secondary)] space-y-2">
        <p className="text-sm max-w-md mx-auto">
          إعدادات النسخ الاحتياطي والأعوام الدراسية ستكتمل في مرحلة الإعدادات الشاملة.
        </p>
      </Card>
    </div>
  );
}

/**
 * Canonical Application Route Definitions
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <TodayPlaceholder />,
      },
      {
        path: 'students',
        element: <StudentsPlaceholder />,
      },
      {
        path: 'groups',
        element: <GroupsPlaceholder />,
      },
      {
        path: 'settings',
        element: <SettingsPlaceholder />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
];

/**
 * Package-Safe Hash Router for Electron file:// protocol execution.
 * Uses createHashRouter in browser/Electron environments, and falls back to
 * createMemoryRouter in non-DOM testing environments.
 */
export function createDesktopRouter(): RouterProviderProps['router'] {
  if (typeof document === 'undefined') {
    return createMemoryRouter(routes, { initialEntries: ['/'] });
  }
  return createHashRouter(routes);
}

export const router: RouterProviderProps['router'] = createDesktopRouter();
