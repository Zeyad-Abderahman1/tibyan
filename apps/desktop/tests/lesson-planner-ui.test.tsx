import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LessonPlanEditorModal } from '../src/features/curriculum/LessonPlanEditorModal.js';
import { SessionReflectionModal } from '../src/features/attendance/SessionReflectionModal.js';
import { CurriculumTreeView } from '../src/features/curriculum/CurriculumTreeView.js';
import { AttendancePage } from '../src/features/attendance/AttendancePage.js';
import { useAuthStore } from '../src/features/auth/auth.state.js';
import {
  type LessonPlanDto,
  type SessionReflectionDto,
  type CurriculumCatalogDto,
  type CurriculumTreeNodeDto,
  createEmptyLessonPlanSections,
  createTextBlock,
  createMathBlock,
} from '@tibyan/contracts';

describe('Phase 3 — Task 3: Lesson Planner & Session Reflection UI Suite', () => {
  let queryClient: QueryClient;

  const mockOwnerSession = {
    userId: '11111111-1111-1111-1111-111111111111',
    fullName: 'الأستاذ أحمد الشريف',
    username: 'teacher',
    role: 'OWNER' as const,
    permissions: ['GROUPS_READ' as const, 'GROUPS_WRITE' as const, 'ATTENDANCE_WRITE' as const, 'SESSIONS_MANAGE' as const],
    tokenExpiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
  };

  const mockLessonPlan: LessonPlanDto = {
    id: 'plan_test_001',
    curriculumNodeId: 'node_calc_01',
    title: 'خطة درس قاعدة السلسلة وتطبيقاتها',
    targetDurationMinutes: 60,
    status: 'READY',
    version: 1,
    sections: {
      ...createEmptyLessonPlanSections(),
      objectives: ['فهم قاعدة السلسلة', 'تطبيق القاعدة على الدوال الدائرية'],
      explanation: {
        version: 1,
        blocks: [
          createTextBlock('نص القاعدة الأساسية:'),
          createMathBlock('\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}', {
            displayMode: 'block',
            altTextAr: 'صيغة قاعدة السلسلة',
          }),
        ],
      },
      timingBreakdown: [
        { id: '1', label: 'مقدمة ومراجعة سريعة', minutes: 10 },
        { id: '2', label: 'شرح النظريات', minutes: 30 },
        { id: '3', label: 'أمثلة وتطبيقات تفاعلية', minutes: 20 },
      ],
      notes: 'إحضار نماذج امتحانات الثانوية العامة للأعوام السابقة',
    },
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  };

  const mockReflection: SessionReflectionDto = {
    id: 'ref_test_001',
    sessionId: 'sess_123',
    lessonPlanId: 'plan_test_001',
    lessonPlanSnapshot: {
      planId: 'plan_test_001',
      curriculumNodeId: 'node_calc_01',
      title: 'خطة درس قاعدة السلسلة وتطبيقاتها (المجمدة)',
      targetDurationMinutes: 60,
      version: 1,
      sections: mockLessonPlan.sections,
      snapshottedAt: '2026-09-20T12:00:00Z',
    },
    completionStatus: 'PARTIALLY_COMPLETED',
    uncompletedItems: 'مسائل الدوال المثلثية المعكوسة',
    topicsNeedingReview: 'مراجعة متطابقات حساب المثلثات',
    quickNotes: 'تفاعل ممتاز ولكن الوقت لم يكفِ لجميع المسائل',
    createdAt: '2026-09-20T12:00:00Z',
    updatedAt: '2026-09-20T12:00:00Z',
  };

  const mockCatalog: CurriculumCatalogDto = {
    id: 'cat_01',
    code: 'CAT-01',
    title: 'منهج التفاضل والتكامل 3 ث',
    educationSystem: 'GENERAL',
    gradeLevel: 'SEC_3',
    languageTrack: 'ARABIC',
    mathBranch: 'CALCULUS',
    version: 1,
    status: 'PUBLISHED',
    publishedAt: '2026-09-20T00:00:00Z',
    description: null,
    createdAt: '2026-09-20T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z',
  };

  const mockTree: CurriculumTreeNodeDto[] = [
    {
      id: 'node_calc_01',
      catalogId: 'cat_01',
      parentId: null,
      tier: 'LESSON',
      code: 'LES-01',
      titleAr: 'قاعدة السلسلة',
      titleEn: null,
      description: null,
      metadataJson: null,
      orderIndex: 1,
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
      children: [],
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuthStore.setState({ session: mockOwnerSession, status: 'authenticated' });

    (global as any).window = {
      tibyan: {
        lessonPlanner: {
          createLessonPlan: vi.fn(async (input: any) => ({ success: true, data: { ...mockLessonPlan, ...input } })),
          updateLessonPlan: vi.fn(async (id: any, input: any) => ({ success: true, data: { ...mockLessonPlan, id, ...input } })),
          getLessonPlan: vi.fn(async () => ({ success: true, data: mockLessonPlan })),
          listLessonPlansByNode: vi.fn(async () => ({ success: true, data: [mockLessonPlan] })),
          listLessonPlans: vi.fn(async () => ({ success: true, data: [mockLessonPlan] })),
          archiveLessonPlan: vi.fn(async (id: any) => ({ success: true, data: { ...mockLessonPlan, id, status: 'ARCHIVED' } })),
        },
        sessionReflection: {
          createReflection: vi.fn(async (input: any) => ({ success: true, data: { ...mockReflection, ...input } })),
          updateReflection: vi.fn(async (id: any, input: any) => ({ success: true, data: { ...mockReflection, id, ...input } })),
          getReflectionBySession: vi.fn(async () => ({ success: true, data: mockReflection })),
          getReflection: vi.fn(async () => ({ success: true, data: mockReflection })),
        },
        curriculum: {
          getTree: vi.fn(async () => ({ success: true, data: mockTree })),
        },
        dashboard: {
          getToday: vi.fn(async () => ({
            success: true,
            data: {
              classes: [
                {
                  sessionId: 'sess_123',
                  groupId: 'grp_01',
                  groupName: 'مجموعة النخبة 3 ث',
                  effectiveStartTime: '16:00',
                  durationMinutes: 90,
                  status: 'COMPLETED',
                },
              ],
            },
          })),
        },
        attendance: {
          getRoster: vi.fn(async () => ({
            success: true,
            data: {
              groupName: 'مجموعة النخبة 3 ث',
              session: {
                sessionId: 'sess_123',
                effectiveStartTime: '16:00',
                durationMinutes: 90,
                status: 'COMPLETED',
                scheduledDate: '2026-09-20',
              },
              summary: { totalStudents: 10, present: 9, absent: 1, late: 0, excused: 0, unmarked: 0 },
              roster: [],
            },
          })),
        },
      },
    };
  });

  describe('LessonPlanEditorModal', () => {
    it('renders modal with pedagogical section tabs and title input', () => {
      queryClient.setQueryData(['lesson-plans', 'detail', 'plan_test_001'], mockLessonPlan);

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <LessonPlanEditorModal
              isOpen={true}
              onClose={() => {}}
              curriculumNodeId="node_calc_01"
              curriculumNodeTitle="قاعدة السلسلة"
              planId="plan_test_001"
            />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="lesson-plan-modal"');
      expect(html).toContain('تعديل خطة الدرس');
      expect(html).toContain('قاعدة السلسلة');
      expect(html).toContain('data-testid="tab-objectives"');
      expect(html).toContain('data-testid="tab-priorReview"');
      expect(html).toContain('data-testid="tab-explanation"');
      expect(html).toContain('data-testid="tab-examples"');
      expect(html).toContain('data-testid="tab-inClassQuestions"');
      expect(html).toContain('data-testid="tab-commonMistakes"');
      expect(html).toContain('data-testid="tab-homework"');
      expect(html).toContain('data-testid="tab-timing"');
      expect(html).toContain('data-testid="tab-notes"');
      expect(html).toContain('data-testid="btn-save-lesson-plan"');
    });

    it('displays dynamic timing simulator with planned duration and exact match feedback', () => {
      queryClient.setQueryData(['lesson-plans', 'detail', 'plan_test_001'], mockLessonPlan);

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <LessonPlanEditorModal
              isOpen={true}
              onClose={() => {}}
              curriculumNodeId="node_calc_01"
              curriculumNodeTitle="قاعدة السلسلة"
              planId="plan_test_001"
            />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Total planned duration in fixture is 10 + 30 + 20 = 60 minutes
      // Target duration is 60 minutes -> EXACT match
      expect(html).toContain('60د');
      expect(html).toContain('60 دقيقة من أصل 60 دقيقة');
    });
  });

  describe('SessionReflectionModal & Immutable Snapshot Preservation', () => {
    it('renders reflection modal with completion status options and immutable taught snapshot', () => {
      queryClient.setQueryData(['session-reflections', 'by-session', 'sess_123'], mockReflection);

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <SessionReflectionModal
              isOpen={true}
              onClose={() => {}}
              sessionId="sess_123"
              groupName="مجموعة النخبة 3 ث"
              sessionDate="2026-09-20"
            />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="session-reflection-modal"');
      expect(html).toContain('تأمل الحصة والملاحظات الأكاديمية');
      expect(html).toContain('مجموعة النخبة 3 ث');
      expect(html).toContain('data-testid="status-option-completed"');
      expect(html).toContain('data-testid="status-option-partially_completed"');
      expect(html).toContain('data-testid="status-option-postponed"');
      expect(html).toContain('data-testid="textarea-uncompleted-items"');
      expect(html).toContain('data-testid="textarea-topics-review"');
      expect(html).toContain('data-testid="textarea-quick-notes"');
      expect(html).toContain('data-testid="btn-save-reflection"');

      // Crucial: proves immutable historical lesson plan snapshot is acknowledged
      expect(html).toContain('data-testid="reflection-snapshot-card"');
      expect(html).toContain('نسخة خطة الدرس المجمدة تاريخياً وقت التدريس');
      expect(html).toContain('خطة درس قاعدة السلسلة وتطبيقاتها (المجمدة)');
      expect(html).toContain('الإصدار 1');
    });
  });

  describe('CurriculumTreeView Integration', () => {
    it('provides lesson planning action button on LESSON tier nodes', () => {
      queryClient.setQueryData(['curriculum', 'trees', mockCatalog.id], mockTree);

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <CurriculumTreeView catalog={mockCatalog} canWrite={true} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="btn-plan-lesson-node_calc_01"');
      expect(html).toContain('خطة الدرس');
    });
  });

  describe('AttendancePage Integration', () => {
    it('provides session reflection button in attendance toolbar for active session', () => {
      queryClient.setQueryData(['attendance', 'roster', 'sess_123'], {
        groupName: 'مجموعة النخبة 3 ث',
        session: {
          sessionId: 'sess_123',
          effectiveStartTime: '16:00',
          durationMinutes: 90,
          status: 'COMPLETED',
          scheduledDate: '2026-09-20',
        },
        summary: { totalStudents: 10, present: 9, absent: 1, late: 0, excused: 0, unmarked: 0 },
        roster: [],
      });
      queryClient.setQueryData(['dashboard', 'today'], {
        classes: [
          {
            sessionId: 'sess_123',
            groupId: 'grp_01',
            groupName: 'مجموعة النخبة 3 ث',
            effectiveStartTime: '16:00',
            durationMinutes: 90,
            status: 'COMPLETED',
          },
        ],
      });

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/attendance?sessionId=sess_123']}>
            <AttendancePage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="btn-open-session-reflection"');
      expect(html).toContain('تأمل الحصة');
    });
  });
});
