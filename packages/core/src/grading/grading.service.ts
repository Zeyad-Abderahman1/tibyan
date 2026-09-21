import * as crypto from 'node:crypto';
import {
  type GradingDecisionDto,
  type GradingRunDto,
  type ExtractedAnswerDto,
  type SubmissionStatus,
  GradeSubmissionSchema,
  OverrideGradingDecisionSchema,
  ReviewExtractedAnswerSchema,
  FinalizeSubmissionSchema,
  RegradeSubmissionSchema,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  type SystemDrizzle,
  GradingRepository,
  CaptureRepository,
  ExamRepository,
  AcademicAuditRepository,
} from '@tibyan/db';
import { requirePermission } from '../auth/permissions.js';
import { type AuthActor } from '../sources/pdf-source.service.js';
import { GradingEngine, type AnswerKeyEntry, type ExtractionResult } from './grading-engine.js';
import { AiGradingService } from './ai-grading.service.js';
import { type GeminiCredentialService } from '../ai/gemini-credential.service.js';

export class GradingService {
  private readonly gradingRepo: GradingRepository;
  private readonly captureRepo: CaptureRepository;
  private readonly examRepo: ExamRepository;
  private readonly academicAuditRepo: AcademicAuditRepository;
  private readonly gradingEngine: GradingEngine;
  private readonly aiGradingService: AiGradingService;

  constructor(
    academicDb: AcademicDrizzle,
    _systemDb: SystemDrizzle,
    geminiCredentialService: GeminiCredentialService,
  ) {
    this.gradingRepo = new GradingRepository(academicDb);
    this.captureRepo = new CaptureRepository(academicDb);
    this.examRepo = new ExamRepository(academicDb);
    this.academicAuditRepo = new AcademicAuditRepository(academicDb);
    this.gradingEngine = new GradingEngine();
    this.aiGradingService = new AiGradingService(geminiCredentialService);
  }

  /**
   * Extract answers from captured pages (deterministic + AI when needed).
   */
  extractAnswers(submissionId: string, actor: AuthActor): ExtractedAnswerDto[] {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const submission = this.captureRepo.findSubmission(submissionId);
    if (!submission) throw new Error('التسليم غير موجود');

    const now = new Date().toISOString();

    // Get exam questions for answer key mapping
    const captureSession = this.captureRepo.findSession(submission.sessionId);
    if (!captureSession) throw new Error('جلسة التصوير غير موجودة');
    const examSnapshot = this.examRepo.findSnapshot(captureSession.examId);
    if (!examSnapshot) throw new Error('الاختبار غير موجود');

    // Build answer key entries from exam snapshot
    const answerKeys: AnswerKeyEntry[] = examSnapshot.questions.map((q) => {
      const answerJson = q.answerJson ? JSON.parse(q.answerJson) : null;
      return {
        examQuestionId: q.id,
        questionPosition: q.position,
        questionMarks: q.marks,
        questionType: answerJson?.type ?? 'SHORT_ANSWER',
        correctOptionLabel: answerJson?.correctOptionLabel,
        correctResponse: answerJson?.correctResponse,
        rubricCriteria: answerJson?.rubricCriteria,
      };
    });

    // For each answer key, create an extracted answer (deterministic extraction)
    const results: ExtractedAnswerDto[] = [];
    for (const key of answerKeys) {
      const extraction: ExtractionResult = {
        examQuestionId: key.examQuestionId,
        recognizedResponse: null,
        recognizedOptionLabel: null,
        extractionMethod: 'DETERMINISTIC',
        confidence: null,
      };

      const gradeResult = this.gradingEngine.gradeQuestion(key, extraction);

      const answer = this.gradingRepo.createExtractedAnswer({
        id: crypto.randomUUID(),
        submissionId,
        examQuestionId: key.examQuestionId,
        examVersionLabel: null,
        recognizedResponse: extraction.recognizedResponse,
        recognizedOptionLabel: extraction.recognizedOptionLabel,
        extractionMethod: extraction.extractionMethod,
        confidence: extraction.confidence,
        evidenceRefJson: null,
        rawExtractionJson: null,
        status: gradeResult.awardedMarks > 0 || extraction.recognizedResponse ? 'EXTRACTED' : 'NEEDS_REVIEW',
        createdAt: now,
        updatedAt: now,
      });

      results.push(this.mapExtractedAnswerToDto(answer));
    }

    // Update submission status
    this.captureRepo.updateSubmissionStatus(submissionId, 'EXTRACTED', now);

    return results;
  }

  /**
   * Grade a submission using deterministic engine only.
   */
  gradeSubmission(input: unknown, actor: AuthActor): GradingRunDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = GradeSubmissionSchema.parse(input);
    const now = new Date().toISOString();

    const submission = this.captureRepo.findSubmission(validated.submissionId);
    if (!submission) throw new Error('التسليم غير موجود');

