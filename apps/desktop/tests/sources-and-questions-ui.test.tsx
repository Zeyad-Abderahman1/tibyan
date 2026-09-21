import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SourcesPage } from '../src/features/sources/SourcesPage.js';
import { QuestionBankPage } from '../src/features/questions/QuestionBankPage.js';
import { ImportPdfModal } from '../src/features/sources/ImportPdfModal.js';
import { BulkQuestionIngestionModal } from '../src/features/questions/BulkQuestionIngestionModal.js';
import { SourceReferencesModal } from '../src/features/sources/SourceReferencesModal.js';
import { QuestionEditorModal } from '../src/features/questions/QuestionEditorModal.js';
import type { SourceDocumentDto, QuestionDto } from '@tibyan/contracts';

const mockSources: SourceDocumentDto[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'كتاب الجبر والهندسة الفراغية',
    author: 'وزارة التربية والتعليم',
    publisher: 'قطاع الكتب',
    editionYear: '2026',
    curriculumCatalogId: null,
    filePath: 'sources/algebra.pdf',
    fileName: 'algebra.pdf',
    fileSizeBytes: 2048576,
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    pageCount: 150,
    status: 'INDEXED',
    importSource: 'MANUAL',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockQuestions: QuestionDto[] = [
  {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'Q-000001',
    questionType: 'MULTIPLE_CHOICE',
    difficulty: 'MEDIUM',
    defaultMarks: 1,
    languageTrack: 'ARABIC',
    status: 'ACTIVE',
    contentFingerprint: 'dummy_hash',
    body: {
      version: 1,
      blocks: [
        { id: '1', type: 'text', content: 'أوجد مساحة الدائرة التي نصف قطرها 7 سم', direction: 'auto' },
      ],
    },
    modelAnswer: {
      version: 1,
      blocks: [
        { id: '2', type: 'text', content: 'المساحة = 154 سم مربع', direction: 'auto' },
      ],
    },
    curriculumTags: ['33333333-3333-3333-3333-333333333333'],
    sourceReferences: [
      {
        sourceReferenceId: '44444444-4444-4444-4444-444444444444',
        referenceLabel: 'تمارين ص 25',
        sourceDocumentTitle: 'كتاب الجبر والهندسة',
        startPage: 25,
        endPage: 26,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe('Phase 3 Tasks 4-6 UI Feature Test Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();

    (global as any).window = {
      ...((global as any).window || {}),
      tibyan: {
        pdfSources: {
          listSources: vi.fn().mockResolvedValue({ success: true, data: mockSources }),
          getSource: vi.fn().mockResolvedValue({ success: true, data: mockSources[0] }),
          importSource: vi.fn().mockResolvedValue({ success: true, data: mockSources[0] }),
          updateSource: vi.fn().mockResolvedValue({ success: true, data: mockSources[0] }),
          deleteSource: vi.fn().mockResolvedValue({ success: true }),
          listReferences: vi.fn().mockResolvedValue({ success: true, data: [] }),
          createReference: vi.fn().mockResolvedValue({ success: true }),
          updateReference: vi.fn().mockResolvedValue({ success: true }),
          deleteReference: vi.fn().mockResolvedValue({ success: true }),
          openDocument: vi.fn().mockResolvedValue({ success: true }),
        },
        questionBank: {
          listQuestions: vi.fn().mockResolvedValue({ success: true, data: mockQuestions }),
          getQuestion: vi.fn().mockResolvedValue({ success: true, data: mockQuestions[0] }),
          createQuestion: vi.fn().mockResolvedValue({ success: true, data: mockQuestions[0] }),
          updateQuestion: vi.fn().mockResolvedValue({ success: true, data: mockQuestions[0] }),
          deleteQuestion: vi.fn().mockResolvedValue({ success: true }),
          archiveQuestion: vi.fn().mockResolvedValue({ success: true }),
          linkSources: vi.fn().mockResolvedValue({ success: true }),
          unlinkSource: vi.fn().mockResolvedValue({ success: true }),
          checkDuplicate: vi.fn().mockResolvedValue({
            success: true,
            data: { isDuplicate: false, matchLevel: 'NONE', reasonAr: 'لا يوجد تكرار' },
          }),
          previewBulk: vi.fn().mockResolvedValue({
            success: true,
            data: [],
          }),
          commitBulk: vi.fn().mockResolvedValue({
            success: true,
            data: { createdCount: 1, linkedCount: 0, dismissedCount: 0 },
          }),
        },
        curriculum: {
          listCatalogs: vi.fn().mockResolvedValue({ success: true, data: [] }),
          getTree: vi.fn().mockResolvedValue({ success: true, data: [] }),
        },
      },
    };
  });

  it('renders SourcesPage with headers and import action button', () => {
    queryClient.setQueryData(['pdf-sources', 'list', undefined], mockSources);

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SourcesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('المصادر والمراجع التعليمية (PDF)');
    expect(html).toContain('كتاب الجبر والهندسة الفراغية');
    expect(html).toContain('150 صفحة');
    expect(html).toContain('data-testid="open-import-pdf-modal-btn"');
  });

  it('renders ImportPdfModal with file path input, title, and form controls', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ImportPdfModal isOpen={true} onClose={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('استيراد وثيقة PDF ومصدر أسئلة');
    expect(html).toContain('data-testid="choose-pdf-btn"');
    expect(html).toContain('data-testid="pdf-file-path-input"');
    expect(html).toContain('data-testid="pdf-title-input"');
    expect(html).toContain('data-testid="submit-import-pdf-btn"');
    expect(html).toContain('تأكيد الاستيراد');
  });

  it('renders SourceReferencesModal with page range inputs and label', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SourceReferencesModal
            isOpen={true}
            onClose={() => {}}
            document={mockSources[0]!}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('مراجع وتفاصيل الوثيقة: كتاب الجبر والهندسة الفراغية');
    expect(html).toContain('data-testid="source-references-modal"');
    expect(html).toContain('data-testid="reference-label-input"');
    expect(html).toContain('data-testid="reference-start-page-input"');
    expect(html).toContain('data-testid="reference-end-page-input"');
    expect(html).toContain('data-testid="save-reference-btn"');
  });

  it('renders QuestionBankPage with QuestionCards, action buttons, and filters', () => {
    queryClient.setQueryData(
      ['question-bank', 'list', { catalogId: undefined, questionType: undefined, difficulty: undefined, status: undefined }],
      mockQuestions
    );

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <QuestionBankPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('بنك الأسئلة والمسائل الرياضية');
    expect(html).toContain('data-testid="create-new-question-btn"');
    expect(html).toContain('data-testid="open-bulk-ingestion-modal-btn"');
    expect(html).toContain('Q-000001');
    expect(html).toContain('أوجد مساحة الدائرة التي نصف قطرها 7 سم');
    expect(html).toContain('تمارين ص 25');
  });

  it('renders QuestionEditorModal with math rich editor, difficulty, and tagging controls', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <QuestionEditorModal
            isOpen={true}
            onClose={() => {}}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('إنشاء مسألة جديدة في بنك الأسئلة');
    expect(html).toContain('نص المسألة والصياغة الرياضية');
    expect(html).toContain('الإجابة النموذجية أو خطوات الحل (اختياري)');
    expect(html).toContain('data-testid="question-type-select"');
    expect(html).toContain('data-testid="question-difficulty-select"');
    expect(html).toContain('data-testid="save-question-submit-btn"');
  });

  it('renders BulkQuestionIngestionModal with sample data loader, json textarea, and review area', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <BulkQuestionIngestionModal isOpen={true} onClose={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('استيراد دفعة ومراجعة التكرار (Bulk Ingestion Review)');
    expect(html).toContain('data-testid="load-sample-btn"');
    expect(html).toContain('data-testid="bulk-json-input"');
    expect(html).toContain('data-testid="preview-bulk-btn"');
    expect(html).toContain('بيانات المسائل بصيغة JSON:');
  });
});

