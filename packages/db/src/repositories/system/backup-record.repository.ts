import { eq, desc } from 'drizzle-orm';
import { type SystemDrizzle, getSystemDatabase } from '../../connection.js';
import {
  backupRecords,
  type BackupRecordRow,
  type NewBackupRecordRow,
} from '../../schema/system.schema.js';

export class BackupRecordRepository {
  constructor(private db?: SystemDrizzle) {}

  private get client(): SystemDrizzle {
    return this.db ?? getSystemDatabase().db;
  }

  create(record: NewBackupRecordRow): BackupRecordRow {
    this.client.insert(backupRecords).values(record).run();
    const created = this.findById(record.id);
    if (!created) {
      throw new Error(`Failed to create backup record with id: ${record.id}`);
    }
    return created;
  }

  findById(id: string): BackupRecordRow | null {
    const row = this.client.select().from(backupRecords).where(eq(backupRecords.id, id)).get();
    return row ?? null;
  }

  findByPath(backupPath: string): BackupRecordRow | null {
    const row = this.client.select().from(backupRecords).where(eq(backupRecords.backupPath, backupPath)).get();
    return row ?? null;
  }

  listRecent(limit: number = 20): BackupRecordRow[] {
    return this.client
      .select()
      .from(backupRecords)
      .orderBy(desc(backupRecords.createdAt))
      .limit(limit)
      .all();
  }
}