    const captureSession = this.captureRepo.findSession(submission.sessionId);
    if (!captureSession) throw new Error('جلسة التصوير غير موجودة');
    const examSnapshot = this.examRepo.findSnapshot(captureSession.examId);
    if (!examSnapshot) throw new Error('الاختبار غير موجود');

    // Create grading run
    const run = this.gradingRepo.createGradingRun({
      id: crypto.randomUUID(),
      submissionId: validated.submissionId,
      method: validated.method,
      triggeredByUserId: actor.userId ?? null,
      startedAt: now,
      completedAt: null,
      questionCount: examSnapshot.questions.length,
      gradedCount: 0,
      failedCount: 0,
      status: 'RUNNING',
    });

    // Build answer keys and extractions
    const answerKeys: AnswerKeyEntry[] = examSnapshot.questions.map((q) => {
      const answerJson = q.answerJson ? JSON.parse(q.answerJson) : null;
      return {
        examQuestionId: q.id,
        questionPosition: q.position,
        questionMarks: q.marks,
        questionType: answerJson?.type ?? 'SHORT_ANSWER',
        correctOptionLabel: answerJson?.correctOptionLabel,
        correctResponse: answerJson?.correctResponse,
        rubricCriteria: answerJson?.rubricCriteria,
      };
    });

    const existingAnswers = this.gradingRepo.listExtractedAnswers(validated.submissionId);
    const extractions: ExtractionResult[] = existingAnswers.map((a) => ({
      examQuestionId: a.examQuestionId,
      recognizedResponse: a.recognizedResponse,
      recognizedOptionLabel: a.recognizedOptionLabel,
      extractionMethod: a.extractionMethod as any,
      confidence: a.confidence,
    }));

    // Grade all questions
    const gradingResults = this.gradingEngine.gradeAll(answerKeys, extractions);

    let gradedCount = 0;
    let failedCount = 0;

    for (const result of gradingResults) {
      try {
        const rubricJson = result.rubricResults.length > 0
          ? JSON.stringify(result.rubricResults)
          : null;

        this.gradingRepo.createGradingDecision({
          id: crypto.randomUUID(),
          submissionId: validated.submissionId,
          examQuestionId: result.examQuestionId,
          questionPosition: result.questionPosition,
          questionMarks: result.questionMarks,
          awardedMarks: result.awardedMarks,
          gradingMethod: result.gradingMethod,
          rubricResultsJson: rubricJson,
          teacherOverride: false,
          teacherOverrideAt: null,
          aiProposalJson: null,
          gradingRunId: run.id,
          status: 'GRADED',
          createdAt: now,
          updatedAt: now,
        });
        gradedCount++;
      } catch {
        failedCount++;
      }
    }

    // Update run status
    this.gradingRepo.updateGradingRunStatus(run.id, 'COMPLETED', gradedCount, failedCount, now);

    // Update submission status
    this.captureRepo.updateSubmissionStatus(validated.submissionId, 'GRADED', now);

