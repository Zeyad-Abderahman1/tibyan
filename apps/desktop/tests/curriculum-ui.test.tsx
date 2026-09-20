import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CurriculumCatalogsPage } from '../src/features/curriculum/CurriculumCatalogsPage.js';
import { CurriculumTreeView } from '../src/features/curriculum/CurriculumTreeView.js';
import { CreateCatalogModal } from '../src/features/curriculum/CreateCatalogModal.js';
import { AssignCatalogModal } from '../src/features/curriculum/AssignCatalogModal.js';
import { GroupSyllabusCard } from '../src/features/curriculum/GroupSyllabusCard.js';
import { useAuthStore } from '../src/features/auth/auth.state.js';
import type {
  CurriculumCatalogDto,
  CurriculumTreeNodeDto,
  GroupDto,
  GroupCurriculumOverviewDto,
  UserSessionDto,
} from '@tibyan/contracts';

describe('Phase 3 — Task 1: Curriculum UI Components Suite', () => {
  let queryClient: QueryClient;

  const mockOwnerSession: UserSessionDto = {
    userId: '11111111-1111-1111-1111-111111111111',
    fullName: 'الأستاذ أحمد الشريف',
    username: 'teacher',
    role: 'OWNER',
    permissions: ['GROUPS_READ', 'GROUPS_WRITE'],
    tokenExpiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
  };

  const mockCatalog: CurriculumCatalogDto = {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'SEC1-ALG-AR-V1',
    title: 'جبر وحساب مثلثات 1 ث',
    educationSystem: 'GENERAL',
    gradeLevel: 'SEC_1',
    languageTrack: 'ARABIC',
    mathBranch: 'ALGEBRA',
    version: 1,
    status: 'DRAFT',
    publishedAt: null,
    description: 'منهج الجبر للفصل الدراسي الأول',
    createdAt: '2026-09-20T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z',
  };

  const mockTree: CurriculumTreeNodeDto[] = [
    {
      id: '33333333-3333-3333-3333-333333333333',
      catalogId: mockCatalog.id,
      parentId: null,
      tier: 'UNIT',
      code: 'UNT-01',
      titleAr: 'الوحدة الأولى: المصفوفات',
      titleEn: null,
      description: null,
      metadataJson: null,
      orderIndex: 1,
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
      children: [
        {
          id: '44444444-4444-4444-4444-444444444444',
          catalogId: mockCatalog.id,
          parentId: '33333333-3333-3333-3333-333333333333',
          tier: 'LESSON',
          code: 'LES-01',
          titleAr: 'الدرس الأول: تنظيم البيانات',
          titleEn: null,
          description: null,
          metadataJson: null,
          orderIndex: 1,
          createdAt: '2026-09-20T00:00:00Z',
          updatedAt: '2026-09-20T00:00:00Z',
          children: [
            {
              id: '55555555-5555-5555-5555-555555555555',
              catalogId: mockCatalog.id,
              parentId: '44444444-4444-4444-4444-444444444444',
              tier: 'CONCEPT',
              code: 'CON-01',
              titleAr: 'مفهوم رتبة المصفوفة',
              titleEn: null,
              description: null,
              metadataJson: null,
              orderIndex: 1,
              createdAt: '2026-09-20T00:00:00Z',
              updatedAt: '2026-09-20T00:00:00Z',
              children: [
                {
                  id: '66666666-6666-6666-6666-666666666666',
                  catalogId: mockCatalog.id,
                  parentId: '55555555-5555-5555-5555-555555555555',
                  tier: 'SKILL',
                  code: 'SKL-01',
                  titleAr: 'تحديد رتبة المصفوفة ونوعها',
                  titleEn: null,
                  description: null,
                  metadataJson: null,
                  orderIndex: 1,
                  createdAt: '2026-09-20T00:00:00Z',
                  updatedAt: '2026-09-20T00:00:00Z',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  const mockGroup: GroupDto = {
    id: '77777777-7777-7777-7777-777777777777',
    name: 'مجموعة أبطال 1 ثانوي - الأحد والثلاثاء',
    educationSystem: 'GENERAL',
    gradeLevel: 'SEC_1',
    languageTrack: 'ARABIC',
    focusMathBranch: 'ALGEBRA',
    defaultPaymentType: 'MONTHLY',
    defaultPaymentAmount: 300,
    status: 'ACTIVE',
    enrolledCount: 0,
    createdAt: '2026-09-20T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z',
    schedules: [],
  };

  const mockOverview: GroupCurriculumOverviewDto = {
    assignment: {
      id: '88888888-8888-8888-8888-888888888888',
      groupId: mockGroup.id,
      catalogId: mockCatalog.id,
      catalogVersion: mockCatalog.version,
      assignedAt: '2026-09-20T00:00:00Z',
      assignedByUserId: '11111111-1111-1111-1111-111111111111',
      assignedByNameSnapshot: 'الأستاذ أحمد الشريف',
      notes: null,
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    },
    catalog: mockCatalog,
    totalSkills: 10,
    completedSkills: 6,
    inProgressSkills: 2,
    remainingSkills: 2,
    completionPercentage: 60,
    projection: {
      status: 'ON_TRACK',
      messageAr: 'على المسار الصحيح',
      completedSessionsCount: 8,
      skillsPerWeekRate: 1.2,
      projectedCompletionDate: '2026-05-15',
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuthStore.setState({ session: mockOwnerSession, status: 'authenticated' });

    // Mock window.tibyan
    (global as any).window = {
      tibyan: {
        curriculum: {
          listCatalogs: vi.fn(async () => ({ success: true, data: [mockCatalog] })),
          getCatalog: vi.fn(async () => ({ success: true, data: mockCatalog })),
          getTree: vi.fn(async () => ({ success: true, data: mockTree })),
          createCatalog: vi.fn(async (input: any) => ({ success: true, data: { ...mockCatalog, ...input } })),
          publishCatalog: vi.fn(async () => ({ success: true, data: { ...mockCatalog, status: 'PUBLISHED' } })),
          reviseCatalog: vi.fn(async () => ({ success: true, data: { ...mockCatalog, version: 2 } })),
          createNode: vi.fn(async (input: any) => ({ success: true, data: { id: 'new-node', ...input } })),
          updateNode: vi.fn(async (id: any, input: any) => ({ success: true, data: { id, ...input } })),
          deleteNode: vi.fn(async () => ({ success: true, data: undefined })),
          reorderNodes: vi.fn(async () => ({ success: true, data: undefined })),
          getGroupOverview: vi.fn(async () => ({ success: true, data: mockOverview })),
          assignGroupCatalog: vi.fn(async (input: any) => ({ success: true, data: { id: 'asgn-1', ...input } })),
          updateGroupProgress: vi.fn(async (input: any) => ({ success: true, data: { id: 'prog-1', ...input } })),
          getGroupProgressMap: vi.fn(async () => ({
            success: true,
            data: { '66666666-6666-6666-6666-666666666666': 'COMPLETED' },
          })),
        },
      },
    };
  });

  it('renders CurriculumCatalogsPage with header, filter toolbar, and catalog card', () => {
    // Prime query cache
    const filterKey = {
      educationSystem: undefined,
      gradeLevel: undefined,
      languageTrack: undefined,
      status: undefined,
      search: undefined,
    };
    queryClient.setQueryData(['curriculum', 'catalogs', 'list', filterKey], [mockCatalog]);
    queryClient.setQueryData(['curriculum', 'trees', mockCatalog.id], mockTree);

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CurriculumCatalogsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('إدارة المناهج وفهارس المعرفة');
    expect(html).toContain('data-testid="page-curriculum"');
    expect(html).toContain('data-testid="curriculum-filter-toolbar"');
    expect(html).toContain('data-testid="btn-create-catalog"');
    expect(html).toContain('جبر وحساب مثلثات 1 ث');
    expect(html).toContain('SEC1-ALG-AR-V1');
  });

  it('renders CurriculumTreeView with 4 tiers and add node actions in draft mode', () => {
    queryClient.setQueryData(['curriculum', 'trees', mockCatalog.id], mockTree);

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CurriculumTreeView catalog={mockCatalog} canWrite={true} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="curriculum-tree-view"');
    expect(html).toContain('الوحدة الأولى: المصفوفات');
    expect(html).toContain('الدرس الأول: تنظيم البيانات');
    expect(html).toContain('مفهوم رتبة المصفوفة');
    expect(html).toContain('تحديد رتبة المصفوفة ونوعها');
    expect(html).toContain('data-testid="btn-add-unit"');
  });

  it('renders locked notice on CurriculumTreeView when catalog is published', () => {
    queryClient.setQueryData(['curriculum', 'trees', mockCatalog.id], mockTree);
    const publishedCatalog = { ...mockCatalog, status: 'PUBLISHED' as const };

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CurriculumTreeView catalog={publishedCatalog} canWrite={true} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('المنهج منشور ومحمي من التعديل');
    expect(html).not.toContain('data-testid="btn-add-unit"');
  });

  it('renders CreateCatalogModal form with required inputs', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CreateCatalogModal isOpen={true} onClose={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('إضافة منهج دراسي جديد');
    expect(html).toContain('data-testid="input-catalog-code"');
    expect(html).toContain('data-testid="input-catalog-title"');
    expect(html).toContain('data-testid="select-catalog-system"');
    expect(html).toContain('data-testid="select-catalog-grade"');
    expect(html).toContain('data-testid="select-catalog-track"');
    expect(html).toContain('data-testid="btn-submit-create-catalog"');
  });

  it('renders AssignCatalogModal with matching published catalogs', () => {
    queryClient.setQueryData(
      [
        'curriculum',
        'catalogs',
        'list',
        {
          educationSystem: mockGroup.educationSystem,
          gradeLevel: mockGroup.gradeLevel,
          languageTrack: mockGroup.languageTrack,
          mathBranch: mockGroup.focusMathBranch,
          status: 'PUBLISHED',
        },
      ],
      [{ ...mockCatalog, status: 'PUBLISHED' }]
    );

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AssignCatalogModal isOpen={true} onClose={() => {}} group={mockGroup} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('ربط منهج دراسي بالمجموعة');
    expect(html).toContain('data-testid="modal-assign-catalog"');
    expect(html).toContain('data-testid="select-assign-catalog"');
    expect(html).toContain('data-testid="btn-confirm-assign-catalog"');
  });

  it('renders GroupSyllabusCard with progress metrics and pacing status', () => {
    queryClient.setQueryData(['curriculum', 'group-overview', mockGroup.id], mockOverview);
    queryClient.setQueryData(['curriculum', 'trees', mockCatalog.id], mockTree);
    queryClient.setQueryData(['curriculum', 'group-progress-map', mockGroup.id], {
      '66666666-6666-6666-6666-666666666666': 'COMPLETED',
    });

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GroupSyllabusCard group={mockGroup} canWrite={true} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('خطة وتغطية المنهج الدراسي');
    expect(html).toContain('data-testid="section-group-syllabus"');
    expect(html).toContain('60%'); // completion rate
    expect(html).toContain('على المسار الصحيح'); // pacing status
    expect(html).toContain('6 مكتملة');
    expect(html).toContain('8 حصة');
    expect(html).toContain('2026-05-15');
    expect(html).toContain('data-testid="syllabus-checklist"');
    expect(html).toContain('تحديد رتبة المصفوفة ونوعها');
  });

  it('renders GroupSyllabusCard empty state when no catalog is assigned', () => {
    queryClient.setQueryData(['curriculum', 'group-overview', mockGroup.id], {
      assignment: null,
      catalog: null,
      totalSkills: 0,
      completedSkills: 0,
      inProgressSkills: 0,
      remainingSkills: 0,
      completionPercentage: 0,
      projection: {
        status: 'INSUFFICIENT_DATA',
        messageAr: 'قيد جمع البيانات',
        completedSessionsCount: 0,
        skillsPerWeekRate: null,
        projectedCompletionDate: null,
      },
    });

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GroupSyllabusCard group={mockGroup} canWrite={true} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('لا يوجد منهج دراسي مرتبط بهذه المجموعة');
    expect(html).toContain('data-testid="empty-syllabus-state"');
  });
});
