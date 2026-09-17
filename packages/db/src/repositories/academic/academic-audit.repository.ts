import { eq, desc, and } from 'drizzle-orm';
import { type AcademicDrizzle, getAcademicDatabase } from '../../connection.js';
import {
  academicAuditLog,
  type AcademicAuditLogRow,
  type NewAcademicAuditLogRow,
} from '../../schema/academic.schema.js';

export class AcademicAuditRepository {
  constructor(private db?: AcademicDrizzle) {}

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  insert(entry: NewAcademicAuditLogRow): AcademicAuditLogRow {
    this.client.insert(academicAuditLog).values(entry).run();
    const created = this.client
      .select()
      .from(academicAuditLog)
      .where(eq(academicAuditLog.id, entry.id))
      .get();
    if (!created) {
      throw new Error(`Failed to insert academic audit entry with id: ${entry.id}`);
    }
    return created;
  }

  listRecent(limit: number = 50): AcademicAuditLogRow[] {
    return this.client
      .select()
      .from(academicAuditLog)
      .orderBy(desc(academicAuditLog.createdAt))
      .limit(limit)
      .all();
  }

  findByEntity(entityType: string, entityId: string): AcademicAuditLogRow[] {
    return this.client
      .select()
      .from(academicAuditLog)
      .where(
        and(
          eq(academicAuditLog.entityType, entityType),
          eq(academicAuditLog.entityId, entityId)
        )
      )
      .orderBy(desc(academicAuditLog.createdAt))
      .all();
  }
}
