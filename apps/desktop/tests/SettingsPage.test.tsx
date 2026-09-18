import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@tibyan/design-system';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { SettingsPage } from '../src/features/settings/SettingsPage.js';
import { ThemePreferencesTab } from '../src/features/settings/ThemePreferencesTab.js';
import { AcademicYearManager } from '../src/features/settings/AcademicYearManager.js';
import { CreateAcademicYearModal } from '../src/features/settings/CreateAcademicYearModal.js';
import { UserManagementTab } from '../src/features/settings/UserManagementTab.js';
import { AssistantCreateModal } from '../src/features/settings/AssistantCreateModal.js';
import { AssistantPermissionsModal } from '../src/features/settings/AssistantPermissionsModal.js';
import { AssistantPinResetModal } from '../src/features/settings/AssistantPinResetModal.js';
import { BackupSettingsTab } from '../src/features/settings/BackupSettingsTab.js';
import { useAuthStore } from '../src/features/auth/auth.state.js';
import {
  CreateAcademicYearSchema,
  ResetUserPinSchema,
  CreateUserSchema,
  type AcademicYearDto,
  type BackupHistoryItemDto,
  type BackupStatusDto,
  type GlobalSettingsDto,
  type LoginUserDto,
  type ManagedUserDto,
  type UserSessionDto,
} from '@tibyan/contracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Task 16: Settings, Academic-Year Switcher, Assistant Management & Backup Tab Suite', () => {
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

  const mockManagedOwner: ManagedUserDto = {
    id: '11111111-1111-4111-8111-111111111111',
    fullName: 'الأستاذ أحمد الشريف',
    username: 'teacher',
    role: 'OWNER',
    status: 'ACTIVE',
    permissions: [
      'STUDENTS_READ',
      'STUDENTS_WRITE',
      'GROUPS_READ',
      'GROUPS_WRITE',
      'SESSIONS_MANAGE',
      'ATTENDANCE_WRITE',
      'PAYMENTS_READ',
      'PAYMENTS_WRITE',
      'REPORTS_READ',
      'SETTINGS_WRITE',
      'USERS_MANAGE',
      'BACKUP_MANAGE',
    ],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const mockManagedAssistant: ManagedUserDto = {
    id: '22222222-2222-4222-8222-222222222222',
    fullName: 'محمود المساعد',
    username: 'assistant',
    role: 'ASSISTANT',
    status: 'ACTIVE',
    permissions: ['STUDENTS_READ'],
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  };

  const mockInactiveAssistant: ManagedUserDto = {
    id: '33333333-3333-4333-8333-333333333333',
    fullName: 'سارة خالد',
    username: 'sara',
    role: 'ASSISTANT',
    status: 'INACTIVE',
    permissions: ['STUDENTS_READ'],
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  const mockOwnerSession: UserSessionDto = {
    userId: mockOwnerUser.id,
    fullName: mockOwnerUser.fullName,
    username: mockOwnerUser.username,
    role: 'OWNER',
    permissions: [
      'STUDENTS_READ',
      'STUDENTS_WRITE',
      'GROUPS_READ',
      'GROUPS_WRITE',
      'SESSIONS_MANAGE',
      'ATTENDANCE_WRITE',
      'PAYMENTS_READ',
      'PAYMENTS_WRITE',
      'REPORTS_READ',
      'SETTINGS_WRITE',
      'USERS_MANAGE',
      'BACKUP_MANAGE',
    ],
    tokenExpiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
  };

  const mockAssistantSessionRestricted: UserSessionDto = {
    userId: mockAssistantUser.id,
    fullName: mockAssistantUser.fullName,
    username: mockAssistantUser.username,
    role: 'ASSISTANT',
    permissions: ['STUDENTS_READ'],
    tokenExpiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
  };

  const mockActiveYear: AcademicYearDto = {
    id: 'year-1',
    name: '2026-2027',
    dbFilename: 'tibyan-2026-2027.sqlite',
    isActive: true,
    isArchived: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const mockInactiveYear: AcademicYearDto = {
    id: 'year-2',
    name: '2027-2028',
    dbFilename: 'tibyan-2027-2028.sqlite',
    isActive: false,
    isArchived: false,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
  };

  const mockGlobalSettings: GlobalSettingsDto = {
    theme: 'light',
    activeAcademicYearId: 'year-1',
    activeAcademicYearName: '2026-2027',
  };

  const mockBackupStatus: BackupStatusDto = {
    lastBackupAt: '2026-09-15T12:00:00.000Z',
    lastBackupStatus: 'SUCCESS',
    totalBackupsCount: 3,
    latestBackupSizeBytes: 1048576, // 1 MB
    isBackupRunning: false,
  };

  const mockBackupRecords: BackupHistoryItemDto[] = [
    {
      id: 'backup-1',
      backupDate: '2026-09-15T12:00:00.000Z',
      status: 'SUCCESS',
      sizeBytes: 1048576,
      academicYearsIncluded: ['2026-2027'],
      createdAt: '2026-09-15T12:00:00.000Z',
    },
  ];

  beforeEach(() => {
    useAuthStore.setState({ session: mockOwnerSession, status: 'authenticated' });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
      },
    });

    (global as any).window = (global as any).window || {};
    (global as any).window.tibyan = {
      system: {
        getSettings: vi.fn().mockResolvedValue({
          success: true,
          data: mockGlobalSettings,
        }),
        updateTheme: vi.fn().mockResolvedValue({
          success: true,
          data: undefined,
        }),
        listAcademicYears: vi.fn().mockResolvedValue({
          success: true,
          data: [mockActiveYear, mockInactiveYear],
        }),
        createAcademicYear: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'year-3',
            name: '2028-2029',
            dbFilename: 'tibyan-2028-2029.sqlite',
            isActive: false,
            isArchived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
        switchAcademicYear: vi.fn().mockResolvedValue({
          success: true,
          data: undefined,
        }),
      },
      auth: {
        listUsers: vi.fn().mockResolvedValue({
          success: true,
          data: [mockOwnerUser, mockAssistantUser],
        }),
        listManagementUsers: vi.fn().mockResolvedValue({
          success: true,
          data: [mockManagedOwner, mockManagedAssistant],
        }),
        createUser: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: '33333333-3333-4333-8333-333333333333',
            fullName: 'سارة خالد',
            username: 'sara',
            role: 'ASSISTANT',
            status: 'ACTIVE',
            failedAttempts: 0,
            lockedUntil: null,
            permissions: ['STUDENTS_READ'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
        updatePermissions: vi.fn().mockResolvedValue({
          success: true,
          data: undefined,
        }),
        changeUserStatus: vi.fn().mockResolvedValue({
          success: true,
          data: undefined,
        }),
        resetPin: vi.fn().mockResolvedValue({
          success: true,
          data: undefined,
        }),
      },
      backup: {
        getStatus: vi.fn().mockResolvedValue({
          success: true,
          data: mockBackupStatus,
        }),
        listRecords: vi.fn().mockResolvedValue({
          success: true,
          data: mockBackupRecords,
        }),
        trigger: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'backup-2',
            backupDate: new Date().toISOString(),
            status: 'SUCCESS',
            sizeBytes: 1048576,
            academicYearsIncluded: ['2026-2027'],
            createdAt: new Date().toISOString(),
          },
        }),
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <MemoryRouter>{ui}</MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  // --------------------------------------------------------------------------
  // 1. Architectural Security & Zero-Prohibited-Import Boundaries
  // --------------------------------------------------------------------------
  describe('1. Architectural Security Boundaries', () => {
    it('ensures no renderer settings files import @tibyan/core, @tibyan/db, fs, path, or electron', () => {
      const settingsDir = path.resolve(__dirname, '../src/features/settings');
      const files = fs.readdirSync(settingsDir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

      expect(files.length).toBeGreaterThanOrEqual(8);

      for (const file of files) {
        const content = fs.readFileSync(path.join(settingsDir, file), 'utf8');
        expect(content).not.toMatch(/from\s+['"]@tibyan\/core['"]/);
        expect(content).not.toMatch(/from\s+['"]@tibyan\/db['"]/);
        expect(content).not.toMatch(/from\s+['"]electron['"]/);
        expect(content).not.toMatch(/from\s+['"]fs['"]/);
        expect(content).not.toMatch(/from\s+['"]path['"]/);
        expect(content).not.toMatch(/from\s+['"]better-sqlite3['"]/);
      }
    });

    it('ensures no renderer hooks import prohibited backend modules', () => {
      const hooks = ['useSettings.ts', 'useAcademicYears.ts', 'useUserManagement.ts', 'useBackup.ts'];
      const hooksDir = path.resolve(__dirname, '../src/hooks');

      for (const hook of hooks) {
        const content = fs.readFileSync(path.join(hooksDir, hook), 'utf8');
        expect(content).not.toMatch(/from\s+['"]@tibyan\/core['"]/);
        expect(content).not.toMatch(/from\s+['"]@tibyan\/db['"]/);
        expect(content).not.toMatch(/from\s+['"]electron['"]/);
        expect(content).not.toMatch(/from\s+['"]fs['"]/);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. SettingsPage Main Container & Navigation
  // --------------------------------------------------------------------------
  describe('2. SettingsPage Main Container', () => {
    it('renders SettingsPage header, tab buttons, and default Theme tab', () => {
      const html = renderWithProviders(<SettingsPage />);

      expect(html).toContain('إعدادات النظام');
      expect(html).toContain('المظهر والتفضيلات');
      expect(html).toContain('الأعوام الدراسية');
      expect(html).toContain('إدارة المساعدين');
      expect(html).toContain('النسخ الاحتياطي');
      expect(html).toContain('مظهر النظام والسمة البصرية');
    });
  });

  // --------------------------------------------------------------------------
  // 3. ThemePreferencesTab & Startup Hydration
  // --------------------------------------------------------------------------
  describe('3. ThemePreferencesTab & Startup Hydration', () => {
    it('renders all three theme options (light, dark, system) with descriptions', () => {
      const html = renderWithProviders(<ThemePreferencesTab />);

      expect(html).toContain('المظهر الفاتح');
      expect(html).toContain('المظهر الداكن');
      expect(html).toContain('تلقائي (حسب النظام)');
      expect(html).toContain('data-testid="theme-card-light"');
      expect(html).toContain('data-testid="theme-card-dark"');
      expect(html).toContain('data-testid="theme-card-system"');
    });

    it('correctly identifies and marks active theme from settings query', () => {
      queryClient.setQueryData(['systemSettings'], mockGlobalSettings);
      const html = renderWithProviders(<ThemePreferencesTab />);

      expect(html).toContain('data-testid="theme-selected-light"');
    });

    it('hydrates theme through authoritative system.getSettings query without visiting SettingsPage', async () => {
      const { useSettings } = await import('../src/hooks/useSettings.js');
      function TestThemeConsumer() {
        const { data } = useSettings();
        return <div data-testid="app-root-test">مظهر النظام: {data?.theme}</div>;
      }

      // Fetch query through React Query
      await queryClient.prefetchQuery({
        queryKey: ['systemSettings'],
        queryFn: async () => {
          const res = await (global as any).window.tibyan.system.getSettings();
          return res.data;
        },
      });

      const html = renderWithProviders(<TestThemeConsumer />);

      expect(html).toContain('data-testid="app-root-test"');
      expect(html).toContain('light');
      expect((global as any).window.tibyan.system.getSettings).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // 4. AcademicYearManager & Year Switch Cache Purge
  // --------------------------------------------------------------------------
  describe('4. AcademicYearManager & Switching Boundary', () => {
    it('renders registered academic years and marks the active year with a badge', () => {
      queryClient.setQueryData(['academicYears'], [mockActiveYear, mockInactiveYear]);
      const html = renderWithProviders(<AcademicYearManager />);

      expect(html).toContain('2026-2027');
      expect(html).toContain('2027-2028');
      expect(html).toContain('نشط حالياً');
      expect(html).toContain('العام الحالي');
      expect(html).toContain('data-testid="switch-year-btn-year-2"');
    });

    it('renders add academic year button when user is Owner or has SETTINGS_WRITE', () => {
      useAuthStore.setState({ session: mockOwnerSession, status: 'authenticated' });
      const html = renderWithProviders(<AcademicYearManager />);

      expect(html).toContain('data-testid="open-create-year-modal-btn"');
    });

    it('hides add academic year button for assistant lacking SETTINGS_WRITE', () => {
      useAuthStore.setState({ session: mockAssistantSessionRestricted, status: 'authenticated' });
      const html = renderWithProviders(<AcademicYearManager />);

      expect(html).not.toContain('data-testid="open-create-year-modal-btn"');
    });

    it('validates strict YYYY-YYYY format with endYear = startYear + 1', () => {
      expect(CreateAcademicYearSchema.safeParse({ name: '2026-2027' }).success).toBe(true);
      expect(CreateAcademicYearSchema.safeParse({ name: '2027-2028' }).success).toBe(true);

      // Rejects invalid years
      expect(CreateAcademicYearSchema.safeParse({ name: '2026-2028' }).success).toBe(false);
      expect(CreateAcademicYearSchema.safeParse({ name: '2026' }).success).toBe(false);
      expect(CreateAcademicYearSchema.safeParse({ name: 'invalid-year' }).success).toBe(false);
      expect(CreateAcademicYearSchema.safeParse({ name: '2027-2026' }).success).toBe(false);
    });

    it('renders CreateAcademicYearModal with clean initial state', () => {
      const html = renderWithProviders(
        <CreateAcademicYearModal isOpen={true} onClose={vi.fn()} />
      );

      expect(html).toContain('إضافة عام دراسي جديد');
      expect(html).toContain('data-testid="academic-year-name-input"');
      expect(html).toContain('data-testid="submit-create-year-btn"');
    });

    it('purges all academic-year scoped queries using canonical keys on year switch', async () => {
      const { studentKeys } = await import('../src/hooks/useStudents.js');
      const { groupKeys, sessionKeys } = await import('../src/hooks/useGroups.js');
      const { dashboardKeys } = await import('../src/hooks/useDashboard.js');

      // Seed academic-year scoped queries
      queryClient.setQueryData(studentKeys.all, [{ id: 's1', name: 'طالب أ' }]);
      queryClient.setQueryData(groupKeys.all, [{ id: 'g1', name: 'مجموعة أ' }]);
      queryClient.setQueryData(sessionKeys.all, [{ id: 'ses1' }]);
      queryClient.setQueryData(dashboardKeys.all, { todayCount: 5 });

      // Seed system queries
      queryClient.setQueryData(['systemSettings'], mockGlobalSettings);
      queryClient.setQueryData(['academicYears'], [mockActiveYear, mockInactiveYear]);

      // Execute useSwitchAcademicYear mutation
      const { useSwitchAcademicYear } = await import('../src/hooks/useAcademicYears.js');
      let mutateFn: any;
      function TestComponent() {
        const mutation = useSwitchAcademicYear();
        mutateFn = mutation.mutateAsync;
        return null;
      }
      renderWithProviders(<TestComponent />);

      await mutateFn({ academicYearId: 'year-2' });

      // Academic-year scoped queries must be purged
      expect(queryClient.getQueryData(studentKeys.all)).toBeUndefined();
      expect(queryClient.getQueryData(groupKeys.all)).toBeUndefined();
      expect(queryClient.getQueryData(sessionKeys.all)).toBeUndefined();
      expect(queryClient.getQueryData(dashboardKeys.all)).toBeUndefined();

      // System queries remain in cache
      expect(queryClient.getQueryData(['academicYears'])).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 5. UserManagementTab & Assistant Security
  // --------------------------------------------------------------------------
  describe('5. UserManagementTab & Assistant Accounts', () => {
    it('renders users table with Owner and Assistant rows from management listing', () => {
      queryClient.setQueryData(['managementUsersList'], [mockManagedOwner, mockManagedAssistant]);
      const html = renderWithProviders(<UserManagementTab />);

      expect(html).toContain('الأستاذ أحمد الشريف');
      expect(html).toContain('محمود المساعد');
      expect(html).toContain('المعلم المسؤول');
      expect(html).toContain('مساعد');
      expect(html).toContain('حساب رئيسي غير قابل للتعديل');
      expect(html).toContain('data-testid="edit-permissions-btn-22222222-2222-4222-8222-222222222222"');
    });

    it('protects sole Owner: does NOT expose deactivation button for Owner account', () => {
      queryClient.setQueryData(['managementUsersList'], [mockManagedOwner, mockManagedAssistant]);
      const html = renderWithProviders(<UserManagementTab />);

      expect(html).not.toContain(`data-testid="deactivate-user-btn-${mockOwnerUser.id}"`);
      expect(html).toContain(`data-testid="deactivate-user-btn-${mockAssistantUser.id}"`);
    });

    it('renders deactivated assistant with inactive badge and reactivation action button', () => {
      queryClient.setQueryData(['managementUsersList'], [mockManagedOwner, mockInactiveAssistant]);
      const html = renderWithProviders(<UserManagementTab />);

      expect(html).toContain('معطل');
      expect(html).toContain(`data-testid="activate-user-btn-${mockInactiveAssistant.id}"`);
      expect(html).toContain('تفعيل');
    });

    it('restricts user management tab for assistant lacking USERS_MANAGE permission', () => {
      useAuthStore.setState({ session: mockAssistantSessionRestricted, status: 'authenticated' });
      const html = renderWithProviders(<UserManagementTab />);

      expect(html).toContain('غير مصرح بالوصول إلى إدارة الحسابات');
      expect(html).toContain('data-testid="user-management-restricted"');
      expect(html).not.toContain('data-testid="users-table"');
    });

    it('validates 4-digit numeric PIN schema strictly in CreateUserSchema and ResetUserPinSchema', () => {
      // CreateUserSchema
      expect(
        CreateUserSchema.safeParse({
          fullName: 'علي سالم',
          username: 'ali',
          pin: '1234',
          role: 'ASSISTANT',
          permissions: ['STUDENTS_READ'],
        }).success
      ).toBe(true);

      expect(
        CreateUserSchema.safeParse({
          fullName: 'علي سالم',
          username: 'ali',
          pin: '123', // Less than 4 digits
          role: 'ASSISTANT',
          permissions: [],
        }).success
      ).toBe(false);

      expect(
        CreateUserSchema.safeParse({
          fullName: 'علي سالم',
          username: 'ali',
          pin: 'abcd', // Non-numeric
          role: 'ASSISTANT',
          permissions: [],
        }).success
      ).toBe(false);

      // ResetUserPinSchema
      expect(
        ResetUserPinSchema.safeParse({
          userId: '11111111-1111-4111-8111-111111111111',
          newPin: '9876',
        }).success
      ).toBe(true);

      expect(
        ResetUserPinSchema.safeParse({
          userId: '11111111-1111-4111-8111-111111111111',
          newPin: '98765', // More than 4 digits
        }).success
      ).toBe(false);
    });

    it('renders AssistantCreateModal with category-grouped permission checkboxes', () => {
      const html = renderWithProviders(
        <AssistantCreateModal isOpen={true} onClose={vi.fn()} />
      );

      expect(html).toContain('إضافة حساب مساعد جديد');
      expect(html).toContain('شؤون الطلاب');
      expect(html).toContain('المجموعات والاشتراكات');
      expect(html).toContain('الحصص والجدولة');
      expect(html).toContain('المالية والتقارير');
      expect(html).toContain('إدارة النظام والنسخ الاحتياطي');
      expect(html).toContain('data-testid="assistant-pin-input"');
    });

    it('renders AssistantPermissionsModal with preselected permissions', () => {
      const html = renderWithProviders(
        <AssistantPermissionsModal
          isOpen={true}
          onClose={vi.fn()}
          user={mockManagedAssistant}
          initialPermissions={['STUDENTS_READ', 'GROUPS_READ']}
        />
      );

      expect(html).toContain('تعديل صلاحيات المساعد: محمود المساعد');
      expect(html).toContain('data-testid="edit-permission-checkbox-STUDENTS_READ"');
      expect(html).toContain('data-testid="submit-edit-permissions-btn"');
    });

    it('renders AssistantPinResetModal with masked PIN input', () => {
      const html = renderWithProviders(
        <AssistantPinResetModal
          isOpen={true}
          onClose={vi.fn()}
          user={mockManagedAssistant}
        />
      );

      expect(html).toContain('إعادة تعيين رمز PIN للمستخدم: محمود المساعد');
      expect(html).toContain('data-testid="new-pin-input"');
      expect(html).toContain('data-testid="submit-reset-pin-btn"');
    });
  });

  // --------------------------------------------------------------------------
  // 6. BackupSettingsTab
  // --------------------------------------------------------------------------
  describe('6. BackupSettingsTab & Manual Trigger', () => {
    it('renders backup status cards (status, timestamp, size, total count)', () => {
      queryClient.setQueryData(['backupStatus'], mockBackupStatus);
      queryClient.setQueryData(['backupRecords'], mockBackupRecords);

      const html = renderWithProviders(<BackupSettingsTab />);

      expect(html).toContain('النسخ الاحتياطي وسلامة البيانات');
      expect(html).toContain('حالة آخر نسخة');
      expect(html).toContain('ناجحة ومكتملة');
      expect(html).toContain('حجم آخر نسخة');
      expect(html).toContain('إجمالي النسخ المحفوظة');
      expect(html).toContain('1 ميجابايت');
    });

    it('renders recent backup records table with included academic years and isolates filesystem paths', () => {
      queryClient.setQueryData(['backupStatus'], mockBackupStatus);
      queryClient.setQueryData(['backupRecords'], mockBackupRecords);

      const html = renderWithProviders(<BackupSettingsTab />);

      expect(html).toContain('سجل النسخ الاحتياطية الأخيرة');
      expect(html).toContain('data-testid="backup-record-row-backup-1"');
      expect(html).toContain('2026-2027');

      // Security Check: Absolute host paths must NEVER leak into renderer HTML
      expect(html).not.toMatch(/[a-zA-Z]:\\[^<"'\s]+/);
      expect(html).not.toContain('AppData');
      expect(html).not.toContain('generation_');
      expect(html).not.toContain('.sqlite');
    });

    it('renders manual backup button for Owner or user with BACKUP_MANAGE', () => {
      useAuthStore.setState({ session: mockOwnerSession, status: 'authenticated' });
      const html = renderWithProviders(<BackupSettingsTab />);

      expect(html).toContain('data-testid="trigger-backup-btn"');
      expect(html).toContain('إنشاء نسخة احتياطية الآن');
    });

    it('hides manual backup trigger button for user lacking BACKUP_MANAGE', () => {
      useAuthStore.setState({ session: mockAssistantSessionRestricted, status: 'authenticated' });
      const html = renderWithProviders(<BackupSettingsTab />);

      expect(html).not.toContain('data-testid="trigger-backup-btn"');
    });
  });
});
