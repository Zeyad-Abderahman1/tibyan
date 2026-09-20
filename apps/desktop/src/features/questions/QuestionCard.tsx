import { useState } from 'react';
import { Card, Badge, Button } from '@tibyan/design-system';
import { MathRichContentViewer } from '@tibyan/design-system';
import type { QuestionDto } from '@tibyan/contracts';
import type { BadgeVariant } from '@tibyan/design-system';
import {
  Bookmark,
  Layers,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface QuestionCardProps {
  question: QuestionDto;
  onEdit: (question: QuestionDto) => void;
  onDelete: (id: string) => void;
}

const difficultyConfig: Record<string, { label: string; color: BadgeVariant }> = {
  EASY: { label: 'سهل', color: 'neutral' },
  MEDIUM: { label: 'متوسط', color: 'primary' },
  HARD: { label: 'صعب', color: 'warning' },
  CHALLENGE: { label: 'تحدي', color: 'danger' },
};

const typeConfig: Record<string, string> = {
  MULTIPLE_CHOICE: 'اختيار من متعدد',
  SHORT_ANSWER: 'إجابة قصيرة',
  ESSAY: 'حل تفصيلي / مقالي',
  TRUE_FALSE: 'صواب / خطأ',
};

export function QuestionCard({ question, onEdit, onDelete }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  const diff = difficultyConfig[question.difficulty] || { label: question.difficulty, color: 'neutral' as BadgeVariant };
  const typeLabel = typeConfig[question.questionType] || question.questionType;

  return (
    <Card
      className="p-5 space-y-4 hover:border-[var(--color-border-default)] transition-all bg-[var(--color-bg-surface)]"
      data-testid={`question-card-${question.id}`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
            {question.code}
          </span>
          <Badge variant={diff.color} size="sm">
            {diff.label}
          </Badge>
          <Badge variant="neutral" size="sm">
            {typeLabel}
          </Badge>
          {question.status !== 'ACTIVE' && (
            <Badge variant="neutral" size="sm" className="opacity-70">
              {question.status === 'DRAFT' ? 'مسودة' : 'مؤرشف'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(question)}
            title="تعديل المسألة"
            data-testid={`edit-question-btn-${question.id}`}
          >
            <Edit2 className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(question.id)}
            title="حذف المسألة"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            data-testid={`delete-question-btn-${question.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Question Body (MathRichContentViewer) */}
      <div className="text-sm text-[var(--color-text-primary)] leading-relaxed" dir="rtl">
        <MathRichContentViewer content={question.body} />
      </div>

      {/* Model Answer (Expandable) */}
      {question.modelAnswer && (
        <div className="pt-2 border-t border-[var(--color-border-subtle)]">
          <button
            type="button"
            onClick={() => setShowAnswer(!showAnswer)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
            data-testid={`toggle-answer-btn-${question.id}`}
          >
            {showAnswer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showAnswer ? 'إخفاء الإجابة النموذجية والحل' : 'عرض الإجابة النموذجية والحل'}</span>
          </button>

          {showAnswer && (
            <div className="mt-3 p-3.5 rounded-lg bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] space-y-2 text-xs">
              <span className="font-semibold text-[var(--color-text-secondary)]">الإجابة النموذجية:</span>
              <div className="p-2 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
                <MathRichContentViewer content={question.modelAnswer} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Curriculum Tags and Source References Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--color-border-subtle)] text-xs">
        {/* Curriculum Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
          {question.curriculumTags && question.curriculumTags.length > 0 ? (
            question.curriculumTags.map((nodeId) => (
              <span
                key={nodeId}
                className="px-2 py-0.5 rounded-full bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-secondary)]"
              >
                عقدة: {nodeId.substring(0, 8)}...
              </span>
            ))
          ) : (
            <span className="text-[11px] text-[var(--color-text-muted)]">غير مصنفة منهجياً</span>
          )}
        </div>

        {/* Source References */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
          {question.sourceReferences && question.sourceReferences.length > 0 ? (
            question.sourceReferences.map((ref) => (
              <span
                key={ref.sourceReferenceId}
                className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-700 dark:text-blue-300"
                title={ref.sourceDocumentTitle}
              >
                {ref.sourceDocumentTitle ? `${ref.sourceDocumentTitle}: ` : ''}
                {ref.referenceLabel || 'مرجع'} {ref.startPage ? `(ص ${ref.startPage})` : ''}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-[var(--color-text-muted)]">بدون مرجع مصدر</span>
          )}
        </div>
      </div>
    </Card>
  );
}
