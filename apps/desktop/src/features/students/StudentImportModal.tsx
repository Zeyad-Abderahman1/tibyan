import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  Modal,
  Button,
  Badge,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@tibyan/design-system';
import type {
  StudentImportPreviewDto,
  StudentImportRowDto,
  StudentImportResultDto,
} from '@tibyan/contracts';

export interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_BADGES: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  READY: { label: 'جاهز للإضافة', variant: 'success' },
  DUPLICATE: { label: 'مكرر', variant: 'warning' },
  NEEDS_REVIEW: { label: 'يحتاج مراجعة', variant: 'warning' },
  MISSING_DATA: { label: 'بيانات ناقصة', variant: 'danger' },
  UNKNOWN_VALUE: { label: 'قيمة غير معروفة', variant: 'danger' },
  INVALID_PHONE: { label: 'رقم هاتف غير صالح', variant: 'danger' },
};

const GRADE_NAMES: Record<string, string> = {
  PREP_1: 'أولى إعدادي',
  PREP_2: 'تانية إعدادي',
  PREP_3: 'تالتة إعدادي',
  SEC_1: 'أولى ثانوي',
  SEC_2: 'تانية ثانوي',
  SEC_3: 'تالتة ثانوي',
};

const SYSTEM_NAMES: Record<string, string> = {
  GENERAL: 'التعليم العام',
  EGYPTIAN_BACCALAUREATE: 'البكالوريا المصرية',
};

const TRACK_NAMES: Record<string, string> = {
  ARABIC: 'عربي',
  LANG_ENGLISH: 'لغات',
};

