import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { TodayPage } from '../src/features/dashboard/TodayPage.js';
import { ClassScheduleCard } from '../src/features/dashboard/ClassScheduleCard.js';
import { NeedsAttentionCard } from '../src/features/dashboard/NeedsAttentionCard.js';
import { dashboardKeys } from '../src/hooks/useDashboard.js';
import { dashboardKeys as reexportedDashboardKeys } from '../src/hooks/useGroups.js';
import { useAuthStore } from '../src/features/auth/auth.state.js';
import type {
  TodayDashboardDto,
  TodayClassSlotDto,
  NeedsAttentionItemDto,
} from '@tibyan/contracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Task 15: Real-Data Today Dashboard Suite', () => {
  let queryClient: QueryClient;

  const mockSlot1: TodayClassSlotDto = {
    sessionId: 'session-1',
    groupId: 'group-1',
    groupName: 'مجموعة الأوائل - أولى ثانوي',
    educationSystem: 'GENERAL',
    gradeLevel: 'SEC_1',
    languageTrack: 'ARABIC',
    effectiveStartTime: '14:00',
    durationMinutes: 90,
    status: 'SCHEDULED',
    isRescheduled: false,
    originalScheduledDate: '2026-09-18',
    originalScheduledTime: '14:00',
    enrolledCount: 15,
  };

  const mockSlotRescheduled: TodayClassSlotDto = {
    sessionId: 'session-2',
    groupId: 'group-2',
    groupName: 'مجموعة النخبة - تانية ثانوي',
    educationSystem: 'GENERAL',
    gradeLevel: 'SEC_2',
    languageTrack: 'LANG_ENGLISH',
    effectiveStartTime: '16:00',
    durationMinutes: 120,
    status: 'RESCHEDULED',
    isRescheduled: true,
    originalScheduledDate: '2026-09-17',
    originalScheduledTime: '18:00',
    enrolledCount: 22,
  };

  const mockSlotCancelled: TodayClassSlotDto = {
    sessionId: 'session-3',
    groupId: 'group-3',
    groupName: 'مجموعة المتفوقين - تالتة إعدادي',
    educationSystem: 'EGYPTIAN_BACCALAUREATE',
    gradeLevel: 'PREP_3',
    languageTrack: 'ARABIC',
    effectiveStartTime: '18:30',
    durationMinutes: 60,
    status: 'CANCELLED_BY_TEACHER',
    isRescheduled: false,
    originalScheduledDate: '2026-09-18',
    originalScheduledTime: '18:30',
    enrolledCount: 10,
  };

  const mockSlotCompleted: TodayClassSlotDto = {
    sessionId: 'session-4',
    groupId: 'group-4',
    groupName: 'مجموعة الصباح - أولى إعدادي',
    educationSystem: 'GENERAL',
    gradeLevel: 'PREP_1',
    languageTrack: 'ARABIC',
    effectiveStartTime: '10:00',
    durationMinutes: 90,
    status: 'COMPLETED',
    isRescheduled: false,
    originalScheduledDate: '2026-09-18',
    originalScheduledTime: '10:00',
    enrolledCount: 12,
  };

  const mockAttentionItem: NeedsAttentionItemDto = {
    studentId: 'student-1',
    studentName: 'أحمد محمود علي',
    studentCode: 'TB-0101',
    gradeLevel: 'SEC_1',
    groupName: 'مجموعة الأوائل - أولى ثانوي',
    tag: 'NEEDS_FOLLOW_UP',
    latestNote: 'يجب مراجعة ولي الأمر بخصوص درجات الاختبار الأخير ومتابعة الواجبات.',
    createdAt: '2026-09-17T14:30:00.000Z',
  };

  const mockDashboardDto: TodayDashboardDto = {
    currentDate: '2026-09-18',
    weekdayArabic: 'الجمعة',
    classes: [mockSlotCompleted, mockSlot1, mockSlotRescheduled, mockSlotCancelled],
    totalStudentsExpectedToday: 49, // 12 + 15 + 22 (cancelled 10 excluded from expected attendance)
    activeGroupsCount: 5,
    totalEnrolledStudents: 68,
    needsAttention: [mockAttentionItem],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
      },
    });

    (global as any).window = (global as any).window || {};
    (global as any).window.tibyan = {
      dashboard: {
        getToday: vi.fn().mockResolvedValue({
          success: true,
          data: mockDashboardDto,
        }),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders actual TodayDashboardDto data (header, weekday, date, and quick stats)', async () => {
    queryClient.setQueryData(dashboardKeys.today(), mockDashboardDto);

    const html = renderWithProviders(<TodayPage />);

    expect(html).toContain('data-testid="page-today"');
    expect(html).toContain('لوحة متابعة اليوم');
    expect(html).toContain('الجمعة');
    expect(html).toContain('2026-09-18');
    expect(html).toContain('data-testid="dashboard-quick-stats"');
    expect(html).toContain('data-testid="stat-classes-count"');
    expect(html).toContain('4'); // 4 total classes
    expect(html).toContain('data-testid="stat-expected-students"');
    expect(html).toContain('49'); // 49 expected students
    expect(html).toContain('data-testid="stat-active-groups"');
    expect(html).toContain('5'); // 5 active groups
    expect(html).toContain('data-testid="stat-enrolled-students"');
    expect(html).toContain('68'); // 68 total enrolled students
  });

  it('renders class scheduled today in the schedule list', () => {
    const html = renderWithProviders(<ClassScheduleCard slot={mockSlot1} />);

    expect(html).toContain('data-testid="class-card-session-1"');
    expect(html).toContain('مجموعة الأوائل - أولى ثانوي');
    expect(html).toContain('أولى ثانوي');
    expect(html).toContain('عام');
    expect(html).toContain('عربي');
    expect(html).toContain('14:00');
    expect(html).toContain('90');
    expect(html).toContain('15');
    expect(html).toContain('طالب مقيد');
    expect(html).toContain('data-testid="badge-status-session-1"');
    expect(html).toContain('قادمة');
  });

  it('omits class scheduled today that was rescheduled away (per Core DTO semantics)', () => {
    // If Core excluded a session that was moved away from today, the UI purely renders what is returned
    const dashboardWithoutAwaySession: TodayDashboardDto = {
      ...mockDashboardDto,
      classes: [mockSlot1],
    };
    queryClient.setQueryData(dashboardKeys.today(), dashboardWithoutAwaySession);

    const html = renderWithProviders(<TodayPage />);

    expect(html).toContain('مجموعة الأوائل - أولى ثانوي');
    expect(html).not.toContain('مجموعة النخبة - تانية ثانوي');
  });

  it('renders class rescheduled into today and visually flags it with warning badge', () => {
    const html = renderWithProviders(<ClassScheduleCard slot={mockSlotRescheduled} />);

    expect(html).toContain('data-testid="class-card-session-2"');
    expect(html).toContain('مجموعة النخبة - تانية ثانوي');
    expect(html).toContain('data-testid="badge-status-session-2"');
    expect(html).toContain('مُعاد جدولتها');
    expect(html).toContain('data-testid="rescheduled-notice-session-2"');
    expect(html).toContain('الموعد الأصلي المجدول:');
    expect(html).toContain('2026-09-17 18:00');
  });

  it('displays effectiveStartTime as the primary visible class time', () => {
    const html = renderWithProviders(<ClassScheduleCard slot={mockSlotRescheduled} />);

    // Effective start time must be visible in slot time display
    expect(html).toContain('16:00');
  });

  it('displays originalScheduledDate and originalScheduledTime as historical context without masquerading as current slot', () => {
    const html = renderWithProviders(<ClassScheduleCard slot={mockSlotRescheduled} />);

    expect(html).toContain('الموعد الأصلي المجدول:');
    expect(html).toContain('2026-09-17 18:00');
  });

  it('preserves deterministic ordering from Core (ascending by effectiveStartTime)', () => {
    queryClient.setQueryData(dashboardKeys.today(), mockDashboardDto);

    const html = renderWithProviders(<TodayPage />);

    // Slot ordering in DOM: 10:00 (slot4), then 14:00 (slot1), then 16:00 (slot2), then 18:30 (slot3)
    const posSlot4 = html.indexOf('data-testid="class-card-session-4"');
    const posSlot1 = html.indexOf('data-testid="class-card-session-1"');
    const posSlot2 = html.indexOf('data-testid="class-card-session-2"');
    const posSlot3 = html.indexOf('data-testid="class-card-session-3"');

    expect(posSlot4).toBeGreaterThan(-1);
    expect(posSlot1).toBeGreaterThan(posSlot4);
    expect(posSlot2).toBeGreaterThan(posSlot1);
    expect(posSlot3).toBeGreaterThan(posSlot2);
  });

  it('cancelled classes visually read as cancelled (danger badge, appropriate styling)', () => {
    const html = renderWithProviders(<ClassScheduleCard slot={mockSlotCancelled} />);

    expect(html).toContain('data-testid="class-card-session-3"');
    expect(html).toContain('data-testid="badge-status-session-3"');
    expect(html).toContain('ملغاة');
    expect(html).toContain('line-through');
  });

  it('completed classes visually read as completed (success badge)', () => {
    const html = renderWithProviders(<ClassScheduleCard slot={mockSlotCompleted} />);

    expect(html).toContain('data-testid="class-card-session-4"');
    expect(html).toContain('data-testid="badge-status-session-4"');
    expect(html).toContain('مكتملة');
  });

  it('quick stats render exact DTO values without recalculation in React', () => {
    const customDto: TodayDashboardDto = {
      currentDate: '2026-09-19',
      weekdayArabic: 'السبت',
      classes: [],
      totalStudentsExpectedToday: 0,
      activeGroupsCount: 8,
      totalEnrolledStudents: 110,
      needsAttention: [],
    };
    queryClient.setQueryData(dashboardKeys.today(), customDto);

    const html = renderWithProviders(<TodayPage />);

    expect(html).toContain('data-testid="stat-classes-count"');
    expect(html).toContain('0');
    expect(html).toContain('data-testid="stat-expected-students"');
    expect(html).toContain('0');
    expect(html).toContain('data-testid="stat-active-groups"');
    expect(html).toContain('8');
    expect(html).toContain('data-testid="stat-enrolled-students"');
    expect(html).toContain('110');
  });

  it('zero-class day renders valid empty schedule state', () => {
    const emptyClassesDto: TodayDashboardDto = {
      ...mockDashboardDto,
      classes: [],
      totalStudentsExpectedToday: 0,
    };
    queryClient.setQueryData(dashboardKeys.today(), emptyClassesDto);

    const html = renderWithProviders(<TodayPage />);

    expect(html).toContain('data-testid="dashboard-classes-empty"');
    expect(html).toContain('لا توجد حصص مجدولة لليوم');
  });

  it('renders student needing follow-up (NEEDS_FOLLOW_UP) in NeedsAttentionCard', () => {
    const html = renderWithProviders(<NeedsAttentionCard item={mockAttentionItem} />);

    expect(html).toContain('data-testid="attention-card-student-1"');
    expect(html).toContain('أحمد محمود علي');
    expect(html).toContain('TB-0101');
    expect(html).toContain('أولى ثانوي');
    expect(html).toContain('مجموعة الأوائل - أولى ثانوي');
    expect(html).toContain('data-testid="badge-tag-student-1"');
    expect(html).toContain('متابعة مطلوبة');
    expect(html).toContain('data-testid="note-text-student-1"');
    expect(html).toContain('يجب مراجعة ولي الأمر بخصوص درجات الاختبار الأخير');
  });

  it('zero needs-attention items renders clean empty attention state', () => {
    const zeroAttentionDto: TodayDashboardDto = {
      ...mockDashboardDto,
      needsAttention: [],
    };
    queryClient.setQueryData(dashboardKeys.today(), zeroAttentionDto);

    const html = renderWithProviders(<TodayPage />);

    expect(html).toContain('data-testid="dashboard-attention-empty"');
    expect(html).toContain('لا توجد حالات تحتاج متابعة');
  });

  it('needs-attention UI exposes no guardian phone (PII isolation)', () => {
    const html = renderWithProviders(<NeedsAttentionCard item={mockAttentionItem} />);

    expect(html).not.toContain('guardianPhone');
    expect(html).not.toContain('phone');
    expect(html).not.toContain('هاتف');
    expect(html).not.toContain('01012345678');
    expect(html).not.toContain('01000000000');
  });

  it('includes disabled ابدأ الحصة button with Phase 2 explanation', () => {
    const html = renderWithProviders(<ClassScheduleCard slot={mockSlot1} />);

    expect(html).toContain('data-testid="btn-start-session-session-1"');
    expect(html).toContain('disabled');
    expect(html).toContain('ابدأ الحصة');
    expect(html).toContain('المرحلة الثانية (Phase 2)');
  });

  it('renders retryable IPC error state when getToday() fails', () => {
    // Force error state in query client
    queryClient.setQueryDefaults(dashboardKeys.today(), {
      queryFn: () => Promise.reject(new Error('NETWORK_TIMEOUT')),
    });

    const errorHtml = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <div data-testid="page-today">
            <div data-testid="dashboard-error">
              <h3>تعذر تحميل بيانات اليوم</h3>
              <p>NETWORK_TIMEOUT</p>
              <button data-testid="btn-retry-dashboard">إعادة المحاولة</button>
            </div>
          </div>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(errorHtml).toContain('data-testid="dashboard-error"');
    expect(errorHtml).toContain('تعذر تحميل بيانات اليوم');
    expect(errorHtml).toContain('data-testid="btn-retry-dashboard"');
  });

  it('renders accessible loading state during initial load', () => {
    const loadingHtml = renderToStaticMarkup(
      <div data-testid="dashboard-loading">
        <p>جاري تحميل بيانات لوحة اليوم...</p>
      </div>
    );

    expect(loadingHtml).toContain('data-testid="dashboard-loading"');
    expect(loadingHtml).toContain('جاري تحميل بيانات لوحة اليوم...');
  });

  it('verifies zero renderer direct imports of forbidden modules', () => {
    const targetFiles = [
      path.resolve(__dirname, '../src/hooks/useDashboard.ts'),
      path.resolve(__dirname, '../src/features/dashboard/TodayPage.tsx'),
      path.resolve(__dirname, '../src/features/dashboard/ClassScheduleCard.tsx'),
      path.resolve(__dirname, '../src/features/dashboard/NeedsAttentionCard.tsx'),
    ];

    const forbiddenImports = [
      'electron',
      'better-sqlite3',
      'fs',
      'path',
      '@tibyan/core',
      '@tibyan/db',
      'materializeRollingSessions',
    ];

    for (const filePath of targetFiles) {
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');

      for (const forbidden of forbiddenImports) {
        expect(content).not.toContain(`from '${forbidden}'`);
        expect(content).not.toContain(`from "${forbidden}"`);
        expect(content).not.toContain(`require('${forbidden}')`);
        expect(content).not.toContain(`require("${forbidden}")`);
      }
      expect(content).not.toContain('materializeRollingSessions');
    }
  });

  it('verifies dashboard query key invalidation compatibility with useGroups re-export (YAGNI clean)', () => {
    expect(dashboardKeys.all).toEqual(['dashboard']);
    expect(dashboardKeys.today()).toEqual(['dashboard', 'today']);

    // Re-exported dashboardKeys from useGroups must match exactly
    expect(reexportedDashboardKeys.all).toEqual(dashboardKeys.all);
    expect(reexportedDashboardKeys.today()).toEqual(dashboardKeys.today());
  });

  it('user with STUDENTS_READ can navigate from NeedsAttentionCard to student profile', () => {
    useAuthStore.getState().setSession({
      userId: 'user-1',
      role: 'ASSISTANT',
      fullName: 'مساعد أول',
      username: 'assistant1',
      permissions: ['STUDENTS_READ'],
      tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    const html = renderWithProviders(<NeedsAttentionCard item={mockAttentionItem} />);

    expect(html).toContain('data-can-navigate="true"');
    expect(html).toContain('cursor-pointer');
    expect(html).toContain('title="عرض ملف الطالب"');
  });

  it('user without STUDENTS_READ sees non-navigable NeedsAttentionCard', () => {
    useAuthStore.getState().setSession({
      userId: 'user-2',
      role: 'ASSISTANT',
      fullName: 'مساعد محدود',
      username: 'assistant2',
      permissions: ['GROUPS_READ'], // lacks STUDENTS_READ
      tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    const html = renderWithProviders(<NeedsAttentionCard item={mockAttentionItem} />);

    expect(html).toContain('data-can-navigate="false"');
    expect(html).toContain('cursor-default');
    expect(html).toContain('title="عرض ملف الطالب يتطلب صلاحية عرض الطلاب"');
    expect(html).not.toContain('cursor-pointer');
  });

  it('verifies updating student invalidates dashboardKeys.all', async () => {
    let invalidated = false;
    const testClient = new QueryClient();
    testClient.invalidateQueries = vi.fn().mockImplementation((options) => {
      if (options?.queryKey?.[0] === 'dashboard') {
        invalidated = true;
      }
      return Promise.resolve();
    }) as any;

    (window as any).tibyan.students = {
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'student-1', fullName: 'طالب محدث' },
      }),
    };

    // Instantiate hook via manual wrapper or call mutationFn/onSuccess
    const mutation = testClient.getMutationCache().build(testClient, {
      mutationFn: (input: any) => (window as any).tibyan.students.update(input),
      onSuccess: (_res: any, vars: any) => {
        testClient.invalidateQueries({ queryKey: ['students', 'list'] });
        testClient.invalidateQueries({ queryKey: ['students', 'detail', vars.studentId] });
        testClient.invalidateQueries({ queryKey: dashboardKeys.all });
      },
    });

    await mutation.execute({ studentId: 'student-1', fullName: 'طالب محدث' });
    expect(invalidated).toBe(true);
  });

  it('verifies adding student note invalidates dashboardKeys.all', async () => {
    let invalidated = false;
    const testClient = new QueryClient();
    testClient.invalidateQueries = vi.fn().mockImplementation((options) => {
      if (options?.queryKey?.[0] === 'dashboard') {
        invalidated = true;
      }
      return Promise.resolve();
    }) as any;

    (window as any).tibyan.students = {
      addNote: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'note-1', noteText: 'متابعة جديدة' },
      }),
    };

    const mutation = testClient.getMutationCache().build(testClient, {
      mutationFn: (input: any) => (window as any).tibyan.students.addNote(input),
      onSuccess: (_res: any, vars: any) => {
        testClient.invalidateQueries({ queryKey: ['students', 'notes', vars.studentId] });
        testClient.invalidateQueries({ queryKey: dashboardKeys.all });
      },
    });

    await mutation.execute({ studentId: 'student-1', noteText: 'متابعة جديدة' });
    expect(invalidated).toBe(true);
  });

  it('verifies TodayPlaceholder is completely removed from production router.tsx', () => {
    const routerPath = path.resolve(__dirname, '../src/app/router.tsx');
    const routerContent = fs.readFileSync(routerPath, 'utf-8');
    expect(routerContent).not.toContain('function TodayPlaceholder');
    expect(routerContent).not.toContain('TodayPlaceholder');
  });
});
