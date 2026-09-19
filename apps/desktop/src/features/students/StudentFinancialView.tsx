import { useState } from 'react';
import {
  CreditCard,
  Plus,
  Percent,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
} from '@tibyan/design-system';
import type { FinancialStatus } from '@tibyan/contracts';
import {
  useStudentFinancialSummary,
  useStudentPayments,
  useStudentInvoices,
  useCreateInvoice,
} from '../../hooks/useFinance.js';
import { AddPaymentModal } from '../finance/AddPaymentModal.js';
import { ApplyDiscountModal } from '../finance/ApplyDiscountModal.js';
import { InvoicePreviewModal } from '../finance/InvoicePreviewModal.js';

export interface StudentFinancialViewProps {
  studentId: string;
  studentName: string;
  canWrite?: boolean;
}

const STATUS_BADGES: Record<
  FinancialStatus,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info'; icon: any }
> = {
  PAID: { label: 'مسدد بالكامل', variant: 'success', icon: CheckCircle2 },
  PARTIALLY_PAID: { label: 'مسدد جزئياً', variant: 'info', icon: Clock },
  UNPAID: { label: 'غير مسدد', variant: 'warning', icon: Clock },
  OVERDUE: { label: 'متأخرات مستحقة', variant: 'danger', icon: AlertCircle },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'نقداً',
  VODAFONE_CASH: 'فودافون كاش',
  INSTAPAY: 'إنستاباي',
  BANK_TRANSFER: 'تحويل بنكي',
  OTHER: 'أخرى',
};

