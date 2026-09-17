import React, { useState } from 'react';
import { Plus, MessageSquare, AlertCircle } from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  Select,
} from '@tibyan/design-system';
import type { StudentNoteTag, StudentNoteDto } from '@tibyan/contracts';
import { useStudentNotes, useAddStudentNote } from '../../hooks/useStudents.js';

export interface StudentNotesViewProps {
  studentId: string;
  canWrite?: boolean;
}

const TAG_LABELS: Record<StudentNoteTag, string> = {
  GENERAL: 'عامة',
  ACADEMIC_WEAKNESS: 'ضعف أكاديمي',
  EXCELLENT: 'تميز وتفوق',
  BEHAVIOR: 'ملاحظة سلوكية',
  NEEDS_FOLLOW_UP: 'تتطلب متابعة',
};

const TAG_VARIANTS: Record<StudentNoteTag, 'neutral' | 'warning' | 'success' | 'info' | 'danger'> = {
  GENERAL: 'neutral',
  ACADEMIC_WEAKNESS: 'warning',
  EXCELLENT: 'success',
  BEHAVIOR: 'info',
  NEEDS_FOLLOW_UP: 'danger',
};

const TAG_OPTIONS = [
  { value: 'GENERAL', label: 'ملاحظة عامة' },
  { value: 'ACADEMIC_WEAKNESS', label: 'ضعف أكاديمي' },
  { value: 'EXCELLENT', label: 'تميز وتفوق' },
  { value: 'BEHAVIOR', label: 'ملاحظة سلوكية' },
  { value: 'NEEDS_FOLLOW_UP', label: 'تتطلب متابعة عاجلة' },
];

export function StudentNotesView({ studentId, canWrite = true }: StudentNotesViewProps) {
  const { data: notes = [], isLoading, error } = useStudentNotes(studentId);
  const addNoteMutation = useAddStudentNote();

  const [noteText, setNoteText] = useState('');
  const [tag, setTag] = useState<StudentNoteTag>('GENERAL');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmed = noteText.trim();
    if (!trimmed) {
      setFormError('يرجى كتابة نص الملاحظة');
      return;
    }

    try {
      const res = await addNoteMutation.mutateAsync({
        studentId,
        noteText: trimmed,
        tag,
      });

      if (res.success) {
        setNoteText('');
        setTag('GENERAL');
      } else {
        setFormError(res.error.message || 'فشل إضافة الملاحظة');
      }
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ غير متوقع أثناء حفظ الملاحظة');
    }
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4" data-testid="student-notes-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-[var(--color-brand-primary)]" />
          <h2 className="text-sm font-bold text-[var(--color-text-primary)]">سجل الملاحظات والمتابعة</h2>
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">
          {notes.length} {notes.length === 1 ? 'ملاحظة' : 'ملاحظات'}
        </span>
      </div>

      {/* Add Note Form */}
      {canWrite ? (
        <form
          onSubmit={handleSubmitNote}
          className="p-3.5 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] space-y-3"
          data-testid="add-note-form"
        >
          {formError && (
            <div
              className="flex items-center gap-2 p-2.5 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-[var(--radius-md)] text-xs"
              role="alert"
              data-testid="note-form-error"
            >
              <AlertCircle size={14} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <textarea
              rows={2}
              placeholder="اكتب ملاحظة جديدة عن مستوى الطالب الأكاديمي أو السلوكي..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              disabled={addNoteMutation.isPending}
              className="w-full bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-primary)] text-sm rounded-[var(--radius-md)] px-3 py-2 border border-[var(--color-border-subtle)] focus-visible:outline-none focus-visible:border-[var(--color-brand-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] resize-none"
              data-testid="note-text-input"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="w-48">
              <Select
                options={TAG_OPTIONS}
                value={tag}
                onChange={(e) => setTag(e.target.value as StudentNoteTag)}
                disabled={addNoteMutation.isPending}
                data-testid="note-tag-select"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={addNoteMutation.isPending}
              disabled={addNoteMutation.isPending || !noteText.trim()}
              data-testid="submit-note-btn"
            >
              <Plus size={14} className="me-1" />
              إضافة الملاحظة
            </Button>
          </div>
        </form>
      ) : (
        <div
          className="p-3 bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-muted)] text-xs rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] text-center"
          data-testid="notes-read-only-banner"
        >
          الملاحظات للقراءة فقط. أنت لا تملك صلاحية كتابة أو إضافة ملاحظات.
        </div>
      )}

      {/* Loading & Error States */}
      {isLoading && (
        <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
          جاري تحميل الملاحظات...
        </div>
      )}

      {error && (
        <div className="p-3 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-[var(--radius-md)] text-xs">
          تعذر تحميل سجل الملاحظات.
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && notes.length === 0 && (
        <Card variant="subtle" className="p-6 text-center text-[var(--color-text-muted)]" data-testid="notes-empty-state">
          <p className="text-xs">لا توجد ملاحظات مسجلة لهذا الطالب حتى الآن.</p>
        </Card>
      )}

      {/* Notes Stream */}
      {!isLoading && notes.length > 0 && (
        <div className="space-y-2.5" data-testid="notes-list">
          {notes.map((note: StudentNoteDto) => (
            <div
              key={note.id}
              className="p-3 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] space-y-1.5 transition-colors hover:border-[var(--color-brand-primary)]"
              data-testid={`note-item-${note.id}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={TAG_VARIANTS[note.tag]} size="sm" data-testid={`note-tag-badge-${note.tag}`}>
                    {TAG_LABELS[note.tag]}
                  </Badge>
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {note.authorNameSnapshot}
                  </span>
                </div>
                <time className="text-[11px] text-[var(--color-text-muted)]" dir="ltr">
                  {formatDate(note.createdAt)}
                </time>
              </div>

              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
                {note.noteText}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
