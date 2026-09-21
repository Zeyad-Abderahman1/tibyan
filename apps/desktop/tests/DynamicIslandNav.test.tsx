import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { DynamicIslandNav, DEFAULT_NAV_ITEMS } from '../src/components/layout/DynamicIslandNav.js';

describe('DynamicIslandNav Component Suite', () => {
  it('renders only the currently implemented live routes in RTL order', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/']}>
        <DynamicIslandNav />
      </MemoryRouter>
    );

    expect(html).toContain('role="navigation"');
    expect(html).toContain('data-testid="dynamic-island-nav"');
    expect(html).toContain('اليوم');
    expect(html).toContain('الطلاب');
    expect(html).toContain('المجموعات');
    expect(html).toContain('مكتبة المناهج');
    expect(html).toContain('المالية');
    expect(html).toContain('تِبيان');
    expect(html).toContain('الإعدادات');

    // Exams and Slides removed from primary nav (accessible via Tibyan workspace)
    expect(html).not.toContain('الاختبارات');
    expect(html).not.toContain('الشرائح');

    // Contextual routes must not be displayed on home
    expect(html).not.toContain('الحضور');
  });

  it('marks active navigation destination with accessible indicator and styling', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/students']}>
        <DynamicIslandNav />
      </MemoryRouter>
    );

    expect(html).toContain('href="/students"');
    expect(html).toContain('data-active="true"');
  });

  it('supports configuration-driven items without hardcoding', () => {
    expect(DEFAULT_NAV_ITEMS).toHaveLength(7);
    expect(DEFAULT_NAV_ITEMS.map((i) => i.to)).toEqual(['/', '/students', '/groups', '/curriculum-library', '/finance', '/assistant', '/settings']);
  });
});
