import { eq } from 'drizzle-orm';
import { type SystemDrizzle, getSystemDatabase } from '../../connection.js';
import {
  globalSettings,
  type GlobalSettingRow,
} from '../../schema/system.schema.js';

export class GlobalSettingsRepository {
  constructor(private db?: SystemDrizzle) {}

  private get client(): SystemDrizzle {
    return this.db ?? getSystemDatabase().db;
  }

  get(key: string): string | null {
    const row = this.client
      .select({ valueJson: globalSettings.valueJson })
      .from(globalSettings)
      .where(eq(globalSettings.key, key))
      .get();
    return row ? row.valueJson : null;
  }

  set(key: string, valueJson: string): void {
    const now = new Date().toISOString();
    this.client
      .insert(globalSettings)
      .values({ key, valueJson, updatedAt: now })
      .onConflictDoUpdate({
        target: globalSettings.key,
        set: { valueJson, updatedAt: now },
      })
      .run();
  }

  listAll(): GlobalSettingRow[] {
    return this.client.select().from(globalSettings).all();
  }
}
