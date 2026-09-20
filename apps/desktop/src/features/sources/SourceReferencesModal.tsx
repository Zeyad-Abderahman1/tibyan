import React, { useState } from 'react';
import { Modal, Button, Input, Card, Badge } from '@tibyan/design-system';
import type { SourceDocumentDto } from '@tibyan/contracts';
import {
  useSourceReferences,
  useCreateSourceReference,
  useDeleteSourceReference,
} from '../../hooks/usePdfSources.js';
import { Bookmark, Plus, Trash2, ExternalLink, AlertCircle, Loader2, BookOpen } from 'lucide-react';

interface SourceReferencesModalProps {
  document: SourceDocumentDto | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SourceReferencesModal({ document, isOpen, onClose }: SourceReferencesModalProps) {
  const [label, setLabel] = useState('');
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isOpenDocLoading, setIsOpenDocLoading] = useState(false);

  const { data: references, isLoading } = useSourceReferences(document?.id);
  const createMutation = useCreateSourceReference();
  const deleteMutation = useDeleteSourceReference();

  if (!document) return null;

  const handleOpenOfflineDoc = async (page?: number) => {
    if (!window.tibyan?.pdfSources?.openDocument) return;
    setIsOpenDocLoading(true);
    try {
      await window.tibyan.pdfSources.openDocument(document.id, page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'تعذر فتح ملف الـ PDF');
    } finally {
      setIsOpenDocLoading(false);
    }
  };

  const handleAddReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('يرجى تحديد عنوان أو مسمى للمرجع');
      return;
    }
    if (startPage < 1) {
      setError('رقم الصفحة يجب أن يكون 1 على الأقل');
      return;
    }
    if (endPage !== '' && Number(endPage) < startPage) {
      setError('صفحة النهاية يجب أن تكون أكبر من أو تساوي صفحة البداية');
      return;
    }

    setError(null);
    try {
      await createMutation.mutateAsync({
        sourceDocumentId: document.id,
        referenceLabel: label.trim(),
        startPage,
        endPage: endPage === '' ? startPage : Number(endPage),
        notes: notes.trim() || undefined,
      });
      setLabel('');
      setStartPage(1);
      setEndPage('');
      setNotes('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل إضافة المرجع');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المرجع؟')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل حذف المرجع');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[var(--color-brand-primary)]" />
          <span>مراجع وتفاصيل الوثيقة: {document.title}</span>
        </div>
      }
      description={`إجمالي الصفحات: ${document.pageCount} صفحة | التجزئة: ${document.sha256Hash.substring(0, 12)}...`}
      size="xl"
    >
      <div className="space-y-6" dir="rtl" data-testid="source-references-modal">
        {/* Offline Viewer Opener Action */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)]">
          <div className="text-xs">
            <span className="font-semibold text-[var(--color-text-primary)]">عرض المستند الرقمي الكامل:</span>
            <span className="text-[var(--color-text-secondary)] me-2"> فتح الوثيقة في قارئ المستندات دون اتصال</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenOfflineDoc()}
            disabled={isOpenDocLoading}
            data-testid="open-pdf-offline-btn"
          >
            {isOpenDocLoading ? (
              <Loader2 className="w-4 h-4 me-1 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4 me-1" />
            )}
            فتح الوثيقة محلياً
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form: Add New Reference */}
        <Card className="p-4 space-y-3 bg-[var(--color-bg-surface)]">
          <h3 className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <Bookmark className="w-4 h-4 text-[var(--color-brand-primary)]" />
            إضافة مرجع صفحة أو نطاق جديد
          </h3>
          <form onSubmit={handleAddReference} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1 md:col-span-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-primary)]">
                  تسمية المرجع / التمرين <span className="text-red-500">*</span>
                </label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="مثال: تمارين الوحدة الأولى"
                  className="text-xs"
                  data-testid="reference-label-input"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-primary)]">
                  صفحة البداية <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={document.pageCount}
                  value={startPage}
                  onChange={(e) => setStartPage(Number(e.target.value))}
                  className="text-xs"
                  data-testid="reference-start-page-input"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-primary)]">
                  صفحة النهاية (اختياري)
                </label>
                <Input
                  type="number"
                  min={startPage}
                  max={document.pageCount}
                  value={endPage}
                  onChange={(e) => setEndPage(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="نفس الصفحة"
                  className="text-xs"
                  data-testid="reference-end-page-input"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--color-text-primary)]">ملاحظات توجيهية</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات حول هذا الجزء أو المسائل الواردة فيه..."
                className="text-xs"
                data-testid="reference-notes-input"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={createMutation.isPending || !label.trim()}
                data-testid="save-reference-btn"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 me-1" />
                )}
                حفظ المرجع
              </Button>
            </div>
          </form>
        </Card>

        {/* References List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
            المراجع المسجلة على هذه الوثيقة ({references?.length || 0})
          </h3>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-secondary)]">جاري تحميل المراجع...</div>
          ) : !references || references.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-subtle)] rounded-lg">
              لا توجد مراجع صفحات مسجلة لهذه الوثيقة بعد. يمكنك إضافة مراجع لتسهيل ربطها بالمسائل والأسئلة.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pe-1">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] transition-colors"
                  data-testid={`reference-item-${ref.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">{ref.referenceLabel}</span>
                      <Badge variant="neutral" size="sm">
                        {ref.endPage && ref.endPage !== ref.startPage
                          ? `ص ${ref.startPage} - ${ref.endPage}`
                          : `ص ${ref.startPage}`}
                      </Badge>
                    </div>
                    {ref.notes && (
                      <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{ref.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenOfflineDoc(ref.startPage)}
                      title="الانتقال إلى الصفحة في القارئ"
                      className="text-xs"
                      data-testid={`open-page-btn-${ref.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 me-1" />
                      انتقال للصفحة
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(ref.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="حذف المرجع"
                      data-testid={`delete-ref-btn-${ref.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
