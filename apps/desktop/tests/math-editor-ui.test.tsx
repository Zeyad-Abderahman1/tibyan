import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import {
  MathRichContentViewer,
} from '@tibyan/design-system';
import {
  createTextBlock,
  createMathBlock,
  createImageBlock,
  createGeometryEnvelopeBlock,
  MathRichContent,
} from '@tibyan/contracts';
import { DynamicIslandNav } from '../src/components/layout/DynamicIslandNav.js';
import { routes } from '../src/app/router.js';

describe('Math Engine — Hidden from Teacher UI', () => {
  it('navigation does NOT contain Math Editor entry', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/']}>
        <DynamicIslandNav />
      </MemoryRouter>
    );

    expect(html).not.toContain('محرر الرياضيات');
    expect(html).not.toContain('math-editor');
  });

  it('router does NOT contain math-editor route', () => {
    const mainRoute = routes[0];
    expect(mainRoute).toBeDefined();
    const childPaths = mainRoute!.children?.map((r) => r.path).filter(Boolean) ?? [];
    expect(childPaths).not.toContain('math-editor');
  });

  it('MathRichContentViewer still renders complex formulas correctly (backend preserved)', () => {
    const doc: MathRichContent = {
      version: 1,
      blocks: [
        createTextBlock('أوجد قيمة التكامل المحدد التالي:'),
        createMathBlock('\\int_{0}^{\\frac{\\pi}{2}} \\cos(x) \\, dx = 1', {
          displayMode: 'block',
          altTextAr: 'تكامل دالة جيب التمام من صفر لباي على 2',
        }),
        createTextBlock('إذا كانت المصفوفة A على الصورة:'),
        createMathBlock('\\begin{pmatrix} 2 & -1 \\\\ 3 & 4 \\end{pmatrix}', {
          displayMode: 'block',
          altTextAr: 'مصفوفة مربعة من الرتبة الثانية',
        }),
        createImageBlock('vector_diagram.png', {
          caption: 'مخطط تحليل المتجهات في المستوى الإحداثي',
        }),
        createGeometryEnvelopeBlock({
          title: 'القطاع الدائري',
        }),
      ],
    };

    const markup = renderToStaticMarkup(
      <MathRichContentViewer content={doc} />
    );

    expect(markup).toContain('أوجد قيمة التكامل المحدد التالي:');
    expect(markup).toContain('dir="ltr"');
    expect(markup).toContain('unicode-bidi:isolate');
    expect(markup).toContain('مصفوفة مربعة من الرتبة الثانية');
    expect(markup).toContain('مخطط تحليل المتجهات');
    expect(markup).toContain('القطاع الدائري');
  });
});
