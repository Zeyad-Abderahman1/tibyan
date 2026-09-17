import { eq, inArray, and } from 'drizzle-orm';
import { type SystemDrizzle, getSystemDatabase } from '../../connection.js';
import {
  users,
  userPermissions,
  type UserRow,
  type NewUserRow,
} from '../../schema/system.schema.js';
import type { PermissionCode } from '@tibyan/contracts';

export class UserRepository {
  constructor(private db?: SystemDrizzle) {}

  private get client(): SystemDrizzle {
    return this.db ?? getSystemDatabase().db;
  }

  findById(id: string): UserRow | null {
    const row = this.client.select().from(users).where(eq(users.id, id)).get();
    return row ?? null;
  }

  findByUsername(username: string): UserRow | null {
    const row = this.client.select().from(users).where(eq(users.username, username)).get();
    return row ?? null;
  }

  create(newUser: NewUserRow): UserRow {
    this.client.insert(users).values(newUser).run();
    const created = this.findById(newUser.id);
    if (!created) {
      throw new Error(`Failed to create user with id: ${newUser.id}`);
    }
    return created;
  }

  update(id: string, updates: Partial<Omit<UserRow, 'id' | 'createdAt'>>): UserRow | null {
    this.client
      .update(users)
      .set({ ...updates, updatedAt: updates.updatedAt ?? new Date().toISOString() })
      .where(eq(users.id, id))
      .run();
    return this.findById(id);
  }

  listAll(): UserRow[] {
    return this.client.select().from(users).all();
  }

  getUserPermissions(userId: string): PermissionCode[] {
    const rows = this.client
      .select({ code: userPermissions.permissionCode })
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId))
      .all();
    return rows.map((r) => r.code as PermissionCode);
  }

  assignPermissions(userId: string, codes: PermissionCode[]): void {
    if (codes.length === 0) return;
    const now = new Date().toISOString();
    const entries = codes.map((code) => ({
      userId,
      permissionCode: code,
      grantedAt: now,
    }));
    this.client
      .insert(userPermissions)
      .values(entries)
      .onConflictDoNothing()
      .run();
  }

  removePermissions(userId: string, codes: PermissionCode[]): void {
    if (codes.length === 0) return;
    this.client
      .delete(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          inArray(userPermissions.permissionCode, codes)
        )
      )
      .run();
  }
}
