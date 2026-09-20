import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  validateLatexSyntax,
  MediaBoundaryValidator,
  MediaBoundaryError,
  MathRichContentSanitizer,
  ContentSanitizationError,
} from '../src/content/index.js';
import {
  createTextBlock,
  createMathBlock,
  createImageBlock,
  createGeometryEnvelopeBlock,
  MathRichContent,
} from '@tibyan/contracts';

describe('LatexSyntaxValidator (Offline LaTeX Feedback)', () => {
  it('validates safe and well-formed secondary mathematics expressions', () => {
    const formulas = [
      'x^2 + y^2 = r^2',
      '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      '\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3}',
      '\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1',
      '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}',
      '\\vec{v} = 3\\hat{i} - 4\\hat{j}',
      'f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}',
      '|x - 3| \\leq 5',
    ];

    for (const f of formulas) {
      const result = validateLatexSyntax(f);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    }
  });

  it('rejects empty or whitespace-only expressions', () => {
    expect(validateLatexSyntax('').valid).toBe(false);
    expect(validateLatexSyntax('   ').valid).toBe(false);
  });

  it('detects unclosed or mismatched braces', () => {
    const r1 = validateLatexSyntax('\\frac{a}{b');
    expect(r1.valid).toBe(false);
    expect(r1.error).toContain("Unclosed delimiter '{'");
    expect(r1.errorAr).toContain("قوس غير مغلق '{'");

    const r2 = validateLatexSyntax('\\frac{a}b}');
    expect(r2.valid).toBe(false);
    expect(r2.error).toContain("Unmatched closing delimiter '}'");
  });

  it('detects mismatched delimiter types', () => {
    const r = validateLatexSyntax('(x + y]');
    expect(r.valid).toBe(false);
    expect(r.error).toContain("Mismatched delimiters: expected closing for '(' but found ']'");
  });

  it('detects unclosed or mismatched LaTeX environments', () => {
    const unclosed = validateLatexSyntax('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4');
    expect(unclosed.valid).toBe(false);
    expect(unclosed.error).toContain("Unclosed environment '\\begin{pmatrix}'");

    const mismatched = validateLatexSyntax('\\begin{pmatrix} 1 & 2 \\end{bmatrix}');
    expect(mismatched.valid).toBe(false);
    expect(mismatched.error).toContain("Mismatched environment: expected '\\end{pmatrix}' but found '\\end{bmatrix}'");

    const unmatchedEnd = validateLatexSyntax('1 + 2 \\end{matrix}');
    expect(unmatchedEnd.valid).toBe(false);
    expect(unmatchedEnd.error).toContain("Unmatched '\\end{matrix}'");
  });

  it('rejects forbidden and unsafe TeX commands', () => {
    const dangerous = [
      '\\write18{calc.exe}',
      '\\input{/etc/passwd}',
      '\\openin1=secret.txt',
      '\\catcode`\\@=11',
      '\\csname malicious\\endcsname',
      '\\url{https://evil.com}',
      '\\href{javascript:alert(1)}{click}',
      '\\def\\macro{evil}',
      '\\include{file}',
    ];

    for (const d of dangerous) {
      const res = validateLatexSyntax(d);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Unsafe TeX command rejected');
      expect(res.errorAr).toContain('تم رفض أمر TeX غير آمن');
    }
  });
});

