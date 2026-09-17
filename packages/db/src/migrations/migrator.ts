import type Database from 'better-sqlite3';

export interface Migration {
  id: string;
  sql: string;
}

export const SYSTEM_MIGRATIONS: Migration[] = [
  {
    id: '0000_initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS \`academic_years\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`db_filename\` text NOT NULL,
        \`is_active\` integer DEFAULT false NOT NULL,
        \`is_archived\` integer DEFAULT false NOT NULL,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`academic_years_name_unique\` ON \`academic_years\` (\`name\`);
      CREATE UNIQUE INDEX IF NOT EXISTS \`academic_years_db_filename_unique\` ON \`academic_years\` (\`db_filename\`);
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_academic_years_single_active\` ON \`academic_years\` (\`is_active\`) WHERE is_active = 1;

      CREATE TABLE IF NOT EXISTS \`backup_records\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`backup_path\` text NOT NULL,
        \`backup_date\` text NOT NULL,
        \`status\` text NOT NULL,
        \`size_bytes\` integer NOT NULL,
        \`academic_years_included_json\` text NOT NULL,
        \`created_at\` text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS \`global_settings\` (
        \`key\` text PRIMARY KEY NOT NULL,
        \`value_json\` text NOT NULL,
        \`updated_at\` text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS \`permissions\` (
        \`code\` text PRIMARY KEY NOT NULL,
        \`name_ar\` text NOT NULL,
        \`description_ar\` text NOT NULL,
        \`category\` text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS \`system_audit_log\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`actor_type\` text DEFAULT 'USER' NOT NULL,
        \`actor_user_id\` text,
        \`actor_name_snapshot\` text NOT NULL,
        \`action\` text NOT NULL,
        \`entity_type\` text NOT NULL,
        \`entity_id\` text NOT NULL,
        \`before_json\` text,
        \`after_json\` text,
        \`metadata_json\` text,
        \`created_at\` text NOT NULL,
        CONSTRAINT "chk_system_audit_actor_invariant" CHECK(("actor_type" = 'USER' AND "actor_user_id" IS NOT NULL) OR ("actor_type" = 'SYSTEM' AND "actor_user_id" IS NULL))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_system_audit_created\` ON \`system_audit_log\` (\`created_at\`,\`id\`);

      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`full_name\` text NOT NULL,
        \`username\` text NOT NULL,
        \`pin_hash\` text NOT NULL,
        \`salt\` text NOT NULL,
        \`role\` text NOT NULL,
        \`status\` text DEFAULT 'ACTIVE' NOT NULL,
        \`failed_attempts\` integer DEFAULT 0 NOT NULL,
        \`locked_until\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`users_username_unique\` ON \`users\` (\`username\`);

      CREATE TABLE IF NOT EXISTS \`user_permissions\` (
        \`user_id\` text NOT NULL,
        \`permission_code\` text NOT NULL,
        \`granted_at\` text NOT NULL,
        PRIMARY KEY(\`user_id\`, \`permission_code\`),
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (\`permission_code\`) REFERENCES \`permissions\`(\`code\`) ON UPDATE no action ON DELETE cascade
      );
    `,
  },
  {
    id: '0001_audit_triggers',
    sql: `
      -- Custom Migration: Immutability triggers for system_audit_log
      CREATE TRIGGER IF NOT EXISTS trg_prevent_system_audit_update
      BEFORE UPDATE ON system_audit_log
      BEGIN
        SELECT RAISE(ABORT, 'system_audit_log entries are immutable and cannot be updated');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_prevent_system_audit_delete
      BEFORE DELETE ON system_audit_log
      BEGIN
        SELECT RAISE(ABORT, 'system_audit_log entries are immutable and cannot be deleted');
      END;
    `,
  },
];

