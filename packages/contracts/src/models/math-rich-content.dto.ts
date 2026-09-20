import { z } from 'zod';

// ==========================================
// 1. Block Sub-Types & Attributes
// ==========================================

export const TextBlockFormattingSchema = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
});
export type TextBlockFormatting = z.infer<typeof TextBlockFormattingSchema>;

export const TextDirectionSchema = z.enum(['rtl', 'ltr', 'auto']);
export type TextDirection = z.infer<typeof TextDirectionSchema>;

export const MathDisplayModeSchema = z.enum(['inline', 'block']);
export type MathDisplayMode = z.infer<typeof MathDisplayModeSchema>;

export const ImageMimeTypeSchema = z.enum([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);
export type ImageMimeType = z.infer<typeof ImageMimeTypeSchema>;

// ==========================================
// 2. Concrete Content Block Schemas
// ==========================================

/**
 * Text block supporting mixed Arabic/English text with direction hints and styling.
 */
export const TextBlockSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.literal('text'),
  content: z.string().max(20000, 'Text content exceeds maximum length of 20000 characters'),
  direction: TextDirectionSchema.default('auto'),
  formatting: TextBlockFormattingSchema.optional(),
});
export type TextBlock = z.infer<typeof TextBlockSchema>;

/**
 * LaTeX Mathematical expression block with display mode and Arabic accessibility description.
 */
export const MathBlockSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.literal('math'),
  latex: z
    .string()
    .min(1, 'LaTeX expression cannot be empty')
    .max(10000, 'LaTeX expression exceeds maximum length of 10000 characters'),
  displayMode: MathDisplayModeSchema.default('block'),
  altTextAr: z.string().max(500, 'Arabic alt text cannot exceed 500 characters').optional().nullable(),
});
export type MathBlock = z.infer<typeof MathBlockSchema>;

/**
 * Local media image block using content-addressed / safe local storage references.
 */
export const ImageBlockSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.literal('image'),
  mediaId: z
    .string()
    .min(1, 'Media ID cannot be empty')
    .max(255)
    .regex(
      /^[a-zA-Z0-9_\-.]+$/,
      'Media ID must contain only alphanumeric characters, dashes, underscores, and dots'
    ),
  caption: z.string().max(500).optional().nullable(),
  altText: z.string().max(500).optional().nullable(),
  width: z.number().int().positive().max(4000).optional().nullable(),
  height: z.number().int().positive().max(4000).optional().nullable(),
  mimeType: ImageMimeTypeSchema.optional().nullable(),
});
export type ImageBlock = z.infer<typeof ImageBlockSchema>;

/**
 * GeometryEnvelopeBlock: Passive, validated future-facing data envelope for geometry assets.
 * Note: Must NOT become a geometry engine, CAD solver, or dynamic SVG constructor.
 */
export const GeometryEnvelopeBlockSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.literal('geometry'),
  schemaVersion: z.literal('v1'),
  title: z.string().max(255).optional().nullable(),
  width: z.number().int().positive().max(4000).optional().nullable(),
  height: z.number().int().positive().max(4000).optional().nullable(),
  svgPayload: z.string().max(50000, 'SVG payload exceeds maximum length of 50000 characters').optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});
export type GeometryEnvelopeBlock = z.infer<typeof GeometryEnvelopeBlockSchema>;

// ==========================================
// 3. Composite Document & Discriminated Union
// ==========================================

export const RichContentBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  MathBlockSchema,
  ImageBlockSchema,
  GeometryEnvelopeBlockSchema,
]);
export type RichContentBlock = z.infer<typeof RichContentBlockSchema>;

export const MathRichContentSchema = z.object({
  version: z.literal(1),
  blocks: z.array(RichContentBlockSchema).max(200, 'A document cannot contain more than 200 blocks'),
});
export type MathRichContent = z.infer<typeof MathRichContentSchema>;

// ==========================================
// 4. Deterministic Utilities & Serialization
// ==========================================

/**
 * Deterministically serializes a MathRichContent composite document to a JSON string.
 */
export function serializeMathRichContent(doc: MathRichContent): string {
  const validated = MathRichContentSchema.parse(doc);
  return JSON.stringify(validated);
}

/**
 * Deterministically parses and validates a raw JSON string or object into a MathRichContent document.
 */
