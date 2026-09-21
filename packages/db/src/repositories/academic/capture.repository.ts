import { asc, eq, sql, type InferInsertModel } from 'drizzle-orm';
import type { AcademicDrizzle } from '../../connection.js';
import {
  captureSessions,
  captureSubmissions,
  capturePages,
  type CaptureSessionRow,
  type CaptureSubmissionRow,
  type CapturePageRow,
} from '../../schema/academic.schema.js';

export class CaptureRepository {
  constructor(private readonly db: AcademicDrizzle) {}

  createSession(session: InferInsertModel<typeof captureSessions>): CaptureSessionRow {
    this.db.insert(captureSessions).values(session).run();
    return this.db.select().from(captureSessions).where(eq(captureSessions.id, session.id)).get()!;
  }

  findSession(id: string): CaptureSessionRow | null {
    return this.db.select().from(captureSessions).where(eq(captureSessions.id, id)).get() ?? null;
  }

  listSessions(): CaptureSessionRow[] {
    return this.db.select().from(captureSessions).orderBy(asc(captureSessions.createdAt)).all();
  }

  deleteSession(id: string): void {
    this.db.delete(captureSessions).where(eq(captureSessions.id, id)).run();
  }

  updateSessionStatus(id: string, status: string, now: string): void {
    this.db.update(captureSessions).set({ status: status as any, updatedAt: now }).where(eq(captureSessions.id, id)).run();
  }

  incrementSubmissionCount(sessionId: string, now: string): void {
    this.db.update(captureSessions)
      .set({ totalSubmissions: sql`"total_submissions" + 1`, updatedAt: now })
      .where(eq(captureSessions.id, sessionId))
      .run();
  }

  incrementCompletedSubmissions(sessionId: string, now: string): void {
    this.db.update(captureSessions)
      .set({ completedSubmissions: sql`"completed_submissions" + 1`, updatedAt: now })
      .where(eq(captureSessions.id, sessionId))
      .run();
  }

  createSubmission(submission: InferInsertModel<typeof captureSubmissions>): CaptureSubmissionRow {
    this.db.insert(captureSubmissions).values(submission).run();
    return this.db.select().from(captureSubmissions).where(eq(captureSubmissions.id, submission.id)).get()!;
  }

  findSubmission(id: string): CaptureSubmissionRow | null {
    return this.db.select().from(captureSubmissions).where(eq(captureSubmissions.id, id)).get() ?? null;
  }

  listSubmissions(sessionId: string): CaptureSubmissionRow[] {
    return this.db.select().from(captureSubmissions)
      .where(eq(captureSubmissions.sessionId, sessionId))
      .orderBy(asc(captureSubmissions.createdAt))
      .all();
  }

  updateSubmissionStatus(id: string, status: string, now: string): void {
    this.db.update(captureSubmissions).set({ status: status as any, updatedAt: now }).where(eq(captureSubmissions.id, id)).run();
  }

  updateSubmissionStudent(id: string, studentId: string | null, studentName: string | null, studentCode: string | null, method: string, now: string): void {
    this.db.update(captureSubmissions)
      .set({ studentId: studentId as any, studentNameSnapshot: studentName, studentCodeSnapshot: studentCode, associationMethod: method, updatedAt: now })
      .where(eq(captureSubmissions.id, id))
      .run();
  }

  updateSubmissionPageCount(id: string, now: string): void {
    this.db.update(captureSubmissions)
      .set({ pageCount: sql`(SELECT COUNT(*) FROM capture_pages WHERE submission_id = ${captureSubmissions.id})`, updatedAt: now })
      .where(eq(captureSubmissions.id, id))
      .run();
  }

  createPage(page: InferInsertModel<typeof capturePages>): CapturePageRow {
    this.db.insert(capturePages).values(page).run();
    return this.db.select().from(capturePages).where(eq(capturePages.id, page.id)).get()!;
  }

  findPage(id: string): CapturePageRow | null {
    return this.db.select().from(capturePages).where(eq(capturePages.id, id)).get() ?? null;
  }

  listPages(submissionId: string): CapturePageRow[] {
    return this.db.select().from(capturePages)
      .where(eq(capturePages.submissionId, submissionId))
      .orderBy(asc(capturePages.pageOrder))
      .all();
  }

  listPagesBySession(sessionId: string): CapturePageRow[] {
    return this.db.select().from(capturePages)
      .where(eq(capturePages.sessionId, sessionId))
      .orderBy(asc(capturePages.pageOrder))
      .all();
  }

  findByFingerprint(fingerprintSha256: string): CapturePageRow | null {
    return this.db.select().from(capturePages)
      .where(eq(capturePages.fingerprintSha256, fingerprintSha256))
      .get() ?? null;
  }

  updatePageStatus(id: string, status: string, now: string): void {
    this.db.update(capturePages).set({ status: status as any, updatedAt: now }).where(eq(capturePages.id, id)).run();
  }

  updatePageRotation(id: string, rotationDegrees: number, now: string): void {
    this.db.update(capturePages).set({ rotationDegrees, updatedAt: now }).where(eq(capturePages.id, id)).run();
  }

  updatePageExcluded(id: string, excluded: boolean, now: string): void {
    this.db.update(capturePages).set({ excluded, updatedAt: now }).where(eq(capturePages.id, id)).run();
  }

  reassignPage(id: string, targetSubmissionId: string, newPageOrder: number | undefined, now: string): void {
    const updates: Record<string, any> = { submissionId: targetSubmissionId, updatedAt: now };
    if (newPageOrder !== undefined) updates.pageOrder = newPageOrder;
    this.db.update(capturePages).set(updates).where(eq(capturePages.id, id)).run();
  }
}
