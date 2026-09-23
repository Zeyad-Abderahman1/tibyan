import { eq, desc, and, lt } from 'drizzle-orm';
import {
  assistantSessions,
  assistantMessages,
  assistantAuditLog,
  assistantConfirmations,
  type AssistantSessionRow,
  type NewAssistantSessionRow,
  type AssistantMessageRow,
  type NewAssistantMessageRow,
  type AssistantAuditLogRow,
  type NewAssistantAuditLogRow,
  type AssistantConfirmationRow,
  type NewAssistantConfirmationRow,
} from '../../schema/system.schema.js';

export class AssistantSessionRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  insert(input: NewAssistantSessionRow): AssistantSessionRow {
    this.db.insert(assistantSessions).values(input).run();
    return this.db.select().from(assistantSessions).where(eq(assistantSessions.id, input.id)).get()!;
  }

  findById(id: string): AssistantSessionRow | undefined {
    return this.db.select().from(assistantSessions).where(eq(assistantSessions.id, id)).get();
  }

  listByUser(userId: string, limit = 50): AssistantSessionRow[] {
    return this.db.select().from(assistantSessions)
      .where(eq(assistantSessions.userId, userId))
      .orderBy(desc(assistantSessions.updatedAt))
      .limit(limit)
      .all();
  }

  update(id: string, updates: Partial<Pick<AssistantSessionRow, 'title' | 'contextScope' | 'contextEntityId' | 'updatedAt'>>): void {
    this.db.update(assistantSessions).set(updates).where(eq(assistantSessions.id, id)).run();
  }

  delete(id: string): void {
    this.db.delete(assistantSessions).where(eq(assistantSessions.id, id)).run();
  }
}

export class AssistantMessageRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  insert(input: NewAssistantMessageRow): AssistantMessageRow {
    this.db.insert(assistantMessages).values(input).run();
    return this.db.select().from(assistantMessages).where(eq(assistantMessages.id, input.id)).get()!;
  }

  listBySession(sessionId: string, limit = 100, cursor?: string): AssistantMessageRow[] {
    const conditions = cursor
      ? and(eq(assistantMessages.sessionId, sessionId), lt(assistantMessages.createdAt, cursor))
      : eq(assistantMessages.sessionId, sessionId);
    return this.db.select().from(assistantMessages)
      .where(conditions)
      .orderBy(desc(assistantMessages.createdAt))
      .limit(limit)
      .all()
      .reverse();
  }

  findById(id: string): AssistantMessageRow | undefined {
    return this.db.select().from(assistantMessages).where(eq(assistantMessages.id, id)).get();
  }

  findByPreviewId(previewId: string): AssistantMessageRow | undefined {
    return this.db.select().from(assistantMessages).where(eq(assistantMessages.previewId, previewId)).get();
  }

  findByReceiptId(receiptId: string): AssistantMessageRow | undefined {
    return this.db.select().from(assistantMessages).where(eq(assistantMessages.receiptId, receiptId)).get();
  }
}

export class AssistantAuditRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  insert(input: NewAssistantAuditLogRow): AssistantAuditLogRow {
    this.db.insert(assistantAuditLog).values(input).run();
    return this.db.select().from(assistantAuditLog).where(eq(assistantAuditLog.id, input.id)).get()!;
  }

  listByUser(userId: string, limit = 100): AssistantAuditLogRow[] {
    return this.db.select().from(assistantAuditLog)
      .where(eq(assistantAuditLog.actorUserId, userId))
      .orderBy(desc(assistantAuditLog.createdAt))
      .limit(limit)
      .all();
  }

  listBySession(sessionId: string): AssistantAuditLogRow[] {
    return this.db.select().from(assistantAuditLog)
      .where(eq(assistantAuditLog.sessionId, sessionId))
      .orderBy(desc(assistantAuditLog.createdAt))
      .all();
  }
}

export class AssistantConfirmationRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  insert(input: NewAssistantConfirmationRow): AssistantConfirmationRow {
    this.db.insert(assistantConfirmations).values(input).run();
    return this.db.select().from(assistantConfirmations).where(eq(assistantConfirmations.id, input.id)).get()!;
  }

  findByPreviewId(previewId: string): AssistantConfirmationRow | undefined {
    return this.db.select().from(assistantConfirmations).where(eq(assistantConfirmations.previewId, previewId)).get();
  }

  confirm(previewId: string): void {
    this.db.update(assistantConfirmations)
      .set({ confirmed: true })
      .where(eq(assistantConfirmations.previewId, previewId))
      .run();
  }

  markExecuted(previewId: string): void {
    this.db.update(assistantConfirmations)
      .set({ executed: true })
      .where(eq(assistantConfirmations.previewId, previewId))
      .run();
  }
}
