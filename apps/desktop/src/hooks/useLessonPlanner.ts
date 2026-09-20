import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  LessonPlanDto,
  CreateLessonPlanDto,
  UpdateLessonPlanDto,
  LessonPlanFilter,
  SessionReflectionDto,
  CreateSessionReflectionDto,
  UpdateSessionReflectionDto,
} from '@tibyan/contracts';

export const lessonPlanKeys = {
  all: ['lesson-plans'] as const,
  list: (filter?: LessonPlanFilter) => [...lessonPlanKeys.all, 'list', filter] as const,
  detail: (id: string) => [...lessonPlanKeys.all, 'detail', id] as const,
  byNode: (nodeId: string) => [...lessonPlanKeys.all, 'by-node', nodeId] as const,
};

export const sessionReflectionKeys = {
  all: ['session-reflections'] as const,
  detail: (id: string) => [...sessionReflectionKeys.all, 'detail', id] as const,
  bySession: (sessionId: string) => [...sessionReflectionKeys.all, 'by-session', sessionId] as const,
};

export function useLessonPlans(filter?: LessonPlanFilter) {
  return useQuery({
    queryKey: lessonPlanKeys.list(filter),
    queryFn: async (): Promise<LessonPlanDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.lessonPlanner?.listLessonPlans) {
        const res = await window.tibyan.lessonPlanner.listLessonPlans(filter);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل خطط الدروس');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function useLessonPlan(id?: string) {
  return useQuery({
    queryKey: lessonPlanKeys.detail(id || ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<LessonPlanDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.lessonPlanner?.getLessonPlan && id) {
        const res = await window.tibyan.lessonPlanner.getLessonPlan(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل خطة الدرس');
        }
        return res.data;
      }
      throw new Error('معرف خطة الدرس غير صالح');
    },
  });
}

export function useLessonPlansByNode(nodeId?: string) {
  return useQuery({
    queryKey: lessonPlanKeys.byNode(nodeId || ''),
    enabled: Boolean(nodeId),
    queryFn: async (): Promise<LessonPlanDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.lessonPlanner?.listLessonPlansByNode && nodeId) {
        const res = await window.tibyan.lessonPlanner.listLessonPlansByNode(nodeId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل خطط الدرس للعنصر');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function useCreateLessonPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLessonPlanDto): Promise<LessonPlanDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.lessonPlanner?.createLessonPlan) {
        const res = await window.tibyan.lessonPlanner.createLessonPlan(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل إنشاء خطة الدرس');
        }
        return res.data;
      }
      throw new Error('خدمة تخطيط الدروس غير متاحة');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lessonPlanKeys.all });
      queryClient.invalidateQueries({ queryKey: lessonPlanKeys.byNode(data.curriculumNodeId) });
    },
  });
}

export function useUpdateLessonPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateLessonPlanDto }): Promise<LessonPlanDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.lessonPlanner?.updateLessonPlan) {
        const res = await window.tibyan.lessonPlanner.updateLessonPlan(id, input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تعديل خطة الدرس');
        }
        return res.data;
      }
      throw new Error('خدمة تخطيط الدروس غير متاحة');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lessonPlanKeys.all });
      queryClient.invalidateQueries({ queryKey: lessonPlanKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: lessonPlanKeys.byNode(data.curriculumNodeId) });
    },
  });
}

export function useArchiveLessonPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<LessonPlanDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.lessonPlanner?.archiveLessonPlan) {
        const res = await window.tibyan.lessonPlanner.archiveLessonPlan(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل أرشفة خطة الدرس');
        }
        return res.data;
      }
      throw new Error('خدمة تخطيط الدروس غير متاحة');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lessonPlanKeys.all });
      queryClient.invalidateQueries({ queryKey: lessonPlanKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: lessonPlanKeys.byNode(data.curriculumNodeId) });
    },
  });
}

// ==========================================
// Session Reflection Hooks
// ==========================================

export function useSessionReflection(sessionId?: string) {
  return useQuery({
    queryKey: sessionReflectionKeys.bySession(sessionId || ''),
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<SessionReflectionDto | null> => {
      if (typeof window !== 'undefined' && window.tibyan?.sessionReflection?.getReflectionBySession && sessionId) {
        const res = await window.tibyan.sessionReflection.getReflectionBySession(sessionId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع تأمل الحصة');
        }
        return res.data;
      }
      return null;
    },
  });
}

export function useCreateSessionReflection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSessionReflectionDto): Promise<SessionReflectionDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.sessionReflection?.createReflection) {
        const res = await window.tibyan.sessionReflection.createReflection(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل حفظ تأمل الحصة');
        }
        return res.data;
      }
      throw new Error('خدمة تأمل الحصص غير متاحة');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sessionReflectionKeys.all });
      queryClient.invalidateQueries({ queryKey: sessionReflectionKeys.bySession(data.sessionId) });
    },
  });
}

export function useUpdateSessionReflection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSessionReflectionDto }): Promise<SessionReflectionDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.sessionReflection?.updateReflection) {
        const res = await window.tibyan.sessionReflection.updateReflection(id, input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحديث تأمل الحصة');
        }
        return res.data;
      }
      throw new Error('خدمة تأمل الحصص غير متاحة');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sessionReflectionKeys.all });
      queryClient.invalidateQueries({ queryKey: sessionReflectionKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: sessionReflectionKeys.bySession(data.sessionId) });
    },
  });
}
