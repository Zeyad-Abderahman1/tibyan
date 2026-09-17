import { sqliteTable, text, integer, uniqueIndex, check, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { UserRole, PermissionCode, ActorType } from '@tibyan/contracts';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  username: text('username').notNull().unique(),
  pinHash: text('pin_hash').notNull(),
  salt: text('salt').notNull(),
  role: text('role').$type<UserRole>().notNull(),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull().default('ACTIVE'),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: text('locked_until'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const permissions = sqliteTable('permissions', {
  code: text('code').$type<PermissionCode>().primaryKey(),
  nameAr: text('name_ar').notNull(),
  descriptionAr: text('description_ar').notNull(),
  category: text('category').notNull(),
});

export const userPermissions = sqliteTable('user_permissions', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionCode: text('permission_code').notNull().references(() => permissions.code, { onDelete: 'cascade' }),
  grantedAt: text('granted_at').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.permissionCode] }),
}));

export const academicYears = sqliteTable('academic_years', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(), // e.g. "2026-2027"
  dbFilename: text('db_filename').notNull().unique(), // e.g. "tibyan-2026-2027.sqlite"
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  // Database-level enforcement that only one academic year can be active at a time
  singleActiveYearIdx: uniqueIndex('idx_academic_years_single_active')
    .on(t.isActive)
    .where(sql`is_active = 1`),
}));

export const globalSettings = sqliteTable('global_settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const systemAuditLog = sqliteTable('system_audit_log', {
  id: text('id').primaryKey(),
  actorType: text('actor_type').$type<ActorType>().notNull().default('USER'),
  actorUserId: text('actor_user_id'),
  actorNameSnapshot: text('actor_name_snapshot').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  metadataJson: text('metadata_json'),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  actorInvariantCheck: check(
    'chk_system_audit_actor_invariant',
    sql`("actor_type" = 'USER' AND "actor_user_id" IS NOT NULL) OR ("actor_type" = 'SYSTEM' AND "actor_user_id" IS NULL)`
  ),
  idxSystemAuditCreated: uniqueIndex('idx_system_audit_created').on(t.createdAt, t.id),
}));

export const backupRecords = sqliteTable('backup_records', {
  id: text('id').primaryKey(),
  backupPath: text('backup_path').notNull(),
  backupDate: text('backup_date').notNull(),
  status: text('status', { enum: ['SUCCESS', 'FAILED'] }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  academicYearsIncludedJson: text('academic_years_included_json').notNull(),
  createdAt: text('created_at').notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type PermissionRow = typeof permissions.$inferSelect;
export type UserPermissionRow = typeof userPermissions.$inferSelect;
export type AcademicYearRow = typeof academicYears.$inferSelect;
export type NewAcademicYearRow = typeof academicYears.$inferInsert;
export type GlobalSettingRow = typeof globalSettings.$inferSelect;
export type SystemAuditLogRow = typeof systemAuditLog.$inferSelect;
export type NewSystemAuditLogRow = typeof systemAuditLog.$inferInsert;
export type BackupRecordRow = typeof backupRecords.$inferSelect;
export type NewBackupRecordRow = typeof backupRecords.$inferInsert;