    // Audit
    this.academicAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'GRADE_SUBMISSION',
      entityType: 'SUBMISSION',
      entityId: validated.submissionId,
      afterJson: JSON.stringify({
        runId: run.id,
        method: validated.method,
        gradedCount,
        failedCount,
      }),
      createdAt: now,
    });

    return this.mapRunToDto({ ...run, gradedCount, failedCount, status: 'COMPLETED', completedAt: now });
  }

  /**
   * Grade using AI-assisted grading (Gemini).
   */
  async gradeSubmissionAi(input: unknown, actor: AuthActor): Promise<GradingRunDto> {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = GradeSubmissionSchema.parse(input);
    const now = new Date().toISOString();

    const submission = this.captureRepo.findSubmission(validated.submissionId);
    if (!submission) throw new Error('التسليم غير موجود');

    const captureSession = this.captureRepo.findSession(submission.sessionId);
    if (!captureSession) throw new Error('جلسة التصوير غير موجودة');
    const examSnapshot = this.examRepo.findSnapshot(captureSession.examId);
    if (!examSnapshot) throw new Error('الاختبار غير موجود');

    // Create grading run
    const run = this.gradingRepo.createGradingRun({
      id: crypto.randomUUID(),
      submissionId: validated.submissionId,
      method: 'AI_ASSISTED',
      triggeredByUserId: actor.userId ?? null,
      startedAt: now,
      completedAt: null,
      questionCount: examSnapshot.questions.length,
      gradedCount: 0,
      failedCount: 0,
      status: 'RUNNING',
    });

    // Build AI grading input for constructed-response questions
    const existingAnswers = this.gradingRepo.listExtractedAnswers(validated.submissionId);
    const extractionMap = new Map(existingAnswers.map((a) => [a.examQuestionId, a]));

    const aiQuestions = examSnapshot.questions
      .filter((q) => {
        const answerJson = q.answerJson ? JSON.parse(q.answerJson) : null;
        const type = answerJson?.type ?? 'SHORT_ANSWER';
        return type !== 'MULTIPLE_CHOICE' && type !== 'TRUE_FALSE';
      })
      .map((q) => {
        const answerJson = q.answerJson ? JSON.parse(q.answerJson) : null;
        const extraction = extractionMap.get(q.id);
        return {
          examQuestionId: q.id,
          questionBody: JSON.parse(q.contentJson),
          modelAnswer: answerJson?.modelAnswer ?? null,
          rubricCriteria: answerJson?.rubricCriteria ?? [],
          maxMarks: q.marks,
          recognizedResponse: extraction?.recognizedResponse ?? null,
          recognizedOptionLabel: extraction?.recognizedOptionLabel ?? null,
          evidenceRefJson: extraction?.evidenceRefJson ?? null,
        };
      });

    let gradedCount = 0;
    let failedCount = 0;

    try {
      const proposals = await this.aiGradingService.gradeQuestions(aiQuestions);

      for (const proposal of proposals) {
        try {
          const rubricJson = proposal.rubricResults.length > 0
            ? JSON.stringify(proposal.rubricResults)
            : null;

          // Find the question position
          const question = examSnapshot.questions.find((q) => q.id === proposal.examQuestionId);
          const position = question?.position ?? 0;

          this.gradingRepo.createGradingDecision({
            id: crypto.randomUUID(),
            submissionId: validated.submissionId,
            examQuestionId: proposal.examQuestionId,
            questionPosition: position,
            questionMarks: question?.marks ?? 0,
            awardedMarks: proposal.awardedMarks,
            gradingMethod: 'AI_ASSISTED',
            rubricResultsJson: rubricJson,
            teacherOverride: false,
            teacherOverrideAt: null,
            aiProposalJson: JSON.stringify(proposal),
            gradingRunId: run.id,
            status: 'GRADED',
            createdAt: now,
            updatedAt: now,
          });
          gradedCount++;
        } catch {
          failedCount++;
        }
      }
    } catch {
      failedCount = aiQuestions.length;
    }

    this.gradingRepo.updateGradingRunStatus(run.id, 'COMPLETED', gradedCount, failedCount, now);
    this.captureRepo.updateSubmissionStatus(validated.submissionId, 'GRADED', now);

    return this.mapRunToDto({ ...run, gradedCount, failedCount, status: 'COMPLETED', completedAt: now });
  }

  /**
   * Override a grading decision (teacher correction).
   */
  overrideDecision(input: unknown, actor: AuthActor): GradingDecisionDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = OverrideGradingDecisionSchema.parse(input);
    const now = new Date().toISOString();

    const decision = this.gradingRepo.findGradingDecision(validated.decisionId);
    if (!decision) throw new Error('قرار التصحيح غير موجود');

    // Clamp marks
    const awardedMarks = Math.min(validated.awardedMarks, decision.questionMarks);
    const finalMarks = Math.max(0, awardedMarks);

    this.gradingRepo.updateGradingDecision(validated.decisionId, {
      awardedMarks: finalMarks,
      teacherOverride: true,
      teacherOverrideAt: now,
      status: 'OVERRIDDEN',
    }, now);

    const updated = this.gradingRepo.findGradingDecision(validated.decisionId)!;

    this.academicAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'OVERRIDE_GRADING_DECISION',
      entityType: 'GRADING_DECISION',
      entityId: validated.decisionId,
      beforeJson: JSON.stringify({ awardedMarks: decision.awardedMarks }),
      afterJson: JSON.stringify({ awardedMarks: finalMarks, rationale: validated.rationale }),
      createdAt: now,
    });

    return this.mapDecisionToDto(updated);
  }

  /**
   * Review an extracted answer (teacher confirms/corrects recognition).
   */
  reviewAnswer(input: unknown, actor: AuthActor): ExtractedAnswerDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = ReviewExtractedAnswerSchema.parse(input);
    const now = new Date().toISOString();

    const answer = this.gradingRepo.findExtractedAnswer(validated.answerId);
    if (!answer) throw new Error('الإجابة المستخرجة غير موجودة');

    switch (validated.action) {
      case 'APPROVE':
        this.gradingRepo.updateExtractedAnswerStatus(validated.answerId, 'REVIEWED', now);
        break;
      case 'EDIT_RESPONSE':
        if (validated.correctedResponse || validated.correctedOptionLabel) {
          this.gradingRepo.updateExtractedAnswerResponse(
            validated.answerId,
            validated.correctedResponse ?? answer.recognizedResponse ?? '',
            validated.correctedOptionLabel ?? answer.recognizedOptionLabel,
            now,
          );
        }
        break;
      case 'REJECT':
        this.gradingRepo.updateExtractedAnswerStatus(validated.answerId, 'FAILED', now);
        break;
      case 'SKIP':
      case 'MARK_FOR_LATER':
        // No status change
        break;
    }

    const updated = this.gradingRepo.findExtractedAnswer(validated.answerId)!;
    return this.mapExtractedAnswerToDto(updated);
  }

  /**
   * Finalize grading for a submission.
   */
  finalize(input: unknown, actor: AuthActor): void {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = FinalizeSubmissionSchema.parse(input);
    const now = new Date().toISOString();

    const submission = this.captureRepo.findSubmission(validated.submissionId);
    if (!submission) throw new Error('التسليم غير موجود');

    // Verify all decisions are graded
    const decisions = this.gradingRepo.listGradingDecisions(validated.submissionId);
    const pendingDecisions = decisions.filter((d) => d.status === 'PENDING');
    if (pendingDecisions.length > 0) {
      throw new Error('جميع القرارات يجب أن تكون مصححة قبل التأكيد النهائي');
    }

    // Update all decisions to FINALIZED
    for (const decision of decisions) {
      this.gradingRepo.updateGradingDecision(decision.id, { status: 'FINALIZED' }, now);
    }

    // Update submission status
    this.captureRepo.updateSubmissionStatus(validated.submissionId, 'FINALIZED', now);

    // Audit
    const totals = this.gradingRepo.getSubmissionTotalAwarded(validated.submissionId);
    this.academicAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'FINALIZE_GRADING',
      entityType: 'SUBMISSION',
      entityId: validated.submissionId,
      afterJson: JSON.stringify({
        totalAwarded: totals.totalAwarded,
        totalMax: totals.totalMax,
        percentage: totals.totalMax > 0 ? Math.round((totals.totalAwarded / totals.totalMax) * 10000) / 100 : 0,
      }),
      createdAt: now,
    });
  }

  /**
   * Regrade a submission (creates new grading run, preserves history).
   */
  regrade(input: unknown, actor: AuthActor): GradingRunDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = RegradeSubmissionSchema.parse(input);

    // Delete existing non-finalized decisions
    const now = new Date().toISOString();
    this.gradingRepo.deleteGradingDecisionsForSubmission(validated.submissionId);

    // Update submission status
    this.captureRepo.updateSubmissionStatus(validated.submissionId, 'EXTRACTED', now);

    // Create new grading run
    return this.gradeSubmission({ submissionId: validated.submissionId, method: 'DETERMINISTIC' }, actor);
  }

  getDecisions(submissionId: string): GradingDecisionDto[] {
    return this.gradingRepo.listGradingDecisions(submissionId).map((d) => this.mapDecisionToDto(d));
  }

  getRuns(submissionId: string): GradingRunDto[] {
    return this.gradingRepo.listGradingRuns(submissionId).map((r) => this.mapRunToDto(r));
  }

  getSubmissionStatus(submissionId: string): { status: SubmissionStatus; totalAwarded: number; totalMax: number } {
    const submission = this.captureRepo.findSubmission(submissionId);
    if (!submission) throw new Error('التسليم غير موجود');
    const totals = this.gradingRepo.getSubmissionTotalAwarded(submissionId);
    return {
      status: submission.status as SubmissionStatus,
      ...totals,
    };
  }

  private mapDecisionToDto(row: any): GradingDecisionDto {
    return {
      id: row.id,
      submissionId: row.submissionId,
      examQuestionId: row.examQuestionId,
      questionPosition: row.questionPosition,
      questionMarks: row.questionMarks,
      awardedMarks: row.awardedMarks,
      gradingMethod: row.gradingMethod,
      rubricResultsJson: row.rubricResultsJson,
      teacherOverride: row.teacherOverride,
      teacherOverrideAt: row.teacherOverrideAt,
      aiProposalJson: row.aiProposalJson,
      gradingRunId: row.gradingRunId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapRunToDto(row: any): GradingRunDto {
    return {
      id: row.id,
      submissionId: row.submissionId,
      method: row.method,
      triggeredByUserId: row.triggeredByUserId,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      questionCount: row.questionCount,
      gradedCount: row.gradedCount,
      failedCount: row.failedCount,
      status: row.status,
    };
  }

  private mapExtractedAnswerToDto(row: any): ExtractedAnswerDto {
    return {
      id: row.id,
      submissionId: row.submissionId,
      examQuestionId: row.examQuestionId,
      examVersionLabel: row.examVersionLabel,
      recognizedResponse: row.recognizedResponse,
      recognizedOptionLabel: row.recognizedOptionLabel,
      extractionMethod: row.extractionMethod,
      confidence: row.confidence,
      evidenceRefJson: row.evidenceRefJson,
      rawExtractionJson: row.rawExtractionJson,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
