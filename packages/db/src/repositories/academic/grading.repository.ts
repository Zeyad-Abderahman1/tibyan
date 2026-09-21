import { asc, eq, type InferInsertModel } from 'drizzle-orm';
import type { AcademicDrizzle } from '../../connection.js';
import {
  extractedAnswers,
  gradingRuns,
  gradingDecisions,
  type ExtractedAnswerRow,
  type GradingRunRow,
  type GradingDecisionRow,
} from '../../schema/academic.schema.js';

export class GradingRepository {
  constructor(private readonly db: AcademicDrizzle) {}

  createExtractedAnswer(answer: InferInsertModel<typeof extractedAnswers>): ExtractedAnswerRow {
    this.db.insert(extractedAnswers).values(answer).run();
    return this.db.select().from(extractedAnswers).where(eq(extractedAnswers.id, answer.id)).get()!;
  }

  findExtractedAnswer(id: string): ExtractedAnswerRow | null {
    return this.db.select().from(extractedAnswers).where(eq(extractedAnswers.id, id)).get() ?? null;
  }

  listExtractedAnswers(submissionId: string): ExtractedAnswerRow[] {
    return this.db.select().from(extractedAnswers)
      .where(eq(extractedAnswers.submissionId, submissionId))
      .orderBy(asc(extractedAnswers.createdAt))
      .all();
  }

  updateExtractedAnswerStatus(id: string, status: string, now: string): void {
    this.db.update(extractedAnswers).set({ status: status as any, updatedAt: now }).where(eq(extractedAnswers.id, id)).run();
  }

  updateExtractedAnswerResponse(id: string, recognizedResponse: string, recognizedOptionLabel: string | null, now: string): void {
    this.db.update(extractedAnswers)
      .set({ recognizedResponse, recognizedOptionLabel, status: 'REVIEWED' as any, updatedAt: now })
      .where(eq(extractedAnswers.id, id))
      .run();
  }

  createGradingRun(run: InferInsertModel<typeof gradingRuns>): GradingRunRow {
    this.db.insert(gradingRuns).values(run).run();
    return this.db.select().from(gradingRuns).where(eq(gradingRuns.id, run.id)).get()!;
  }

  findGradingRun(id: string): GradingRunRow | null {
    return this.db.select().from(gradingRuns).where(eq(gradingRuns.id, id)).get() ?? null;
  }

  listGradingRuns(submissionId: string): GradingRunRow[] {
    return this.db.select().from(gradingRuns)
      .where(eq(gradingRuns.submissionId, submissionId))
      .orderBy(asc(gradingRuns.startedAt))
      .all();
  }

  updateGradingRunStatus(id: string, status: string, gradedCount: number, failedCount: number, now: string): void {
    this.db.update(gradingRuns)
      .set({ status: status as any, gradedCount, failedCount, completedAt: now })
      .where(eq(gradingRuns.id, id))
      .run();
  }

  createGradingDecision(decision: InferInsertModel<typeof gradingDecisions>): GradingDecisionRow {
    this.db.insert(gradingDecisions).values(decision).run();
    return this.db.select().from(gradingDecisions).where(eq(gradingDecisions.id, decision.id)).get()!;
  }

  findGradingDecision(id: string): GradingDecisionRow | null {
    return this.db.select().from(gradingDecisions).where(eq(gradingDecisions.id, id)).get() ?? null;
  }

  listGradingDecisions(submissionId: string): GradingDecisionRow[] {
    return this.db.select().from(gradingDecisions)
      .where(eq(gradingDecisions.submissionId, submissionId))
      .orderBy(asc(gradingDecisions.createdAt))
      .all();
  }

  updateGradingDecision(id: string, updates: Partial<{
    awardedMarks: number;
    gradingMethod: string;
    rubricResultsJson: string;
    teacherOverride: boolean;
    teacherOverrideAt: string;
    aiProposalJson: string;
    gradingRunId: string;
    status: string;
  }>, now: string): void {
    this.db.update(gradingDecisions)
      .set({ ...updates, updatedAt: now } as any)
      .where(eq(gradingDecisions.id, id))
      .run();
  }

  deleteGradingDecisionsForSubmission(submissionId: string): void {
    this.db.delete(gradingDecisions).where(eq(gradingDecisions.submissionId, submissionId)).run();
  }

  getSubmissionTotalAwarded(submissionId: string): { totalAwarded: number; totalMax: number } {
    const result = this.db.select({
      totalAwarded: gradingDecisions.awardedMarks,
      totalMax: gradingDecisions.questionMarks,
    }).from(gradingDecisions).where(eq(gradingDecisions.submissionId, submissionId)).all();

    return result.reduce(
      (acc, row) => ({
        totalAwarded: acc.totalAwarded + row.totalAwarded,
        totalMax: acc.totalMax + row.totalMax,
      }),
      { totalAwarded: 0, totalMax: 0 }
    );
  }
}
