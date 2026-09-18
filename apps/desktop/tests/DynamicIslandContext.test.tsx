import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@tibyan/design-system';
import { DynamicIslandContext } from '../src/components/layout/DynamicIslandContext.js';
import { DynamicIslandSystem } from '../src/components/layout/DynamicIslandSystem.js';

describe('Dynamic Island Context & System Clusters', () => {
  beforeEach(() => {
    (global as any).window = (global as any).window || {};
    (global as any).window.tibyan = {
      system: {
        getSettings: vi.fn().mockResolvedValue({
          success: true,
          data: {
            theme: 'light',
            activeAcademicYearId: 'year-1',
            activeAcademicYearName: '2026-2027',
          },
        }),
      },
      auth: {
        listUsers: vi.fn().mockResolvedValue({ success: true, data: [] }),
      },
    };
  });

  it('renders context tools and system controls without exposing database telemetry', () => {
    const queryClient = new QueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <div>
              <DynamicIslandContext />
              <DynamicIslandSystem />
            </div>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="dynamic-island-context"');
    expect(html).toContain('data-testid="dynamic-island-system"');
    expect(html).toContain('data-testid="topbar-theme-toggle-btn"');

    // Mandatory correction: NO database health pips or infrastructure telemetry
    expect(html).not.toContain('محلي');
    expect(html).not.toContain('sqlite-health');
    expect(html).not.toContain('database-status');
  });
});
