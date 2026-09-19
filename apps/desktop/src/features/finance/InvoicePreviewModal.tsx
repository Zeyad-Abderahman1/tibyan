import { useState } from 'react';
import {
  Modal,
  Button,
  Badge,
} from '@tibyan/design-system';
import { useInvoice } from '../../hooks/useFinance.js';
import type { InvoiceDto, InvoiceItemDto } from '@tibyan/contracts';
import { Printer, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import officialLogo from '@tibyan/design-system/assets/tibyan-official-logo.png';
import { useAuthStore } from '../auth/auth.state.js';

export interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: string;
  initialInvoice?: InvoiceDto;
}

export function InvoicePreviewModal({
  isOpen,
  onClose,
  invoiceId,
  initialInvoice,
}: InvoicePreviewModalProps) {
  const teacherName = useAuthStore((s) => s.session?.fullName) || 'الأستاذ أحمد الشريف';
  const { data: fetchedInvoice, isLoading, error } = useInvoice(invoiceId || '');

  const invoice = initialInvoice || fetchedInvoice;

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [exportErrorMsg, setExportErrorMsg] = useState<string | null>(null);

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      if (typeof window !== 'undefined' && window.tibyan?.finance?.printInvoice) {
        await window.tibyan.finance.printInvoice(invoice.id);
      } else {
        window.print();
      }
    } catch (err: any) {
      console.error('Failed to print invoice:', err);
    }
  };

  const handleExportPdf = async () => {
    if (!invoice) return;
    setIsExporting(true);
    setExportSuccessMsg(null);
    setExportErrorMsg(null);

    try {
      if (typeof window !== 'undefined' && window.tibyan?.finance?.exportInvoicePdf) {
        const defaultFilename = `فاتورة_${invoice.studentName || invoice.studentCode}_${invoice.invoiceNumber}.pdf`;
        const res = await window.tibyan.finance.exportInvoicePdf({
          invoiceId: invoice.id,
          defaultFilename,
        });

        if (!res.success) {
          setExportErrorMsg(res.error.message || 'فشل تصدير الفاتورة');
          return;
        }

        if (!res.data.canceled) {
          setExportSuccessMsg(`تم تصدير الفاتورة بنجاح إلى: ${res.data.filePath}`);
        }
      }
    } catch (err: any) {
      setExportErrorMsg(err?.message || 'حدث خطأ أثناء تصدير ملف PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success">خالصة ومسددة</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge variant="warning">مسددة جزئياً</Badge>;
      case 'UNPAID':
      default:
        return <Badge variant="danger">غير مسددة</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="معاينة الفاتورة وكشف الحساب"
      size="lg"
    >
      <div className="space-y-4" data-testid="invoice-preview-modal">
        {isLoading && !invoice ? (
          <div className="py-12 text-center text-xs text-[var(--color-text-secondary)]">
            جاري تحميل بيانات الفاتورة...
          </div>
        ) : error && !invoice ? (
          <div className="p-4 rounded-lg bg-[var(--color-status-danger-bg)] text-xs text-[var(--color-status-danger)]">
            فشل تحميل بيانات الفاتورة
          </div>
        ) : invoice ? (
          <>
            {/* Printable Invoice Sheet Container */}
            <div
              className="p-6 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm space-y-6"
              id="printable-invoice-sheet"
              data-testid="printable-invoice-sheet"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-3">
                  <img
                    src={officialLogo}
                    alt="شعار تِبيان"
                    className="w-12 h-12 object-contain"
                    style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                  />
                  <div>
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">تِبيان • نظام إدارة التعليم الذكي</h2>
                    <p className="text-xs text-[var(--color-text-secondary)]">فاتورة خدمات تعليمية واشتراك حلقة</p>
                    <p className="text-xs font-medium text-[var(--color-brand-primary)]">{teacherName}</p>
                  </div>
                </div>

                <div className="text-left space-y-1">
                  <div className="font-mono text-sm font-bold text-[var(--color-brand-primary)]" dir="ltr" data-testid="invoice-number">
                    {invoice.invoiceNumber}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    تاريخ الإصدار: <span className="font-mono text-[var(--color-text-primary)]">{invoice.issueDate}</span>
                  </div>
                  {invoice.dueDate && (
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      تاريخ الاستحقاق: <span className="font-mono text-[var(--color-text-primary)]">{invoice.dueDate}</span>
                    </div>
                  )}
                  <div className="pt-1">{getStatusBadge(invoice.status)}</div>
                </div>
              </div>

              {/* Student Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-[var(--color-bg-surface-subtle)] text-xs">
                <div>
                  <span className="text-[var(--color-text-secondary)] block">اسم الطالب:</span>
                  <span className="font-bold text-[var(--color-text-primary)] text-sm" data-testid="invoice-student-name">
                    {invoice.studentName || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-text-secondary)] block">كود الطالب:</span>
                  <span className="font-mono font-bold text-[var(--color-brand-primary)]" dir="ltr">
                    {invoice.studentCode || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-text-secondary)] block">المجموعة / الحلقة:</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {invoice.groupName || 'حساب عام'}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] bg-[var(--color-bg-surface-subtle)]">
                      <th className="py-2.5 px-3 font-semibold">#</th>
                      <th className="py-2.5 px-3 font-semibold">بيان الرسوم / الخدمة</th>
                      <th className="py-2.5 px-3 font-semibold text-center">الكمية</th>
                      <th className="py-2.5 px-3 font-semibold text-left">سعر الوحدة</th>
                      <th className="py-2.5 px-3 font-semibold text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    {invoice.items.map((item: InvoiceItemDto, idx: number) => (
                      <tr key={item.id || idx}>
                        <td className="py-2.5 px-3 text-[var(--color-text-muted)] font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-[var(--color-text-primary)]">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-left font-mono">
                          {(item.unitPriceCents / 100).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-semibold">
                          {(item.amountCents / 100).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals Breakdown */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-[var(--color-border-subtle)]">
                <div className="text-xs text-[var(--color-text-secondary)] max-w-sm">
                  {invoice.notes && (
                    <div>
                      <span className="font-semibold block mb-0.5">ملاحظات:</span>
                      <p>{invoice.notes}</p>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-64 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono">{(invoice.subtotalCents / 100).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
                  </div>
                  {invoice.discountCents > 0 && (
                    <div className="flex items-center justify-between text-[var(--color-status-success)] font-medium">
                      <span>الخصم المطبق:</span>
                      <span className="font-mono">- {(invoice.discountCents / 100).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-bold text-sm text-[var(--color-text-primary)] pt-1 border-t border-[var(--color-border-subtle)]">
                    <span>صافي الفاتورة:</span>
                    <span className="font-mono text-base text-[var(--color-brand-primary)]">
                      {(invoice.totalCents / 100).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--color-status-success)] text-xs">
                    <span>المبلغ المسدد:</span>
                    <span className="font-mono">{(invoice.paidCents / 100).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-xs text-[var(--color-status-danger)] pt-1 border-t border-[var(--color-border-subtle)]">
                    <span>المتبقي المستحق:</span>
                    <span className="font-mono text-sm">
                      {(invoice.remainingCents / 100).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Messages */}
            {exportSuccessMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-status-success-bg)] border border-[var(--color-status-success)] text-xs text-[var(--color-status-success)]">
                <CheckCircle2 size={16} />
                <span>{exportSuccessMsg}</span>
              </div>
            )}

            {exportErrorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-status-danger-bg)] border border-[var(--color-status-danger)] text-xs text-[var(--color-status-danger)]">
                <AlertCircle size={16} />
                <span>{exportErrorMsg}</span>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
              <Button
                variant="ghost"
                onClick={onClose}
                data-testid="close-invoice-preview-btn"
              >
                إغلاق
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={handleExportPdf}
                  loading={isExporting}
                  disabled={isExporting}
                  data-testid="export-invoice-pdf-btn"
                >
                  <Download size={15} className="me-1.5" />
                  تصدير ملف PDF
                </Button>

                <Button
                  variant="primary"
                  onClick={handlePrint}
                  data-testid="print-invoice-btn"
                >
                  <Printer size={15} className="me-1.5" />
                  طباعة الفاتورة
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
