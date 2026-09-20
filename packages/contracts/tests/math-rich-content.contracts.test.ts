import { describe, it, expect } from 'vitest';
import {
  MathRichContentSchema,
  TextBlockSchema,
  MathBlockSchema,
  ImageBlockSchema,
  GeometryEnvelopeBlockSchema,
  RichContentBlockSchema,
  serializeMathRichContent,
  deserializeMathRichContent,
  extractPlainText,
  extractPreviewSummary,
  createEmptyMathRichContent,
  createTextBlock,
  createMathBlock,
  createImageBlock,
  createGeometryEnvelopeBlock,
  MathRichContent,
} from '../src/models/math-rich-content.dto.js';

describe('MathRichContent Contracts & Validation', () => {
  describe('TextBlockSchema', () => {
    it('validates a valid text block with defaults', () => {
      const block = TextBlockSchema.parse({
        id: 'txt_1',
        type: 'text',
        content: 'أهلاً بكم في درس حساب المثلثات',
      });
      expect(block.id).toBe('txt_1');
      expect(block.type).toBe('text');
      expect(block.direction).toBe('auto');
      expect(block.content).toBe('أهلاً بكم في درس حساب المثلثات');
    });

    it('validates explicit direction and formatting', () => {
      const block = TextBlockSchema.parse({
        id: 'txt_2',
        type: 'text',
        content: 'Trigonometry Introduction',
        direction: 'ltr',
        formatting: { bold: true, italic: true, underline: false },
      });
      expect(block.direction).toBe('ltr');
      expect(block.formatting?.bold).toBe(true);
    });

    it('rejects oversized text content', () => {
      const oversized = 'x'.repeat(20001);
      expect(() =>
        TextBlockSchema.parse({
          id: 'txt_3',
          type: 'text',
          content: oversized,
        })
      ).toThrowError(/exceeds maximum length/);
    });
  });

  describe('MathBlockSchema', () => {
    it('validates a valid LaTeX block', () => {
      const block = MathBlockSchema.parse({
        id: 'mth_1',
        type: 'math',
        latex: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        displayMode: 'block',
        altTextAr: 'القانون العام لحل المعادلة التربيعية',
      });
      expect(block.type).toBe('math');
      expect(block.latex).toBe('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
      expect(block.displayMode).toBe('block');
      expect(block.altTextAr).toBe('القانون العام لحل المعادلة التربيعية');
    });

    it('rejects empty LaTeX expression', () => {
      expect(() =>
        MathBlockSchema.parse({
          id: 'mth_2',
          type: 'math',
          latex: '',
        })
      ).toThrowError(/LaTeX expression cannot be empty/);
    });

    it('rejects oversized LaTeX expression', () => {
      expect(() =>
        MathBlockSchema.parse({
          id: 'mth_3',
          type: 'math',
          latex: 'a'.repeat(10001),
        })
      ).toThrowError(/exceeds maximum length/);
    });
  });

  describe('ImageBlockSchema', () => {
    it('validates a valid image block with safe media identifier', () => {
      const block = ImageBlockSchema.parse({
        id: 'img_1',
        type: 'image',
        mediaId: 'triangle_abc_diagram.png',
        caption: 'مثلث قائم الزاوية في ب',
        altText: 'شكل توضيحي لمثلث قائم',
        width: 800,
        height: 600,
        mimeType: 'image/png',
      });
      expect(block.mediaId).toBe('triangle_abc_diagram.png');
      expect(block.mimeType).toBe('image/png');
    });

    it('rejects invalid mediaId with traversal or illegal characters', () => {
      expect(() =>
        ImageBlockSchema.parse({
          id: 'img_2',
          type: 'image',
          mediaId: '../traversal/secret.png',
        })
      ).toThrowError(/Media ID must contain only alphanumeric/);

      expect(() =>
        ImageBlockSchema.parse({
          id: 'img_3',
          type: 'image',
          mediaId: 'image with spaces.png',
        })
      ).toThrowError(/Media ID must contain only alphanumeric/);
    });

    it('rejects negative or zero dimensions', () => {
      expect(() =>
        ImageBlockSchema.parse({
          id: 'img_4',
          type: 'image',
          mediaId: 'valid.png',
          width: 0,
        })
      ).toThrowError();
    });
  });

  describe('GeometryEnvelopeBlockSchema', () => {
    it('validates a valid geometry envelope', () => {
      const block = GeometryEnvelopeBlockSchema.parse({
        id: 'geo_1',
        type: 'geometry',
        schemaVersion: 'v1',
        title: 'دائرة الوحدة',
        width: 500,
        height: 500,
        svgPayload: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>',
        metadata: { unitRadius: 1 },
      });
      expect(block.schemaVersion).toBe('v1');
      expect(block.title).toBe('دائرة الوحدة');
    });

    it('rejects unapproved schemaVersion', () => {
      expect(() =>
        GeometryEnvelopeBlockSchema.parse({
          id: 'geo_2',
          type: 'geometry',
          schemaVersion: 'v2', // only v1 approved for Task 2 envelope
        })
      ).toThrowError();
    });
  });

  describe('Discriminated Union & Document Validation', () => {
    it('rejects unsupported block types via discriminated union', () => {
      expect(() =>
        RichContentBlockSchema.parse({
          id: 'unknown_1',
          type: 'video', // not in union
          url: 'https://example.com/video.mp4',
        })
      ).toThrowError();
    });

    it('validates a complete composite document with mixed blocks', () => {
      const doc: MathRichContent = {
        version: 1,
        blocks: [
          createTextBlock('في المثلث القائم:'),
          createMathBlock('a^2 + b^2 = c^2', { displayMode: 'block', altTextAr: 'نظرية فيثاغورس' }),
          createImageBlock('pythagoras.png', { caption: 'رسم توضيحي' }),
          createGeometryEnvelopeBlock({ title: 'مخطط هندسي للمثلث' }),
        ],
      };

      const parsed = MathRichContentSchema.parse(doc);
      expect(parsed.version).toBe(1);
      expect(parsed.blocks.length).toBe(4);
    });

    it('rejects invalid document version', () => {
      expect(() =>
        MathRichContentSchema.parse({
          version: 2, // version 1 is mandatory
          blocks: [],
        })
      ).toThrowError();
    });

    it('rejects document with more than 200 blocks', () => {
      const tooManyBlocks = Array.from({ length: 201 }, (_, i) =>
        createTextBlock(`فقرة ${i}`)
      );
      expect(() =>
        MathRichContentSchema.parse({
          version: 1,
          blocks: tooManyBlocks,
        })
      ).toThrowError(/cannot contain more than 200 blocks/);
    });
  });

  describe('Serialization, Deserialization & Extraction', () => {
    it('serializes and deserializes deterministically', () => {
      const original: MathRichContent = {
        version: 1,
        blocks: [
          createTextBlock('حل المعادلة التالية:'),
          createMathBlock('\\int_{0}^{\\pi} \\sin(x) \\, dx = 2'),
        ],
      };

      const serialized = serializeMathRichContent(original);
      expect(typeof serialized).toBe('string');

      const deserialized = deserializeMathRichContent(serialized);
      expect(deserialized).toEqual(original);
    });

    it('extracts plain-text representation prioritizing Arabic alt-text', () => {
      const doc: MathRichContent = {
        version: 1,
        blocks: [
          createTextBlock('السؤال الأول:'),
          createMathBlock('\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1', {
            altTextAr: 'نهاية جا س على س عندما س تقترب من الصفر تساوي واحد',
          }),
          createImageBlock('graph.png', { caption: 'منحنى الدالة' }),
        ],
      };

      const plainText = extractPlainText(doc);
      expect(plainText).toContain('السؤال الأول:');
      expect(plainText).toContain('[رياضيات: نهاية جا س على س عندما س تقترب من الصفر تساوي واحد]');
      expect(plainText).toContain('[صورة: منحنى الدالة]');
    });

    it('extracts preview summary with truncation limit', () => {
      const doc: MathRichContent = {
        version: 1,
        blocks: [
          createTextBlock('نص طويل جداً لشرح مفاهيم التفاضل والتكامل في الثانوية العامة المصرية مع أمثلة وتطبيقات فيزيائية وهندسية متنوعة تشمل المعدلات الزمنية المرتبطة وتطبيقات القيم العظمى والصغرى.'),
        ],
      };

      const summary = extractPreviewSummary(doc, 50);
      expect(summary.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(summary.endsWith('...')).toBe(true);
    });

    it('creates an empty document with createEmptyMathRichContent', () => {
      const empty = createEmptyMathRichContent();
      expect(empty.version).toBe(1);
      expect(empty.blocks).toEqual([]);
      expect(MathRichContentSchema.parse(empty)).toEqual(empty);
    });
  });
});
