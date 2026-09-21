import { useState } from 'react';
import { Card, Button, Input, Select } from '@tibyan/design-system';
import { Presentation, Loader2, Sparkles, Play, Sun, Moon, Palette, GripVertical, Trash2 } from 'lucide-react';
import { SourcePicker, type SourceSelection } from './SourcePicker.js';

interface SlideData {
  id: string;
  title: string;
  content: string;
  notes: string;
  blocks: SlideBlock[];
}

interface SlideBlock {
  id: string;
  type: 'TEXT' | 'MATH' | 'IMAGE' | 'GEOMETRY' | 'QUESTION';
  content: string;
}

const GRADE_LEVELS = [
  { value: 'SEC_1', label: 'الصف الأول الثانوي' },
  { value: 'SEC_2', label: 'الصف الثاني الثانوي' },
  { value: 'SEC_3', label: 'الصف الثالث الثانوي' },
];

const THEMES = [
  { value: 'LIGHT', label: 'فاتح', icon: Sun },
  { value: 'DARK', label: 'داكن', icon: Moon },
  { value: 'TIBYAN', label: 'تبيان', icon: Palette },
];

const LAYOUT_TEMPLATES = [
  { value: 'SIMPLE_EDUCATIONAL', label: 'تعليمي بسيط' },
  { value: 'EXPLAIN_EXAMPLE', label: 'شرح + مثال' },
  { value: 'QUICK_REVIEW', label: 'مراجعة سريعة' },
  { value: 'VISUAL_EXPLAIN', label: 'شرح بصري' },
];

const DETAIL_LEVELS = [
  { value: 'BRIEF', label: 'مختصر' },
  { value: 'MODERATE', label: 'متوسط' },
  { value: 'DETAILED', label: 'تفصيلي' },
];

