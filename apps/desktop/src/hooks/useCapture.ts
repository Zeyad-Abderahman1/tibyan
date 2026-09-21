import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CaptureSessionDto,
  CaptureSubmissionDto,
  CapturePageDto,
  CreateCaptureSessionDto,
  ImportCaptureFilesInput,
  AssociateSubmissionInput,
  ReassignPageInput,
  ExcludePageInput,
  RotatePageInput,
} from '@tibyan/contracts';

export const captureKeys = {
  all: ['capture'] as const,
  sessions: () => [...captureKeys.all, 'sessions'] as const,
  session: (id: string) => [...captureKeys.all, 'session', id] as const,
  submissions: (sessionId: string) => [...captureKeys.all, 'submissions', sessionId] as const,
  submission: (id: string) => [...captureKeys.all, 'submission', id] as const,
  pages: (submissionId: string) => [...captureKeys.all, 'pages', submissionId] as const,
  duplicate: (hash: string) => [...captureKeys.all, 'duplicate', hash] as const,
};

export function useCaptureSessions() {
  return useQuery({
    queryKey: captureKeys.sessions(),
    queryFn: async (): Promise<CaptureSessionDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.listSessions) {
        const res = await window.tibyan.capture.listSessions();
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل جلسات التصوير');
        return res.data;
      }
      return [];
    },
  });
}

export function useCaptureSession(id: string) {
  return useQuery({
    queryKey: captureKeys.session(id),
    enabled: Boolean(id),
    queryFn: async (): Promise<CaptureSessionDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.getSession) {
        const res = await window.tibyan.capture.getSession(id);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل جلسة التصوير');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
  });
}

export function useCreateCaptureSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCaptureSessionDto): Promise<CaptureSessionDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.createSession) {
        const res = await window.tibyan.capture.createSession(input);
        if (!res.success) throw new Error(res.error.message || 'فشل إنشاء جلسة التصوير');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: captureKeys.sessions() });
    },
  });
}

export function useDeleteCaptureSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.deleteSession) {
        const res = await window.tibyan.capture.deleteSession(id);
        if (!res.success) throw new Error(res.error.message || 'فشل حذف جلسة التصوير');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: captureKeys.sessions() });
    },
  });
}

export function useImportCaptureFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ImportCaptureFilesInput) => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.importFiles) {
        const res = await window.tibyan.capture.importFiles(input);
        if (!res.success) throw new Error(res.error.message || 'فشل استيراد الملفات');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: captureKeys.submissions(vars.sessionId) });
      queryClient.invalidateQueries({ queryKey: captureKeys.sessions() });
    },
  });
}

export function useCaptureSubmissions(sessionId: string) {
  return useQuery({
    queryKey: captureKeys.submissions(sessionId),
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<CaptureSubmissionDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.listSubmissions) {
        const res = await window.tibyan.capture.listSubmissions(sessionId);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل递交ات التصوير');
        return res.data;
      }
      return [];
    },
  });
}

export function useCaptureSubmission(id: string) {
  return useQuery({
    queryKey: captureKeys.submission(id),
    enabled: Boolean(id),
    queryFn: async (): Promise<CaptureSubmissionDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.getSubmission) {
        const res = await window.tibyan.capture.getSubmission(id);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل بيانات التسليم');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
  });
}

export function useAssociateSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssociateSubmissionInput): Promise<CaptureSubmissionDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.associateSubmission) {
        const res = await window.tibyan.capture.associateSubmission(input);
        if (!res.success) throw new Error(res.error.message || 'فشل ربط التسليم بالطالب');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: captureKeys.all });
    },
  });
}

export function useCapturePages(submissionId: string) {
  return useQuery({
    queryKey: captureKeys.pages(submissionId),
    enabled: Boolean(submissionId),
    queryFn: async (): Promise<CapturePageDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.listPages) {
        const res = await window.tibyan.capture.listPages(submissionId);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل صفحات التصوير');
        return res.data;
      }
      return [];
    },
  });
}

export function useRotatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RotatePageInput): Promise<CapturePageDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.rotatePage) {
        const res = await window.tibyan.capture.rotatePage(input);
        if (!res.success) throw new Error(res.error.message || 'فشل تدوير الصفحة');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: captureKeys.all });
    },
  });
}

export function useExcludePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExcludePageInput): Promise<CapturePageDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.excludePage) {
        const res = await window.tibyan.capture.excludePage(input);
        if (!res.success) throw new Error(res.error.message || 'فشل استبعاد الصفحة');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: captureKeys.all });
    },
  });
}

export function useReassignPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReassignPageInput): Promise<CapturePageDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.reassignPage) {
        const res = await window.tibyan.capture.reassignPage(input);
        if (!res.success) throw new Error(res.error.message || 'فشل نقل الصفحة');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: captureKeys.all });
    },
  });
}

export function useCheckDuplicate() {
  return useMutation({
    mutationFn: async (fingerprintSha256: string) => {
      if (typeof window !== 'undefined' && window.tibyan?.capture?.checkDuplicate) {
        const res = await window.tibyan.capture.checkDuplicate(fingerprintSha256);
        if (!res.success) throw new Error(res.error.message || 'فشل فحص التكرار');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
  });
}
