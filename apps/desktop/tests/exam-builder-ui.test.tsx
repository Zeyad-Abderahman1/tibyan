import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ExamBuilderPage } from '../src/features/exams/ExamBuilderPage.js';

describe('ExamBuilderPage Component', () => {
  it('renders with Arabic RTL layout, header, and tab navigation', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExamBuilderPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('منشئ الاختبارات الذكي');
    expect(html).toContain('سجل الاختبارات');
    expect(html).toContain('بناء اختبار جديد');
  });
});
