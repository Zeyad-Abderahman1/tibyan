import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CaptureSessionPage } from '../src/features/capture/CaptureSessionPage.js';
import { CorrectionWorkspace } from '../src/features/grading/CorrectionWorkspace.js';
import { AnalyticsDashboard } from '../src/features/analytics/AnalyticsDashboard.js';
import { StudentResultPage } from '../src/features/analytics/StudentResultPage.js';
import { DynamicIslandNav } from '../src/components/layout/DynamicIslandNav.js';

vi.mock('electron', () => ({
  app: { getPath: vi.fn(), isPackaged: false },
  ipcRenderer: { invoke: vi.fn() },
  contextBridge: { exposeInMainWorld: vi.fn() },
}));

function wrap(ui: React.ReactNode, entries: string[] = ['/']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToString(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={entries}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

function wrapRoute(ui: React.ReactNode, entries: string[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToString(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={entries}>
        <Routes>
          <Route path="/grading/:submissionId" element={<CorrectionWorkspace />} />
          <Route path="/student-result/:submissionId" element={<StudentResultPage />} />
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Phase 5 — CaptureSessionPage', () => {
  it('renders Arabic RTL header and create button', () => {
    const html = wrap(<CaptureSessionPage />);
    expect(html).toContain('تصحيح ورصد الأوراق');
    expect(html).toContain('جلسة تصوير جديدة');
  });

  it('shows loading or empty state initially', () => {
    const html = wrap(<CaptureSessionPage />);
    const hasContent = html.includes('capture-loading') || html.includes('capture-empty-state') || html.includes('جاري تحميل');
    expect(hasContent).toBe(true);
  });
});

describe('Phase 5 — CorrectionWorkspace', () => {
  it('renders with workspace structure', () => {
    const html = wrapRoute(<CorrectionWorkspace />, ['/grading/test-id']);
    const hasContent = html.includes('page-correction-workspace') || html.includes('correction-loading') || html.includes('correction-error');
    expect(hasContent).toBe(true);
  });
});

describe('Phase 5 — AnalyticsDashboard', () => {
  it('renders Arabic RTL header and exam selector', () => {
    const html = wrap(<AnalyticsDashboard />);
    expect(html).toContain('تحليلات الاختبارات');
    expect(html).toContain('اختر اختباراً');
  });
});

describe('Phase 5 — StudentResultPage', () => {
  it('renders loading state', () => {
    const html = wrapRoute(<StudentResultPage />, ['/student-result/test-id']);
    const hasContent = html.includes('page-student-result') || html.includes('student-result-loading') || html.includes('student-result-error') || html.includes('جاري تحميل');
    expect(hasContent).toBe(true);
  });
});

describe('Phase 5 — Navigation', () => {
  it('shows capture nav item when on capture route', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/capture']}>
        <DynamicIslandNav />
      </MemoryRouter>
    );
    expect(html).toContain('تصحيح الأوراق');
  });

  it('shows capture nav item when on grading route', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/grading/some-id']}>
        <DynamicIslandNav />
      </MemoryRouter>
    );
    expect(html).toContain('تصحيح الأوراق');
  });

  it('shows capture nav item when on analytics route', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/analytics']}>
        <DynamicIslandNav />
      </MemoryRouter>
    );
    expect(html).toContain('تصحيح الأوراق');
  });

  it('does not show capture nav on unrelated routes', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/students']}>
        <DynamicIslandNav />
      </MemoryRouter>
    );
    expect(html).not.toContain('تصحيح الأوراق');
  });
});