export function deserializeMathRichContent(raw: string | unknown): MathRichContent {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return MathRichContentSchema.parse(parsed);
    } catch (e) {
      if (e instanceof z.ZodError) throw e;
      throw new Error(`Failed to parse MathRichContent JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return MathRichContentSchema.parse(raw);
}

/**
 * Extracts a readable plain-text representation from a MathRichContent document,
 * useful for indexing, search, or accessible summaries.
 */
export function extractPlainText(doc: MathRichContent): string {
  const validated = MathRichContentSchema.parse(doc);
  const parts: string[] = [];

  for (const block of validated.blocks) {
    switch (block.type) {
      case 'text':
        if (block.content.trim().length > 0) {
          parts.push(block.content.trim());
        }
        break;
      case 'math':
        // Prefer Arabic alt text if present, otherwise fall back to LaTeX expression
        if (block.altTextAr && block.altTextAr.trim().length > 0) {
          parts.push(`[رياضيات: ${block.altTextAr.trim()}]`);
        } else {
          parts.push(`$${block.latex.trim()}$`);
        }
        break;
      case 'image':
        if (block.caption && block.caption.trim().length > 0) {
          parts.push(`[صورة: ${block.caption.trim()}]`);
        } else if (block.altText && block.altText.trim().length > 0) {
          parts.push(`[صورة: ${block.altText.trim()}]`);
        } else {
          parts.push('[صورة]');
        }
        break;
      case 'geometry':
        if (block.title && block.title.trim().length > 0) {
          parts.push(`[شكل هندسي: ${block.title.trim()}]`);
        } else {
          parts.push('[شكل هندسي]');
        }
        break;
    }
  }

  return parts.join('\n\n');
}

/**
 * Extracts a truncated one-line preview summary suitable for lists and badges.
 */
export function extractPreviewSummary(doc: MathRichContent, maxLength = 120): string {
  const plain = extractPlainText(doc).replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLength) {
    return plain;
  }
  return `${plain.slice(0, maxLength).trim()}...`;
}

// ==========================================
// 5. Factory Helpers
// ==========================================

export function createEmptyMathRichContent(): MathRichContent {
  return {
    version: 1,
    blocks: [],
  };
}

export function createTextBlock(
  content: string,
  options?: {
    id?: string;
    direction?: TextDirection;
    formatting?: TextBlockFormatting;
  }
): TextBlock {
  return TextBlockSchema.parse({
    id: options?.id ?? `txt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'text',
    content,
    direction: options?.direction ?? 'auto',
    formatting: options?.formatting,
  });
}

export function createMathBlock(
  latex: string,
  options?: {
    id?: string;
    displayMode?: MathDisplayMode;
    altTextAr?: string | null;
  }
): MathBlock {
  return MathBlockSchema.parse({
    id: options?.id ?? `mth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'math',
    latex,
    displayMode: options?.displayMode ?? 'block',
    altTextAr: options?.altTextAr,
  });
}

export function createImageBlock(
  mediaId: string,
  options?: {
    id?: string;
    caption?: string | null;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
    mimeType?: ImageMimeType | null;
  }
): ImageBlock {
  return ImageBlockSchema.parse({
    id: options?.id ?? `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'image',
    mediaId,
    caption: options?.caption,
    altText: options?.altText,
    width: options?.width,
    height: options?.height,
    mimeType: options?.mimeType,
  });
}

