import { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
} from '@tibyan/design-system';
import {
  useAllFinancialSummaries,
  useOverallFinanceKpi,
} from '../../hooks/useFinance.js';
import { useGroupsList } from '../../hooks/useGroups.js';
import { AddPaymentModal } from './AddPaymentModal.js';
import { ApplyDiscountModal } from './ApplyDiscountModal.js';
import { InvoicePreviewModal } from './InvoicePreviewModal.js';
import type { StudentFinancialSummaryDto, FinancialStatus, InvoiceDto } from '@tibyan/contracts';
import {
  CreditCard,
  Tag,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
} from 'lucide-react';

export function FinancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Active Modals state
  const [paymentStudent, setPaymentStudent] = useState<StudentFinancialSummaryDto | null>(null);
  const [discountStudent, setDiscountStudent] = useState<StudentFinancialSummaryDto | null>(null);
  const [invoicePreviewData, setInvoicePreviewData] = useState<{ student: StudentFinancialSummaryDto; invoice?: InvoiceDto } | null>(null);

  const { data: kpi } = useOverallFinanceKpi();
  const { data: groups = [] } = useGroupsList();

  const filterStatusParam = selectedStatus !== 'ALL' ? (selectedStatus as FinancialStatus) : undefined;
  const { data: summaries = [], isLoading: isSummariesLoading, refetch } = useAllFinancialSummaries({
    groupId: selectedGroupId ? selectedGroupId : undefined,
    status: filterStatusParam,
    search: searchQuery.trim() ? searchQuery.trim() : undefined,
  });

  const getStatusBadge = (status: FinancialStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success">خالص ومسدد</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge variant="warning">مسدد جزئياً</Badge>;
      case 'UNPAID':
      case 'OVERDUE':
      default:
        return <Badge variant="danger">غير مسدد</Badge>;
    }
  };

  const handleOpenInvoice = (studentSummary: StudentFinancialSummaryDto) => {
    // Construct immediate invoice representation for the student
    const generatedInvoice: InvoiceDto = {
      id: studentSummary.studentId,
      invoiceNumber: `INV-${new Date().getFullYear()}-${studentSummary.studentCode.replace(/\D/g, '') || '0001'}`,
      studentId: studentSummary.studentId,
      studentName: studentSummary.studentName,
      studentCode: studentSummary.studentCode,
      groupId: studentSummary.subscriptions[0]?.groupId,
      groupName: studentSummary.subscriptions[0]?.groupName,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      periodMonth: new Date().toISOString().slice(0, 7),
      subtotalCents: studentSummary.totalChargesCents,
      discountCents: studentSummary.totalDiscountsCents,
      totalCents: studentSummary.netPayableCents,
      paidCents: studentSummary.totalPaidCents,
      remainingCents: studentSummary.remainingBalanceCents,
      status: studentSummary.status === 'PAID' ? 'PAID' : studentSummary.totalPaidCents > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
      notes: 'كشف حساب واشتراك الطالب الصادر عن النظام',
      items: studentSummary.subscriptions.map((sub, idx) => ({
        id: `item-${idx}`,
        invoiceId: studentSummary.studentId,
        description: `رسوم اشتراك حلقة: ${sub.groupName} (${sub.paymentType === 'MONTHLY' ? 'اشتراك شهري' : 'حساب بالحصة'})`,
        itemType: sub.paymentType === 'MONTHLY' ? 'MONTHLY_SUBSCRIPTION' : 'SESSION_FEE',
        quantity: sub.paymentType === 'MONTHLY' ? (sub.monthsCount || 1) : (sub.sessionsCount || 1),
        unitPriceCents: sub.rateCents,
        amountCents: sub.totalChargeCents,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setInvoicePreviewData({ student: studentSummary, invoice: generatedInvoice });
  };

  return (
    <div className="space-y-6" data-testid="page-finance">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--color-border-subtle)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">الإدارة المالية والاشتراكات</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            متابعة الاشتراكات الشهرية، تسديد الرسوم، كشوف الحسابات وفواتير الطلاب
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="finance-kpi-grid">
        {/* Total Charges */}
        <Card variant="default" className="p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[var(--color-brand-surface)] text-[var(--color-brand-primary)]">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-xs text-[var(--color-text-secondary)] block">إجمالي الرسوم المقررة</span>
            <span className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
              {((kpi?.totalChargesCents || 0) / 100).toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </Card>

        {/* Total Collected */}
        <Card variant="default" className="p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[var(--color-status-success-bg)] text-[var(--color-status-success)]">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-xs text-[var(--color-text-secondary)] block">المبالغ المحصلة</span>
            <span className="text-lg font-bold font-mono text-[var(--color-status-success)]">
              {((kpi?.totalCollectedCents || 0) / 100).toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </Card>

        {/* Outstanding Balance */}
        <Card variant="default" className="p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)]">
            <AlertCircle size={22} />
          </div>
          <div>
            <span className="text-xs text-[var(--color-text-secondary)] block">إجمالي المتأخرات والمتبقي</span>
            <span className="text-lg font-bold font-mono text-[var(--color-status-danger)]">
              {((kpi?.totalOutstandingCents || 0) / 100).toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </Card>

        {/* Paid Students Ratio */}
        <Card variant="default" className="p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[var(--color-brand-surface)] text-[var(--color-brand-accent)]">
            <Users size={22} />
          </div>
          <div>
            <span className="text-xs text-[var(--color-text-secondary)] block">الطلاب المسددون</span>
            <span className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
              {kpi?.paidStudentsCount || 0} <span className="text-xs text-[var(--color-text-muted)]">/ {kpi?.activeStudentsCount || 0} طالب</span>
            </span>
          </div>
        </Card>
      </div>

      {/* Toolbar: Search, Group filter, Status pills */}
      <Card variant="default" className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
            <Input
              type="text"
              placeholder="بحث باسم الطالب أو كود القيد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 text-xs"
              data-testid="search-finance-input"
            />
          </div>

          {/* Group Filter */}
          <div>
            <Select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              options={[
                { value: '', label: 'كافة الحلقات والمجموعات' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
              data-testid="filter-finance-group"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] text-xs font-semibold">
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'PAID', label: 'خالص' },
              { id: 'PARTIALLY_PAID', label: 'متبقي جزئي' },
              { id: 'UNPAID', label: 'غير مسدد' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`flex-1 py-1.5 rounded-md transition-all text-center ${
                  selectedStatus === tab.id
                    ? 'bg-[var(--color-brand-primary)] text-white shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
                data-testid={`filter-status-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Financial Table */}
      <Card variant="default" className="overflow-hidden">
        {isSummariesLoading ? (
          <div className="py-16 text-center text-xs text-[var(--color-text-secondary)]" data-testid="finance-loading">
            جاري تحميل السجلات المالية...
          </div>
        ) : summaries.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--color-text-muted)]" data-testid="finance-empty">
            لا توجد سجلات مالية مطابقة للشروط المحددة
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse" data-testid="finance-table">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)]">
                  <th className="py-3 px-4 font-semibold">الطالب</th>
                  <th className="py-3 px-4 font-semibold">المجموعة / الحلقة</th>
                  <th className="py-3 px-4 font-semibold text-center">نظام السداد</th>
                  <th className="py-3 px-4 font-semibold text-left">إجمالي الرسوم</th>
                  <th className="py-3 px-4 font-semibold text-left">المسدد</th>
                  <th className="py-3 px-4 font-semibold text-left">المتبقي</th>
                  <th className="py-3 px-4 font-semibold text-center">حالة السداد</th>
                  <th className="py-3 px-4 font-semibold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {summaries.map((student) => {
                  const primarySub = student.subscriptions[0];
                  return (
                    <tr
                      key={student.studentId}
                      className="hover:bg-[var(--color-bg-surface-subtle)] transition-colors"
                      data-testid={`finance-row-${student.studentCode}`}
                    >
                      {/* Student Info */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[var(--color-text-primary)]">{student.studentName}</div>
                        <span className="font-mono text-[11px] text-[var(--color-brand-primary)]" dir="ltr">
                          {student.studentCode}
                        </span>
                      </td>

                      {/* Group */}
                      <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                        {student.subscriptions.length > 0 ? (
                          <span>{student.subscriptions.map((s) => s.groupName).join(' • ')}</span>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">غير ملتحق بحلقة</span>
                        )}
                      </td>

                      {/* Payment Model */}
                      <td className="py-3 px-4 text-center">
                        {primarySub ? (
                          <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                            {primarySub.paymentType === 'MONTHLY' ? 'اشتراك شهري' : 'حساب بالحصة'}
                            <span className="block text-[10px] text-[var(--color-text-muted)] font-mono">
                              ({(primarySub.rateCents / 100).toLocaleString('ar-EG')} ج.م)
                            </span>
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>

                      {/* Total Charges */}
                      <td className="py-3 px-4 text-left font-mono font-medium">
                        {(student.totalChargesCents / 100).toLocaleString('ar-EG')} ج.م
                        {student.totalDiscountsCents > 0 && (
                          <span className="block text-[10px] text-[var(--color-status-success)]">
                            (خصم: -{(student.totalDiscountsCents / 100).toLocaleString('ar-EG')})
                          </span>
                        )}
                      </td>

                      {/* Paid */}
                      <td className="py-3 px-4 text-left font-mono font-semibold text-[var(--color-status-success)]">
                        {(student.totalPaidCents / 100).toLocaleString('ar-EG')} ج.م
                      </td>

                      {/* Remaining */}
                      <td className="py-3 px-4 text-left font-mono font-bold">
                        <span className={student.remainingBalanceCents > 0 ? 'text-[var(--color-status-danger)]' : 'text-[var(--color-text-muted)]'}>
                          {(student.remainingBalanceCents / 100).toLocaleString('ar-EG')} ج.م
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(student.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setPaymentStudent(student)}
                            title="تسجيل دفعة جديدة"
                            data-testid={`pay-btn-${student.studentCode}`}
                            data-test-payment-id={`record-payment-${student.studentId}`}
                            className="record-payment-btn"
                          >
                            <CreditCard size={13} className="me-1 text-[var(--color-brand-primary)]" />
                            سداد
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDiscountStudent(student)}
                            title="تطبيق خصم"
                            data-testid={`discount-btn-${student.studentCode}`}
                            data-test-discount-id={`apply-discount-${student.studentId}`}
                            className="apply-discount-btn"
                          >
                            <Tag size={13} className="text-[var(--color-text-secondary)]" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenInvoice(student)}
                            title="عرض الفاتورة وكشف الحساب"
                            data-testid={`invoice-btn-${student.studentCode}`}
                            data-test-invoice-id={`invoice-preview-${student.studentId}`}
                            className="invoice-preview-btn"
                          >
                            <FileText size={13} className="text-[var(--color-text-secondary)]" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      {paymentStudent && (
        <AddPaymentModal
          isOpen={Boolean(paymentStudent)}
          onClose={() => setPaymentStudent(null)}
          student={{
            id: paymentStudent.studentId,
            fullName: paymentStudent.studentName,
            studentCode: paymentStudent.studentCode,
          }}
          groups={paymentStudent.subscriptions.map((s) => ({ id: s.groupId, name: s.groupName }))}
          remainingBalanceCents={paymentStudent.remainingBalanceCents}
          onSuccess={() => refetch()}
        />
      )}

      {discountStudent && (
        <ApplyDiscountModal
          isOpen={Boolean(discountStudent)}
          onClose={() => setDiscountStudent(null)}
          student={{
            id: discountStudent.studentId,
            fullName: discountStudent.studentName,
            studentCode: discountStudent.studentCode,
          }}
          groups={discountStudent.subscriptions.map((s) => ({ id: s.groupId, name: s.groupName }))}
          currentChargesCents={discountStudent.totalChargesCents}
          onSuccess={() => refetch()}
        />
      )}

      {invoicePreviewData && (
        <InvoicePreviewModal
          isOpen={Boolean(invoicePreviewData)}
          onClose={() => setInvoicePreviewData(null)}
          initialInvoice={invoicePreviewData.invoice}
        />
      )}
    </div>
  );
}
