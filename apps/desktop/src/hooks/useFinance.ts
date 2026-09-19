import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  PaymentDto,
  RecordPaymentInput,
  StudentDiscountDto,
  ApplyDiscountInput,
  InvoiceDto,
  CreateInvoiceInput,
  StudentFinancialSummaryDto,
  OverallFinanceKpiDto,
  FinancialStatus,
  IpcResult,
} from '@tibyan/contracts';

export const financeKeys = {
  all: ['finance'] as const,
  summaries: () => [...financeKeys.all, 'summaries'] as const,
  summary: (studentId: string) => [...financeKeys.all, 'summary', studentId] as const,
  kpi: () => [...financeKeys.all, 'kpi'] as const,
  payments: (studentId: string) => [...financeKeys.all, 'payments', studentId] as const,
  discounts: (studentId: string) => [...financeKeys.all, 'discounts', studentId] as const,
  invoices: (studentId?: string) => [...financeKeys.all, 'invoices', studentId ?? 'all'] as const,
  invoice: (invoiceId: string) => [...financeKeys.all, 'invoice', invoiceId] as const,
};

export function useStudentFinancialSummary(studentId: string) {
  return useQuery({
    queryKey: financeKeys.summary(studentId),
    queryFn: async (): Promise<StudentFinancialSummaryDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.finance?.getStudentSummary) {
        const res = await window.tibyan.finance.getStudentSummary(studentId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع السجل المالي للطالب');
        }
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    enabled: Boolean(studentId),
  });
}

export function useAllFinancialSummaries(filter?: {
  groupId?: string;
  status?: FinancialStatus;
  search?: string;
}) {
  return useQuery({
    queryKey: [...financeKeys.summaries(), filter ?? {}],
    queryFn: async (): Promise<StudentFinancialSummaryDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.finance?.listAllSummaries) {
        const res = await window.tibyan.finance.listAllSummaries(filter);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع السجلات المالية');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function useOverallFinanceKpi() {
  return useQuery({
    queryKey: financeKeys.kpi(),
    queryFn: async (): Promise<OverallFinanceKpiDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.finance?.getOverallKpi) {
        const res = await window.tibyan.finance.getOverallKpi();
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع الإحصائيات المالية');
        }
        return res.data;
      }
      return {
        totalChargesCents: 0,
        totalCollectedCents: 0,
        totalOutstandingCents: 0,
        totalDiscountsCents: 0,
        activeStudentsCount: 0,
        paidStudentsCount: 0,
        unpaidStudentsCount: 0,
      };
    },
  });
}

export function useStudentPayments(studentId: string) {
  return useQuery({
    queryKey: financeKeys.payments(studentId),
    queryFn: async (): Promise<PaymentDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.finance?.listStudentPayments) {
        const res = await window.tibyan.finance.listStudentPayments(studentId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع سجل المدفوعات');
        }
        return res.data;
      }
      return [];
    },
    enabled: Boolean(studentId),
  });
}

export function useStudentDiscounts(studentId: string) {
  return useQuery({
    queryKey: financeKeys.discounts(studentId),
    queryFn: async (): Promise<StudentDiscountDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.finance?.listDiscounts) {
        const res = await window.tibyan.finance.listDiscounts(studentId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع سجل الخصومات');
        }
        return res.data;
      }
      return [];
    },
    enabled: Boolean(studentId),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordPaymentInput): Promise<IpcResult<PaymentDto>> => {
      if (typeof window !== 'undefined' && window.tibyan?.finance?.recordPayment) {
        return window.tibyan.finance.recordPayment(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: financeKeys.payments(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: financeKeys.summaries() });
      queryClient.invalidateQueries({ queryKey: financeKeys.kpi() });
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices(variables.studentId) });
    },
  });
}

export function useApplyDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ApplyDiscountInput): Promise<IpcResult<StudentDiscountDto>> => {
      if (typeof window !== 'undefined' && window.tibyan?.finance?.applyDiscount) {
        return window.tibyan.finance.applyDiscount(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: financeKeys.discounts(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: financeKeys.summaries() });
      queryClient.invalidateQueries({ queryKey: financeKeys.kpi() });
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInvoiceInput): Promise<IpcResult<InvoiceDto>> => {
      if (typeof window !== 'undefined' && window.tibyan?.finance?.createInvoice) {
        return window.tibyan.finance.createInvoice(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(variables.studentId) });
    },
  });
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: financeKeys.invoice(invoiceId),
    queryFn: async (): Promise<InvoiceDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.finance?.getInvoice) {
        const res = await window.tibyan.finance.getInvoice(invoiceId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع بيانات الفاتورة');
        }
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    enabled: Boolean(invoiceId),
  });
}

export function useStudentInvoices(studentId?: string) {
  return useQuery({
    queryKey: financeKeys.invoices(studentId),
    queryFn: async (): Promise<InvoiceDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.finance?.listInvoices) {
        const res = await window.tibyan.finance.listInvoices(studentId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع قائمة الفواتير');
        }
        return res.data;
      }
      return [];
    },
  });
}