export function SlidesToolUI() {
  const [selectedSource, setSelectedSource] = useState<SourceSelection | null>(null);
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState('SEC_1');
  const [slideCount, setSlideCount] = useState(8);
  const [detailLevel, setDetailLevel] = useState('MODERATE');
  const [includeInteractive, setIncludeInteractive] = useState(false);
  const [includeExamples, setIncludeExamples] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [theme, setTheme] = useState('LIGHT');
  const [layoutTemplate, setLayoutTemplate] = useState('SIMPLE_EDUCATIONAL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [presentationMode, setPresentationMode] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handleGenerate = async () => {
    if (!selectedSource) return;
    setIsGenerating(true);
    try {
      const mockSlides: SlideData[] = [];
      for (let i = 0; i < slideCount; i++) {
        mockSlides.push({
          id: `slide-${i}`,
          title: i === 0 ? (title || 'عنوان العرض') : `شريحة ${i + 1}`,
          content: `محتوى تعليمي للشريحة ${i + 1} - بناءً على مصدر المنهج المحدد`,
          notes: `ملاحظات المتحدث للشريحة ${i + 1}`,
          blocks: [
            { id: `block-${i}-1`, type: 'TEXT', content: `محتوى الشريحة ${i + 1}` },
          ],
        });
      }
      setSlides(mockSlides);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteSlide = (id: string) => {
    setSlides((prev) => prev.filter((s) => s.id !== id));
  };

  const startPresentation = () => {
    setCurrentSlideIndex(0);
    setPresentationMode(true);
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  // Presentation mode overlay
  if (presentationMode && slides.length > 0) {
    const current = slides[currentSlideIndex]!;
    const themeBg = theme === 'DARK' ? 'bg-gray-900' : theme === 'TIBYAN' ? 'bg-emerald-900' : 'bg-white';
    const themeText = theme === 'DARK' || theme === 'TIBYAN' ? 'text-white' : 'text-gray-900';

    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" dir="rtl">
        <div
          className={`relative w-full max-w-5xl aspect-video ${themeBg} ${themeText} rounded-lg shadow-2xl overflow-hidden`}
          style={{ maxHeight: '90vh' }}
        >
          {/* Slide Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
            {currentSlideIndex === 0 ? (
              <>
                <h1 className="text-4xl font-bold mb-4 text-center">{current.title}</h1>
                <p className="text-xl opacity-80 text-center">{current.content}</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-6 text-center">{current.title}</h2>
                <div className="text-lg leading-relaxed text-center max-w-2xl">
                  {current.content}
                </div>
              </>
            )}
          </div>

          {/* Slide Number */}
          <div className="absolute bottom-4 left-4 text-sm opacity-60">
            {currentSlideIndex + 1} / {slides.length}
          </div>

          {/* Navigation */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <Button variant="ghost" size="sm" onClick={prevSlide} disabled={currentSlideIndex === 0}>
              السابق
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPresentationMode(false)}>
              خروج
            </Button>
            <Button variant="ghost" size="sm" onClick={nextSlide} disabled={currentSlideIndex === slides.length - 1}>
              التالي
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-primary-bg)] flex items-center justify-center">
            <Presentation className="w-5 h-5 text-[var(--color-brand-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              إنشاء شرائح
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              عرض تعليمي احترافي بتنسيق 16:9
            </p>
          </div>
        </div>

        {/* Source */}
        <SourcePicker
          selectedSource={selectedSource}
          onSourceSelected={setSelectedSource}
          onSourceCleared={() => setSelectedSource(null)}
          label="مصدر العرض"
        />

        {/* Settings */}
        <Card variant="default" className="p-6">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-4">
            إعدادات العرض
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                عنوان العرض
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عرض تعليمي - الدورة الأولى"
                className="mt-1"
                data-testid="slides-title"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                الصف الدراسي
              </label>
              <Select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                options={GRADE_LEVELS}
                className="mt-1"
                data-testid="slides-grade"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                عدد الشرائح
              </label>
              <Input
                type="number"
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                min={3}
                max={30}
                className="mt-1"
                data-testid="slides-count"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                مستوى التفصيل
              </label>
              <Select
                value={detailLevel}
                onChange={(e) => setDetailLevel(e.target.value)}
                options={DETAIL_LEVELS}
                className="mt-1"
                data-testid="slides-detail"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-4 mt-4">
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                checked={includeInteractive}
                onChange={(e) => setIncludeInteractive(e.target.checked)}
                className="rounded"
                data-testid="slides-interactive"
              />
              أسئلة تفاعلية
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                checked={includeExamples}
                onChange={(e) => setIncludeExamples(e.target.checked)}
                className="rounded"
                data-testid="slides-examples"
              />
              أمثلة محلولة
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                className="rounded"
                data-testid="slides-summary"
              />
              ملخص في النهاية
            </label>
          </div>
        </Card>

        {/* Theme & Layout */}
        <Card variant="default" className="p-6">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-4">
            المظهر والتخطيط
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 block">
                السمة
              </label>
              <div className="flex gap-2">
                {THEMES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                        theme === t.value
                          ? 'bg-[var(--color-brand-primary)] text-white'
                          : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]'
                      }`}
                      data-testid={`slides-theme-${t.value}`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                قالب التخطيط
              </label>
              <Select
                value={layoutTemplate}
                onChange={(e) => setLayoutTemplate(e.target.value)}
                options={LAYOUT_TEMPLATES}
                className="mt-1"
                data-testid="slides-layout"
              />
            </div>
          </div>
        </Card>

        {/* Generate */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleGenerate}
          disabled={!selectedSource || isGenerating}
          data-testid="btn-generate-slides"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin ml-2" />
          ) : (
            <Sparkles className="w-5 h-5 ml-2" />
          )}
          {isGenerating ? 'جاري توليد الشرائح...' : 'توليد الشرائح'}
        </Button>

        {/* Slides Preview */}
        {slides.length > 0 && (
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                الشرائح ({slides.length})
              </h3>
              <Button variant="primary" size="sm" onClick={startPresentation} data-testid="btn-present">
                <Play className="w-4 h-4 ml-1" />
                بدء العرض
              </Button>
            </div>

            {/* 16:9 Slide Grid */}
            <div className="grid grid-cols-3 gap-3">
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className="relative group cursor-pointer"
                  data-testid={`slide-thumb-${idx}`}
                >
                  {/* 16:9 Thumbnail */}
                  <div className="aspect-video rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3 flex flex-col overflow-hidden">
                    <p className="text-xs font-bold text-[var(--color-text-primary)] truncate mb-1">
                      {slide.title}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-secondary)] line-clamp-2 flex-1">
                      {slide.content}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
                      {idx + 1}
                    </p>
                  </div>

                  {/* Actions overlay */}
                  <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="w-5 h-5 rounded bg-black/50 text-white flex items-center justify-center text-xs cursor-grab active:cursor-grabbing"
                      title="ترتيب"
                      data-testid={`reorder-slide-${idx}`}
                    >
                      <GripVertical className="w-3 h-3" />
                    </button>
                    <button
                      className="w-5 h-5 rounded bg-red-500/80 text-white flex items-center justify-center text-xs"
                      onClick={() => handleDeleteSlide(slide.id)}
                      title="حذف"
                      data-testid={`delete-slide-${idx}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
