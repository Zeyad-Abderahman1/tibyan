import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AssistantSession, ConversationHistory } from '@tibyan/contracts';

export type TaskType = 'EXAM' | 'SLIDES' | 'REVIEW' | 'NOTES' | 'PLATFORM_CONTROL';

export const TASK_DEFINITIONS: Record<
  TaskType,
  { labelAr: string; descriptionAr: string; icon: string }
> = {
  EXAM: {
    labelAr: 'إنشاء اختبار',
    descriptionAr: 'إنشاء اختبار من ملف PDF أو منهج محفوظ',
    icon: 'FileText',
  },
  SLIDES: {
    labelAr: 'إنشاء شرائح',
    descriptionAr: 'إنشاء عرض تعليمي من ملف PDF أو منهج محفوظ',
    icon: 'Presentation',
  },
  REVIEW: {
    labelAr: 'إنشاء مراجعة',
    descriptionAr: 'إنشاء مواد مراجعة منهجية',
    icon: 'BookOpen',
  },
  NOTES: {
    labelAr: 'إنشاء مذكرة',
    descriptionAr: 'إنشاء مذكرة دراسية أو توصيلية',
    icon: 'StickyNote',
  },
  PLATFORM_CONTROL: {
    labelAr: 'التحكم في المنصة',
    descriptionAr: 'إدارة العمليات الآمنة في تبيان',
    icon: 'Settings',
  },
};

export const tibyanKeys = {
  all: ['tibyan-workspace'] as const,
  history: () => [...tibyanKeys.all, 'history'] as const,
  conversation: (sessionId: string) => [...tibyanKeys.all, 'conversation', sessionId] as const,
};

export function useTibyanHistory() {
  return useQuery({
    queryKey: tibyanKeys.history(),
    queryFn: async (): Promise<AssistantSession[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.tibyan?.listHistory) {
        const res = await window.tibyan.tibyan.listHistory();
        if (!res.success) {
          throw new Error(res.error?.message || 'فشل تحميل السجل');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function useTibyanConversation(sessionId?: string) {
  return useQuery({
    queryKey: tibyanKeys.conversation(sessionId || ''),
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<ConversationHistory> => {
      if (typeof window !== 'undefined' && window.tibyan?.tibyan?.getHistoryItem && sessionId) {
        const res = await window.tibyan.tibyan.getHistoryItem(sessionId);
        if (!res.success) {
          throw new Error(res.error?.message || 'فشل تحميل المحادثة');
        }
        return res.data;
      }
      throw new Error('معرف الجلسة غير صالح');
    },
  });
}

export function useCreateTaskSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      taskType: string;
      title?: string;
    }): Promise<AssistantSession> => {
      if (typeof window !== 'undefined' && window.tibyan?.tibyan?.createTaskSession) {
        const res = await window.tibyan.tibyan.createTaskSession(input);
        if (!res.success) {
          throw new Error(res.error?.message || 'فشل إنشاء الجلسة');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tibyanKeys.history() });
    },
  });
}

export function useDeleteHistoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string): Promise<void> => {
      if (typeof window !== 'undefined' && window.tibyan?.tibyan?.deleteHistoryItem) {
        const res = await window.tibyan.tibyan.deleteHistoryItem(sessionId);
        if (!res.success) {
          throw new Error(res.error?.message || 'فشل حذف السجل');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tibyanKeys.history() });
    },
  });
}

export function useRenameHistoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      title,
    }: {
      sessionId: string;
      title: string;
    }): Promise<void> => {
      if (typeof window !== 'undefined' && window.tibyan?.tibyan?.renameHistoryItem) {
        const res = await window.tibyan.tibyan.renameHistoryItem(sessionId, title);
        if (!res.success) {
          throw new Error(res.error?.message || 'فشل إعادة التسمية');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tibyanKeys.history() });
    },
  });
}
