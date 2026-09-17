import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { GroupsPage } from '../src/features/groups/GroupsPage.js';
import { GroupDetailsPage } from '../src/features/groups/GroupDetailsPage.js';
import { GroupCreateModal } from '../src/features/groups/GroupCreateModal.js';
import { EnrollmentModal } from '../src/features/groups/EnrollmentModal.js';
import { RescheduleSessionModal } from '../src/features/groups/RescheduleSessionModal.js';
import { useAuthStore } from '../src/features/auth/auth.state.js';
import {
  type GroupDto,
  type GroupEnrollmentDto,
  type SessionDto,
  type UserSessionDto,
  CreateGroupSchema,
  EnrollStudentSchema,
  RescheduleSessionSchema,
} from '@tibyan/contracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getRangeForTest() {
  const today = new Date().toISOString().split('T')[0]!;
  const todayPlus27Dt = new Date();
  todayPlus27Dt.setDate(todayPlus27Dt.getDate() + 27);
  const todayPlus27 = todayPlus27Dt.toISOString().split('T')[0]!;
  return { today, todayPlus27 };
}

describe('Task 14: Group Management UI & Rescheduling Suite', () => {
  let queryClient: QueryClient;

  const mockGeneralGroup: GroupDto = {
    id: '11111111-2222-4333-8444-555555555555',
    name: 'مجموعة الأوائل - أولى ثانوي',
    educationSystem: 'GENERAL',
    gradeLevel: 'SEC_1',
    languageTrack: 'ARABIC',
    focusMathBranch: null,
    defaultPaymentType: 'MONTHLY',
    defaultPaymentAmount: 250,
    status: 'ACTIVE',
    schedules: [
      {
        id: 'slot-1',
        groupId: '11111111-2222-4333-8444-555555555555',
        weekday: 0,
        startTime: '16:00',
        durationMinutes: 120,
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'slot-2',
        groupId: '11111111-2222-4333-8444-555555555555',
        weekday: 2,
        startTime: '18:00',
        durationMinutes: 120,
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      },
    ],
    enrolledCount: 2,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  };

  const mockBaccalaureateGroup: GroupDto = {
    id: '22222222-3333-4444-8555-666666666666',
    name: 'مجموعة البكالوريا - تفاضل وتكامل',
    educationSystem: 'EGYPTIAN_BACCALAUREATE',
    gradeLevel: 'SEC_3',
    languageTrack: 'LANG_ENGLISH',
    focusMathBranch: 'CALCULUS',
    defaultPaymentType: 'PER_SESSION',
    defaultPaymentAmount: 60,
    status: 'ACTIVE',
    schedules: [
      {
        id: 'slot-3',
        groupId: '22222222-3333-4444-8555-666666666666',
        weekday: 1,
        startTime: '17:00',
        durationMinutes: 90,
        createdAt: '2026-09-02T10:00:00.000Z',
        updatedAt: '2026-09-02T10:00:00.000Z',
      },
    ],
    enrolledCount: 1,
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
  };

  const mockArchivedGroup: GroupDto = {
    id: '33333333-4444-4555-8666-777777777777',
    name: 'مجموعة مؤرشفة قديمة',
    educationSystem: 'GENERAL',
    gradeLevel: 'PREP_3',
    languageTrack: 'ARABIC',
    focusMathBranch: null,
    defaultPaymentType: 'MONTHLY',
    defaultPaymentAmount: 200,
    status: 'ARCHIVED',
    schedules: [],
    enrolledCount: 0,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-15T10:00:00.000Z',
  };

  const mockEnrollmentActive1: GroupEnrollmentDto = {
    id: 'enr-1',
    groupId: mockGeneralGroup.id,
    groupName: mockGeneralGroup.name,
    studentId: 'stud-1',
    studentName: 'محمود أحمد عثمان',
    studentCode: 'TB-0010',
    enrolledAt: '2026-09-05T10:00:00.000Z',
    leftAt: null,
    status: 'ACTIVE',
    paymentTypeOverride: null,
    paymentAmountOverride: null,
    effectivePaymentType: 'MONTHLY',
    effectivePaymentAmount: 250,
    isPaymentOverridden: false,
    createdAt: '2026-09-05T10:00:00.000Z',
  };

  const mockEnrollmentOverridden: GroupEnrollmentDto = {
    id: 'enr-2',
    groupId: mockGeneralGroup.id,
    groupName: mockGeneralGroup.name,
    studentId: 'stud-2',
    studentName: 'يوسف إبراهيم حسنين',
    studentCode: 'TB-0011',
    enrolledAt: '2026-09-06T10:00:00.000Z',
    leftAt: null,
    status: 'ACTIVE',
    paymentTypeOverride: 'MONTHLY',
    paymentAmountOverride: 200,
    effectivePaymentType: 'MONTHLY',
    effectivePaymentAmount: 200,
    isPaymentOverridden: true,
    createdAt: '2026-09-06T10:00:00.000Z',
  };

  const mockEnrollmentEnded: GroupEnrollmentDto = {
    id: 'enr-3',
    groupId: mockGeneralGroup.id,
    groupName: mockGeneralGroup.name,
    studentId: 'stud-3',
    studentName: 'كريم مصطفى الجوهري',
    studentCode: 'TB-0012',
    enrolledAt: '2026-09-01T10:00:00.000Z',
    leftAt: '2026-09-10T12:00:00.000Z',
    status: 'ENDED',
    paymentTypeOverride: null,
    paymentAmountOverride: null,
    effectivePaymentType: 'MONTHLY',
    effectivePaymentAmount: 250,
    isPaymentOverridden: false,
    createdAt: '2026-09-01T10:00:00.000Z',
  };

  const mockSessionScheduled: SessionDto = {
    id: '12345678-1234-4234-8234-1234567890ab',
    groupId: mockGeneralGroup.id,
    groupName: mockGeneralGroup.name,
    scheduleId: 'slot-1',
    occurrenceKey: 'slot-1_2026-09-20',
    scheduledDate: '2026-09-20',
    scheduledStartTime: '16:00',
    effectiveDate: '2026-09-20',
    effectiveStartTime: '16:00',
    durationMinutes: 120,
    status: 'SCHEDULED',
    rescheduleReason: null,
    rescheduledAt: null,
    cancellationReason: null,
    notes: null,
    studentCount: 2,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  };

  const mockSessionRescheduled: SessionDto = {
    id: 'sess-2',
    groupId: mockGeneralGroup.id,
    groupName: mockGeneralGroup.name,
    scheduleId: 'slot-2',
    occurrenceKey: 'slot-2_2026-09-22',
    scheduledDate: '2026-09-22',
    scheduledStartTime: '18:00',
    effectiveDate: '2026-09-23',
    effectiveStartTime: '19:00',
    durationMinutes: 120,
    status: 'RESCHEDULED',
    rescheduleReason: 'تعديل استثنائي بسبب عطلة رسمية',
    rescheduledAt: '2026-09-18T10:00:00.000Z',
    cancellationReason: null,
    notes: null,
    studentCount: 2,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
  };

  const ownerSession: UserSessionDto = {
    userId: 'owner-uuid',
    username: 'owner',
    fullName: 'أحمد صاحب السنتر',
    role: 'OWNER',
    permissions: ['GROUPS_READ', 'GROUPS_WRITE', 'SESSIONS_MANAGE', 'STUDENTS_READ', 'STUDENTS_WRITE'],
    tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
  };

  const readOnlyAssistantSession: UserSessionDto = {
    userId: 'asst-uuid',
    username: 'assistant_read',
    fullName: 'مساعد للقراءة فقط',
    role: 'ASSISTANT',
    permissions: ['GROUPS_READ', 'STUDENTS_READ'],
    tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    useAuthStore.setState({ session: ownerSession, status: 'authenticated' });

    (globalThis as any).window = {
      tibyan: {
        groups: {
          list: vi.fn().mockResolvedValue({
            success: true,
            data: [mockGeneralGroup, mockBaccalaureateGroup, mockArchivedGroup],
          }),
          getById: vi.fn().mockImplementation((id: string) => {
            if (id === mockGeneralGroup.id) {
              return Promise.resolve({ success: true, data: mockGeneralGroup });
            }
            if (id === mockBaccalaureateGroup.id) {
              return Promise.resolve({ success: true, data: mockBaccalaureateGroup });
            }
            return Promise.resolve({ success: false, error: { code: 'GROUP_NOT_FOUND', message: 'المجموعة غير موجودة' } });
          }),
          create: vi.fn().mockImplementation((input: any) => {
            return Promise.resolve({
              success: true,
              data: {
                ...mockGeneralGroup,
                id: 'new-group-uuid',
                name: input.name,
                educationSystem: input.educationSystem,
                gradeLevel: input.gradeLevel,
                languageTrack: input.languageTrack,
                focusMathBranch: input.focusMathBranch ?? null,
                defaultPaymentType: input.defaultPaymentType,
                defaultPaymentAmount: input.defaultPaymentAmount,
              },
            });
          }),
          update: vi.fn().mockResolvedValue({ success: true, data: mockGeneralGroup }),
          setSchedule: vi.fn().mockResolvedValue({ success: true, data: mockGeneralGroup }),
        },
        enrollments: {
          listByGroup: vi.fn().mockResolvedValue({
            success: true,
            data: [mockEnrollmentActive1, mockEnrollmentOverridden, mockEnrollmentEnded],
          }),
          enroll: vi.fn().mockResolvedValue({ success: true, data: mockEnrollmentActive1 }),
          updatePayment: vi.fn().mockResolvedValue({ success: true, data: mockEnrollmentOverridden }),
          end: vi.fn().mockResolvedValue({ success: true, data: undefined }),
        },
        sessions: {
          materializeRollingSessions: vi.fn().mockResolvedValue({
            success: true,
            data: { startDate: '2026-09-18', endDate: '2026-10-15', createdCount: 4, existingCount: 10 },
          }),
          listByRange: vi.fn().mockResolvedValue({
            success: true,
            data: [mockSessionScheduled, mockSessionRescheduled],
          }),
          reschedule: vi.fn().mockResolvedValue({ success: true, data: mockSessionRescheduled }),
          cancel: vi.fn().mockResolvedValue({ success: true, data: mockSessionScheduled }),
        },
        students: {
          list: vi.fn().mockResolvedValue({
            success: true,
            data: [
              {
                id: 'stud-1',
                fullName: 'محمود أحمد عثمان',
                studentCode: 'TB-0010',
                educationSystem: 'GENERAL',
                gradeLevel: 'SEC_1',
                languageTrack: 'ARABIC',
                status: 'ACTIVE',
              },
              {
                id: 'stud-compatible-free',
                fullName: 'طالب متوافق جديد',
                studentCode: 'TB-0015',
                educationSystem: 'GENERAL',
                gradeLevel: 'SEC_1',
                languageTrack: 'ARABIC',
                status: 'ACTIVE',
              },
              {
                id: 'stud-inactive',
                fullName: 'طالب غير نشط',
                studentCode: 'TB-0099',
                educationSystem: 'GENERAL',
                gradeLevel: 'SEC_1',
                languageTrack: 'ARABIC',
                status: 'INACTIVE',
              },
            ],
          }),
        },
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  const renderWithProviders = (ui: React.ReactElement, initialPath: string = '/groups') => {
    return renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:groupId" element={<GroupDetailsPage />} />
            <Route path="/test-create-modal" element={ui} />
            <Route path="/test-enroll-modal" element={ui} />
            <Route path="/test-reschedule-modal" element={ui} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('Groups Directory (GroupsPage)', () => {
    it('renders real group list with Arabic names, grade levels, and status badges', () => {
      queryClient.setQueryData(['groups', 'list'], [mockGeneralGroup, mockBaccalaureateGroup]);
      const html = renderWithProviders(<GroupsPage />);

      expect(html).toContain('data-testid="page-groups"');
      expect(html).toContain('المجموعات الدراسية');
      expect(html).toContain('مجموعة الأوائل - أولى ثانوي');
      expect(html).toContain('مجموعة البكالوريا - تفاضل وتكامل');
      expect(html).toContain('التعليم العام');
      expect(html).toContain('البكالوريا المصرية');
      expect(html).toContain('250 ج.م');
      expect(html).toContain('60 ج.م');
    });

    it('renders empty state cleanly when zero groups exist', () => {
      queryClient.setQueryData(['groups', 'list'], []);
      const html = renderWithProviders(<GroupsPage />);

      expect(html).toContain('data-testid="groups-empty"');
      expect(html).toContain('لا توجد مجموعات بعد');
      expect(html).toContain('data-testid="btn-empty-create-group"');
    });

    it('displays optional focusMathBranch badge for specialized high-school math groups', () => {
      queryClient.setQueryData(['groups', 'list'], [mockBaccalaureateGroup]);
      const html = renderWithProviders(<GroupsPage />);

      expect(html).toContain('فرع: CALCULUS');
    });
  });

  describe('Group Creation & Validation (GroupCreateModal)', () => {
    it('supports GENERAL and EGYPTIAN_BACCALAUREATE group creation contracts', () => {
      const generalInput = {
        name: 'مجموعة عامة تجريبية',
        educationSystem: 'GENERAL' as const,
        gradeLevel: 'PREP_2' as const,
        languageTrack: 'ARABIC' as const,
        defaultPaymentType: 'MONTHLY' as const,
        defaultPaymentAmount: 200,
        schedules: [],
      };
      expect(() => CreateGroupSchema.parse(generalInput)).not.toThrow();

      const baccalaureateInput = {
        name: 'مجموعة بكالوريا تجريبية',
        educationSystem: 'EGYPTIAN_BACCALAUREATE' as const,
        gradeLevel: 'SEC_2' as const,
        languageTrack: 'LANG_ENGLISH' as const,
        focusMathBranch: 'ALGEBRA' as const,
        defaultPaymentType: 'PER_SESSION' as const,
        defaultPaymentAmount: 75,
        schedules: [
          { weekday: 1 as const, startTime: '15:30', durationMinutes: 90 },
        ],
      };
      expect(() => CreateGroupSchema.parse(baccalaureateInput)).not.toThrow();
    });

    it('rejects duplicate schedule slots with duplicate weekday and startTime', () => {
      const duplicateSlots = [
        { weekday: 0 as const, startTime: '16:00', durationMinutes: 120 },
        { weekday: 0 as const, startTime: '16:00', durationMinutes: 90 },
      ];

      const seen = new Set<string>();
      let hasDuplicate = false;
      for (const slot of duplicateSlots) {
        const key = `${slot.weekday}_${slot.startTime}`;
        if (seen.has(key)) {
          hasDuplicate = true;
          break;
        }
        seen.add(key);
      }
      expect(hasDuplicate).toBe(true);
    });

    it('renders GroupCreateModal with academic dimensions and payment defaults', () => {
      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <GroupCreateModal isOpen={true} onClose={() => {}} />
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="group-form"');
      expect(html).toContain('data-testid="input-group-name"');
      expect(html).toContain('data-testid="select-education-system"');
      expect(html).toContain('data-testid="select-grade-level"');
      expect(html).toContain('data-testid="select-language-track"');
      expect(html).toContain('data-testid="select-math-branch"');
      expect(html).toContain('data-testid="select-default-payment-type"');
      expect(html).toContain('data-testid="input-default-payment-amount"');
      expect(html).toContain('data-testid="btn-add-schedule-slot"');
    });
  });

  describe('Group Details & Enrollment Roster (GroupDetailsPage)', () => {
    it('renders group metadata, schedule chips, and enrolled students list', () => {
      const { today, todayPlus27 } = getRangeForTest();
      queryClient.setQueryData(['groups', 'detail', mockGeneralGroup.id], mockGeneralGroup);
      queryClient.setQueryData(['groups', 'enrollments', mockGeneralGroup.id], [
        mockEnrollmentActive1,
        mockEnrollmentOverridden,
        mockEnrollmentEnded,
      ]);
      queryClient.setQueryData(
        ['sessions', 'range', { startDate: today, endDate: todayPlus27, groupId: mockGeneralGroup.id }],
        [mockSessionScheduled, mockSessionRescheduled]
      );

      const html = renderWithProviders(<GroupDetailsPage />, `/groups/${mockGeneralGroup.id}`);

      expect(html).toContain('data-testid="page-group-details"');
      expect(html).toContain(mockGeneralGroup.name);
      expect(html).toContain('الأبعاد الأكاديمية');
      expect(html).toContain('المصروفات الافتراضية');
      expect(html).toContain('محمود أحمد عثمان');
      expect(html).toContain('يوسف إبراهيم حسنين');
      expect(html).toContain('افتراضي المجموعة');
      expect(html).toContain('سعر خاص');
      expect(html).toContain('TB-0010');
      expect(html).toContain('TB-0011');
    });

    it('preserves ENDED enrollment departure history without deleting rows', () => {
      queryClient.setQueryData(['groups', 'detail', mockGeneralGroup.id], mockGeneralGroup);
      queryClient.setQueryData(['groups', 'enrollments', mockGeneralGroup.id], [
        mockEnrollmentActive1,
        mockEnrollmentEnded,
      ]);

      const html = renderWithProviders(<GroupDetailsPage />, `/groups/${mockGeneralGroup.id}`);

      // Has toggle button for departed students
      expect(html).toContain('data-testid="btn-toggle-ended-students"');
      expect(html).toContain('عرض السابقين (1)');
    });
  });

  describe('Enrollment & Payment Inheritance (EnrollmentModal)', () => {
    it('inherits group defaults when payment overrides are null', () => {
      const input = {
        groupId: mockGeneralGroup.id,
        studentId: '11111111-aaaa-4111-8111-111111111111',
        paymentTypeOverride: null,
        paymentAmountOverride: null,
      };

      const validated = EnrollStudentSchema.parse(input);
      expect(validated.paymentTypeOverride).toBeNull();
      expect(validated.paymentAmountOverride).toBeNull();
    });

    it('supports student-specific overridden payment terms on enrollment row', () => {
      const input = {
        groupId: mockGeneralGroup.id,
        studentId: '11111111-aaaa-4111-8111-111111111111',
        paymentTypeOverride: 'PER_SESSION' as const,
        paymentAmountOverride: 45,
      };

      const validated = EnrollStudentSchema.parse(input);
      expect(validated.paymentTypeOverride).toBe('PER_SESSION');
      expect(validated.paymentAmountOverride).toBe(45);
    });

    it('renders EnrollmentModal with candidate selector and fee override option', () => {
      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <EnrollmentModal isOpen={true} onClose={() => {}} group={mockGeneralGroup} />
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="enrollment-form"');
      expect(html).toContain('data-testid="select-student"');
      expect(html).toContain('data-testid="checkbox-custom-payment"');
      expect(html).toContain(mockGeneralGroup.name);
      expect(html).toContain('250 ج.م');
    });
  });

  describe('Single-Session Rescheduling UI (RescheduleSessionModal)', () => {
    it('reschedules changes effectiveDate and effectiveStartTime only, keeping occurrenceKey immutable', () => {
      const rescheduleInput = {
        sessionId: mockSessionScheduled.id,
        newEffectiveDate: '2026-09-25',
        newEffectiveStartTime: '17:30',
        reason: 'تقديم الحصة لسفر المعلم',
      };

      const validated = RescheduleSessionSchema.parse(rescheduleInput);
      expect(validated.newEffectiveDate).toBe('2026-09-25');
      expect(validated.newEffectiveStartTime).toBe('17:30');
      expect(validated.reason).toBe('تقديم الحصة لسفر المعلم');

      // Occurrence key on the target session remains untouched
      expect(mockSessionScheduled.occurrenceKey).toBe('slot-1_2026-09-20');
      expect(mockSessionScheduled.scheduledDate).toBe('2026-09-20');
      expect(mockSessionScheduled.scheduledStartTime).toBe('16:00');
    });

    it('renders RescheduleSessionModal showing immutable scheduled date and inputs for new date/time', () => {
      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <RescheduleSessionModal
            isOpen={true}
            onClose={() => {}}
            session={mockSessionScheduled}
            groupId={mockGeneralGroup.id}
          />
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="reschedule-form"');
      expect(html).toContain('الموعد الأصلي المجدول (ثابت)');
      expect(html).toContain(mockSessionScheduled.scheduledDate);
      expect(html).toContain(mockSessionScheduled.scheduledStartTime);
      expect(html).toContain(mockSessionScheduled.occurrenceKey);
      expect(html).toContain('data-testid="input-new-date"');
      expect(html).toContain('data-testid="input-new-time"');
      expect(html).toContain('data-testid="textarea-reschedule-reason"');
    });
  });

  describe('Permission Boundaries Enforcement', () => {
    it('read-only assistant cannot see Create Group button on GroupsPage', () => {
      useAuthStore.setState({ session: readOnlyAssistantSession, status: 'authenticated' });
      queryClient.setQueryData(['groups', 'list'], [mockGeneralGroup]);

      const html = renderWithProviders(<GroupsPage />);

      expect(html).not.toContain('data-testid="btn-create-group"');
    });

    it('read-only assistant cannot see Edit, Archive, or Enroll buttons on GroupDetailsPage', () => {
      const { today, todayPlus27 } = getRangeForTest();
      useAuthStore.setState({ session: readOnlyAssistantSession, status: 'authenticated' });
      queryClient.setQueryData(['groups', 'detail', mockGeneralGroup.id], mockGeneralGroup);
      queryClient.setQueryData(['groups', 'enrollments', mockGeneralGroup.id], [mockEnrollmentActive1]);
      queryClient.setQueryData(['sessions', 'range', { startDate: today, endDate: todayPlus27, groupId: mockGeneralGroup.id }], [
        mockSessionScheduled,
      ]);

      const html = renderWithProviders(<GroupDetailsPage />, `/groups/${mockGeneralGroup.id}`);

      expect(html).not.toContain('data-testid="btn-edit-group"');
      expect(html).not.toContain('data-testid="btn-toggle-archive"');
      expect(html).not.toContain('data-testid="btn-open-enroll-modal"');
      expect(html).not.toContain('data-testid="btn-edit-payment-enr-1"');
      expect(html).not.toContain('data-testid="btn-end-enrollment-enr-1"');
      expect(html).not.toContain(`data-testid="btn-reschedule-${mockSessionScheduled.id}"`);
    });

    it('owner has full access to create, edit, archive, enroll, and reschedule', () => {
      const { today, todayPlus27 } = getRangeForTest();
      useAuthStore.setState({ session: ownerSession, status: 'authenticated' });
      queryClient.setQueryData(['groups', 'detail', mockGeneralGroup.id], mockGeneralGroup);
      queryClient.setQueryData(['groups', 'enrollments', mockGeneralGroup.id], [mockEnrollmentActive1]);
      queryClient.setQueryData(['sessions', 'range', { startDate: today, endDate: todayPlus27, groupId: mockGeneralGroup.id }], [
        mockSessionScheduled,
      ]);

      const html = renderWithProviders(<GroupDetailsPage />, `/groups/${mockGeneralGroup.id}`);

      expect(html).toContain('data-testid="btn-edit-group"');
      expect(html).toContain('data-testid="btn-toggle-archive"');
      expect(html).toContain('data-testid="btn-open-enroll-modal"');
      expect(html).toContain('data-testid="btn-edit-payment-enr-1"');
      expect(html).toContain('data-testid="btn-end-enrollment-enr-1"');
      expect(html).toContain(`data-testid="btn-reschedule-${mockSessionScheduled.id}"`);
    });
  });

  describe('Architectural Sandbox Boundary Verification', () => {
    it('verifies that no groups UI files or hooks import @tibyan/core, @tibyan/db, better-sqlite3, fs, path, or electron', () => {
      const groupsDir = path.resolve(__dirname, '../src/features/groups');
      const files = fs.readdirSync(groupsDir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));
      files.push(path.resolve(__dirname, '../src/hooks/useGroups.ts'));

      const forbiddenPatterns = [
        /@tibyan\/core/,
        /@tibyan\/db/,
        /better-sqlite3/,
        /from ['"]fs['"]/,
        /from ['"]path['"]/,
        /from ['"]electron['"]/,
        /ipcRenderer/,
      ];

      for (const file of files) {
        const filePath = file.includes(path.sep) ? file : path.join(groupsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        for (const pattern of forbiddenPatterns) {
          expect(content).not.toMatch(pattern);
        }
      }
    });
  });
});
