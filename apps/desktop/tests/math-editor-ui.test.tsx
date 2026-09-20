import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { MathEditorPage } from '../src/features/math/MathEditorPage.js';
import {
  MathRichContentEditor,
  MathRichContentViewer,
} from '@tibyan/design-system';
import {
  createTextBlock,
  createMathBlock,
  createImageBlock,
  createGeometryEnvelopeBlock,
  MathRichContent,
} from '@tibyan/contracts';

describe('Phase 3 — Task 2: Math Editor & Viewer UI Suite', () => {
  it('renders MathEditorPage with offline KaTeX and BiDi badges', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/math-editor']}>
        <MathEditorPage />
      </MemoryRouter>
    );

    expect(markup).toContain('محرر الرياضيات والصيغ الأكاديمية');
    expect(markup).toContain('KaTeX مدمج دون إنترنت');
    expect(markup).toContain('عزل BiDi (LTR/RTL) نشط');
    expect(markup).toContain('لوحة الرموز الرياضية (للمرحلة الثانوية العامة)');
    expect(markup).toContain('ملخص المستند النصي');
    expect(markup).toContain('مخرجات التسلسل المتطابق');
  });

  it('renders initial secondary math problem with KaTeX formula', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/math-editor']}>
        <MathEditorPage />
      </MemoryRouter>
    );

    expect(markup).toContain('مسألة نموذجية في التفاضل والتكامل');
    expect(markup).toContain('class="katex"');
  });

  it('renders MathRichContentViewer with complex secondary formulas and LTR isolation', () => {
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

  it('renders MathRichContentEditor with custom blocks and active math block', () => {
    const doc: MathRichContent = {
      version: 1,
      blocks: [
        createTextBlock('نص تجريبي'),
        createMathBlock('x^2 + y^2 = 25'),
      ],
    };

    const markup = renderToStaticMarkup(
      <MathRichContentEditor initialContent={doc} />
    );

    expect(markup).toContain('تحرير ومعاينة');
    expect(markup).toContain('نص تجريبي');
    expect(markup).toContain('x^2 + y^2 = 25');
    expect(markup).toContain('الصيغة الرياضية سليمة ومطابقة لمعايير TeX');
  });
});