export function StudentFinancialView({
  studentId,
  studentName,
  canWrite = true,
}: StudentFinancialViewProps) {
  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } =
    useStudentFinancialSummary(studentId);
  const { data: payments = [], isLoading: isPaymentsLoading, refetch: refetchPayments } =
    useStudentPayments(studentId);
  const { data: invoices = [], isLoading: isInvoicesLoading, refetch: refetchInvoices } =
    useStudentInvoices(studentId);

  const createInvoiceMutation = useCreateInvoice();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceErrorMessage, setInvoiceErrorMessage] = useState<string | null>(null);

  const formatCurrency = (cents: number): string => {
    const egp = cents / 100;
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 2,
    }).format(egp);
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'medium',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const primarySub = summary?.subscriptions?.[0];

  const handleGenerateInvoice = async () => {
    if (!summary) return;
    setInvoiceErrorMessage(null);
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);

    try {
      const unitPriceCents =
        summary.remainingBalanceCents > 0
          ? summary.remainingBalanceCents
          : summary.netPayableCents > 0
            ? summary.netPayableCents
            : 10000;

      const res = await createInvoiceMutation.mutateAsync({
        studentId,
        groupId: primarySub?.groupId,
        issueDate: today,
        periodMonth: currentMonth,
        items: [
          {
            itemType: 'MONTHLY_SUBSCRIPTION',
            description: `رسوم اشتراك شهرية - ${primarySub?.groupName || 'المجموعة الدراسية'}`,
            quantity: 1,
            unitPriceCents,
          },
        ],
        discountCents: 0,
        notes: `فاتورة حساب الطالب: ${studentName}`,
      });

      if (res.success) {
        setSelectedInvoiceId(res.data.id);
        refetchInvoices();
        refetchSummary();
      } else {
        setInvoiceErrorMessage(res.error.message || 'فشل إصدار الفاتورة');
      }
    } catch (err: any) {
      setInvoiceErrorMessage(err?.message || 'حدث خطأ غير متوقع أثناء إنشاء الفاتورة');
    }
  };

  const handleActionSuccess = () => {
    refetchSummary();
    refetchPayments();
    refetchInvoices();
  };

  const statusInfo = summary ? STATUS_BADGES[summary.status] : STATUS_BADGES.UNPAID;
  const StatusIcon = statusInfo.icon;

  const studentProp = {
    id: studentId,
    fullName: summary?.studentName || studentName,
    studentCode: summary?.studentCode || '',
  };

  return (
    <div className="space-y-4" data-testid="student-financial-view">
      {/* Header and Quick Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-[var(--color-brand-primary)]" />
          <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
            السجل المالي والاشتراكات
          </h2>
          {summary && (
            <Badge variant={statusInfo.variant} size="sm" className="gap-1">
              <StatusIcon size={12} />
              <span>{statusInfo.label}</span>
            </Badge>
          )}
        </div>

        {canWrite && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPaymentModalOpen(true)}
              data-testid="profile-record-payment-btn"
            >
              <Plus size={14} className="me-1" />
              تسجيل دفعة
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDiscountModalOpen(true)}
              data-testid="profile-apply-discount-btn"
            >
              <Percent size={14} className="me-1" />
              تطبيق خصم
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateInvoice}
              loading={createInvoiceMutation.isPending}
              data-testid="profile-generate-invoice-btn"
            >
              <FileText size={14} className="me-1" />
              إصدار فاتورة
            </Button>
          </div>
        )}
      </div>

      {invoiceErrorMessage && (
        <div
          className="flex items-center gap-2 p-2.5 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-[var(--radius-md)] text-xs"
          role="alert"
        >
          <AlertCircle size={14} className="shrink-0" />
          <span>{invoiceErrorMessage}</span>
        </div>
      )}

      {/* Financial KPIs */}
      {isSummaryLoading ? (
        <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
          جاري تحميل الحساب المالي...
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5" data-testid="student-finance-kpis">
          <div className="p-3 bg-[var(--color-bg-surface-subtle)] rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] space-y-1">
            <span className="text-[11px] text-[var(--color-text-muted)]">المبلغ المستحق</span>
            <div className="text-sm font-bold text-[var(--color-text-primary)]" dir="ltr">
              {formatCurrency(summary.netPayableCents)}
            </div>
          </div>
          <div className="p-3 bg-[var(--color-bg-surface-subtle)] rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] space-y-1">
            <span className="text-[11px] text-[var(--color-text-muted)]">المبلغ المسدد</span>
            <div className="text-sm font-bold text-[var(--color-status-success)]" dir="ltr">
              {formatCurrency(summary.totalPaidCents)}
            </div>
          </div>
          <div className="p-3 bg-[var(--color-bg-surface-subtle)] rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] space-y-1">
            <span className="text-[11px] text-[var(--color-text-muted)]">الرصيد المتبقي</span>
            <div
              className={`text-sm font-bold ${
                summary.remainingBalanceCents > 0
                  ? 'text-[var(--color-status-danger)]'
                  : 'text-[var(--color-text-primary)]'
              }`}
              dir="ltr"
            >
              {formatCurrency(summary.remainingBalanceCents)}
            </div>
          </div>
          <div className="p-3 bg-[var(--color-bg-surface-subtle)] rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] space-y-1">
            <span className="text-[11px] text-[var(--color-text-muted)]">إجمالي الخصومات</span>
            <div className="text-sm font-bold text-[var(--color-brand-primary)]" dir="ltr">
              {formatCurrency(summary.totalDiscountsCents)}
            </div>
          </div>
        </div>
      ) : null}

      {/* Payments History */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
            سجل المدفوعات ({payments.length})
          </h3>
        </div>

        {isPaymentsLoading ? (
          <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
            جاري تحميل المدفوعات...
          </div>
        ) : payments.length === 0 ? (
          <Card variant="subtle" className="p-5 text-center text-xs text-[var(--color-text-muted)]">
            لم يتم تسجيل أي مدفوعات لهذا الطالب حتى الآن.
          </Card>
        ) : (
          <div className="space-y-1.5" data-testid="student-payments-list">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-[var(--color-brand-primary)]" dir="ltr">
                    {p.receiptNumber}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                  </Badge>
                  {p.notes && (
                    <span className="text-[var(--color-text-secondary)] truncate max-w-xs">
                      {p.notes}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <time className="text-[11px] text-[var(--color-text-muted)]" dir="ltr">
                    {formatDate(p.paymentDate)}
                  </time>
                  <span className="font-bold text-[var(--color-status-success)] text-sm" dir="ltr">
                    {formatCurrency(p.amountCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices List */}
      <div className="space-y-2 pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
            الفواتير الصادرة ({invoices.length})
          </h3>
        </div>

        {isInvoicesLoading ? (
          <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
            جاري تحميل الفواتير...
          </div>
        ) : invoices.length === 0 ? (
          <Card variant="subtle" className="p-5 text-center text-xs text-[var(--color-text-muted)]">
            لم يتم إصدار فواتير لهذا الطالب حتى الآن.
          </Card>
        ) : (
          <div className="space-y-1.5" data-testid="student-invoices-list">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-2.5 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[var(--color-brand-primary)]" dir="ltr">
                    {inv.invoiceNumber}
                  </span>
                  <time className="text-[11px] text-[var(--color-text-muted)]" dir="ltr">
                    {formatDate(inv.issueDate)}
                  </time>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[var(--color-text-primary)]" dir="ltr">
                    {formatCurrency(inv.totalCents)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    data-testid={`view-invoice-${inv.id}`}
                  >
                    <ExternalLink size={14} className="me-1" />
                    عرض وطباعة
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isPaymentModalOpen && (
        <AddPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handleActionSuccess}
          student={studentProp}
          remainingBalanceCents={summary?.remainingBalanceCents ?? 0}
        />
      )}

      {isDiscountModalOpen && (
        <ApplyDiscountModal
          isOpen={isDiscountModalOpen}
          onClose={() => setIsDiscountModalOpen(false)}
          onSuccess={handleActionSuccess}
          student={studentProp}
          currentChargesCents={summary?.totalChargesCents ?? 0}
        />
      )}

      {selectedInvoiceId && (
        <InvoicePreviewModal
          isOpen={!!selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          invoiceId={selectedInvoiceId}
        />
      )}
    </div>
  );
}
