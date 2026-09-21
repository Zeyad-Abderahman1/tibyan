import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  GradingDecisionDto,
  GradingRunDto,
  ExtractedAnswerDto,
  GradeSubmissionInput,
  OverrideGradingDecisionInput,
  ReviewExtractedAnswerInput,
  FinalizeSubmissionInput,
  RegradeSubmissionInput,
} from '@tibyan/contracts';

export const gradingKeys = {
  all: ['grading'] as const,
  decisions: (submissionId: string) => [...gradingKeys.all, 'decisions', submissionId] as const,
  runs: (submissionId: string) => [...gradingKeys.all, 'runs', submissionId] as const,
  status: (submissionId: string) => [...gradingKeys.all, 'status', submissionId] as const,
  extracted: (submissionId: string) => [...gradingKeys.all, 'extracted', submissionId] as const,
};

export function useExtractedAnswers(submissionId: string) {
  return useQuery({
    queryKey: gradingKeys.extracted(submissionId),
    enabled: Boolean(submissionId),
    queryFn: async (): Promise<ExtractedAnswerDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.grading?.extractAnswers) {
        const res = await window.tibyan.grading.extractAnswers(submissionId);
        if (!res.success) throw new Error(res.error.message || 'فشل استخراج الإجابات');
        return res.data;
      }
      return [];
    },
  });
}

export function useExtractAnswers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (submissionId: string): Promise<ExtractedAnswerDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.grading?.extractAnswers) {
        const res = await window.tibyan.grading.extractAnswers(submissionId);
        if (!res.success) throw new Error(res.error.message || 'فشل استخراج الإجابات');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (_data, submissionId) => {
      queryClient.invalidateQueries({ queryKey: gradingKeys.extracted(submissionId) });
    },
  });
}

export function useGradeSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GradeSubmissionInput): Promise<GradingRunDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.grading?.gradeSubmission) {
        const res = await window.tibyan.grading.gradeSubmission(input);
        if (!res.success) throw new Error(res.error.message || 'فشل تقييم التسليم');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: gradingKeys.decisions(vars.submissionId) });
      queryClient.invalidateQueries({ queryKey: gradingKeys.runs(vars.submissionId) });
      queryClient.invalidateQueries({ queryKey: gradingKeys.status(vars.submissionId) });
    },
  });
}

export function useGradeSubmissionAi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GradeSubmissionInput): Promise<GradingRunDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.grading?.gradeSubmissionAi) {
        const res = await window.tibyan.grading.gradeSubmissionAi(input);
        if (!res.success) throw new Error(res.error.message || 'فشل التقييم بالذكاء الاصطناعي');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: gradingKeys.decisions(vars.submissionId) });
      queryClient.invalidateQueries({ queryKey: gradingKeys.runs(vars.submissionId) });
      queryClient.invalidateQueries({ queryKey: gradingKeys.status(vars.submissionId) });
    },
  });
}

export function useGradingDecisions(submissionId: string) {
  return useQuery({
    queryKey: gradingKeys.decisions(submissionId),
    enabled: Boolean(submissionId),
    queryFn: async (): Promise<GradingDecisionDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.grading?.getDecisions) {
        const res = await window.tibyan.grading.getDecisions(submissionId);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل قرارات التقييم');
        return res.data;
      }
      return [];
    },
  });
}

export function useOverrideDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: OverrideGradingDecisionInput): Promise<GradingDecisionDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.grading?.overrideDecision) {
        const res = await window.tibyan.grading.overrideDecision(input);
        if (!res.success) throw new Error(res.error.message || 'فشل تعديل قرار التقييم');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gradingKeys.all });
    },
  });
}

export function useReviewAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReviewExtractedAnswerInput): Promise<ExtractedAnswerDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.grading?.reviewAnswer) {
        const res = await window.tibyan.grading.reviewAnswer(input);
        if (!res.success) throw new Error(res.error.message || 'فشل مراجعة الإجابة');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gradingKeys.all });
    },
  });
}

export function useFinalizeSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: FinalizeSubmissionInput): Promise<void> => {
      if (typeof window !== 'undefined' && window.tibyan?.grading?.finalize) {
        const res = await window.tibyan.grading.finalize(input);
        if (!res.success) throw new Error(res.error.message || 'فشل تأكيد التقييم النهائي');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: gradingKeys.decisions(vars.submissionId) });
      queryClient.invalidateQueries({ queryKey: gradingKeys.status(vars.submissionId) });
    },
  });
}

export function useRegradeSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegradeSubmissionInput): Promise<GradingRunDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.grading?.regrade) {
        const res = await window.tibyan.grading.regrade(input);
        if (!res.success) throw new Error(res.error.message || 'فشل إعادة التقييم');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: gradingKeys.decisions(vars.submissionId) });
      queryClient.invalidateQueries({ queryKey: gradingKeys.runs(vars.submissionId) });
      queryClient.invalidateQueries({ queryKey: gradingKeys.status(vars.submissionId) });
    },
  });
}

export function useGradingRuns(submissionId: string) {
  return useQuery({
    queryKey: gradingKeys.runs(submissionId),
    enabled: Boolean(submissionId),
    queryFn: async (): Promise<GradingRunDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.grading?.getRuns) {
        const res = await window.tibyan.grading.getRuns(submissionId);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل سجلات التقييم');
        return res.data;
      }
      return [];
    },
  });
}

export function useGradingStatus(submissionId: string) {
  return useQuery({
    queryKey: gradingKeys.status(submissionId),
    enabled: Boolean(submissionId),
    queryFn: async (): Promise<{ status: string; totalAwarded: number; totalMax: number }> => {
      if (typeof window !== 'undefined' && window.tibyan?.grading?.getSubmissionStatus) {
        const res = await window.tibyan.grading.getSubmissionStatus(submissionId);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل حالة التقييم');
        return res.data;
      }
      return { status: 'NOT_STARTED', totalAwarded: 0, totalMax: 0 };
    },
  });
}
