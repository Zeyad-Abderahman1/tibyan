import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Code128Barcode } from '../src/features/students/cards/Code128Barcode.js';
import { StudentQrCode } from '../src/features/students/cards/StudentQrCode.js';

describe('Barcode & QR SVG Components (TDD)', () => {
  describe('Code128Barcode', () => {
    it('renders controlled SVG for TB-0042 without dangerouslySetInnerHTML', () => {
      const html = renderToStaticMarkup(<Code128Barcode value="TB-0042" />);
      
      expect(html).toContain('data-testid="code128-svg"');
      expect(html).toContain('<svg');
      expect(html).toContain('TB-0042');
      expect(html).toContain('<rect');
      expect(html).not.toContain('dangerouslySetInnerHTML');
    });

    it('displays fallback error message for invalid characters', () => {
      const html = renderToStaticMarkup(<Code128Barcode value="غير صالح" />);
      expect(html).toContain('data-testid="code128-error"');
      expect(html).toContain('Invalid Code128');
    });

    it('can hide the text label if requested', () => {
      const html = renderToStaticMarkup(<Code128Barcode value="TB-0042" showText={false} />);
      expect(html).not.toContain('data-testid="code128-text"');
    });
  });

  describe('StudentQrCode', () => {
    it('renders controlled vector SVG path for TB-0042 without dangerouslySetInnerHTML', () => {
      const html = renderToStaticMarkup(<StudentQrCode value="TB-0042" size={80} />);

      expect(html).toContain('data-testid="student-qr-svg"');
      expect(html).toContain('width="80"');
      expect(html).toContain('height="80"');
      expect(html).toContain('data-testid="student-qr-path"');
      expect(html).toContain('fill="#000000"');
      expect(html).toContain('fill="#ffffff"');
      expect(html).not.toContain('dangerouslySetInnerHTML');
    });

    it('displays fallback error message for empty value', () => {
      const html = renderToStaticMarkup(<StudentQrCode value="" />);
      expect(html).toContain('data-testid="student-qr-error"');
    });
  });
});