describe('MediaBoundaryValidator (Path Traversal & Root Enforcement)', () => {
  const fakeMediaRoot = path.resolve('/var/tibyan/data/media');
  const validator = new MediaBoundaryValidator(fakeMediaRoot);

  it('validates safe media IDs and resolves within root directory', () => {
    const safeId = 'diagram-01_graph.png';
    const validated = validator.validateMediaId(safeId);
    expect(validated).toBe(safeId);

    const resolved = validator.resolvePath(safeId);
    expect(resolved).toBe(path.join(fakeMediaRoot, safeId));
  });

  it('rejects null bytes in media ID', () => {
    expect(() => validator.validateMediaId('test\0evil.png')).toThrowError(
      expect.objectContaining({ code: 'PATH_TRAVERSAL_DETECTED' })
    );
    expect(() => validator.validateMediaId('test%00evil.png')).toThrowError(
      expect.objectContaining({ code: 'PATH_TRAVERSAL_DETECTED' })
    );
  });

  it('rejects directory traversal sequences', () => {
    const traversalAttempts = [
      '../outside.png',
      '..\\outside.png',
      'dir/../../etc/passwd.jpg',
      '%2e%2e/evil.webp',
      '%2E%2E/evil.png',
    ];

    for (const att of traversalAttempts) {
      expect(() => validator.validateMediaId(att)).toThrowError(
        expect.objectContaining({ code: 'PATH_TRAVERSAL_DETECTED' })
      );
    }
  });

  it('rejects absolute paths and external URL schemes', () => {
    const invalidPaths = [
      'C:\\Windows\\System32\\file.png',
      '/etc/shadow.jpg',
      '\\\\network\\share\\image.png',
      'http://example.com/pic.png',
      'file:///etc/hosts.svg',
    ];

    for (const p of invalidPaths) {
      expect(() => validator.validateMediaId(p)).toThrowError(
        expect.objectContaining({ code: 'PATH_TRAVERSAL_DETECTED' })
      );
    }
  });

  it('rejects unsupported media extensions', () => {
    expect(() => validator.validateMediaId('script.js')).toThrowError(
      expect.objectContaining({ code: 'UNSUPPORTED_MEDIA_TYPE' })
    );
    expect(() => validator.validateMediaId('executable.exe')).toThrowError(
      expect.objectContaining({ code: 'UNSUPPORTED_MEDIA_TYPE' })
    );
  });
});

describe('MathRichContentSanitizer', () => {
  const fakeMediaRoot = path.resolve('/tmp/tibyan_media');
  const mediaValidator = new MediaBoundaryValidator(fakeMediaRoot);
  const sanitizer = new MathRichContentSanitizer(mediaValidator);

  it('strips script tags and executable HTML from TextBlocks', () => {
    const textWithScript = 'أهلاً وسهلاً <script>alert("XSS")</script> في الدرس <b>الأول</b>';
    const sanitized = sanitizer.sanitizeText(textWithScript);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).not.toContain('<b>');
    expect(sanitized).toContain('أهلاً وسهلاً');
    expect(sanitized).toContain('في الدرس');
  });

  it('sanitizes a multi-block MathRichContent document', () => {
    const doc: MathRichContent = {
      version: 1,
      blocks: [
        createTextBlock('نص تجريبي <i>مائل</i>'),
        createMathBlock('x^2 + 1 = 0', { altTextAr: 'معادلة تربيعية' }),
        createImageBlock('pythagoras.png', { caption: 'شرح <b>توضيحي</b>' }),
        createGeometryEnvelopeBlock({
          title: 'مثلث',
          svgPayload: '<svg viewBox="0 0 10 10"><path d="M0 0 L10 10"/></svg>',
        }),
      ],
    };

    const cleaned = sanitizer.sanitizeDocument(doc);
    expect(cleaned.version).toBe(1);
    expect(cleaned.blocks[0]).toMatchObject({
      type: 'text',
      content: 'نص تجريبي مائل',
    });
    expect(cleaned.blocks[2]).toMatchObject({
      type: 'image',
      caption: 'شرح توضيحي',
    });
  });

  it('throws ContentSanitizationError when MathBlock contains unsafe TeX command', () => {
    const doc: MathRichContent = {
      version: 1,
      blocks: [createMathBlock('\\write18{malicious}')],
    };

    expect(() => sanitizer.sanitizeDocument(doc)).toThrowError(ContentSanitizationError);
  });

  it('throws ContentSanitizationError when GeometryBlock contains executable scripts or event handlers in svgPayload', () => {
    const docWithScript: MathRichContent = {
      version: 1,
      blocks: [
        createGeometryEnvelopeBlock({
          svgPayload: '<svg><script>evil()</script></svg>',
        }),
      ],
    };

    expect(() => sanitizer.sanitizeDocument(docWithScript)).toThrowError(ContentSanitizationError);

    const docWithOnload: MathRichContent = {
      version: 1,
      blocks: [
        createGeometryEnvelopeBlock({
          svgPayload: '<svg onload="fetch(\'http://evil\')"></svg>',
        }),
      ],
    };

    expect(() => sanitizer.sanitizeDocument(docWithOnload)).toThrowError(ContentSanitizationError);
  });

  it('throws MediaBoundaryError when ImageBlock attempts path traversal', () => {
    const rawTraversalBlock = {
      id: 'img_bad',
      type: 'image' as const,
      mediaId: 'safe_name_prefix/../secret.png',
    };

    expect(() => sanitizer.sanitizeBlock(rawTraversalBlock as any)).toThrowError(MediaBoundaryError);
  });
});
