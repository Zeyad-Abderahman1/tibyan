import React, { useState, useRef, useCallback } from 'react';
import {
  MathRichContent,
  RichContentBlock,
  createTextBlock,
  createMathBlock,
  createImageBlock,
  serializeMathRichContent,
} from '@tibyan/contracts';
import { MathRichContentViewer } from './MathRichContentViewer.js';
import { MathSymbolPalette } from './MathSymbolPalette.js';
import { cn } from '../../utils/cn.js';
import {
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  Sigma,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Columns,
  Save,
} from 'lucide-react';

export interface LatexValidationFeedback {
  valid: boolean;
  error?: string;
  errorAr?: string;
}

export interface MathRichContentEditorProps {
  /**
   * Initial content document or array of blocks.
   */
  initialContent?: MathRichContent | RichContentBlock[];
  /**
   * Callback fired on every change with the updated MathRichContent document.
   */
  onChange?: (doc: MathRichContent) => void;
  /**
   * Callback fired when save button is clicked with serialized JSON string.
   */
  onSave?: (serializedJson: string) => void;
  /**
   * Optional custom LaTeX validator. If omitted, built-in baseline validation is used.
   */
  validateLatex?: (latex: string) => LatexValidationFeedback;
  /**
   * Optional media URL resolver for previews.
   */
  resolveMediaUrl?: (mediaId: string) => string;
  /**
   * Read-only mode flag.
   */
  readOnly?: boolean;
  className?: string;
  testId?: string;
}

/**
 * Built-in default LaTeX validator if no external validator is injected.
 */
function defaultValidateLatex(latex: string): LatexValidationFeedback {
  if (!latex || latex.trim().length === 0) {
    return { valid: false, error: 'Empty expression', errorAr: 'المعادلة فارغة' };
  }

  // Quick check for balanced delimiters
  const stack: string[] = [];
  for (let i = 0; i < latex.length; i++) {
    const c = latex[i];
    if (c === '{' || c === '[' || c === '(') stack.push(c);
    else if (c === '}' || c === ']' || c === ')') {
      if (stack.length === 0) return { valid: false, error: `Unmatched '${c}'`, errorAr: `قوس غير متطابق '${c}'` };
      const top = stack.pop();
      const match: Record<string, string> = { '}': '{', ']': '[', ')': '(' };
      if (match[c] !== top) return { valid: false, error: `Mismatched '${c}'`, errorAr: `عدم تطابق في الأقواس` };
    }
  }
  if (stack.length > 0) {
    return { valid: false, error: `Unclosed '${stack[stack.length - 1]}'`, errorAr: `قوس غير مغلق` };
  }

  return { valid: true };
}

/**
 * Arabic-first block-based Math Rich Content Editor.
 * Tailored for Egyptian secondary mathematics authoring with live KaTeX preview
 * and secondary math symbol palette.
 */
