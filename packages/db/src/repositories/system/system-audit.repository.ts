import { eq, desc, and } from 'drizzle-orm';
import { type SystemDrizzle, getSystemDatabase } from '../../connection.js';
import {
  systemAuditLog,
  type SystemAuditLogRow,
  type NewSystemAuditLogRow,
} from '../../schema/system.schema.js';

export class SystemAuditRepository {
  constructor(private db?: SystemDrizzle) {}

  private get client(): SystemDrizzle {
    return this.db ?? getSystemDatabase().db;
  }

  insert(entry: NewSystemAuditLogRow): SystemAuditLogRow {
    this.client.insert(systemAuditLog).values(entry).run();
    const created = this.client
      .select()
      .from(systemAuditLog)
      .where(eq(systemAuditLog.id, entry.id))
      .get();
    if (!created) {
      throw new Error(`Failed to insert system audit entry with id: ${entry.id}`);
    }
    return created;
  }

  listRecent(limit: number = 50): SystemAuditLogRow[] {
    return this.client
      .select()
      .from(systemAuditLog)
      .orderBy(desc(systemAuditLog.createdAt))
      .limit(limit)
      .all();
  }

  findByEntity(entityType: string, entityId: string): SystemAuditLogRow[] {
    return this.client
      .select()
      .from(systemAuditLog)
      .where(
        and(
          eq(systemAuditLog.entityType, entityType),
          eq(systemAuditLog.entityId, entityId)
        )
      )
      .orderBy(desc(systemAuditLog.createdAt))
      .all();
  }
}
