import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ExamDto,
  ExamBlueprint,
  ConfirmAssemblyInput,
  AssemblyPreviewResult,
  AiGenerateCandidatesInput,
  AiExamCandidate,
} from '@tibyan/contracts';

export const examKeys = {
  all: ['exams'] as const,
  list: () => [...examKeys.all, 'list'] as const,
  detail: (id: string) => [...examKeys.all, 'detail', id] as const,
  layout: (id: string, kind: string, version?: string) => [...examKeys.all, 'layout', id, kind, version] as const,
};

export function useExams() {
  return useQuery({
    queryKey: examKeys.list(),
    queryFn: async (): Promise<ExamDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.exams?.list) {
        const res = await window.tibyan.exams.list();
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل قائمة الاختبارات');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function useExam(id?: string) {
  return useQuery({
    queryKey: examKeys.detail(id || ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<ExamDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.exams?.get && id) {
        const res = await window.tibyan.exams.get(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل بيانات الاختبار');
        }
        return res.data;
      }
      throw new Error('معرف الاختبار غير صالح');
    },
  });
}

export function usePreviewAssembly() {
  return useMutation({
    mutationFn: async (blueprint: ExamBlueprint): Promise<AssemblyPreviewResult> => {
      if (typeof window !== 'undefined' && window.tibyan?.exams?.previewAssembly) {
        const res = await window.tibyan.exams.previewAssembly(blueprint);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل فحص مخطط الاختبار');
        }
        return res.data;
      }
      throw new Error('خدمة تجميع الاختبار غير متوفرة');
    },
  });
}

export function useConfirmAssembly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ConfirmAssemblyInput): Promise<ExamDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.exams?.confirmAssembly) {
        const res = await window.tibyan.exams.confirmAssembly(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تأكيد إنشاء الاختبار');
        }
        return res.data;
      }
      throw new Error('خدمة تأكيد الاختبار غير متوفرة');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.all });
    },
  });
}

export function useUndoExamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (examId: string): Promise<void> => {
      if (typeof window !== 'undefined' && window.tibyan?.exams?.undoLastMutation) {
        const res = await window.tibyan.exams.undoLastMutation(examId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل التراجع عن إنشاء الاختبار');
        }
        return res.data;
      }
      throw new Error('خدمة التراجع غير متوفرة');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.all });
    },
  });
}

export function usePreviewAiCandidates() {
  return useMutation({
    mutationFn: async (input: AiGenerateCandidatesInput): Promise<{ candidates: AiExamCandidate[] }> => {
      if (typeof window !== 'undefined' && window.tibyan?.exams?.previewAiCandidates) {
        const res = await window.tibyan.exams.previewAiCandidates(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل توليد مقترحات الأسئلة');
        }
        return res.data;
      }
      throw new Error('خدمة الذكاء الاصطناعي غير متوفرة');
    },
  });
}

export function useExamLayout(
  examId?: string,
  kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY' = 'STUDENT',
  versionLabel?: 'A' | 'B' | 'C' | 'D'
) {
  return useQuery({
    queryKey: examKeys.layout(examId || '', kind, versionLabel),
    enabled: Boolean(examId),
    queryFn: async (): Promise<string> => {
      if (typeof window !== 'undefined' && window.tibyan?.exams?.renderLayout && examId) {
        const res = await window.tibyan.exams.renderLayout({ examId, kind, versionLabel });
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تجهيز نموذج الطباعة');
        }
        return res.data;
      }
      return '';
    },
  });
}

export function useExportExamPdf() {
  return useMutation({
    mutationFn: async (input: {
      examId: string;
      kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY';
      versionLabel?: 'A' | 'B' | 'C' | 'D';
      defaultFilename?: string;
    }): Promise<{ canceled: boolean; filePath: string }> => {
      if (typeof window !== 'undefined' && window.tibyan?.exams?.exportPdf) {
        const res = await window.tibyan.exams.exportPdf(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تصدير ملف PDF');
        }
        return res.data;
      }
      throw new Error('خدمة التصدير غير متوفرة');
    },
  });
}

export function usePrintExam() {
  return useMutation({
    mutationFn: async (input: {
      examId: string;
      kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY';
      versionLabel?: 'A' | 'B' | 'C' | 'D';
    }): Promise<{ success: boolean }> => {
      if (typeof window !== 'undefined' && window.tibyan?.exams?.print) {
        const res = await window.tibyan.exams.print(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل إرسال أمر الطباعة');
        }
        return res.data;
      }
      throw new Error('خدمة الطباعة غير متوفرة');
    },
  });
}
