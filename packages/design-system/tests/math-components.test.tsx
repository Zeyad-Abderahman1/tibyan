import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  MathRichContentViewer,
  MathSymbolPalette,
  MathRichContentEditor,
  MATH_SYMBOL_CATEGORIES,
  MATH_SYMBOLS,
} from '../src/components/math/index.js';
import {
  createTextBlock,
  createMathBlock,
  createImageBlock,
  createGeometryEnvelopeBlock,
  MathRichContent,
} from '@tibyan/contracts';

describe('MathRichContentViewer Component', () => {
  it('renders an empty placeholder when content has no blocks', () => {
    const markup = renderToStaticMarkup(<MathRichContentViewer content={[]} />);
    expect(markup).toContain('لا يوجد محتوى لعرضه');
  });

  it('renders TextBlock with Arabic RTL typography', () => {
    const textBlock = createTextBlock('شرح تفاضل وتكامل الدوال المثلثية', {
      direction: 'rtl',
      formatting: { bold: true },
    });
    const markup = renderToStaticMarkup(
      <MathRichContentViewer content={[textBlock]} />
    );
    expect(markup).toContain('شرح تفاضل وتكامل الدوال المثلثية');
    expect(markup).toContain('dir="rtl"');
    expect(markup).toContain('font-bold');
  });

  it('renders MathBlock using KaTeX with strict LTR BiDi isolation in RTL context', () => {
    const mathBlock = createMathBlock('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', {
      displayMode: 'block',
      altTextAr: 'القانون العام',
    });

    const doc: MathRichContent = {
      version: 1,
      blocks: [
        createTextBlock('المعادلة التالية:'),
        mathBlock,
      ],
    };

    const markup = renderToStaticMarkup(<MathRichContentViewer content={doc} />);

    // Must be wrapped in RTL document container
    expect(markup).toContain('dir="rtl"');

    // KaTeX rendered content must exist
    expect(markup).toContain('class="katex"');

    // Math container must enforce strict LTR direction and unicode-bidi: isolate
    expect(markup).toContain('dir="ltr"');
    expect(markup).toContain('unicode-bidi:isolate');
    expect(markup).toContain('aria-label="القانون العام"');
  });

  it('renders ImageBlock safely with alt text and caption', () => {
    const imageBlock = createImageBlock('geometry_unit_circle.png', {
      caption: 'دائرة الوحدة والزوايا الخاصة',
      altText: 'شكل توضيحي لدائرة الوحدة',
      width: 400,
      height: 300,
    });

    const markup = renderToStaticMarkup(
      <MathRichContentViewer content={[imageBlock]} />
    );

    expect(markup).toContain('src="geometry_unit_circle.png"');
    expect(markup).toContain('alt="شكل توضيحي لدائرة الوحدة"');
    expect(markup).toContain('دائرة الوحدة والزوايا الخاصة');
    expect(markup).toContain('max-width:400px');
  });

  it('renders GeometryEnvelopeBlock passive container without construction engine', () => {
    const geoBlock = createGeometryEnvelopeBlock({
      title: 'مخطط متجهات القوى',
      svgPayload: '<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20"/></svg>',
    });

    const markup = renderToStaticMarkup(
      <MathRichContentViewer content={[geoBlock]} />
    );

    expect(markup).toContain('مخطط متجهات القوى');
    expect(markup).toContain('v1');
    expect(markup).toContain('<svg viewBox="0 0 50 50">');
  });
});

describe('MathSymbolPalette Component', () => {
  it('renders Arabic secondary school math categories', () => {
    const markup = renderToStaticMarkup(<MathSymbolPalette onInsert={vi.fn()} />);

    for (const cat of MATH_SYMBOL_CATEGORIES) {
      expect(markup).toContain(cat.nameAr);
    }
  });

  it('contains comprehensive Egyptian secondary mathematics symbols', () => {
    const categories = new Set(MATH_SYMBOLS.map((s) => s.category));
    expect(categories.has('fractions_powers')).toBe(true);
    expect(categories.has('calculus_limits')).toBe(true);
    expect(categories.has('matrices')).toBe(true);
    expect(categories.has('vectors_geometry')).toBe(true);
    expect(categories.has('trigonometry')).toBe(true);
    expect(categories.has('operators')).toBe(true);
    expect(categories.has('brackets')).toBe(true);
  });
});

describe('MathRichContentEditor Component', () => {
  it('renders toolbar with mode toggles and add block buttons', () => {
    const markup = renderToStaticMarkup(
      <MathRichContentEditor
        initialContent={[
          createTextBlock('السؤال الأول:'),
          createMathBlock('x^2 - 5x + 6 = 0'),
        ]}
      />
    );

    expect(markup).toContain('تحرير ومعاينة');
    expect(markup).toContain('إضافة نص');
    expect(markup).toContain('إضافة معادلة');
    expect(markup).toContain('إضافة صورة');
    expect(markup).toContain('لوحة الرموز الرياضية');
  });

  it('renders LaTeX input textarea with LTR direction and monospace font', () => {
    const markup = renderToStaticMarkup(
      <MathRichContentEditor
        initialContent={[
          createMathBlock('\\int x^2 \\, dx'),
        ]}
      />
    );

    expect(markup).toContain('dir="ltr"');
    expect(markup).toContain('font-mono');
    expect(markup).toContain('\\int x^2 \\, dx');
  });

  it('renders syntax validation indicator for math blocks', () => {
    const markup = renderToStaticMarkup(
      <MathRichContentEditor
        initialContent={[
          createMathBlock('\\frac{a}{b}'),
        ]}
      />
    );

    expect(markup).toContain('الصيغة الرياضية سليمة');
  });

  it('renders syntax validation error when unclosed delimiter is present', () => {
    const markup = renderToStaticMarkup(
      <MathRichContentEditor
        initialContent={[
          createMathBlock('\\frac{a}{b'),
        ]}
      />
    );

    expect(markup).toContain('قوس غير مغلق');
  });

  it('renders live preview pane alongside editor in split mode', () => {
    const markup = renderToStaticMarkup(
      <MathRichContentEditor
        initialContent={[
          createTextBlock('احسب قيمة النهاية:'),
          createMathBlock('\\lim_{x \\to 0} \\frac{\\tan x}{x} = 1'),
        ]}
      />
    );

    expect(markup).toContain('المعاينة الحية للمحتوى');
    expect(markup).toContain('عزل LTR للرياضيات نشط');
    expect(markup).toContain('class="katex"');
  });
});
