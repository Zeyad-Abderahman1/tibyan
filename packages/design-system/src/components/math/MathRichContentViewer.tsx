import React, { useMemo } from 'react';
import katex from 'katex';
import {
  MathRichContent,
  RichContentBlock,
  MathBlock,
  TextBlock,
  ImageBlock,
  GeometryEnvelopeBlock,
} from '@tibyan/contracts';
import { cn } from '../../utils/cn.js';
import { Shapes, Image as ImageIcon } from 'lucide-react';

export interface MathRichContentViewerProps {
  /**
   * The MathRichContent document or array of blocks to render.
   */
  content: MathRichContent | RichContentBlock[];
  /**
   * Optional custom resolver for local media paths/URLs.
   */
  resolveMediaUrl?: (mediaId: string) => string;
  /**
   * Additional container classes.
   */
  className?: string;
  /**
   * Test ID for automation.
   */
  testId?: string;
}

/**
 * Individual MathBlock renderer with KaTeX and strict LTR BiDi isolation.
 */
export const SingleMathRenderer: React.FC<{ block: MathBlock }> = ({ block }) => {
  const renderedHtml = useMemo(() => {
    try {
      return katex.renderToString(block.latex, {
        displayMode: block.displayMode === 'block',
        throwOnError: false,
        strict: false,
        trust: false, // Security constraint: Never enable arbitrary trust settings
      });
    } catch {
      return `<span class="katex-fallback-error text-red-500 font-mono text-sm">${block.latex}</span>`;
    }
  }, [block.latex, block.displayMode]);

  return (
    <div
      className={cn(
        'math-render-container font-math text-slate-900 dark:text-slate-100',
        block.displayMode === 'block'
          ? 'my-3 block w-full text-center overflow-x-auto py-2 px-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60'
          : 'inline-block mx-1'
      )}
      dir="ltr"
      style={{
        direction: 'ltr',
        unicodeBidi: 'isolate',
      }}
      data-testid={`math-block-${block.id}`}
      aria-label={block.altTextAr ?? block.latex}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

/**
 * Individual TextBlock renderer with typography and direction support.
 */
export const SingleTextRenderer: React.FC<{ block: TextBlock }> = ({ block }) => {
  return (
    <div
      className={cn(
        'text-block text-slate-800 dark:text-slate-200 leading-relaxed my-1.5 text-base',
        block.formatting?.bold && 'font-bold',
        block.formatting?.italic && 'italic',
        block.formatting?.underline && 'underline'
      )}
      dir={block.direction}
      data-testid={`text-block-${block.id}`}
    >
      {block.content}
    </div>
  );
};

/**
 * Individual ImageBlock renderer via safe local media pathway.
 */
export const SingleImageRenderer: React.FC<{
  block: ImageBlock;
  resolveMediaUrl?: (mediaId: string) => string;
}> = ({ block, resolveMediaUrl }) => {
  const src = resolveMediaUrl ? resolveMediaUrl(block.mediaId) : block.mediaId;

  return (
    <figure
      className="image-block my-4 flex flex-col items-center justify-center"
      data-testid={`image-block-${block.id}`}
    >
      <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1 max-w-full">
        <img
          src={src}
          alt={block.altText ?? block.caption ?? 'صورة توضيحية'}
          className="rounded object-contain max-w-full"
          style={{
            maxWidth: block.width ? `${block.width}px` : '100%',
            maxHeight: block.height ? `${block.height}px` : '480px',
          }}
          onError={(e) => {
            // Safe fallback if local file is missing
            const target = e.currentTarget;
            target.style.display = 'none';
            const fallback = target.parentElement?.querySelector('.image-fallback-placeholder');
            if (fallback) (fallback as HTMLElement).style.display = 'flex';
          }}
        />
        <div
          className="image-fallback-placeholder hidden flex-col items-center justify-center p-6 text-slate-400 gap-2"
          style={{ minWidth: '200px', minHeight: '120px' }}
        >
          <ImageIcon className="w-8 h-8 text-slate-400" />
          <span className="text-xs text-slate-500 font-mono">{block.mediaId}</span>
        </div>
      </div>
      {block.caption && (
        <figcaption className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center font-medium max-w-lg">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
};

/**
 * Individual GeometryEnvelopeBlock passive representation.
 * Strict Constraint: Geometry block is a versioned data container; never a dynamic construction engine.
 */
export const SingleGeometryRenderer: React.FC<{ block: GeometryEnvelopeBlock }> = ({ block }) => {
  return (
    <div
      className="geometry-envelope-block my-4 p-4 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 text-center"
      data-testid={`geometry-block-${block.id}`}
    >
      <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm mb-2">
        <Shapes className="w-4 h-4" />
        <span>{block.title ?? 'شكل هندسي (Geometry Envelope)'}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 font-mono">
          {block.schemaVersion}
        </span>
      </div>

      {block.svgPayload ? (
        <div
          className="geometry-svg-container overflow-hidden max-w-full flex items-center justify-center py-2"
          dir="ltr"
          dangerouslySetInnerHTML={{ __html: block.svgPayload }}
        />
      ) : (
        <div className="text-xs text-slate-500 dark:text-slate-400 py-3">
          بيانات الرسم الهندسي محفوظة بصيغة مغلفة ومجهزة للمراحل القادمة
          {block.width && block.height && (
            <span className="block mt-1 font-mono text-[11px] text-slate-400">
              الأبعاد: {block.width} × {block.height} بكسل
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Canonical MathRichContentViewer component.
 * Renders the multi-block document offline with authentic Arabic RTL layouts
 * and strict LTR isolated containers for all KaTeX formulas.
 */
export const MathRichContentViewer: React.FC<MathRichContentViewerProps> = ({
  content,
  resolveMediaUrl,
  className,
  testId = 'math-rich-content-viewer',
}) => {
  const blocks = useMemo(() => {
    if (Array.isArray(content)) {
      return content;
    }
    return content?.blocks ?? [];
  }, [content]);

  if (blocks.length === 0) {
    return (
      <div
        className={cn('text-sm text-slate-400 dark:text-slate-500 italic py-2', className)}
        data-testid={testId}
      >
        لا يوجد محتوى لعرضه.
      </div>
    );
  }

  return (
    <div
      className={cn('math-rich-content-viewer text-right', className)}
      dir="rtl"
      data-testid={testId}
    >
      {blocks.map((block) => {
        switch (block.type) {
          case 'text':
            return <SingleTextRenderer key={block.id} block={block} />;
          case 'math':
            return <SingleMathRenderer key={block.id} block={block} />;
          case 'image':
            return (
              <SingleImageRenderer
                key={block.id}
                block={block}
                resolveMediaUrl={resolveMediaUrl}
              />
            );
          case 'geometry':
            return <SingleGeometryRenderer key={block.id} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
};
