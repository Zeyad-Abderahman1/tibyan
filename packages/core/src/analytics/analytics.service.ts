import {
  type ExamAnalyticsSummaryDto,
  type ScoreDistributionDto,
  type QuestionPerformanceDto,
  type SkillPerformanceDto,
  type StudentExamResultDto,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  type SystemDrizzle,
  GradingRepository,
  CaptureRepository,
  ExamRepository,
} from '@tibyan/db';

/**
 * Analytics service.
 * Computes deterministic analytics from finalized authoritative grading data.
 * All numeric calculations are deterministic — no AI used.
 */
export class AnalyticsService {
  private readonly gradingRepo: GradingRepository;
  private readonly captureRepo: CaptureRepository;
  private readonly examRepo: ExamRepository;

  constructor(academicDb: AcademicDrizzle, _systemDb: SystemDrizzle) {
    this.gradingRepo = new GradingRepository(academicDb);
    this.captureRepo = new CaptureRepository(academicDb);
    this.examRepo = new ExamRepository(academicDb);
  }

  getExamSummary(examId: string): ExamAnalyticsSummaryDto {
    const examSnapshot = this.examRepo.findSnapshot(examId);
    if (!examSnapshot) throw new Error('الاختبار غير موجود');

    const sessions = this.captureRepo.listSessions().filter((s) => s.examId === examId);
    const allSubmissions = sessions.flatMap((s) => this.captureRepo.listSubmissions(s.id));
    const finalizedSubmissions = allSubmissions.filter((s) => s.status === 'FINALIZED');

    if (finalizedSubmissions.length === 0) {
      return {
        examId,
        examTitle: examSnapshot.exam.title,
        totalSubmissions: allSubmissions.length,
        finalizedCount: 0,
        averageScore: null,
        medianScore: null,
        highestScore: null,
        lowestScore: null,
        standardDeviation: null,
        averagePercentage: null,
      };
    }

    const totals = finalizedSubmissions.map((s) => this.gradingRepo.getSubmissionTotalAwarded(s.id));
    const percentages = totals.map((t) => t.totalMax > 0 ? (t.totalAwarded / t.totalMax) * 100 : 0);
    const scores = totals.map((t) => t.totalAwarded);

    const sortedScores = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sortedScores.length / 2);
    const median = sortedScores.length % 2 === 0
      ? ((sortedScores[mid - 1] ?? 0) + (sortedScores[mid] ?? 0)) / 2
      : (sortedScores[mid] ?? 0);

    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const avgPct = percentages.reduce((s, v) => s + v, 0) / percentages.length;

