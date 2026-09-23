import React, { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  Input,
  Modal,
  MathRichContentViewer,
} from '@tibyan/design-system';
import {
  Plus,
  Trash2,
  Copy,
  GripVertical,
  Presentation,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Calculator,
  Shapes,
  HelpCircle,
  X,
  Type,
} from 'lucide-react';
import type {
  SlideDto,
  SlideBlockDto,
  SlideBlockType,
  MathRichContent,
} from '@tibyan/contracts';
import {
  useSlideDecks,
  useSlideDeck,
  useCreateSlideDeck,
  useAddSlide,
  useDeleteSlide,
  useDuplicateSlide,
  useReorderSlides,
  useAddSlideBlock,
  useDeleteSlideBlock,
  useReorderSlideBlocks,
  useUpdateSlide,
  useUpdateSlideBlock,
} from '../../hooks/useSlides.js';

// ─── Block Type Config ──────────────────────────────────────────────────────

const BLOCK_TYPES: Array<{ type: SlideBlockType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = [
  { type: 'TEXT', label: 'نص', icon: Type, color: 'text-blue-600 dark:text-blue-400' },
  { type: 'MATH', label: 'صيغة رياضية', icon: Calculator, color: 'text-emerald-600 dark:text-emerald-400' },
  { type: 'IMAGE', label: 'صورة', icon: ImageIcon, color: 'text-purple-600 dark:text-purple-400' },
  { type: 'GEOMETRY', label: 'شكل هندسي', icon: Shapes, color: 'text-amber-600 dark:text-amber-400' },
  { type: 'QUESTION', label: 'سؤال من البنك', icon: HelpCircle, color: 'text-rose-600 dark:text-rose-400' },
];

function EmptyContentDoc(): MathRichContent {
  return { version: 1, blocks: [] };
}

// ─── Slide Thumbnail ────────────────────────────────────────────────────────

interface SlideThumbnailProps {
  slide: SlideDto;
  isActive: boolean;
  index: number;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, slideId: string) => void;
  onDragOver: (e: React.DragEvent, slideId: string) => void;
  onDrop: (e: React.DragEvent, slideId: string) => void;
  isDropTarget: boolean;
}

