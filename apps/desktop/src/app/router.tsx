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
import { Card, Button } from '@tibyan/design-system';

import { useAuthStore } from '../features/auth/auth.state.js';
import { LoginScreen } from '../features/auth/LoginScreen.js';
import { StudentsPage } from '../features/students/StudentsPage.js';
import { StudentProfilePage } from '../features/students/StudentProfilePage.js';
import { GroupsPage } from '../features/groups/GroupsPage.js';
import { GroupDetailsPage } from '../features/groups/GroupDetailsPage.js';
import { TodayPage } from '../features/dashboard/TodayPage.js';
import { AttendancePage } from '../features/attendance/AttendancePage.js';
import { SettingsPage } from '../features/settings/SettingsPage.js';
import { FinancePage } from '../features/finance/index.js';
import { CurriculumCatalogsPage } from '../features/curriculum/CurriculumCatalogsPage.js';
import { MathEditorPage } from '../features/math/MathEditorPage.js';

/**
 * Root Controller: Checks authoritative persisted SQLite setup state.
 * Directs fresh installations or interrupted setups to FirstRunWizard,
 * unauthenticated users to LoginScreen, and authenticated users to AppShell.
 */
export function RootLayout() {
  const authStoreSession = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);

  const {
    data: setupState,
    isLoading: isSetupLoading,
    refetch: refetchSetup,
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

  const {
    data: sessionResult,
    isLoading: isSessionLoading,
    isError: isSessionQueryError,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ['authSession'],
    queryFn: async () => {
      if (typeof window !== 'undefined' && window.tibyan?.auth?.getSession) {
        const res = await window.tibyan.auth.getSession();
        if (res.success) {
          setSession(res.data);
        }
        return res;
      }
      return { success: true, data: null };
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const isSessionError = isSessionQueryError || sessionResult?.success === false;
  const session = sessionResult?.success ? sessionResult.data : authStoreSession;

  // 1. Safe retryable error state on IPC failure (does not masquerade as unauthenticated)
  if (isSessionError) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center bg-[var(--color-bg-app)] text-[var(--color-text-primary)]"
        dir="rtl"
        data-testid="session-error-state"
      >
        <div className="flex flex-col items-center gap-3 p-6 max-w-sm text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] flex items-center justify-center font-bold text-lg">
            !
          </div>
          <h2 className="font-bold text-base text-[var(--color-text-primary)]">تعذر التحقق من الجلسة</h2>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            حدث خطأ أثناء محاولة استرجاع حالة تسجيل الدخول من النظام الرئيسي.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => refetchSession()}
            data-testid="retry-session-btn"
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  // 2. Authoritative resolution loading / splash state
  if (isSetupLoading || isSessionLoading) {
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

  // 3. If setup is incomplete, render FirstRunWizard
  if (!setupState?.isSetupComplete) {
    return (
      <FirstRunWizard
        setupState={setupState}
        onComplete={() => {
          refetchSetup();
          refetchSession();
        }}
      />
    );
  }

  // 4. Only render LoginScreen after getSession() successfully confirms session === null
  if (!session) {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          refetchSession();
        }}
      />
    );
  }

  // 5. Once setup is complete and user is authoritatively authenticated, render AppShell
  return <AppShell />;
}

/**
 * Placeholder Views for Shell-Level Navigation
 * No mock data, no premature feature logic belonging to later tasks.
 */

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

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <TodayPage />,
      },
      {
        path: 'students',
        element: <StudentsPage />,
      },
      {
        path: 'students/:studentId',
        element: <StudentProfilePage />,
      },
      {
        path: 'groups',
        element: <GroupsPage />,
      },
      {
        path: 'groups/:groupId',
        element: <GroupDetailsPage />,
      },
      {
        path: 'attendance',
        element: <AttendancePage />,
      },
      {
        path: 'finance',
        element: <FinancePage />,
      },
      {
        path: 'curriculum',
        element: <CurriculumCatalogsPage />,
      },
      {
        path: 'math-editor',
        element: <MathEditorPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
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
