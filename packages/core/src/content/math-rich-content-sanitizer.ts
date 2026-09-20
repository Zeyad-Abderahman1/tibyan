import { MathRichContent, RichContentBlock, MathRichContentSchema } from '@tibyan/contracts';
import { validateLatexSyntax } from './latex-syntax-validator.js';
import { MediaBoundaryValidator } from './media-boundary.validator.js';

export type SanitizationErrorCode =
  | 'INVALID_LATEX'
  | 'UNSAFE_SVG_PAYLOAD'
  | 'INVALID_MEDIA_ID'
  | 'UNSAFE_CONTENT';

export class ContentSanitizationError extends Error {
  constructor(public readonly code: SanitizationErrorCode, message: string) {
    super(message);
    this.name = 'ContentSanitizationError';
  }
}

/**
 * Service to sanitize and validate MathRichContent documents.
 * Ensures no executable HTML, script tags, javascript: schemes, or unsafe TeX commands
 * can pass through into storage or presentation.
 */
export class MathRichContentSanitizer {
  private readonly mediaValidator?: MediaBoundaryValidator;

  constructor(mediaValidator?: MediaBoundaryValidator) {
    this.mediaValidator = mediaValidator;
  }

  /**
   * Sanitizes plain text by stripping HTML tags, scripts, and null bytes.
   */
  sanitizeText(raw: string): string {
    if (!raw || typeof raw !== 'string') return '';

    // 1. Remove null bytes
    let text = raw.replace(/\0/g, '');

    // 2. Remove script tags and their contents
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 3. Remove all other HTML tags
    text = text.replace(/<[^>]+>/g, '');

    return text;
  }

  /**
   * Validates and sanitizes an entire MathRichContent document.
   */
  sanitizeDocument(doc: MathRichContent): MathRichContent {
    const validated = MathRichContentSchema.parse(doc);
    const sanitizedBlocks: RichContentBlock[] = [];

    for (const block of validated.blocks) {
      sanitizedBlocks.push(this.sanitizeBlock(block));
    }

    return {
      version: 1,
      blocks: sanitizedBlocks,
    };
  }

  /**
   * Validates and sanitizes a single RichContentBlock.
   */
  sanitizeBlock(block: RichContentBlock): RichContentBlock {
    switch (block.type) {
      case 'text': {
        const cleanContent = this.sanitizeText(block.content);
        return {
          ...block,
          content: cleanContent,
        };
      }

      case 'math': {
        // Enforce safe LaTeX syntax
        const result = validateLatexSyntax(block.latex);
        if (!result.valid) {
          throw new ContentSanitizationError(
            'INVALID_LATEX',
            result.error ?? 'Invalid or unsafe LaTeX expression'
          );
        }
        return {
          ...block,
          altTextAr: block.altTextAr ? this.sanitizeText(block.altTextAr) : block.altTextAr,
        };
      }

      case 'image': {
        if (this.mediaValidator) {
          this.mediaValidator.validateMediaId(block.mediaId);
        } else {
          // Minimal baseline check if no media validator injected
          if (/[\0\\]|\.\.|\%2e\%2e/i.test(block.mediaId)) {
            throw new ContentSanitizationError(
              'INVALID_MEDIA_ID',
              'Path traversal or illegal characters detected in image mediaId'
            );
          }
        }
        return {
          ...block,
          caption: block.caption ? this.sanitizeText(block.caption) : block.caption,
          altText: block.altText ? this.sanitizeText(block.altText) : block.altText,
        };
      }

      case 'geometry': {
        // SVG payload security check: Reject script tags, inline event handlers, and javascript: links
        if (block.svgPayload) {
          const payload = block.svgPayload;
          if (
            /<script\b/i.test(payload) ||
            /\bon[a-z]+\s*=/i.test(payload) ||
            /javascript:/i.test(payload) ||
            /<object\b/i.test(payload) ||
            /<embed\b/i.test(payload) ||
            /<iframe\b/i.test(payload)
          ) {
            throw new ContentSanitizationError(
              'UNSAFE_SVG_PAYLOAD',
              'Executable script, external object, or event handler detected in SVG payload'
            );
          }
        }
        return {
          ...block,
          title: block.title ? this.sanitizeText(block.title) : block.title,
        };
      }
    }
  }
}