export const MathRichContentEditor: React.FC<MathRichContentEditorProps> = ({
  initialContent,
  onChange,
  onSave,
  validateLatex = defaultValidateLatex,
  resolveMediaUrl,
  readOnly = false,
  className,
  testId = 'math-rich-content-editor',
}) => {
  const [blocks, setBlocks] = useState<RichContentBlock[]>(() => {
    if (!initialContent) return [createTextBlock(''), createMathBlock('')];
    if (Array.isArray(initialContent)) return initialContent;
    return initialContent.blocks;
  });

  const [activeBlockId, setActiveBlockId] = useState<string | null>(() => {
    const firstMath = blocks.find((b) => b.type === 'math');
    return firstMath ? firstMath.id : blocks[0]?.id ?? null;
  });

  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const mathInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const updateBlocks = useCallback(
    (newBlocks: RichContentBlock[]) => {
      setBlocks(newBlocks);
      const doc: MathRichContent = { version: 1, blocks: newBlocks };
      onChange?.(doc);
    },
    [onChange]
  );

  // Block Manipulation Handlers
  const handleAddTextBlock = () => {
    const newBlock = createTextBlock('', { direction: 'rtl' });
    const next = [...blocks, newBlock];
    updateBlocks(next);
    setActiveBlockId(newBlock.id);
  };

  const handleAddMathBlock = () => {
    const newBlock = createMathBlock('');
    const next = [...blocks, newBlock];
    updateBlocks(next);
    setActiveBlockId(newBlock.id);
  };

  const handleAddImageBlock = () => {
    const mediaId = `diagram_${Date.now()}.png`;
    const newBlock = createImageBlock(mediaId, { caption: 'شكل توضيحي' });
    const next = [...blocks, newBlock];
    updateBlocks(next);
    setActiveBlockId(newBlock.id);
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const next = [...blocks];
    const currentItem = next[index];
    const targetItem = next[targetIndex];
    if (currentItem && targetItem) {
      next[index] = targetItem;
      next[targetIndex] = currentItem;
      updateBlocks(next);
    }
  };

  const handleDeleteBlock = (id: string) => {
    const next = blocks.filter((b) => b.id !== id);
    updateBlocks(next);
    if (activeBlockId === id) {
      setActiveBlockId(next[0]?.id ?? null);
    }
  };

  const handleUpdateBlockContent = (id: string, partial: Partial<RichContentBlock>) => {
    const next = blocks.map((b) => {
      if (b.id !== id) return b;
      return { ...b, ...partial } as RichContentBlock;
    });
    updateBlocks(next);
  };

  // Symbol Palette Insertion
  const handleInsertSymbol = (snippet: string) => {
    if (!activeBlockId) return;
    const block = blocks.find((b) => b.id === activeBlockId);
    if (!block || block.type !== 'math') return;

    const textarea = mathInputRefs.current[activeBlockId];
    if (textarea) {
      const start = textarea.selectionStart ?? block.latex.length;
      const end = textarea.selectionEnd ?? block.latex.length;
      const newLatex =
        block.latex.substring(0, start) + snippet + block.latex.substring(end);

      handleUpdateBlockContent(activeBlockId, { latex: newLatex });

      setTimeout(() => {
        textarea.focus();
        const nextPos = start + snippet.length;
        textarea.setSelectionRange(nextPos, nextPos);
      }, 0);
    } else {
      const newLatex = block.latex ? `${block.latex} ${snippet}` : snippet;
      handleUpdateBlockContent(activeBlockId, { latex: newLatex });
    }
  };

  const handleSave = () => {
    const doc: MathRichContent = { version: 1, blocks };
    const serialized = serializeMathRichContent(doc);
    onSave?.(serialized);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const currentDocument: MathRichContent = { version: 1, blocks };

  return (
    <div
      className={cn(
        'math-rich-content-editor flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden text-right',
        className
      )}
      dir="rtl"
      data-testid={testId}
    >
      {/* Editor Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
        {/* Left: View Mode Switches */}
        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-700/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            )}
            data-testid="view-mode-split"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>تحرير ومعاينة</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              viewMode === 'edit'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            )}
            data-testid="view-mode-edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>تحرير فقط</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              viewMode === 'preview'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            )}
            data-testid="view-mode-preview"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>معاينة نهائية</span>
          </button>
        </div>

        {/* Center: Block Add Buttons */}
        {!readOnly && viewMode !== 'preview' && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAddTextBlock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-100 transition-colors"
              data-testid="add-text-block-btn"
            >
              <Type className="w-3.5 h-3.5" />
              <span>إضافة نص</span>
            </button>
            <button
              type="button"
              onClick={handleAddMathBlock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-100 transition-colors"
              data-testid="add-math-block-btn"
            >
              <Sigma className="w-3.5 h-3.5" />
              <span>إضافة معادلة</span>
            </button>
            <button
              type="button"
              onClick={handleAddImageBlock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-100 transition-colors"
              data-testid="add-image-block-btn"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>إضافة صورة</span>
            </button>
          </div>
        )}

        {/* Right: Save Action */}
        {onSave && (
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
            data-testid="save-content-btn"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>تم الحفظ</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>حفظ المحتوى</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
        {/* Editor Column */}
        {viewMode !== 'preview' && (
          <div
            className={cn(
              'p-4 space-y-4 overflow-y-auto max-h-[700px]',
              viewMode === 'split' ? 'md:col-span-7 border-l border-slate-200 dark:border-slate-800' : 'md:col-span-12'
            )}
            data-testid="editor-column"
          >
            {/* Symbol Palette for Active Math Block */}
            {!readOnly && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span>لوحة الرموز الرياضية (للمرحلة الثانوية العامة):</span>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal">
                    انقر لإدراج الرمز في المعادلة النشطة
                  </span>
                </div>
                <MathSymbolPalette onInsert={handleInsertSymbol} />
              </div>
            )}

            {/* Block List */}
            <div className="space-y-3" data-testid="blocks-container">
              {blocks.length === 0 && (
                <div className="text-center py-10 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                  المحتوى فارغ. استخدم الأزرار بالأعلى لإضافة نص أو معادلة رياضية.
                </div>
              )}

              {blocks.map((block, index) => {
                const isActive = activeBlockId === block.id;

                if (block.type === 'text') {
                  return (
                    <div
                      key={block.id}
                      onClick={() => setActiveBlockId(block.id)}
                      className={cn(
                        'rounded-xl border p-3 transition-all',
                        isActive
                          ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-white dark:bg-slate-900 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                      )}
                      data-testid={`editor-block-${block.id}`}
                    >
                      {/* Block Controls Header */}
                      <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Type className="w-3.5 h-3.5 text-emerald-600" />
                          <span>فقرة نصية ({index + 1})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveBlock(index, 'up');
                            }}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                            title="تحريك لأعلى"
                            data-testid={`move-up-${block.id}`}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveBlock(index, 'down');
                            }}
                            disabled={index === blocks.length - 1}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                            title="تحريك لأسفل"
                            data-testid={`move-down-${block.id}`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBlock(block.id);
                            }}
                            className="p-1 rounded hover:bg-red-100 text-red-600 dark:hover:bg-red-950/40"
                            title="حذف الفقرة"
                            data-testid={`delete-block-${block.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Text Input */}
                      <textarea
                        value={block.content}
                        onChange={(e) =>
                          handleUpdateBlockContent(block.id, { content: e.target.value })
                        }
                        placeholder="اكتب المحتوى النصي هنا..."
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                        dir={block.direction}
                        data-testid={`textarea-text-${block.id}`}
                      />
                    </div>
                  );
                }

                if (block.type === 'math') {
                  const validation = validateLatex(block.latex);

                  return (
                    <div
                      key={block.id}
                      onClick={() => setActiveBlockId(block.id)}
                      className={cn(
                        'rounded-xl border p-3 transition-all',
                        isActive
                          ? 'border-amber-500 ring-1 ring-amber-500/20 bg-white dark:bg-slate-900 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                      )}
                      data-testid={`editor-block-${block.id}`}
                    >
                      {/* Math Block Controls Header */}
                      <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                          <Sigma className="w-3.5 h-3.5" />
                          <span>معادلة رياضية ({index + 1})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Display Mode Toggle */}
                          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 rounded p-0.5 text-[11px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateBlockContent(block.id, { displayMode: 'block' });
                              }}
                              className={cn(
                                'px-2 py-0.5 rounded transition-all',
                                block.displayMode === 'block'
                                  ? 'bg-white dark:bg-slate-900 font-semibold text-amber-700 dark:text-amber-400'
                                  : 'text-slate-600 dark:text-slate-400'
                              )}
                              data-testid={`mode-block-${block.id}`}
                            >
                              كتلة (Block)
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateBlockContent(block.id, { displayMode: 'inline' });
                              }}
                              className={cn(
                                'px-2 py-0.5 rounded transition-all',
                                block.displayMode === 'inline'
                                  ? 'bg-white dark:bg-slate-900 font-semibold text-amber-700 dark:text-amber-400'
                                  : 'text-slate-600 dark:text-slate-400'
                              )}
                              data-testid={`mode-inline-${block.id}`}
                            >
                              سطرية (Inline)
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveBlock(index, 'up');
                              }}
                              disabled={index === 0}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                              title="تحريك لأعلى"
                              data-testid={`move-up-${block.id}`}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveBlock(index, 'down');
                              }}
                              disabled={index === blocks.length - 1}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                              title="تحريك لأسفل"
                              data-testid={`move-down-${block.id}`}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBlock(block.id);
                              }}
                              className="p-1 rounded hover:bg-red-100 text-red-600 dark:hover:bg-red-950/40"
                              title="حذف المعادلة"
                              data-testid={`delete-block-${block.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* LaTeX Code Input (LTR Monospace) */}
                      <div className="relative">
                        <textarea
                          ref={(el) => (mathInputRefs.current[block.id] = el)}
                          value={block.latex}
                          onChange={(e) =>
                            handleUpdateBlockContent(block.id, { latex: e.target.value })
                          }
                          placeholder="مثال: \frac{d}{dx}\left(\sin x\right) = \cos x"
                          rows={2}
                          dir="ltr"
                          className="w-full font-mono text-sm rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 bg-slate-900 text-emerald-400 dark:bg-black focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y text-left"
                          style={{ direction: 'ltr' }}
                          data-testid={`textarea-math-${block.id}`}
                        />
                      </div>

                      {/* Validation Feedback Indicator */}
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        {validation.valid ? (
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>الصيغة الرياضية سليمة ومطابقة لمعايير TeX</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{validation.errorAr ?? validation.error}</span>
                          </div>
                        )}

                        <span className="text-[11px] text-slate-400 font-mono">
                          {block.latex.length} حرف
                        </span>
                      </div>

                      {/* Optional Alt Text for Accessibility */}
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <input
                          type="text"
                          value={block.altTextAr ?? ''}
                          onChange={(e) =>
                            handleUpdateBlockContent(block.id, { altTextAr: e.target.value })
                          }
                          placeholder="وصف بديل للمعادلة بالعربية (اختياري، مثلاً: قانون نيوتن الثاني)..."
                          className="w-full rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                          data-testid={`input-alttext-${block.id}`}
                        />
                      </div>
                    </div>
                  );
                }

                if (block.type === 'image') {
                  return (
                    <div
                      key={block.id}
                      onClick={() => setActiveBlockId(block.id)}
                      className={cn(
                        'rounded-xl border p-3 transition-all',
                        isActive
                          ? 'border-blue-500 ring-1 ring-blue-500/20 bg-white dark:bg-slate-900 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                      )}
                      data-testid={`editor-block-${block.id}`}
                    >
                      <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-400">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>صورة توضيحية ({index + 1})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveBlock(index, 'up');
                            }}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                            data-testid={`move-up-${block.id}`}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveBlock(index, 'down');
                            }}
                            disabled={index === blocks.length - 1}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                            data-testid={`move-down-${block.id}`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBlock(block.id);
                            }}
                            className="p-1 rounded hover:bg-red-100 text-red-600 dark:hover:bg-red-950/40"
                            data-testid={`delete-block-${block.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-slate-500 mb-1">اسم / مسار الوسائط الآمن:</label>
                          <input
                            type="text"
                            value={block.mediaId}
                            onChange={(e) =>
                              handleUpdateBlockContent(block.id, { mediaId: e.target.value })
                            }
                            className="w-full font-mono rounded border border-slate-200 dark:border-slate-700 px-2 py-1 bg-white dark:bg-slate-950"
                            dir="ltr"
                            data-testid={`input-mediaid-${block.id}`}
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 mb-1">التعليق التوضيحي (Caption):</label>
                          <input
                            type="text"
                            value={block.caption ?? ''}
                            onChange={(e) =>
                              handleUpdateBlockContent(block.id, { caption: e.target.value })
                            }
                            placeholder="تعليق أسفل الصورة..."
                            className="w-full rounded border border-slate-200 dark:border-slate-700 px-2 py-1 bg-white dark:bg-slate-950"
                            data-testid={`input-caption-${block.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        )}

        {/* Live Preview Column */}
        {viewMode !== 'edit' && (
          <div
            className={cn(
              'p-4 bg-slate-50/50 dark:bg-slate-950/30 overflow-y-auto max-h-[700px]',
              viewMode === 'split' ? 'md:col-span-5' : 'md:col-span-12'
            )}
            data-testid="preview-column"
          >
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-800">
              <span>المعاينة الحية للمحتوى (Live Offline Preview):</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                عزل LTR للرياضيات نشط
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm min-h-[300px]">
              <MathRichContentViewer
                content={currentDocument}
                resolveMediaUrl={resolveMediaUrl}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
