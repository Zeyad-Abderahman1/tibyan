import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select } from '@tibyan/design-system';
import { Presentation, Loader2, Sparkles, Sun, Moon, Palette } from 'lucide-react';
import type { SlidesGenerationRequest } from '@tibyan/contracts';
import { SourcePicker, type SourceSelection } from './SourcePicker.js';

const grades = [{ value: 'SEC_1', label: 'الصف الأول الثانوي' }, { value: 'SEC_2', label: 'الصف الثاني الثانوي' }, { value: 'SEC_3', label: 'الصف الثالث الثانوي' }];
const details = [{ value: 'BRIEF', label: 'مختصر' }, { value: 'MODERATE', label: 'متوسط' }, { value: 'DETAILED', label: 'تفصيلي' }];
const layouts = [
  { value: 'SIMPLE_EDUCATIONAL', label: 'تعليمي بسيط' }, { value: 'EXPLAIN_EXAMPLE', label: 'شرح + مثال' },
  { value: 'QUICK_REVIEW', label: 'مراجعة سريعة' }, { value: 'VISUAL_EXPLAIN', label: 'شرح بصري' },
];
const themes = [{ value: 'LIGHT', label: 'فاتح', icon: Sun }, { value: 'DARK', label: 'داكن', icon: Moon }, { value: 'TIBYAN', label: 'تبيان', icon: Palette }];

export function SlidesToolUI() {
  const navigate = useNavigate();
  const [source, setSource] = useState<SourceSelection | null>(null);
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState<SlidesGenerationRequest['gradeLevel']>('SEC_1');
  const [slideCount, setSlideCount] = useState(8);
  const [detailLevel, setDetailLevel] = useState<SlidesGenerationRequest['detailLevel']>('MODERATE');
  const [includeInteractive, setIncludeInteractive] = useState(false);
  const [includeExamples, setIncludeExamples] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [theme, setTheme] = useState<SlidesGenerationRequest['theme']>('LIGHT');
  const [layoutTemplate, setLayoutTemplate] = useState<SlidesGenerationRequest['layoutTemplate']>('SIMPLE_EDUCATIONAL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!source?.id) return;
    setBusy(true);
    setError(null);
    try {
      const result = await window.tibyan.ai.generateSlides({
        sourceDocumentId: source.id, title: title.trim() || `عرض تعليمي - ${source.title}`,
        gradeLevel, slideCount, detailLevel, includeInteractive, includeExamples, includeSummary, theme, layoutTemplate,
      });
      if (!result.success) throw new Error(result.error.message);
      navigate(`/slides?deck=${encodeURIComponent(result.data.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إنشاء العرض');
    } finally {
      setBusy(false);
    }
  };

  return <div className="h-full overflow-y-auto p-6" dir="rtl">
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3"><Presentation className="w-7 h-7 text-[var(--color-brand-primary)]" /><div><h2 className="text-xl font-bold">إنشاء شرائح</h2><p className="text-sm text-[var(--color-text-secondary)]">عرض تعليمي بتنسيق 16:9</p></div></div>
      <SourcePicker selectedSource={source} onSourceSelected={setSource} onSourceCleared={() => setSource(null)} label="مصدر العرض" />
      <Card variant="default" className="p-6 space-y-4">
        <h3 className="font-bold">إعدادات العرض</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">عنوان العرض<Input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1" data-testid="slides-title" /></label>
          <label className="text-sm">الصف الدراسي<Select value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value as SlidesGenerationRequest['gradeLevel'])} options={grades} className="mt-1" data-testid="slides-grade" /></label>
          <label className="text-sm">عدد الشرائح<Input type="number" min={1} max={50} value={slideCount} onChange={(event) => setSlideCount(Number(event.target.value))} className="mt-1" data-testid="slides-count" /></label>
          <label className="text-sm">مستوى التفصيل<Select value={detailLevel} onChange={(event) => setDetailLevel(event.target.value as SlidesGenerationRequest['detailLevel'])} options={details} className="mt-1" data-testid="slides-detail" /></label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label><input type="checkbox" checked={includeInteractive} onChange={(event) => setIncludeInteractive(event.target.checked)} data-testid="slides-interactive" /> أسئلة تفاعلية</label>
          <label><input type="checkbox" checked={includeExamples} onChange={(event) => setIncludeExamples(event.target.checked)} data-testid="slides-examples" /> أمثلة محلولة</label>
          <label><input type="checkbox" checked={includeSummary} onChange={(event) => setIncludeSummary(event.target.checked)} data-testid="slides-summary" /> ملخص</label>
        </div>
      </Card>
      <Card variant="default" className="p-6 space-y-4">
        <h3 className="font-bold">المظهر والتخطيط</h3>
        <div className="flex gap-2">{themes.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => setTheme(value as SlidesGenerationRequest['theme'])} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${theme === value ? 'bg-[var(--color-brand-primary)] text-white' : 'bg-[var(--color-bg-elevated)]'}`} data-testid={`slides-theme-${value}`}><Icon className="w-4 h-4" />{label}</button>)}</div>
        <label className="text-sm">قالب التخطيط<Select value={layoutTemplate} onChange={(event) => setLayoutTemplate(event.target.value as SlidesGenerationRequest['layoutTemplate'])} options={layouts} className="mt-1" data-testid="slides-layout" /></label>
      </Card>
      {error && <p role="alert" className="text-sm text-[var(--color-status-danger)]">{error}</p>}
      <Button variant="primary" size="lg" className="w-full" onClick={generate} disabled={!source?.id || busy || slideCount < 1 || slideCount > 50} data-testid="btn-generate-slides">{busy ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Sparkles className="w-5 h-5 ml-2" />}{busy ? 'جاري توليد الشرائح وحفظها...' : 'توليد العرض وفتحه'}</Button>
    </div>
  </div>;
}