export const ACADEMIC_MIGRATIONS: Migration[] = [
  {
    id: '0000_initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS \`students\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`student_code\` text NOT NULL,
        \`full_name\` text NOT NULL,
        \`photo_path\` text,
        \`education_system\` text NOT NULL,
        \`grade_level\` text NOT NULL,
        \`language_track\` text NOT NULL,
        \`guardian_phone\` text NOT NULL,
        \`status\` text DEFAULT 'ACTIVE' NOT NULL,
        \`qr_token\` text NOT NULL,
        \`barcode_value\` text NOT NULL,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        CONSTRAINT "chk_students_status" CHECK("status" IN ('ACTIVE', 'INACTIVE'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`students_student_code_unique\` ON \`students\` (\`student_code\`);
      CREATE UNIQUE INDEX IF NOT EXISTS \`students_qr_token_unique\` ON \`students\` (\`qr_token\`);
      CREATE UNIQUE INDEX IF NOT EXISTS \`students_barcode_value_unique\` ON \`students\` (\`barcode_value\`);
      CREATE INDEX IF NOT EXISTS \`idx_students_status\` ON \`students\` (\`status\`);
      CREATE INDEX IF NOT EXISTS \`idx_students_grade\` ON \`students\` (\`grade_level\`,\`education_system\`);
      CREATE INDEX IF NOT EXISTS \`idx_students_track\` ON \`students\` (\`language_track\`);

      CREATE TABLE IF NOT EXISTS \`student_notes\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`student_id\` text NOT NULL,
        \`author_user_id\` text,
        \`author_name_snapshot\` text NOT NULL,
        \`note_text\` text NOT NULL,
        \`tag\` text DEFAULT 'GENERAL' NOT NULL,
        \`created_at\` text NOT NULL,
        FOREIGN KEY (\`student_id\`) REFERENCES \`students\`(\`id\`) ON UPDATE no action ON DELETE restrict
      );
      CREATE INDEX IF NOT EXISTS \`idx_notes_student\` ON \`student_notes\` (\`student_id\`);

      CREATE TABLE IF NOT EXISTS \`groups\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`education_system\` text NOT NULL,
        \`grade_level\` text NOT NULL,
        \`language_track\` text NOT NULL,
        \`focus_math_branch\` text,
        \`default_payment_type\` text NOT NULL,
        \`default_payment_amount\` real NOT NULL,
        \`status\` text DEFAULT 'ACTIVE' NOT NULL,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        CONSTRAINT "chk_groups_default_payment_amount" CHECK("default_payment_amount" >= 0)
      );
      CREATE INDEX IF NOT EXISTS \`idx_groups_status\` ON \`groups\` (\`status\`);
      CREATE INDEX IF NOT EXISTS \`idx_groups_grade\` ON \`groups\` (\`grade_level\`,\`education_system\`);

      CREATE TABLE IF NOT EXISTS \`group_enrollments\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`group_id\` text NOT NULL,
        \`student_id\` text NOT NULL,
        \`enrolled_at\` text NOT NULL,
        \`left_at\` text,
        \`status\` text DEFAULT 'ACTIVE' NOT NULL,
        \`payment_type_override\` text,
        \`payment_amount_override\` real,
        \`created_at\` text NOT NULL,
        FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE restrict,
        FOREIGN KEY (\`student_id\`) REFERENCES \`students\`(\`id\`) ON UPDATE no action ON DELETE restrict,
        CONSTRAINT "chk_enrollment_payment_amount_override" CHECK("payment_amount_override" IS NULL OR "payment_amount_override" >= 0)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_group_enrollments_active\` ON \`group_enrollments\` (\`group_id\`,\`student_id\`) WHERE "status" = 'ACTIVE';
      CREATE INDEX IF NOT EXISTS \`idx_enrollments_student\` ON \`group_enrollments\` (\`student_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_enrollments_group\` ON \`group_enrollments\` (\`group_id\`);

      CREATE TABLE IF NOT EXISTS \`group_schedules\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`group_id\` text NOT NULL,
        \`weekday\` integer NOT NULL,
        \`start_time\` text NOT NULL,
        \`duration_minutes\` integer DEFAULT 120 NOT NULL,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE restrict,
        CONSTRAINT "chk_schedule_weekday" CHECK("weekday" BETWEEN 0 AND 6),
        CONSTRAINT "chk_schedule_duration" CHECK("duration_minutes" > 0)
      );
      CREATE INDEX IF NOT EXISTS \`idx_schedules_group\` ON \`group_schedules\` (\`group_id\`);

      CREATE TABLE IF NOT EXISTS \`sessions\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`group_id\` text NOT NULL,
        \`schedule_id\` text,
        \`occurrence_key\` text NOT NULL,
        \`scheduled_date\` text NOT NULL,
        \`scheduled_start_time\` text NOT NULL,
        \`effective_date\` text NOT NULL,
        \`effective_start_time\` text NOT NULL,
        \`duration_minutes\` integer NOT NULL,
        \`status\` text DEFAULT 'SCHEDULED' NOT NULL,
        \`reschedule_reason\` text,
        \`rescheduled_at\` text,
        \`notes\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE restrict,
        FOREIGN KEY (\`schedule_id\`) REFERENCES \`group_schedules\`(\`id\`) ON UPDATE no action ON DELETE set null,
        CONSTRAINT "chk_session_duration" CHECK("duration_minutes" > 0)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_sessions_occurrence\` ON \`sessions\` (\`occurrence_key\`);
      CREATE INDEX IF NOT EXISTS \`idx_sessions_effective_slot\` ON \`sessions\` (\`group_id\`,\`effective_date\`,\`effective_start_time\`);
      CREATE INDEX IF NOT EXISTS \`idx_sessions_effective_date\` ON \`sessions\` (\`effective_date\`);

      CREATE TABLE IF NOT EXISTS \`academic_audit_log\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`actor_type\` text DEFAULT 'USER' NOT NULL,
        \`actor_user_id\` text,
        \`actor_name_snapshot\` text NOT NULL,
        \`action\` text NOT NULL,
        \`entity_type\` text NOT NULL,
        \`entity_id\` text NOT NULL,
        \`before_json\` text,
        \`after_json\` text,
        \`metadata_json\` text,
        \`created_at\` text NOT NULL,
        CONSTRAINT "chk_academic_audit_actor_invariant" CHECK(("actor_type" = 'USER' AND "actor_user_id" IS NOT NULL) OR ("actor_type" = 'SYSTEM' AND "actor_user_id" IS NULL))
      );
      CREATE INDEX IF NOT EXISTS \`idx_academic_audit_created\` ON \`academic_audit_log\` (\`created_at\`);
      CREATE INDEX IF NOT EXISTS \`idx_academic_audit_entity\` ON \`academic_audit_log\` (\`entity_type\`,\`entity_id\`);
    `,
  },
  {
    id: '0001_audit_triggers',
    sql: `
      -- Custom Migration: Immutability triggers for academic_audit_log
      CREATE TRIGGER IF NOT EXISTS trg_prevent_academic_audit_update
      BEFORE UPDATE ON academic_audit_log
      BEGIN
        SELECT RAISE(ABORT, 'academic_audit_log entries are immutable and cannot be updated');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_prevent_academic_audit_delete
      BEFORE DELETE ON academic_audit_log
      BEGIN
        SELECT RAISE(ABORT, 'academic_audit_log entries are immutable and cannot be deleted');
      END;
    `,
  },
];

function initMigrationTrackingTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS __tibyan_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

export function getAppliedMigrations(db: Database.Database): string[] {
  initMigrationTrackingTable(db);
  const rows = db.prepare('SELECT id FROM __tibyan_migrations ORDER BY applied_at ASC').all() as { id: string }[];
  return rows.map((r) => r.id);
}

export function runMigrations(db: Database.Database, migrations: Migration[]): string[] {
  initMigrationTrackingTable(db);
  const applied = new Set(getAppliedMigrations(db));
  const newlyApplied: string[] = [];

  for (const migration of migrations) {
    if (!applied.has(migration.id)) {
      const applyTx = db.transaction(() => {
        db.exec(migration.sql);
        db.prepare('INSERT INTO __tibyan_migrations (id, applied_at) VALUES (?, ?)').run(
          migration.id,
          new Date().toISOString()
        );
      });
      applyTx();
      newlyApplied.push(migration.id);
    }
  }

  return newlyApplied;
}

export function migrateSystemDatabase(db: Database.Database): string[] {
  return runMigrations(db, SYSTEM_MIGRATIONS);
}

export function migrateAcademicDatabase(db: Database.Database): string[] {
  return runMigrations(db, ACADEMIC_MIGRATIONS);
}