function SlideThumbnail({ slide, isActive, index, onClick, onDragStart, onDragOver, onDrop, isDropTarget }: SlideThumbnailProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, slide.id)}
      onDragOver={(e) => onDragOver(e, slide.id)}
      onDrop={(e) => onDrop(e, slide.id)}
      onClick={onClick}
      className={`group relative p-3 rounded-lg border cursor-pointer transition-colors ${isDropTarget ? 'ring-2 ring-inset ring-[var(--color-brand-primary)]' : ''} ${
        isActive
          ? 'bg-[var(--color-brand-primary)]/8 border-[var(--color-brand-primary)] shadow-sm dark:bg-[#5CE1E6]/10 dark:border-[#5CE1E6]'
          : 'bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-bold)]'
      }`}
      data-testid={`slide-thumb-${slide.id}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <GripVertical className="w-3 h-3 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="text-xs font-bold text-[var(--color-text-secondary)]">
          {index + 1}
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-primary)] truncate font-medium">
        {slide.title || `شريحة ${index + 1}`}
      </p>
      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
        {slide.blockCount} كتل
      </p>
    </div>
  );
}

// ─── Content Block Renderer ─────────────────────────────────────────────────

interface BlockRendererProps {
  block: SlideBlockDto;
  onDelete: () => void;
  onEdit: () => void;
  onDragStart: (e: React.DragEvent, blockId: string) => void;
  onDragOver: (e: React.DragEvent, blockId: string) => void;
  onDrop: (e: React.DragEvent, blockId: string) => void;
  isDropTarget: boolean;
}

function BlockRenderer({ block, onDelete, onEdit, onDragStart, onDragOver, onDrop, isDropTarget }: BlockRendererProps) {
  const blockConfig = BLOCK_TYPES.find((bt) => bt.type === block.blockType);
  const Icon = blockConfig?.icon || FileText;

  let content: React.ReactNode = null;
  try {
    const doc: MathRichContent = JSON.parse(block.contentJson);
    if (block.blockType === 'TEXT' || block.blockType === 'MATH') {
      content = <MathRichContentViewer content={doc} />;
    } else {
      content = <MathRichContentViewer content={doc} />;
    }
  } catch {
    content = <p className="text-xs text-[var(--color-text-muted)]">محتوى غير صالح</p>;
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, block.id)}
      onDragOver={(e) => onDragOver(e, block.id)}
      onDrop={(e) => onDrop(e, block.id)}
      className={`group relative p-3 rounded-lg border bg-[var(--color-bg-surface)] hover:border-[var(--color-border-bold)] transition-colors border-[var(--color-border-subtle)] ${isDropTarget ? 'ring-2 ring-inset ring-[var(--color-brand-primary)]' : ''}`}
      data-testid={`slide-block-${block.id}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0 cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Icon className={`w-3.5 h-3.5 ${blockConfig?.color || ''}`} />
            <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
              {blockConfig?.label || block.blockType}
            </span>
          </div>
          <div className="text-sm text-[var(--color-text-primary)] leading-relaxed">
            {content}
          </div>
        </div>
        {(block.blockType === 'TEXT' || block.blockType === 'MATH') && <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1 text-xs text-[var(--color-brand-primary)]"
          data-testid={`edit-block-${block.id}`}
        >تعديل</button>}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-[var(--color-text-muted)] hover:text-red-500 transition-all shrink-0"
          data-testid={`delete-block-${block.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Slide Authoring Page ──────────────────────────────────────────────

export function SlidesPage() {
  const [searchParams] = useSearchParams();
  const { data: decks = [], isLoading: decksLoading } = useSlideDecks();
  const createDeck = useCreateSlideDeck();

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(() => searchParams.get('deck'));
  const { data: deck } = useSlideDeck(selectedDeckId);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);

  const addSlide = useAddSlide();
  const deleteSlide = useDeleteSlide();
  const duplicateSlide = useDuplicateSlide();
  const reorderSlides = useReorderSlides();
  const addBlock = useAddSlideBlock();
  const deleteBlock = useDeleteSlideBlock();
  const reorderBlocks = useReorderSlideBlocks();
  const updateSlide = useUpdateSlide();
  const updateBlock = useUpdateSlideBlock();

  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [presentationSlideIndex, setPresentationSlideIndex] = useState(0);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [editingSlideTitle, setEditingSlideTitle] = useState<string | null>(null);
  const [slideTitleValue, setSlideTitleValue] = useState('');
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockDraft, setBlockDraft] = useState('');

  // Drag state
  const dragTypeRef = useRef<'slide' | 'block' | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const [slideDropTarget, setSlideDropTarget] = useState<string | null>(null);
  const [blockDropTarget, setBlockDropTarget] = useState<string | null>(null);

  const selectedSlide = deck?.slides?.find((s) => s.id === selectedSlideId);

  const openBlockEditor = (block: SlideBlockDto) => {
    try {
      const parsed = JSON.parse(block.contentJson) as MathRichContent;
      setBlockDraft(parsed.blocks.map((item) => item.type === 'text' ? item.content : item.type === 'math' ? `$$${item.latex}$$` : '').join('\n'));
    } catch { setBlockDraft(''); }
    setEditingBlockId(block.id);
  };

  const saveBlockEdit = async () => {
    if (!editingBlockId || !blockDraft.trim()) return;
    const blocks: MathRichContent['blocks'] = blockDraft.split(/(\$\$[\s\S]*?\$\$)/g).filter(Boolean).map((part) =>
      part.startsWith('$$') && part.endsWith('$$')
        ? { id: crypto.randomUUID(), type: 'math' as const, latex: part.slice(2, -2).trim(), displayMode: 'block' as const }
        : { id: crypto.randomUUID(), type: 'text' as const, content: part, direction: 'rtl' as const });
    await updateBlock.mutateAsync({ id: editingBlockId, input: { contentJson: JSON.stringify({ version: 1, blocks }) } });
    setEditingBlockId(null);
  };

  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim()) return;
    const result = await createDeck.mutateAsync({ title: newDeckTitle.trim() });
    setSelectedDeckId(result.id);
    setNewDeckTitle('');
    setShowNewDeckModal(false);
  };

  const handleAddSlide = async () => {
    if (!selectedDeckId) return;
    const result = await addSlide.mutateAsync({ deckId: selectedDeckId });
    setSelectedSlideId(result.id);
  };

  const handleAddBlock = async (blockType: SlideBlockType) => {
    if (!selectedSlideId) return;
    const emptyDoc = EmptyContentDoc();
    await addBlock.mutateAsync({
      slideId: selectedSlideId,
      blockType,
      contentJson: JSON.stringify(emptyDoc),
    });
  };

  // Slide drag-and-drop
  const handleSlideDragStart = useCallback((e: React.DragEvent, _slideId: string) => {
    dragTypeRef.current = 'slide';
    dragIdRef.current = _slideId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _slideId);
  }, []);

  const handleSlideDragOver = useCallback((e: React.DragEvent, _slideId: string) => {
    e.preventDefault();
    if (dragTypeRef.current !== 'slide') return;
    e.dataTransfer.dropEffect = 'move';
    setSlideDropTarget(_slideId);
  }, []);

  const handleSlideDrop = useCallback((e: React.DragEvent, targetSlideId: string) => {
    e.preventDefault();
    setSlideDropTarget(null);
    if (dragTypeRef.current !== 'slide' || !deck) return;
    const sourceId = dragIdRef.current;
    if (!sourceId || sourceId === targetSlideId) return;

    const slideIds = deck.slides.map((s) => s.id);
    const fromIdx = slideIds.indexOf(sourceId);
    const toIdx = slideIds.indexOf(targetSlideId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...slideIds];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, sourceId);

    reorderSlides.mutate({ deckId: deck.id, slideIds: reordered });
    dragTypeRef.current = null;
    dragIdRef.current = null;
  }, [deck, reorderSlides]);

  // Block drag-and-drop
  const handleBlockDragStart = useCallback((e: React.DragEvent, _blockId: string) => {
    dragTypeRef.current = 'block';
    dragIdRef.current = _blockId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _blockId);
  }, []);

  const handleBlockDragOver = useCallback((e: React.DragEvent, _blockId: string) => {
    e.preventDefault();
    if (dragTypeRef.current !== 'block') return;
    e.dataTransfer.dropEffect = 'move';
    setBlockDropTarget(_blockId);
  }, []);

  const handleBlockDrop = useCallback((e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    setBlockDropTarget(null);
    if (dragTypeRef.current !== 'block' || !selectedSlide) return;
    const sourceId = dragIdRef.current;
    if (!sourceId || sourceId === targetBlockId) return;

    const blockIds = selectedSlide.blocks.map((b) => b.id);
    const fromIdx = blockIds.indexOf(sourceId);
    const toIdx = blockIds.indexOf(targetBlockId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...blockIds];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, sourceId);

    reorderBlocks.mutate({ slideId: selectedSlide.id, blockIds: reordered });
    dragTypeRef.current = null;
    dragIdRef.current = null;
  }, [selectedSlide, reorderBlocks]);

  // Presentation mode
  const handleStartPresentation = () => {
    setPresentationSlideIndex(0);
    setIsPresentationMode(true);
  };

  const presentationSlides = deck?.slides || [];
  const currentPresentationSlide = presentationSlides[presentationSlideIndex];

  if (decksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" dir="rtl" data-testid="page-slides" onDragEndCapture={() => { setSlideDropTarget(null); setBlockDropTarget(null); dragTypeRef.current = null; dragIdRef.current = null; }}>
      {/* Presentation Mode Overlay */}
      {isPresentationMode && currentPresentationSlide && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black/80 text-white">
            <span className="text-sm font-medium">
              {presentationSlideIndex + 1} / {presentationSlides.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPresentationSlideIndex(Math.max(0, presentationSlideIndex - 1))}
                disabled={presentationSlideIndex === 0}
                className="text-white hover:bg-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPresentationSlideIndex(Math.min(presentationSlides.length - 1, presentationSlideIndex + 1))}
                disabled={presentationSlideIndex === presentationSlides.length - 1}
                className="text-white hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPresentationMode(false)}
                className="text-white hover:bg-white/10"
                data-testid="exit-presentation"
              >
                <X className="w-4 h-4" />
                <span className="mr-1">خروج</span>
              </Button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className={`w-full max-w-5xl aspect-video rounded-2xl shadow-2xl p-12 overflow-auto ${deck?.generationSettings?.theme === 'DARK' ? 'bg-gray-900 text-white' : deck?.generationSettings?.theme === 'TIBYAN' ? 'bg-emerald-900 text-white' : 'bg-white text-gray-900'}`}>
              {currentPresentationSlide.title && (
                <h2 className="text-2xl font-bold mb-6 text-center">
                  {currentPresentationSlide.title}
                </h2>
              )}
              <div className="space-y-4">
                {currentPresentationSlide.blocks.map((block) => {
                  try {
                    const doc: MathRichContent = JSON.parse(block.contentJson);
                    return (
                      <div key={block.id}>
                        <MathRichContentViewer content={doc} />
                      </div>
                    );
                  } catch {
                    return null;
                  }
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] dark:bg-[#5CE1E6]/10 dark:text-[#5CE1E6] flex items-center justify-center">
            <Presentation className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">شرائح التدريس</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">إنشاء وتنظيم عروض الشرح والدروس</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowNewDeckModal(true)}
            className="gap-1.5"
            data-testid="btn-create-deck"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>곹 deck جديد</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Deck List Sidebar */}
        <div className="w-56 border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col">
          <div className="p-3 border-b border-[var(--color-border-subtle)]">
            <h2 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              عروض الشرح ({decks.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {decks.length === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--color-text-muted)]">
                لا توجد عروض بعد
              </div>
            ) : (
              decks.map((d) => (
                <div
                  key={d.id}
                  onClick={() => { setSelectedDeckId(d.id); setSelectedSlideId(null); }}
                  className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                    selectedDeckId === d.id
                      ? 'bg-[var(--color-brand-primary)]/8 border border-[var(--color-brand-primary)] dark:bg-[#5CE1E6]/10 dark:border-[#5CE1E6]'
                      : 'hover:bg-[var(--color-bg-surface-subtle)] border border-transparent'
                  }`}
                  data-testid={`deck-item-${d.id}`}
                >
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {d.title}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    {d.slideCount} شريحة
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Slide Workspace */}
        {selectedDeckId && deck ? (
          <div className="flex-1 flex">
            {/* Slide Thumbnails Column */}
            <div className="w-48 border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-subtle)] flex flex-col">
              <div className="p-2 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--color-text-secondary)]">
                  الشرائح ({deck.slides.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddSlide}
                  className="p-1"
                  data-testid="btn-add-slide"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {deck.slides.map((s, idx) => (
                  <SlideThumbnail
                    key={s.id}
                    slide={s}
                    index={idx}
                    isActive={selectedSlideId === s.id}
                    onClick={() => setSelectedSlideId(s.id)}
                    onDragStart={handleSlideDragStart}
                    onDragOver={handleSlideDragOver}
                    onDrop={handleSlideDrop}
                    isDropTarget={slideDropTarget === s.id}
                  />
                ))}
              </div>
              <div className="p-2 border-t border-[var(--color-border-subtle)]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartPresentation}
                  disabled={deck.slides.length === 0}
                  className="w-full gap-1.5 text-xs"
                  data-testid="btn-present"
                >
                  <Presentation className="w-3.5 h-3.5" />
                  <span>عرض الشرح</span>
                </Button>
              </div>
            </div>

            {/* Block Editor Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedSlide ? (
                <>
                  {/* Slide Header */}
                  <div className="p-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {editingSlideTitle === selectedSlide.id ? (
                        <input
                          value={slideTitleValue}
                          onChange={(e) => setSlideTitleValue(e.target.value)}
                          onBlur={() => {
                            updateSlide.mutate({ id: selectedSlide.id, input: { title: slideTitleValue || null } });
                            setEditingSlideTitle(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateSlide.mutate({ id: selectedSlide.id, input: { title: slideTitleValue || null } });
                              setEditingSlideTitle(null);
                            }
                          }}
                          className="text-sm font-bold text-[var(--color-text-primary)] bg-transparent border-b border-[var(--color-brand-primary)] outline-none px-1 py-0.5 w-full"
                          autoFocus
                        />
                      ) : (
                        <h3
                          className="text-sm font-bold text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-brand-primary)] truncate"
                          onClick={() => {
                            setEditingSlideTitle(selectedSlide.id);
                            setSlideTitleValue(selectedSlide.title || '');
                          }}
                        >
                          {selectedSlide.title || `شريحة ${deck.slides.indexOf(selectedSlide) + 1}`}
                        </h3>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateSlide.mutate(selectedSlide.id)}
                        className="p-1"
                        data-testid="btn-duplicate-slide"
                        title="تكرار الشريحة"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (deck.slides.length > 1) {
                            deleteSlide.mutate(selectedSlide.id);
                            setSelectedSlideId(null);
                          }
                        }}
                        disabled={deck.slides.length <= 1}
                        className="p-1 text-red-500 hover:text-red-600"
                        data-testid="btn-delete-slide"
                        title="حذف الشريحة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Blocks List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {selectedSlide.blocks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-12 h-12 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6" />
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                          شريحة فارغة
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mb-4">
                          أضف كتل محتوى من القائمة أدناه
                        </p>
                      </div>
                    ) : (
                      selectedSlide.blocks.map((block) => (
                        <BlockRenderer
                          key={block.id}
                          block={block}
                          onDelete={() => deleteBlock.mutate(block.id)}
                          onEdit={() => openBlockEditor(block)}
                          onDragStart={handleBlockDragStart}
                          onDragOver={handleBlockDragOver}
                          onDrop={handleBlockDrop}
                          isDropTarget={blockDropTarget === block.id}
                        />
                      ))
                    )}
                  </div>

                  {/* Add Block Bar */}
                  <div className="p-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {BLOCK_TYPES.map((bt) => {
                        const Icon = bt.icon;
                        return (
                          <Button
                            key={bt.type}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddBlock(bt.type)}
                            className="gap-1 text-xs"
                            data-testid={`add-block-${bt.type.toLowerCase()}`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${bt.color}`} />
                            <span>{bt.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      اختر شريحة من القائمة
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      أو أضف شريحة جديدة
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] flex items-center justify-center mb-4">
                <Presentation className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
                ابدأ بإنشاء عرض شرح
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                أنشئ عرض شرح جديد وابدأ بإضافة الشرائح والمحتوى
              </p>
              <Button
                variant="primary"
                onClick={() => setShowNewDeckModal(true)}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء عرض جديد</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Deck Modal */}
      <Modal isOpen={editingBlockId !== null} onClose={() => setEditingBlockId(null)} title="تعديل محتوى الشريحة" size="lg">
        <div className="space-y-3 p-1">
          <textarea value={blockDraft} onChange={(event) => setBlockDraft(event.target.value)} rows={9} className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3" data-testid="slide-block-editor" />
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditingBlockId(null)}>إلغاء</Button><Button variant="primary" onClick={saveBlockEdit} disabled={!blockDraft.trim()} loading={updateBlock.isPending}>حفظ</Button></div>
        </div>
      </Modal>
      <Modal
        isOpen={showNewDeckModal}
        onClose={() => setShowNewDeckModal(false)}
        title="إنشاء عرض شرح جديد"
        size="sm"
      >
        <div className="space-y-4 p-1">
          <Input
            label="عنوان العرض"
            value={newDeckTitle}
            onChange={(e) => setNewDeckTitle(e.target.value)}
            placeholder="مثال: حصّة Algebra - الفصل الأول"
            data-testid="input-deck-title"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowNewDeckModal(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateDeck}
              disabled={!newDeckTitle.trim()}
              loading={createDeck.isPending}
              data-testid="btn-confirm-create-deck"
            >
              إنشاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
