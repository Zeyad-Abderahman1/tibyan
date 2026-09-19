import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { FinancePage } from '../src/features/finance/FinancePage.js';
import { AddPaymentModal } from '../src/features/finance/AddPaymentModal.js';
import { ApplyDiscountModal } from '../src/features/finance/ApplyDiscountModal.js';
import { InvoicePreviewModal } from '../src/features/finance/InvoicePreviewModal.js';
import { StudentFinancialView } from '../src/features/students/StudentFinancialView.js';
import { useAuthStore } from '../src/features/auth/auth.state.js';
import type {
  StudentFinancialSummaryDto,
  InvoiceDto,
  OverallFinanceKpiDto,
  UserSessionDto,
} from '@tibyan/contracts';

describe('Phase 2 — Task 4: Finance UI Components Suite', () => {
  let queryClient: QueryClient;

  const mockOwnerSession: UserSessionDto = {
    userId: 'owner-uuid',
    fullName: 'الأستاذ أحمد الشريف',
    username: 'teacher',
    role: 'OWNER',
    permissions: ['ALL' as any],
    tokenExpiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
  };

  const mockKpi: OverallFinanceKpiDto = {
    totalChargesCents: 450000,
    totalCollectedCents: 350000,
    totalOutstandingCents: 100000,
    totalDiscountsCents: 25000,
    activeStudentsCount: 30,
    paidStudentsCount: 22,
    unpaidStudentsCount: 8,
  };

  const mockSummary: StudentFinancialSummaryDto = {
    studentId: '11111111-aaaa-4111-8111-111111111111',
    studentName: 'أحمد إبراهيم الدسوقي',
    studentCode: 'TB-0001',
    gradeLevel: 'PREP_1',
    guardianPhone: '01012345678',
    totalChargesCents: 20000,
    totalDiscountsCents: 2000,
    netPayableCents: 18000,
    totalPaidCents: 10000,
    remainingBalanceCents: 8000,
    status: 'PARTIALLY_PAID',
    subscriptions: [
      {
        groupId: 'grp-1',
        groupName: 'مجموعة النخبة أ',
        paymentType: 'MONTHLY',
        rateCents: 20000,
        enrolledAt: '2026-09-01T00:00:00.000Z',
        monthsCount: 1,
        totalChargeCents: 20000,
        totalPaidCents: 10000,
        balanceCents: 10000,
      },
    ],
    recentPayments: [
      {
        id: 'pay-1',
        receiptNumber: 'REC-2026-0001',
        studentId: '11111111-aaaa-4111-8111-111111111111',
        amountCents: 10000,
        paymentMethod: 'CASH',
        paymentDate: '2026-09-10',
        recordedByUserId: 'owner-uuid',
        createdAt: '2026-09-10T10:00:00.000Z',
        updatedAt: '2026-09-10T10:00:00.000Z',
      },
    ],
  };

  const mockInvoice: InvoiceDto = {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    studentId: '11111111-aaaa-4111-8111-111111111111',
    studentName: 'أحمد إبراهيم الدسوقي',
    studentCode: 'TB-0001',
    groupName: 'مجموعة النخبة أ',
    issueDate: '2026-09-15',
    subtotalCents: 20000,
    discountCents: 2000,
    totalCents: 18000,
    paidCents: 10000,
    remainingCents: 8000,
    status: 'PARTIALLY_PAID',
    notes: 'فاتورة اشتراك شهر سبتمبر',
    items: [
      {
        id: 'item-1',
        invoiceId: 'inv-1',
        description: 'اشتراك شهر سبتمبر - لغة عربية',
        itemType: 'MONTHLY_SUBSCRIPTION',
        quantity: 1,
        unitPriceCents: 20000,
        amountCents: 20000,
      },
    ],
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-09-15T10:00:00.000Z',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuthStore.setState({ session: mockOwnerSession, status: 'authenticated' });

    // Mock window.tibyan bridge
    (global as any).window = {
      tibyan: {
        finance: {
          getStudentSummary: vi.fn(async () => ({ success: true, data: mockSummary })),
          listAllSummaries: vi.fn(async () => ({ success: true, data: [mockSummary] })),
          getOverallKpi: vi.fn(async () => ({ success: true, data: mockKpi })),
          listStudentPayments: vi.fn(async () => ({ success: true, data: mockSummary.recentPayments })),
          listInvoices: vi.fn(async () => ({ success: true, data: [mockInvoice] })),
          getInvoice: vi.fn(async () => ({ success: true, data: mockInvoice })),
          recordPayment: vi.fn(async () => ({ success: true, data: mockSummary.recentPayments[0] })),
          applyDiscount: vi.fn(async () => ({ success: true, data: { id: 'd-1' } })),
          createInvoice: vi.fn(async () => ({ success: true, data: mockInvoice })),
          printInvoice: vi.fn(async () => ({ success: true, data: { printed: true } })),
          exportInvoicePdf: vi.fn(async () => ({ success: true, data: { filePath: 'test.pdf' } })),
        },
        groups: {
          list: vi.fn(async () => ({ success: true, data: [{ id: 'grp-1', name: 'مجموعة النخبة أ' }] })),
        },
      },
    };
  });

  it('renders FinancePage with KPI metrics and filter controls', () => {
    // Prime query cache
    queryClient.setQueryData(['finance', 'kpi'], mockKpi);
    queryClient.setQueryData(['finance', 'summaries', undefined, undefined, undefined], [mockSummary]);
    queryClient.setQueryData(['groups'], [{ id: 'grp-1', name: 'مجموعة النخبة أ' }]);

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FinancePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('الإدارة المالية والاشتراكات');
    expect(html).toContain('المبالغ المحصلة');
    expect(html).toContain('إجمالي المتأخرات والمتبقي');
    expect(html).toContain('إجمالي الرسوم المقررة');
  });

  it('renders AddPaymentModal with payment method selection and positive amount fields', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AddPaymentModal
            isOpen={true}
            onClose={() => {}}
            student={{
              id: mockSummary.studentId,
              fullName: mockSummary.studentName,
              studentCode: mockSummary.studentCode,
            }}
            remainingBalanceCents={mockSummary.remainingBalanceCents}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('تسجيل دفعة مالية');
    expect(html).toContain('أحمد إبراهيم الدسوقي');
    expect(html).toContain('TB-0001');
    expect(html).toContain('المبلغ المدفوع (بالجنيه المصري)');
    expect(html).toContain('طريقة الدفع');
    expect(html).toContain('تأكيد وتسجيل الدفعة');
  });

  it('renders ApplyDiscountModal with percentage and fixed amount toggles', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ApplyDiscountModal
            isOpen={true}
            onClose={() => {}}
            student={{
              id: mockSummary.studentId,
              fullName: mockSummary.studentName,
              studentCode: mockSummary.studentCode,
            }}
            currentChargesCents={mockSummary.totalChargesCents}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('تطبيق خصم للطالب');
    expect(html).toContain('نسبة مئوية (%)');
    expect(html).toContain('مبلغ ثابت (ج.م)');
    expect(html).toContain('سبب الخصم');
    expect(html).toContain('تطبيق الخصم');
  });

  it('renders InvoicePreviewModal with deterministic invoice number and item breakdown', () => {
    queryClient.setQueryData(['finance', 'invoice', mockInvoice.id], mockInvoice);

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InvoicePreviewModal
            isOpen={true}
            onClose={() => {}}
            invoiceId={mockInvoice.id}
            initialInvoice={mockInvoice}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('معاينة الفاتورة وكشف الحساب');
    expect(html).toContain('INV-2026-0001');
    expect(html).toContain('أحمد إبراهيم الدسوقي');
    expect(html).toContain('اشتراك شهر سبتمبر - لغة عربية');
    expect(html).toContain('طباعة الفاتورة');
    expect(html).toContain('تصدير ملف PDF');
  });

  it('renders StudentFinancialView with balance, status badge, payments, and invoices', () => {
    queryClient.setQueryData(['finance', 'summary', mockSummary.studentId], mockSummary);
    queryClient.setQueryData(['finance', 'payments', mockSummary.studentId], mockSummary.recentPayments);
    queryClient.setQueryData(['finance', 'invoices', mockSummary.studentId], [mockInvoice]);

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StudentFinancialView
            studentId={mockSummary.studentId}
            studentName={mockSummary.studentName}
            canWrite={true}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('السجل المالي والاشتراكات');
    expect(html).toContain('مسدد جزئياً');
    expect(html).toContain('REC-2026-0001');
    expect(html).toContain('INV-2026-0001');
    expect(html).toContain('تسجيل دفعة');
    expect(html).toContain('تطبيق خصم');
    expect(html).toContain('إصدار فاتورة');
  });
});