    const variance = scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    return {
      examId,
      examTitle: examSnapshot.exam.title,
      totalSubmissions: allSubmissions.length,
      finalizedCount: finalizedSubmissions.length,
      averageScore: Math.round(avg * 100) / 100,
      medianScore: sortedScores.length > 0 ? median : null,
      highestScore: sortedScores.length > 0 ? sortedScores[sortedScores.length - 1]! : null,
      lowestScore: sortedScores.length > 0 ? sortedScores[0]! : null,
      standardDeviation: Math.round(stdDev * 100) / 100,
      averagePercentage: Math.round(avgPct * 100) / 100,
    };
  }

  getScoreDistribution(examId: string): ScoreDistributionDto {
    const examSnapshot = this.examRepo.findSnapshot(examId);
    if (!examSnapshot) throw new Error('الاختبار غير موجود');

    const sessions = this.captureRepo.listSessions().filter((s) => s.examId === examId);
    const allSubmissions = sessions.flatMap((s) => this.captureRepo.listSubmissions(s.id));
    const finalizedSubmissions = allSubmissions.filter((s) => s.status === 'FINALIZED');

    const scores = finalizedSubmissions.map((s) => {
      const totals = this.gradingRepo.getSubmissionTotalAwarded(s.id);
      return totals.totalMax > 0 ? (totals.totalAwarded / totals.totalMax) * 100 : 0;
    });

    // Create 10 buckets (0-10, 10-20, ..., 90-100)
    const bucketCount = 10;
    const bucketSize = 100 / bucketCount;
    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const start = i * bucketSize;
      const end = (i + 1) * bucketSize;
      const count = scores.filter((s) => s >= start && s < end).length;
      return {
        rangeStart: Math.round(start),
        rangeEnd: Math.round(end),
        count,
        percentage: scores.length > 0 ? Math.round((count / scores.length) * 10000) / 100 : 0,
      };
    });

    // Include 100 in the last bucket
    const lastBucket = buckets[buckets.length - 1];
    if (lastBucket) {
      lastBucket.count += scores.filter((s) => s === 100).length;
    }

    return {
      examId,
      buckets,
      totalStudents: finalizedSubmissions.length,
    };
  }

  getQuestionPerformance(examId: string): QuestionPerformanceDto[] {
    const examSnapshot = this.examRepo.findSnapshot(examId);
    if (!examSnapshot) throw new Error('الاختبار غير موجود');

    const sessions = this.captureRepo.listSessions().filter((s) => s.examId === examId);
    const allSubmissions = sessions.flatMap((s) => this.captureRepo.listSubmissions(s.id));
    const finalizedSubmissions = allSubmissions.filter((s) => s.status === 'FINALIZED');

    return examSnapshot.questions.map((question) => {
      const decisions = finalizedSubmissions
        .flatMap((s) => this.gradingRepo.listGradingDecisions(s.id))
        .filter((d) => d.examQuestionId === question.id);

      const attempts = decisions.length;
      const fullCredit = decisions.filter((d) => d.awardedMarks === question.marks).length;
      const partialCredit = decisions.filter((d) => d.awardedMarks > 0 && d.awardedMarks < question.marks).length;
      const zeroCredit = decisions.filter((d) => d.awardedMarks === 0).length;
      const omitted = finalizedSubmissions.length - attempts;

      const avgMarks = attempts > 0
        ? decisions.reduce((s, d) => s + d.awardedMarks, 0) / attempts
        : null;

      const successPct = attempts > 0
        ? Math.round((fullCredit / attempts) * 10000) / 100
        : null;

      return {
        examQuestionId: question.id,
        questionPosition: question.position,
        questionType: JSON.parse(question.contentJson)?.type ?? 'UNKNOWN',
        maxMarks: question.marks,
        attempts,
        fullCreditCount: fullCredit,
        partialCreditCount: partialCredit,
        zeroCreditCount: zeroCredit,
        omittedCount: omitted,
        averageAwardedMarks: avgMarks !== null ? Math.round(avgMarks * 100) / 100 : null,
        successPercentage: successPct,
        curriculumNodeIds: JSON.parse(question.curriculumNodeIdsJson),
      };
    });
  }

  getSkillPerformance(examId: string): SkillPerformanceDto[] {
    const questionPerf = this.getQuestionPerformance(examId);

    // Group by curriculum node
    const skillMap = new Map<string, {
      attempts: number;
      totalAwarded: number;
      totalMax: number;
      title: string;
      code: string;
    }>();

    for (const qp of questionPerf) {
      for (const nodeId of qp.curriculumNodeIds) {
        if (!skillMap.has(nodeId)) {
          skillMap.set(nodeId, {
            attempts: 0,
            totalAwarded: 0,
            totalMax: 0,
            title: nodeId,
            code: nodeId,
          });
        }
        const skill = skillMap.get(nodeId)!;
        skill.attempts += qp.attempts;
        skill.totalAwarded += (qp.averageAwardedMarks ?? 0) * qp.attempts;
        skill.totalMax += qp.maxMarks * qp.attempts;
      }
    }

    return Array.from(skillMap.entries()).map(([nodeId, data]) => ({
      curriculumNodeId: nodeId,
      nodeTitle: data.title,
      nodeCode: data.code,
      totalAttempts: data.attempts,
      averageAwardedMarks: data.attempts > 0 ? Math.round((data.totalAwarded / data.attempts) * 100) / 100 : null,
      averageMaxMarks: data.attempts > 0 ? Math.round((data.totalMax / data.attempts) * 100) / 100 : null,
      successPercentage: data.totalMax > 0 ? Math.round((data.totalAwarded / data.totalMax) * 10000) / 100 : null,
      sampleSize: data.attempts,
    }));
  }

  getStudentResult(submissionId: string): StudentExamResultDto | null {
    const submission = this.captureRepo.findSubmission(submissionId);
    if (!submission || !submission.studentId) return null;

    const session = this.captureRepo.findSession(submission.sessionId);
    if (!session) return null;

    const examSnapshot = this.examRepo.findSnapshot(session.examId);
    if (!examSnapshot) return null;

    const decisions = this.gradingRepo.listGradingDecisions(submissionId);
    const totals = this.gradingRepo.getSubmissionTotalAwarded(submissionId);

    const questionResults = decisions.map((d) => {
      const rubricResults = d.rubricResultsJson ? JSON.parse(d.rubricResultsJson) : undefined;
      return {
        examQuestionId: d.examQuestionId,
        questionPosition: d.questionPosition,
        maxMarks: d.questionMarks,
        awardedMarks: d.awardedMarks,
        gradingMethod: d.gradingMethod,
        teacherOverride: d.teacherOverride,
        rubricResults,
      };
    });

    // Compute skill performance for this student
    const skillPerformance = this.computeStudentSkillPerformance(examSnapshot.questions, decisions);

    return {
      studentId: submission.studentId,
      studentName: submission.studentNameSnapshot ?? '',
      studentCode: submission.studentCodeSnapshot ?? '',
      submissionId,
      examId: session.examId,
      examTitle: examSnapshot.exam.title,
      totalAwardedMarks: totals.totalAwarded,
      totalMaxMarks: totals.totalMax,
      percentage: totals.totalMax > 0 ? Math.round((totals.totalAwarded / totals.totalMax) * 10000) / 100 : null,
      questionResults,
      skillPerformance,
      isFinalized: submission.status === 'FINALIZED',
      finalizedAt: submission.status === 'FINALIZED' ? submission.updatedAt : null,
    };
  }

  listStudentResults(examId: string): StudentExamResultDto[] {
    const sessions = this.captureRepo.listSessions().filter((s) => s.examId === examId);
    const allSubmissions = sessions.flatMap((s) => this.captureRepo.listSubmissions(s.id));
    const finalizedSubmissions = allSubmissions.filter((s) => s.status === 'FINALIZED');

    return finalizedSubmissions
      .map((s) => this.getStudentResult(s.id))
      .filter((r): r is StudentExamResultDto => r !== null);
  }

  private computeStudentSkillPerformance(
    questions: Array<{ id: string; curriculumNodeIdsJson: string; marks: number }>,
    decisions: Array<{ examQuestionId: string; awardedMarks: number }>,
  ): Array<{
    curriculumNodeId: string;
    nodeTitle: string;
    nodeCode: string;
    totalAttempts: number;
    averageAwardedMarks: number | null;
    averageMaxMarks: number | null;
    successPercentage: number | null;
    sampleSize: number;
  }> {
    const decisionMap = new Map(decisions.map((d) => [d.examQuestionId, d]));
    const skillMap = new Map<string, { awarded: number; max: number; count: number }>();

    for (const q of questions) {
      const nodeIds: string[] = JSON.parse(q.curriculumNodeIdsJson);
      const decision = decisionMap.get(q.id);
      for (const nodeId of nodeIds) {
        if (!skillMap.has(nodeId)) skillMap.set(nodeId, { awarded: 0, max: 0, count: 0 });
        const skill = skillMap.get(nodeId)!;
        skill.awarded += decision?.awardedMarks ?? 0;
        skill.max += q.marks;
        skill.count++;
      }
    }

    return Array.from(skillMap.entries()).map(([nodeId, data]) => ({
      curriculumNodeId: nodeId,
      nodeTitle: nodeId,
      nodeCode: nodeId,
      totalAttempts: data.count,
      averageAwardedMarks: data.count > 0 ? Math.round((data.awarded / data.count) * 100) / 100 : null,
      averageMaxMarks: data.count > 0 ? Math.round((data.max / data.count) * 100) / 100 : null,
      successPercentage: data.max > 0 ? Math.round((data.awarded / data.max) * 10000) / 100 : null,
      sampleSize: data.count,
    }));
  }
}