export function createGeometryEnvelopeBlock(options?: {
  id?: string;
  title?: string | null;
  width?: number | null;
  height?: number | null;
  svgPayload?: string | null;
  metadata?: Record<string, unknown>;
}): GeometryEnvelopeBlock {
  return GeometryEnvelopeBlockSchema.parse({
    id: options?.id ?? `geo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'geometry',
    schemaVersion: 'v1',
    title: options?.title,
    width: options?.width,
    height: options?.height,
    svgPayload: options?.svgPayload,
    metadata: options?.metadata,
  });
}

// ==========================================
// 6. Safe Offline LaTeX Validation
// ==========================================

export interface LatexValidationResult {
  valid: boolean;
  error?: string;
  errorAr?: string;
}

const FORBIDDEN_TEX_COMMANDS = [
  '\\write',
  '\\newwrite',
  '\\openout',
  '\\openin',
  '\\closeout',
  '\\closein',
  '\\read',
  '\\input',
  '\\include',
  '\\endinput',
  '\\catcode',
  '\\csname',
  '\\endcsname',
  '\\def',
  '\\gdef',
  '\\edef',
  '\\xdef',
  '\\let',
  '\\futurelet',
  '\\immediate',
  '\\special',
  '\\escapechar',
  '\\url',
  '\\href',
  '\\loop',
  '\\repeat',
  '\\every',
  '\\outer',
];

/**
 * Validates a LaTeX expression for mathematical authoring.
 * Deterministic, offline, pure string syntax validator.
 */
export function validateLatexSyntax(latex: string): LatexValidationResult {
  if (!latex || typeof latex !== 'string' || latex.trim().length === 0) {
    return {
      valid: false,
      error: 'LaTeX expression cannot be empty',
      errorAr: 'المعادلة الرياضية لا يمكن أن تكون فارغة',
    };
  }

  const trimmed = latex.trim();

  // 1. Check forbidden commands
  for (const cmd of FORBIDDEN_TEX_COMMANDS) {
    const escaped = cmd.replace(/\\/g, '\\\\');
    const regex = new RegExp(`${escaped}(?![a-zA-Z])`, 'i');
    if (regex.test(trimmed)) {
      return {
        valid: false,
        error: `Unsafe TeX command rejected: ${cmd}`,
        errorAr: `تم رفض أمر TeX غير آمن: ${cmd}`,
      };
    }
  }

  // 2. Check balanced delimiters
  const stack: { char: string; index: number }[] = [];
  let isEscaped = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '{' || char === '[' || char === '(') {
      stack.push({ char, index: i });
    } else if (char === '}' || char === ']' || char === ')') {
      if (stack.length === 0) {
        return {
          valid: false,
          error: `Unmatched closing delimiter '${char}' at position ${i + 1}`,
          errorAr: `قوس إغلاق غير متطابق '${char}' عند الموضع ${i + 1}`,
        };
      }
      const top = stack.pop()!;
      const matching: Record<string, string> = { '}': '{', ']': '[', ')': '(' };
      if (matching[char] !== top.char) {
        return {
          valid: false,
          error: `Mismatched delimiters: expected closing for '${top.char}' but found '${char}' at position ${i + 1}`,
          errorAr: `عدم تطابق في الأقواس: متوقع إغلاق '${top.char}' ولكن وُجد '${char}' عند الموضع ${i + 1}`,
        };
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1]!;
    return {
      valid: false,
      error: `Unclosed delimiter '${unclosed.char}' at position ${unclosed.index + 1}`,
      errorAr: `قوس غير مغلق '${unclosed.char}' عند الموضع ${unclosed.index + 1}`,
    };
  }

  // 3. Check balanced environments \begin{name} and \end{name}
  const envStack: { name: string; index: number }[] = [];
  const envRegex = /\\(begin|end)\{([a-zA-Z0-9*]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = envRegex.exec(trimmed)) !== null) {
    const action = match[1]!;
    const envName = match[2]!;
    const index = match.index;

    if (action === 'begin') {
      envStack.push({ name: envName, index });
    } else if (action === 'end') {
      if (envStack.length === 0) {
        return {
          valid: false,
          error: `Unmatched '\\end{${envName}}' at position ${index + 1}`,
          errorAr: `بيئة إغلاق غير متطابقة '\\end{${envName}}' عند الموضع ${index + 1}`,
        };
      }
      const top = envStack.pop()!;
      if (top.name !== envName) {
        return {
          valid: false,
          error: `Mismatched environment: expected '\\end{${top.name}}' but found '\\end{${envName}}' at position ${index + 1}`,
          errorAr: `عدم تطابق في البيئة الرياضية: متوقع '\\end{${top.name}}' ولكن وُجد '\\end{${envName}}'`,
        };
      }
    }
  }

  if (envStack.length > 0) {
    const unclosedEnv = envStack[envStack.length - 1]!;
    return {
      valid: false,
      error: `Unclosed environment '\\begin{${unclosedEnv.name}}' at position ${unclosedEnv.index + 1}`,
      errorAr: `بيئة رياضية غير مغلقة '\\begin{${unclosedEnv.name}}'`,
    };
  }

  return { valid: true };
}
