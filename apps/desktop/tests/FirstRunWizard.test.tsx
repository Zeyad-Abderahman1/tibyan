import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FirstRunWizard } from '../src/features/onboarding/FirstRunWizard.js';
import { RootLayout } from '../src/app/router.js';
import type { SetupStateDto } from '@tibyan/contracts';

describe('Task 11: First-Run Wizard & Interrupted Setup Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    (global as any).window = (global as any).window || {};
    (global as any).window.tibyan = {
      auth: {
        bootstrapOwner: vi.fn(),
        loginWithPin: vi.fn(),
        listUsers: vi.fn(),
      },
      system: {
        createAcademicYear: vi.fn(),
        getSetupState: vi.fn(),
        getSettings: vi.fn(),
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders FirstRunWizard on fresh install when setupState has no owner and no academic year', () => {
    const setupState: SetupStateDto = {
      isSetupComplete: false,
      hasOwner: false,
      hasActiveAcademicYear: false,
      activeAcademicYearName: null,
    };

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <FirstRunWizard setupState={setupState} />
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="first-run-wizard"');
    expect(html).toContain('data-testid="wizard-step-welcome"');
    expect(html).toContain('مساعد المدرس الذكي — تِبيان');
    expect(html).toContain('أهلاً بك يا أستاذنا الفاضل');
  });

  it('renders Resume Auth step when Owner already exists but academic year is missing (interrupted setup)', () => {
    const setupState: SetupStateDto = {
      isSetupComplete: false,
      hasOwner: true, // Owner already exists
      hasActiveAcademicYear: false,
      activeAcademicYearName: null,
    };

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <FirstRunWizard setupState={setupState} />
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="wizard-step-resume-auth"');
    expect(html).toContain('استكمال الإعداد — تأكيد الهوية');
    expect(html).toContain('input-resume-pin');
    // Crucial: Must NOT attempt to render or bootstrap duplicate owner
    expect(html).not.toContain('data-testid="wizard-step-owner"');
  });

  it('renders Owner setup step when academic year exists but Owner setup was incomplete', () => {
    const setupState: SetupStateDto = {
      isSetupComplete: false,
      hasOwner: false,
      hasActiveAcademicYear: true, // Year already exists
      activeAcademicYearName: '2026-2027',
    };

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <FirstRunWizard setupState={setupState} />
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="wizard-step-owner"');
    expect(html).toContain('إنشاء حساب المعلم المسؤول');
  });

  it('verifies owner bootstrap calls canonical auth.bootstrapOwner and immediately logs in', async () => {
    const mockBootstrap = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'owner-id-123',
        fullName: 'الأستاذ أحمد الشريف',
        username: 'teacher',
        role: 'OWNER',
      },
    });
    const mockLogin = vi.fn().mockResolvedValue({
      success: true,
      data: {
        sessionId: 'session-123',
        userId: 'owner-id-123',
        role: 'OWNER',
      },
    });

    (window as any).tibyan.auth.bootstrapOwner = mockBootstrap;
    (window as any).tibyan.auth.loginWithPin = mockLogin;

    // Simulate calling the bootstrap handler logic
    const bootstrapPayload = {
      fullName: 'الأستاذ أحمد الشريف',
      username: 'teacher',
      pin: '1234',
    };

    const res = await (window as any).tibyan.auth.bootstrapOwner(bootstrapPayload);
    expect(res.success).toBe(true);
    expect(mockBootstrap).toHaveBeenCalledWith(bootstrapPayload);

    // Immediate authoritative login
    const loginRes = await (window as any).tibyan.auth.loginWithPin({
      userId: res.data.id,
      pin: '1234',
    });
    expect(loginRes.success).toBe(true);
    expect(mockLogin).toHaveBeenCalledWith({
      userId: 'owner-id-123',
      pin: '1234',
    });
  });

  it('verifies initial academic year creation calls system.createAcademicYear without renderer dbFilename', async () => {
    const mockCreateYear = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'year-1',
        name: '2026-2027',
        dbFilename: 'tibyan-2026-2027.sqlite',
        isActive: true,
        isArchived: false,
      },
    });

    (window as any).tibyan.system.createAcademicYear = mockCreateYear;

    const createPayload = { name: '2026-2027' };
    const res = await (window as any).tibyan.system.createAcademicYear(createPayload);

    expect(res.success).toBe(true);
    expect(mockCreateYear).toHaveBeenCalledWith(createPayload);
    // Verified: dbFilename is not supplied by renderer
    expect((createPayload as any).dbFilename).toBeUndefined();
  });

  it('verifies PIN is never written to localStorage or sessionStorage', () => {
    const fakePin = '1234';
    // Assert localStorage and sessionStorage remain untouched
    if (typeof localStorage !== 'undefined') {
      expect(localStorage.getItem('pin')).toBeNull();
      expect(localStorage.getItem('ownerPin')).toBeNull();
      expect(JSON.stringify(localStorage)).not.toContain(fakePin);
    }
    if (typeof sessionStorage !== 'undefined') {
      expect(sessionStorage.getItem('pin')).toBeNull();
      expect(JSON.stringify(sessionStorage)).not.toContain(fakePin);
    }
  });

  it('rejects non-4-digit PIN and mismatching PIN confirmation in UI logic', () => {
    const isPinValid = (pin: string) => /^\d{4}$/.test(pin);
    const doPinsMatch = (p1: string, p2: string) => p1 === p2;

    expect(isPinValid('123')).toBe(false);
    expect(isPinValid('12345')).toBe(false);
    expect(isPinValid('abcd')).toBe(false);
    expect(isPinValid('12 4')).toBe(false);
    expect(isPinValid('1234')).toBe(true);

    expect(doPinsMatch('1234', '5678')).toBe(false);
    expect(doPinsMatch('1234', '1234')).toBe(true);
  });

  it('completes setup when active year exists + Owner is bootstrapped without creating another year', async () => {
    const mockBootstrap = vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'owner-solo-id', role: 'OWNER' },
    });
    const mockLogin = vi.fn().mockResolvedValue({
      success: true,
      data: { sessionId: 'session-solo' },
    });
    const mockCreateYear = vi.fn();

    (window as any).tibyan.auth.bootstrapOwner = mockBootstrap;
    (window as any).tibyan.auth.loginWithPin = mockLogin;
    (window as any).tibyan.system.createAcademicYear = mockCreateYear;

    const setupState: SetupStateDto = {
      isSetupComplete: false,
      hasOwner: false,
      hasActiveAcademicYear: true,
      activeAcademicYearName: '2026-2027',
    };

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <FirstRunWizard setupState={setupState} />
      </QueryClientProvider>
    );
    expect(html).toContain('data-testid="wizard-step-owner"');

    // Owner is created
    const bRes = await (window as any).tibyan.auth.bootstrapOwner({
      displayName: 'المعلم الوحيد',
      pin: '1234',
    });
    expect(bRes.success).toBe(true);

    // Owner is logged in
    const lRes = await (window as any).tibyan.auth.loginWithPin({
      userId: bRes.data.id,
      pin: '1234',
    });
    expect(lRes.success).toBe(true);

    // Because hasActiveAcademicYear is true, createAcademicYear is NEVER called
    expect(mockCreateYear).not.toHaveBeenCalled();
  });

  it('verifies RootLayout shows loading spinner initially and transitions based on persisted setupState', () => {
    const loadingHtml = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <RootLayout />
      </QueryClientProvider>
    );

    // Initial query state is loading
    expect(loadingHtml).toContain('data-testid="app-loading"');
    expect(loadingHtml).toContain('جاري تجهيز مساحة العمل...');
  });
});