export function StudentImportModal({ isOpen, onClose, onSuccess }: StudentImportModalProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<StudentImportPreviewDto | null>(null);
  const [rows, setRows] = useState<StudentImportRowDto[]>([]);
  const [result, setResult] = useState<StudentImportResultDto | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (selectedFile: File) => {
    setError(null);
    setResult(null);
    setIsParsing(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1] || '';
          const res = await window.tibyan.students.importPreview({
            fileContentBase64: base64,
            fileName: selectedFile.name,
          });

          if (res.success) {
            setPreview(res.data);
            setRows(res.data.rows);
          } else {
            setError(res.error.message || 'تعذر تحليل الملف');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'خطأ غير متوقع أثناء معالجة الملف');
        } finally {
          setIsParsing(false);
        }
      };

      reader.onerror = () => {
        setError('فشل في قراءة محتوى الملف');
        setIsParsing(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في معالجة الملف');
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]!;
      handleFileChange(droppedFile);
    }
  };

  const toggleRowSelected = (index: number) => {
    setRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, selected: !row.selected } : row))
    );
  };

  const toggleSelectAll = () => {
    const allSelected = rows.every((r) => r.selected);
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const selectedRows = rows.filter((r) => r.selected);

  const handleExecuteImport = async () => {
    if (selectedRows.length === 0) return;
    setIsExecuting(true);
    setError(null);

    try {
      const res = await window.tibyan.students.importExecute({ approvedRows: selectedRows });
      if (res.success) {
        setResult(res.data);
        onSuccess();
      } else {
        setError(res.error.message || 'تعذر تنفيذ الاستيراد');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ أثناء تنفيذ الاستيراد');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setRows([]);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="استيراد بيانات الطلاب من ملف (Excel / CSV / PDF)"
      size="xl"
    >
      <div className="space-y-4 text-sm" dir="rtl">
        {/* Error Alert */}
        {error && (
          <div
            className="p-3 bg-[var(--color-bg-danger-subtle)] border border-[var(--color-border-danger)] text-[var(--color-text-danger)] rounded flex items-center gap-2"
            data-testid="import-error-banner"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span className="text-xs">{error}</span>
          </div>
        )}

        {/* Success Result Banner */}
        {result && (
          <Card
            variant="default"
            className="p-4 bg-[var(--color-bg-success-subtle)] border border-[var(--color-border-success)] space-y-2"
            data-testid="import-success-banner"
          >
            <div className="flex items-center gap-2 text-[var(--color-text-success)] font-semibold">
              <CheckCircle2 size={20} />
              <span>اكتملت عملية الاستيراد بنجاح!</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--color-text-primary)]">
              <div>
                تمت إضافة: <strong className="text-green-600">{result.importedCount}</strong> طالب
              </div>
              {result.skippedCount > 0 && (
                <div>
                  تم تخطي (مكرر): <strong className="text-amber-600">{result.skippedCount}</strong>
                </div>
              )}
              {result.failedCount > 0 && (
                <div>
                  فشل: <strong className="text-red-600">{result.failedCount}</strong>
                </div>
              )}
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={handleReset}>
                استيراد ملف آخر
              </Button>
              <Button size="sm" variant="primary" onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </Card>
        )}

        {/* File Upload Dropzone (if no preview yet) */}
        {!preview && !result && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[var(--color-border-subtle)] hover:border-[var(--color-brand-primary)] bg-[var(--color-bg-surface-elevated)] p-8 rounded-lg text-center cursor-pointer transition-colors space-y-3"
            data-testid="import-dropzone"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0]!);
                }
              }}
            />
            <div className="w-12 h-12 rounded-full bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)] flex items-center justify-center mx-auto">
              {isParsing ? (
                <RefreshCw size={24} className="animate-spin" />
              ) : (
                <UploadCloud size={24} />
              )}
            </div>
            <div>
              <div className="font-bold text-[var(--color-text-primary)]">
                {isParsing
                  ? 'جاري فحص وتحليل الملف...'
                  : 'اسحب الملف وأفلته هنا، أو اضغط للتصفح'}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                الصيغ المدعومة: Excel (.xlsx, .xls) و CSV و جداول PDF القابلة للقراءة
              </div>
            </div>
          </div>
        )}

        {/* Preview Summary Cards & Table */}
        {preview && !result && (
          <div className="space-y-3">
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-[var(--color-brand-primary)]" />
                <span className="font-medium text-[var(--color-text-primary)]">
                  {preview.fileName}
                </span>
                <Badge variant="neutral">{preview.totalRows} سجل</Badge>
              </div>
              <Button size="sm" variant="ghost" onClick={handleReset}>
                تغيير الملف
              </Button>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">جاهز للإضافة</span>
                <span className="font-bold text-green-600">{preview.validCount}</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">مكرر</span>
                <span className="font-bold text-amber-600">{preview.duplicateCount}</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">يحتاج مراجعة</span>
                <span className="font-bold text-yellow-600">{preview.warningCount}</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">بيانات ناقصة/غير صالحة</span>
                <span className="font-bold text-red-600">{preview.invalidCount}</span>
              </div>
            </div>

            {/* Table */}
            <div className="max-h-72 overflow-y-auto border border-[var(--color-border-subtle)] rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && rows.every((r) => r.selected)}
                        onChange={toggleSelectAll}
                        className="rounded cursor-pointer"
                        title="تحديد الكل"
                      />
                    </TableHead>
                    <TableHead>اسم الطالب</TableHead>
                    <TableHead>الصف الدراسي</TableHead>
                    <TableHead>النظام</TableHead>
                    <TableHead>المسار</TableHead>
                    <TableHead>هاتف ولي الأمر</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>ملاحظة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => {
                    const badgeInfo = STATUS_BADGES[row.status] || {
                      label: row.status,
                      variant: 'neutral' as const,
                    };
                    return (
                      <TableRow
                        key={idx}
                        className={!row.selected ? 'opacity-50 bg-[var(--color-bg-surface-dim)]' : ''}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRowSelected(idx)}
                            className="rounded cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row.fullName || '-'}</TableCell>
                        <TableCell>
                          {row.gradeLevel ? GRADE_NAMES[row.gradeLevel] || row.gradeLevel : '-'}
                        </TableCell>
                        <TableCell>
                          {row.educationSystem
                            ? SYSTEM_NAMES[row.educationSystem] || row.educationSystem
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {row.languageTrack
                            ? TRACK_NAMES[row.languageTrack] || row.languageTrack
                            : '-'}
                        </TableCell>
                        <TableCell dir="ltr" className="text-end">
                          {row.guardianPhone || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-[var(--color-text-secondary)]">
                          {row.statusMessageAr || row.notes || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)]">
              <div className="text-xs text-[var(--color-text-secondary)]">
                تم تحديد <strong>{selectedRows.length}</strong> من أصل {rows.length} طالب
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={onClose} disabled={isExecuting}>
                  إلغاء
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteImport}
                  disabled={selectedRows.length === 0 || isExecuting}
                  data-testid="confirm-import-btn"
                >
                  {isExecuting ? (
                    <RefreshCw size={14} className="animate-spin me-1.5" />
                  ) : (
                    <Check size={14} className="me-1.5" />
                  )}
                  استيراد الطلاب المحددين ({selectedRows.length})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
