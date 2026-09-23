import { useState } from 'react';
import { Card, Button, Badge } from '@tibyan/design-system';
import { StickyNote, Loader2, Download, Save } from 'lucide-react';
import { useCurriculumLibraryList } from '../../hooks/useCurriculumLibrary.js';

interface NotesGeneratorProps {
  onGenerate: (sourceId: string, scope?: string) => Promise<void>;
  generatedContent: string | null;
  isGenerating: boolean;
}

export function NotesGenerator({ onGenerate, generatedContent, isGenerating }: NotesGeneratorProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [scope, setScope] = useState('');
  const { data: sources } = useCurriculumLibraryList();

  const handleGenerate = async () => {
    if (!selectedSourceId) return;
    await onGenerate(selectedSourceId, scope || undefined);
  };

  return (
    <Card variant="default" className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <StickyNote className="w-5 h-5 text-[var(--color-brand-primary)]" />
        <h3 className="text-base font-bold text-[var(--color-text-primary)]">
          إنشاء مذكرة
        </h3>
      </div>

      <div>
        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
          اختر المصدر
        </label>
        <select
          value={selectedSourceId}
          onChange={(e) => setSelectedSourceId(e.target.value)}
          className="w-full mt-1 p-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-sm text-[var(--color-text-primary)]"
        >
          <option value="">اختر منهجاً...</option>
          {(sources || []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} {s.gradeLevel ? `(${s.gradeLevel})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
          النطاق (اختياري)
        </label>
        <input
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder="مثال: الفصل الثالث، الوحدة الثانية..."
          className="w-full mt-1 p-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-sm text-[var(--color-text-primary)]"
        />
      </div>

      <Button
        variant="primary"
        onClick={handleGenerate}
        disabled={!selectedSourceId || isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin ml-1" />
        ) : (
          <StickyNote className="w-4 h-4 ml-1" />
        )}
        {isGenerating ? 'جاري التوليد...' : 'توليد المذكرة'}
      </Button>

      {generatedContent && (
        <div className="mt-4 p-3 bg-[var(--color-bg-elevated)] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="success" size="sm">تم التوليد</Badge>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm">
                <Save className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap max-h-64 overflow-y-auto">
            {generatedContent}
          </div>
        </div>
      )}
    </Card>
  );
}
