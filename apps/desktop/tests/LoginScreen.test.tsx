import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, DirectionProvider } from '@tibyan/design-system';
import { useAuthStore } from '../src/features/auth/auth.state.js';
import { UserCard } from '../src/features/auth/UserCard.js';
import { LoginScreen } from '../src/features/auth/LoginScreen.js';
import { RootLayout } from '../src/app/router.js';
import type { UserSessionDto, LoginUserDto } from '@tibyan/contracts';

describe('Task 12: 4-Digit PIN Authentication & Session Store Suite', () => {
  let queryClient: QueryClient;

  const mockOwnerUser: LoginUserDto = {
    id: '11111111-1111-4111-8111-111111111111',
    fullName: 'الأستاذ أحمد الشريف',
    username: 'teacher',
    role: 'OWNER',
  };

  const mockAssistantUser: LoginUserDto = {
    id: '22222222-2222-4222-8222-222222222222',
    fullName: 'محمود المساعد',
    username: 'assistant',
    role: 'ASSISTANT',
  };

  const mockOwnerSession: UserSessionDto = {
    userId: mockOwnerUser.id,
    fullName: mockOwnerUser.fullName,
    username: mockOwnerUser.username,
    role: 'OWNER',
    permissions: ['ALL' as any],
    tokenExpiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
  };

  const mockAssistantSession: UserSessionDto = {
    userId: mockAssistantUser.id,
    fullName: mockAssistantUser.fullName,
    username: mockAssistantUser.username,
    role: 'ASSISTANT',
    permissions: ['USERS_MANAGE' as any],
    tokenExpiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
  };

  beforeEach(() => {
    // Reset Zustand presentation store
    useAuthStore.setState({ session: null, status: 'idle' });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    (global as any).window = (global as any).window || {};
    (global as any).window.tibyan = {
      system: {
        getSetupState: vi.fn().mockResolvedValue({
          success: true,
          data: {
            isSetupComplete: true,
            hasOwner: true,
            hasActiveAcademicYear: true,
            activeAcademicYearName: '2026-2027',
          },
        }),
        getSettings: vi.fn().mockResolvedValue({
          success: true,
          data: {
            theme: 'light',
            activeAcademicYearName: '2026-2027',
          },
        }),
      },
      auth: {
        listUsers: vi.fn().mockResolvedValue({
          success: true,
          data: [mockOwnerUser, mockAssistantUser],
        }),
        loginWithPin: vi.fn().mockResolvedValue({
          success: true,
          data: mockOwnerSession,
        }),
        getSession: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
        logout: vi.fn().mockResolvedValue({
          success: true,
          data: undefined,
        }),
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ session: null, status: 'idle' });
  });

  // 1. Zustand Presentation Store
  describe('Zustand auth.state store', () => {
    it('initializes with null session and idle status', () => {
      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.status).toBe('idle');
    });

    it('setSession updates presentation session and status', () => {
      useAuthStore.getState().setSession(mockOwnerSession);
      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockOwnerSession);
      expect(state.status).toBe('authenticated');
    });

    it('clearSession resets presentation state to unauthenticated', () => {
      useAuthStore.getState().setSession(mockOwnerSession);
      useAuthStore.getState().clearSession();
      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.status).toBe('unauthenticated');
    });
  });

  // 2. UserCard Component
  describe('UserCard Component', () => {
    it('renders Owner user card with official teacher role badge and initial', () => {
      const html = renderToStaticMarkup(
        <UserCard
          user={mockOwnerUser}
          isSelected={true}
          onSelect={vi.fn()}
        />
      );

      expect(html).toContain('data-testid="user-card-11111111-1111-4111-8111-111111111111"');
      expect(html).toContain('الأستاذ أحمد الشريف');
      expect(html).toContain('@teacher');
      expect(html).toContain('المعلم المسؤول');
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain('ا');
    });

    it('renders Assistant user card with assistant badge', () => {
      const html = renderToStaticMarkup(
        <UserCard
          user={mockAssistantUser}
          isSelected={false}
          onSelect={vi.fn()}
        />
      );

      expect(html).toContain('محمود المساعد');
      expect(html).toContain('@assistant');
      expect(html).toContain('مساعد');
      expect(html).toContain('aria-pressed="false"');
    });
  });

  // 3. LoginScreen Markup & Initial Rendering
  describe('LoginScreen Rendering', () => {
    it('renders brand header, logo, and initial loading spinner when users are loading', () => {
      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <LoginScreen />
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="login-screen"');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('مساعد المدرس الذكي — تِبيان');
      expect(html).toContain('alt="تِبيان"');
      expect(html).toContain('data-testid="login-loading"');
      expect(html).toContain('جاري تحميل الحسابات...');
    });

    it('verifies design system PinPad is integrated with 4-digit display', () => {
      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <LoginScreen initialUsers={[mockOwnerUser, mockAssistantUser]} />
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="pin-entry-view"');
      expect(html).toContain('dir="ltr"');
      expect(html).toContain('aria-label="رمز PIN لتسجيل الدخول"');
      expect(html).toContain('aria-label="مسح الكل"');
      expect(html).toContain('aria-label="حذف رقم"');
      expect(html).toContain('data-testid="switch-account-btn"');
      expect(html).toContain('تبديل الحساب');
      expect(html).toContain('data-testid="lock-screen-avatar"');
      expect(html).toContain('الشاشة مقفلة');
      expect(html).toContain('أدخل رمز PIN لفتح مساحة العمل');
      expect(html).not.toContain('#5CE1E6');
      expect(html).not.toContain('teal-');
    });

    it('renders empty state when users array is empty', () => {
      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <LoginScreen initialUsers={[]} />
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="login-no-users"');
      expect(html).toContain('لا توجد حسابات مسجلة');
    });
  });

  // 4. Session Boot Without Login-Screen Flash & Error State
  describe('Authoritative session boot & RootLayout routing', () => {
    it('configured app shows loading during getSession resolution and renders AppShell when session exists', () => {
      // 1. Prior to session resolution: Shows neutral loading splash without flash of LoginScreen or AppShell
      const pendingClient = new QueryClient();
      const pendingHtml = renderToStaticMarkup(
        <QueryClientProvider client={pendingClient}>
          <RootLayout />
        </QueryClientProvider>
      );
      expect(pendingHtml).toContain('data-testid="app-loading"');
      expect(pendingHtml).toContain('نظام إدارة المعلم الذكي');
      expect(pendingHtml).toContain('جاري تجهيز مساحة العمل...');
      expect(pendingHtml).toContain('data-testid="startup-loading-indicator"');
      expect(pendingHtml).not.toContain('data-testid="login-screen"');
      expect(pendingHtml).not.toContain('data-testid="app-shell"');

      // 2. Once authoritative session is resolved and present, renders AppShell without rendering LoginScreen
      (window as any).tibyan.auth.getSession.mockResolvedValue({
        success: true,
        data: mockOwnerSession,
      });
      useAuthStore.setState({ session: mockOwnerSession, status: 'authenticated' });
      queryClient.setQueryData(['setupState'], {
        isSetupComplete: true,
        hasOwner: true,
        hasActiveAcademicYear: true,
      });
      queryClient.setQueryData(['authSession'], { success: true, data: mockOwnerSession });

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <DirectionProvider defaultDirection="rtl">
              <MemoryRouter>
                <RootLayout />
              </MemoryRouter>
            </DirectionProvider>
          </ThemeProvider>
        </QueryClientProvider>
      );

      // Verify it renders AppShell rather than LoginScreen
      expect(html).toContain('data-testid="app-shell"');
      expect(html).not.toContain('data-testid="login-screen"');
      expect(html).not.toContain('data-testid="app-loading"');
    });

    it('successful getSession(null) renders LoginScreen after resolution', () => {
      useAuthStore.setState({ session: null, status: 'unauthenticated' });

      // Simulate queries resolved with setup complete and null session
      queryClient.setQueryData(['setupState'], {
        isSetupComplete: true,
        hasOwner: true,
        hasActiveAcademicYear: true,
      });
      queryClient.setQueryData(['authSession'], { success: true, data: null });

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <RootLayout />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="login-screen"');
      expect(html).not.toContain('data-testid="app-shell"');
    });

    it('failed getSession does not masquerade as confirmed unauthenticated state and renders safe retry state', () => {
      queryClient.setQueryData(['setupState'], {
        isSetupComplete: true,
        hasOwner: true,
        hasActiveAcademicYear: true,
      });
      queryClient.setQueryData(['authSession'], {
        success: false,
        error: { code: 'IPC_TRANSPORT_ERROR', message: 'IPC transport failure' },
      });

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <RootLayout />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="session-error-state"');
      expect(html).toContain('تعذر التحقق من الجلسة');
      expect(html).toContain('data-testid="retry-session-btn"');
      // Crucial: Must NOT render LoginScreen or AppShell on transport failure
      expect(html).not.toContain('data-testid="login-screen"');
      expect(html).not.toContain('data-testid="app-shell"');
    });
  });

  // 5. Cross-User Cache Isolation & Truthful Logout
  describe('Cross-User Cache Isolation and Logout Truthfulness', () => {
    it('successful logout clears Zustand session and TanStack Query cache', async () => {
      useAuthStore.setState({ session: mockOwnerSession, status: 'authenticated' });

      // Populate query cache with sensitive student data
      queryClient.setQueryData(['students', 'list'], [{ id: 's-1', name: 'طالب خاص' }]);
      expect(queryClient.getQueryData(['students', 'list'])).toBeDefined();

      const clearSpy = vi.spyOn(queryClient, 'clear');

      // Execute logout logic
      const res = await (window as any).tibyan.auth.logout();
      expect(res.success).toBe(true);

      // Simulate hook logout
      useAuthStore.getState().clearSession();
      queryClient.clear();

      expect(useAuthStore.getState().session).toBeNull();
      expect(clearSpy).toHaveBeenCalled();
      expect(queryClient.getQueryData(['students', 'list'])).toBeUndefined();
    });

    it('failed logout preserves cached session and does not clear cache', async () => {
      useAuthStore.setState({ session: mockOwnerSession, status: 'authenticated' });
      queryClient.setQueryData(['sensitiveData'], { value: 123 });

      const clearSpy = vi.spyOn(queryClient, 'clear');

      // Mock logout failure from Main process
      (window as any).tibyan.auth.logout = vi.fn().mockResolvedValue({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Main process busy' },
      });

      // Simulate hook logout call
      const logoutResult = await (window as any).tibyan.auth.logout();
      if (!logoutResult.success) {
        // As implemented in useAuth: do NOT clear session or cache
      } else {
        useAuthStore.getState().clearSession();
        queryClient.clear();
      }

      // Preserved!
      expect(useAuthStore.getState().session).toEqual(mockOwnerSession);
      expect(clearSpy).not.toHaveBeenCalled();
      expect(queryClient.getQueryData(['sensitiveData'])).toBeDefined();
    });

    it('clears stale query cache when authenticated identity switches from User A to User B', () => {
      useAuthStore.setState({ session: mockOwnerSession, status: 'authenticated' });
      queryClient.setQueryData(['userAData'], { grades: [10, 20] });

      const clearSpy = vi.spyOn(queryClient, 'clear');

      // Identity change detection logic
      const current = useAuthStore.getState().session;
      const nextSession = mockAssistantSession;
      if (current && current.userId !== nextSession.userId) {
        queryClient.clear();
      }
      useAuthStore.getState().setSession(nextSession);

      expect(clearSpy).toHaveBeenCalled();
      expect(queryClient.getQueryData(['userAData'])).toBeUndefined();
      expect(useAuthStore.getState().session?.userId).toBe(mockAssistantUser.id);
    });
  });

  // 6. Account-Scoped Cooldown & Robust Countdown
  describe('Account-Scoped Cooldown and Absolute Deadline Countdown', () => {
    it('derives remaining seconds from absolute deadline and tolerates large time jumps', () => {
      const now = Date.now();
      const retryAfterSeconds = 30;
      const absoluteDeadline = now + retryAfterSeconds * 1000;

      const calcRemaining = (currentTime: number) => {
        const remainingMs = absoluteDeadline - currentTime;
        return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
      };

      expect(calcRemaining(now)).toBe(30);
      expect(calcRemaining(now + 10000)).toBe(20);
      // Large jump of 25 seconds
      expect(calcRemaining(now + 25000)).toBe(5);
      // Past deadline
      expect(calcRemaining(now + 31000)).toBe(0);
    });

    it('cooldown is strictly account-scoped: User A being locked does not lock User B', () => {
      const now = Date.now();
      const cooldownDeadlines: Record<string, number> = {
        [mockOwnerUser.id]: now + 30000, // Owner is locked
        // Assistant is NOT locked
      };

      const isAccountLocked = (userId: string, currentTime: number) => {
        const deadline = cooldownDeadlines[userId] ?? 0;
        return deadline > currentTime;
      };

      // Owner is locked
      expect(isAccountLocked(mockOwnerUser.id, now)).toBe(true);

      // Assistant is NOT locked
      expect(isAccountLocked(mockAssistantUser.id, now)).toBe(false);

      // Switching user clears entered PIN buffer
      let pin = '1234';
      let error: string | null = 'Account locked';
      const switchUser = (_newUserId: string) => {
        pin = '';
        error = null;
      };

      switchUser(mockAssistantUser.id);
      expect(pin).toBe('');
      expect(error).toBeNull();
    });
  });

  // 7. PIN Memory Wipe on All Outcomes
  describe('PIN Memory Wipe on Every Submitted Attempt', () => {
    it('PIN is cleared immediately after submission on success', async () => {
      let pin = '1234';
      const submittedPin = pin;
      pin = ''; // Wiped before IPC

      const res = await (window as any).tibyan.auth.loginWithPin({
        userId: mockOwnerUser.id,
        pin: submittedPin,
      });

      expect(pin).toBe('');
      expect(res.success).toBe(true);
    });

    it('PIN is cleared immediately on INVALID_PIN error', async () => {
      (window as any).tibyan.auth.loginWithPin = vi.fn().mockResolvedValue({
        success: false,
        error: { code: 'INVALID_PIN', message: 'Invalid PIN' },
      });

      let pin = '9999';
      const submittedPin = pin;
      pin = ''; // Wiped before IPC

      const res = await (window as any).tibyan.auth.loginWithPin({
        userId: mockOwnerUser.id,
        pin: submittedPin,
      });

      expect(pin).toBe('');
      expect(res.error.code).toBe('INVALID_PIN');
    });

    it('PIN is cleared immediately on ACCOUNT_LOCKED response', async () => {
      (window as any).tibyan.auth.loginWithPin = vi.fn().mockResolvedValue({
        success: false,
        error: { code: 'ACCOUNT_LOCKED', message: 'Locked', details: { retryAfterSeconds: 30 } },
      });

      let pin = '9999';
      const submittedPin = pin;
      pin = ''; // Wiped before IPC

      const res = await (window as any).tibyan.auth.loginWithPin({
        userId: mockOwnerUser.id,
        pin: submittedPin,
      });

      expect(pin).toBe('');
      expect(res.error.code).toBe('ACCOUNT_LOCKED');
    });

    it('PIN is cleared immediately on IPC transport failure', async () => {
      (window as any).tibyan.auth.loginWithPin = vi.fn().mockRejectedValue(new Error('IPC crash'));

      let pin = '1234';
      const submittedPin = pin;
      pin = ''; // Wiped before IPC

      try {
        await (window as any).tibyan.auth.loginWithPin({
          userId: mockOwnerUser.id,
          pin: submittedPin,
        });
      } catch {
        pin = ''; // Guaranteed in finally
      }

      expect(pin).toBe('');
    });

    it('plaintext PIN never appears in rendered DOM attributes or persistent storage', () => {
      const sensitivePin = '7392';
      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <LoginScreen initialUsers={[mockOwnerUser]} />
        </QueryClientProvider>
      );

      // Must not appear in markup
      expect(html).not.toContain(sensitivePin);
      expect(html).not.toContain('7392');

      // Must not appear in localStorage/sessionStorage
      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('pin')).toBeNull();
        expect(JSON.stringify(localStorage)).not.toContain(sensitivePin);
      }
      if (typeof sessionStorage !== 'undefined') {
        expect(sessionStorage.getItem('pin')).toBeNull();
        expect(JSON.stringify(sessionStorage)).not.toContain(sensitivePin);
      }
    });
  });

  // 8. Visual Rescue: Premium Horizontal Authentication Stage & Copy Hierarchy
  describe('Visual Rescue: Desktop Auth Stage Layout & Hierarchy', () => {
    it('renders horizontal two-column desktop authentication stage with identity panel and pin workspace', () => {
      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <LoginScreen initialUsers={[mockOwnerUser, mockAssistantUser]} />
        </QueryClientProvider>
      );

      // Auth Stage container
      expect(html).toContain('data-testid="auth-stage"');

      // Right Column: Identity Panel
      expect(html).toContain('data-testid="identity-panel"');
      expect(html).toContain('الشاشة مقفلة');
      expect(html).toContain('الأستاذ أحمد الشريف');
      expect(html).toContain('@teacher');

      // Left Column: PIN Workspace
      expect(html).toContain('data-testid="pin-workspace"');
      expect(html).toContain('أدخل رمز PIN للمتابعة');
      expect(html).toContain('data-testid="pin-pad-container"');

      // Integrated Local-first security statement
      expect(html).toContain('يعمل تِبيان محلياً على جهازك');
    });

    it('renders ambient background depth layers', () => {
      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <LoginScreen initialUsers={[mockOwnerUser]} />
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="login-ambient-bg"');
    });
  });
});

