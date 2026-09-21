import { useQuery } from '@tanstack/react-query';
import type {
  ExamAnalyticsSummaryDto,
  ScoreDistributionDto,
  QuestionPerformanceDto,
  SkillPerformanceDto,
  StudentExamResultDto,
} from '@tibyan/contracts';

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (examId: string) => [...analyticsKeys.all, 'summary', examId] as const,
  distribution: (examId: string) => [...analyticsKeys.all, 'distribution', examId] as const,
  questions: (examId: string) => [...analyticsKeys.all, 'questions', examId] as const,
  skills: (examId: string) => [...analyticsKeys.all, 'skills', examId] as const,
  studentResult: (submissionId: string) => [...analyticsKeys.all, 'studentResult', submissionId] as const,
  studentResults: (examId: string) => [...analyticsKeys.all, 'studentResults', examId] as const,
};

export function useExamSummary(examId: string) {
  return useQuery({
    queryKey: analyticsKeys.summary(examId),
    enabled: Boolean(examId),
    queryFn: async (): Promise<ExamAnalyticsSummaryDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.analytics?.getExamSummary) {
        const res = await window.tibyan.analytics.getExamSummary(examId);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل ملخص الاختبار');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
  });
}

export function useScoreDistribution(examId: string) {
  return useQuery({
    queryKey: analyticsKeys.distribution(examId),
    enabled: Boolean(examId),
    queryFn: async (): Promise<ScoreDistributionDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.analytics?.getScoreDistribution) {
        const res = await window.tibyan.analytics.getScoreDistribution(examId);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل توزيع الدرجات');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
  });
}

export function useQuestionPerformance(examId: string) {
  return useQuery({
    queryKey: analyticsKeys.questions(examId),
    enabled: Boolean(examId),
    queryFn: async (): Promise<QuestionPerformanceDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.analytics?.getQuestionPerformance) {
        const res = await window.tibyan.analytics.getQuestionPerformance(examId);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل أداء الأسئلة');
        return res.data;
      }
      return [];
    },
  });
}

export function useSkillPerformance(examId: string) {
  return useQuery({
    queryKey: analyticsKeys.skills(examId),
    enabled: Boolean(examId),
    queryFn: async (): Promise<SkillPerformanceDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.analytics?.getSkillPerformance) {
        const res = await window.tibyan.analytics.getSkillPerformance(examId);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل أداء المهارات');
        return res.data;
      }
      return [];
    },
  });
}

export function useStudentExamResult(submissionId: string) {
  return useQuery({
    queryKey: analyticsKeys.studentResult(submissionId),
    enabled: Boolean(submissionId),
    queryFn: async (): Promise<StudentExamResultDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.analytics?.getStudentResult) {
        const res = await window.tibyan.analytics.getStudentResult(submissionId);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل نتيجة الطالب');
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
  });
}

export function useStudentResults(examId: string) {
  return useQuery({
    queryKey: analyticsKeys.studentResults(examId),
    enabled: Boolean(examId),
    queryFn: async (): Promise<StudentExamResultDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.analytics?.listStudentResults) {
        const res = await window.tibyan.analytics.listStudentResults(examId);
        if (!res.success) throw new Error(res.error.message || 'فشل تحميل نتائج الطلاب');
        return res.data;
      }
      return [];
    },
  });
}
