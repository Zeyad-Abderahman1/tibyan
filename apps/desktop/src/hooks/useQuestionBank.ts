import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  QuestionDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionFilterDto,
  DuplicateCheckResultDto,
  BulkImportReviewItemDto,
  BulkQuestionItemDto,
  CommitBulkImportInputDto,
} from '@tibyan/contracts';

export const questionBankKeys = {
  all: ['question-bank'] as const,
  list: (filter?: QuestionFilterDto) => [...questionBankKeys.all, 'list', filter] as const,
  detail: (id: string) => [...questionBankKeys.all, 'detail', id] as const,
};

export function useQuestions(filter?: QuestionFilterDto) {
  return useQuery({
    queryKey: questionBankKeys.list(filter),
    queryFn: async (): Promise<QuestionDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.questionBank?.listQuestions) {
        const res = await window.tibyan.questionBank.listQuestions(filter);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل الأسئلة من بنك الأسئلة');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function useQuestion(id?: string) {
  return useQuery({
    queryKey: questionBankKeys.detail(id || ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<QuestionDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.questionBank?.getQuestion && id) {
        const res = await window.tibyan.questionBank.getQuestion(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل المسألة');
        }
        return res.data;
      }
      throw new Error('معرف المسألة غير صالح');
    },
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateQuestionDto): Promise<QuestionDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.questionBank?.createQuestion) {
        const res = await window.tibyan.questionBank.createQuestion(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل إنشاء المسألة');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.all });
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateQuestionDto }): Promise<QuestionDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.questionBank?.updateQuestion) {
        const res = await window.tibyan.questionBank.updateQuestion(id, data);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحديث المسألة');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.all });
      queryClient.invalidateQueries({ queryKey: questionBankKeys.detail(data.id) });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (typeof window !== 'undefined' && window.tibyan?.questionBank?.deleteQuestion) {
        const res = await window.tibyan.questionBank.deleteQuestion(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل حذف المسألة');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.all });
    },
  });
}

export function useLinkQuestionSources() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, sourceReferenceIds }: { questionId: string; sourceReferenceIds: string[] }) => {
      if (typeof window !== 'undefined' && window.tibyan?.questionBank?.linkSources) {
        const res = await window.tibyan.questionBank.linkSources(questionId, sourceReferenceIds);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل ربط المراجع بالمسألة');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.all });
      queryClient.invalidateQueries({ queryKey: questionBankKeys.detail(vars.questionId) });
    },
  });
}

export function useUnlinkQuestionSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, sourceReferenceId }: { questionId: string; sourceReferenceId: string }) => {
      if (typeof window !== 'undefined' && window.tibyan?.questionBank?.unlinkSource) {
        const res = await window.tibyan.questionBank.unlinkSource(questionId, sourceReferenceId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل فك ارتباط المرجع بالمسألة');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.all });
      queryClient.invalidateQueries({ queryKey: questionBankKeys.detail(vars.questionId) });
    },
  });
}

export function useCheckQuestionDuplicate() {
  return useMutation({
    mutationFn: async ({
      body,
      excludeQuestionId,
    }: {
      body: unknown;
      excludeQuestionId?: string;
    }): Promise<DuplicateCheckResultDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.questionBank?.checkDuplicate) {
        const res = await window.tibyan.questionBank.checkDuplicate(body, excludeQuestionId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل فحص التكرار');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
  });
}

export function usePreviewBulkQuestions() {
  return useMutation({
    mutationFn: async (items: BulkQuestionItemDto[]): Promise<BulkImportReviewItemDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.questionBank?.previewBulk) {
        const res = await window.tibyan.questionBank.previewBulk(items);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحليل دفعة الاستيراد');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
  });
}

export function useCommitBulkQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CommitBulkImportInputDto) => {
      if (typeof window !== 'undefined' && window.tibyan?.questionBank?.commitBulk) {
        const res = await window.tibyan.questionBank.commitBulk(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل إتمام استيراد الدفعة');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.all });
    },
  });
}
