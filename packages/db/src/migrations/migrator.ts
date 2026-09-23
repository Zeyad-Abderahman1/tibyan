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
  {
    id: '0002_overrated_naoko',
    sql: `
      CREATE TABLE IF NOT EXISTS \`curriculum_catalogs\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`code\` text NOT NULL,
        \`title\` text NOT NULL,
        \`education_system\` text NOT NULL,
        \`grade_level\` text NOT NULL,
        \`language_track\` text NOT NULL,
        \`math_branch\` text,
        \`version\` integer DEFAULT 1 NOT NULL,
        \`status\` text DEFAULT 'DRAFT' NOT NULL,
        \`published_at\` text,
        \`description\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_curriculum_catalog_scope_version\` ON \`curriculum_catalogs\` (\`education_system\`,\`grade_level\`,\`language_track\`,\`math_branch\`,\`version\`);
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_curriculum_catalog_code_version\` ON \`curriculum_catalogs\` (\`code\`,\`version\`);
      CREATE INDEX IF NOT EXISTS \`idx_curriculum_catalog_status\` ON \`curriculum_catalogs\` (\`status\`);

      CREATE TABLE IF NOT EXISTS \`curriculum_nodes\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`catalog_id\` text NOT NULL,
        \`parent_id\` text,
        \`tier\` text NOT NULL,
        \`title_ar\` text NOT NULL,
        \`title_en\` text,
        \`code\` text NOT NULL,
        \`order_index\` integer DEFAULT 0 NOT NULL,
        \`description\` text,
        \`metadata_json\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`catalog_id\`) REFERENCES \`curriculum_catalogs\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`idx_curriculum_node_catalog_parent\` ON \`curriculum_nodes\` (\`catalog_id\`,\`parent_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_curriculum_node_catalog_order\` ON \`curriculum_nodes\` (\`catalog_id\`,\`order_index\`);
      CREATE INDEX IF NOT EXISTS \`idx_curriculum_node_catalog_tier\` ON \`curriculum_nodes\` (\`catalog_id\`,\`tier\`);
    `,
  },
  {
    id: '0003_uneven_vengeance',
    sql: `
      DROP INDEX IF EXISTS \`idx_curriculum_catalog_scope_version\`;
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_curriculum_catalog_scope_version_branch\` ON \`curriculum_catalogs\` (\`education_system\`,\`grade_level\`,\`language_track\`,\`math_branch\`,\`version\`) WHERE math_branch IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_curriculum_catalog_scope_version_nobranch\` ON \`curriculum_catalogs\` (\`education_system\`,\`grade_level\`,\`language_track\`,\`version\`) WHERE math_branch IS NULL;
    `,
  },
  {
    id: '0004_certain_stellaris',
    sql: `
      CREATE TABLE IF NOT EXISTS \`source_documents\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`title\` text NOT NULL,
        \`author\` text,
        \`publisher\` text,
        \`edition_year\` text,
        \`curriculum_catalog_id\` text,
        \`file_path\` text NOT NULL,
        \`file_name\` text NOT NULL,
        \`file_size_bytes\` integer NOT NULL,
        \`sha256_hash\` text NOT NULL,
        \`page_count\` integer NOT NULL,
        \`status\` text DEFAULT 'INDEXED' NOT NULL,
        \`metadata_json\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`curriculum_catalog_id\`) REFERENCES \`curriculum_catalogs\`(\`id\`) ON UPDATE no action ON DELETE set null
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_source_document_hash\` ON \`source_documents\` (\`sha256_hash\`);
      CREATE INDEX IF NOT EXISTS \`idx_source_document_catalog\` ON \`source_documents\` (\`curriculum_catalog_id\`);

      CREATE TABLE IF NOT EXISTS \`source_references\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`source_document_id\` text NOT NULL,
        \`start_page\` integer NOT NULL,
        \`end_page\` integer NOT NULL,
        \`reference_label\` text NOT NULL,
        \`notes\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`source_document_id\`) REFERENCES \`source_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`idx_source_ref_document\` ON \`source_references\` (\`source_document_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_source_ref_pages\` ON \`source_references\` (\`source_document_id\`,\`start_page\`,\`end_page\`);

      CREATE TABLE IF NOT EXISTS \`questions\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`code\` text NOT NULL,
        \`body_json\` text NOT NULL,
        \`model_answer_json\` text,
        \`question_type\` text DEFAULT 'MULTIPLE_CHOICE' NOT NULL,
        \`difficulty\` text DEFAULT 'MEDIUM' NOT NULL,
        \`default_marks\` integer DEFAULT 1 NOT NULL,
        \`language_track\` text DEFAULT 'ARABIC' NOT NULL,
        \`status\` text DEFAULT 'ACTIVE' NOT NULL,
        \`content_fingerprint\` text NOT NULL,
        \`metadata_json\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_question_code\` ON \`questions\` (\`code\`);
      CREATE INDEX IF NOT EXISTS \`idx_question_fingerprint\` ON \`questions\` (\`content_fingerprint\`);
      CREATE INDEX IF NOT EXISTS \`idx_question_type_diff\` ON \`questions\` (\`question_type\`,\`difficulty\`);
      CREATE INDEX IF NOT EXISTS \`idx_question_status\` ON \`questions\` (\`status\`);

      CREATE TABLE IF NOT EXISTS \`question_curriculum_tags\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`question_id\` text NOT NULL,
        \`curriculum_node_id\` text NOT NULL,
        \`created_at\` text NOT NULL,
        FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (\`curriculum_node_id\`) REFERENCES \`curriculum_nodes\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_question_node_unique\` ON \`question_curriculum_tags\` (\`question_id\`,\`curriculum_node_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_question_tag_node\` ON \`question_curriculum_tags\` (\`curriculum_node_id\`);

      CREATE TABLE IF NOT EXISTS \`question_source_references\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`question_id\` text NOT NULL,
        \`source_reference_id\` text NOT NULL,
        \`notes\` text,
        \`created_at\` text NOT NULL,
        FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (\`source_reference_id\`) REFERENCES \`source_references\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_question_source_unique\` ON \`question_source_references\` (\`question_id\`,\`source_reference_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_question_source_ref\` ON \`question_source_references\` (\`source_reference_id\`);
    `,
  },
  // 0005: Assistant tables (sessions, messages, audit, confirmations)
  {
    id: '0005_assistant_tables',
    sql: `
      CREATE TABLE IF NOT EXISTS \`assistant_sessions\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`title\` text,
        \`context_scope\` text,
        \`context_entity_id\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`idx_assistant_session_user\` ON \`assistant_sessions\` (\`user_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_assistant_session_updated\` ON \`assistant_sessions\` (\`updated_at\`);

      CREATE TABLE IF NOT EXISTS \`assistant_messages\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`session_id\` text NOT NULL,
        \`role\` text NOT NULL,
        \`type\` text NOT NULL,
        \`content\` text NOT NULL,
        \`tool_call_id\` text,
        \`tool_name\` text,
        \`tool_input_json\` text,
        \`tool_output_json\` text,
        \`confirmation_token\` text,
        \`preview_id\` text,
        \`receipt_id\` text,
        \`undo_available\` integer DEFAULT false,
        \`undo_token\` text,
        \`created_at\` text NOT NULL,
        FOREIGN KEY (\`session_id\`) REFERENCES \`assistant_sessions\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`idx_assistant_msg_session\` ON \`assistant_messages\` (\`session_id\`,\`created_at\`);
      CREATE INDEX IF NOT EXISTS \`idx_assistant_msg_preview\` ON \`assistant_messages\` (\`preview_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_assistant_msg_receipt\` ON \`assistant_messages\` (\`receipt_id\`);

      CREATE TABLE IF NOT EXISTS \`assistant_audit_log\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`actor_user_id\` text NOT NULL,
        \`session_id\` text NOT NULL,
        \`tool_name\` text NOT NULL,
        \`action\` text NOT NULL,
        \`input_summary_json\` text,
        \`affected_entities_json\` text,
        \`outcome\` text NOT NULL,
        \`receipt_id\` text,
        \`created_at\` text NOT NULL,
        FOREIGN KEY (\`actor_user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE no action
      );
      CREATE INDEX IF NOT EXISTS \`idx_assistant_audit_user\` ON \`assistant_audit_log\` (\`actor_user_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_assistant_audit_session\` ON \`assistant_audit_log\` (\`session_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_assistant_audit_tool\` ON \`assistant_audit_log\` (\`tool_name\`);
      CREATE INDEX IF NOT EXISTS \`idx_assistant_audit_created\` ON \`assistant_audit_log\` (\`created_at\`);

      CREATE TABLE IF NOT EXISTS \`assistant_confirmations\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`preview_id\` text NOT NULL,
        \`tool_name\` text NOT NULL,
        \`tool_input_json\` text NOT NULL,
        \`summary\` text NOT NULL,
        \`requires_confirmation\` integer DEFAULT true NOT NULL,
        \`confirmed\` integer DEFAULT false NOT NULL,
        \`executed\` integer DEFAULT false NOT NULL,
        \`expires_at\` text NOT NULL,
        \`created_at\` text NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_assistant_confirm_preview\` ON \`assistant_confirmations\` (\`preview_id\`);
    `,
  },
  // 0006: Curriculum library metadata columns
  {
    id: '0006_curriculum_library_metadata',
    sql: `
      ALTER TABLE \`source_documents\` ADD COLUMN \`grade_level\` text;
      ALTER TABLE \`source_documents\` ADD COLUMN \`education_system\` text;
      ALTER TABLE \`source_documents\` ADD COLUMN \`subject\` text;
      ALTER TABLE \`source_documents\` ADD COLUMN \`description\` text;
      ALTER TABLE \`source_documents\` ADD COLUMN \`academic_year_id\` text;
      ALTER TABLE \`source_documents\` ADD COLUMN \`import_source\` text DEFAULT 'MANUAL' NOT NULL;
      CREATE INDEX IF NOT EXISTS \`idx_source_document_grade\` ON \`source_documents\` (\`grade_level\`);
      CREATE INDEX IF NOT EXISTS \`idx_source_document_subject\` ON \`source_documents\` (\`subject\`);
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
  {
    id: '0002_glamorous_sunspot',
    sql: `
      ALTER TABLE \`sessions\` ADD \`cancellation_reason\` text;
    `,
  },
  {
    id: '0003_neat_krista_starr',
    sql: `
      CREATE TABLE IF NOT EXISTS \`attendance_records\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`session_id\` text NOT NULL,
        \`student_id\` text NOT NULL,
        \`status\` text NOT NULL,
        \`arrival_time\` text,
        \`notes\` text,
        \`recorded_by_user_id\` text,
        \`recorded_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`session_id\`) REFERENCES \`sessions\`(\`id\`) ON UPDATE no action ON DELETE restrict,
        FOREIGN KEY (\`student_id\`) REFERENCES \`students\`(\`id\`) ON UPDATE no action ON DELETE restrict
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_attendance_session_student\` ON \`attendance_records\` (\`session_id\`,\`student_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_attendance_session\` ON \`attendance_records\` (\`session_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_attendance_student\` ON \`attendance_records\` (\`student_id\`);
    `,
  },
  {
    id: '0004_cold_bullseye',
    sql: `
      PRAGMA foreign_keys=OFF;
      CREATE TABLE \`__new_attendance_records\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`session_id\` text NOT NULL,
        \`student_id\` text NOT NULL,
        \`status\` text NOT NULL,
        \`arrival_time\` text,
        \`notes\` text,
        \`recorded_by_user_id\` text,
        \`recorded_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`session_id\`) REFERENCES \`sessions\`(\`id\`) ON UPDATE no action ON DELETE restrict,
        FOREIGN KEY (\`student_id\`) REFERENCES \`students\`(\`id\`) ON UPDATE no action ON DELETE restrict,
        CONSTRAINT "chk_attendance_status" CHECK("status" IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
        CONSTRAINT "chk_attendance_arrival_time" CHECK(("status" = 'LATE' AND "arrival_time" IS NOT NULL AND ("arrival_time" GLOB '[0-1][0-9]:[0-5][0-9]' OR "arrival_time" GLOB '2[0-3]:[0-5][0-9]'))
          OR ("status" = 'PRESENT' AND ("arrival_time" IS NULL OR "arrival_time" GLOB '[0-1][0-9]:[0-5][0-9]' OR "arrival_time" GLOB '2[0-3]:[0-5][0-9]'))
          OR ("status" IN ('ABSENT', 'EXCUSED') AND "arrival_time" IS NULL))
      );
      INSERT INTO \`__new_attendance_records\`("id", "session_id", "student_id", "status", "arrival_time", "notes", "recorded_by_user_id", "recorded_at", "updated_at")
        SELECT "id", "session_id", "student_id", "status", "arrival_time", "notes", "recorded_by_user_id", "recorded_at", "updated_at" FROM \`attendance_records\`;
      DROP TABLE \`attendance_records\`;
      ALTER TABLE \`__new_attendance_records\` RENAME TO \`attendance_records\`;
      PRAGMA foreign_keys=ON;
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_attendance_session_student\` ON \`attendance_records\` (\`session_id\`,\`student_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_attendance_session\` ON \`attendance_records\` (\`session_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_attendance_student\` ON \`attendance_records\` (\`student_id\`);
    `,
  },
  {
    id: '0005_rainy_silvermane',
    sql: `
      CREATE TABLE IF NOT EXISTS \`attendance_follow_ups\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`attendance_record_id\` text NOT NULL,
        \`contact_status\` text DEFAULT 'UNCONTACTED' NOT NULL,
        \`note\` text,
        \`contacted_at\` text,
        \`contacted_by_user_id\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`attendance_record_id\`) REFERENCES \`attendance_records\`(\`id\`) ON UPDATE no action ON DELETE restrict,
        CONSTRAINT "chk_contact_status" CHECK("contact_status" IN ('UNCONTACTED', 'CONTACTED', 'UNREACHABLE'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_attendance_follow_up_record\` ON \`attendance_follow_ups\` (\`attendance_record_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_attendance_follow_up_status\` ON \`attendance_follow_ups\` (\`contact_status\`);
    `,
  },
  {
    id: '0006_parched_xavin',
    sql: `
      CREATE TABLE IF NOT EXISTS \`student_discounts\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`student_id\` text NOT NULL,
        \`group_id\` text,
        \`discount_type\` text NOT NULL,
        \`discount_value\` integer NOT NULL,
        \`reason\` text NOT NULL,
        \`status\` text DEFAULT 'ACTIVE' NOT NULL,
        \`applied_by_user_id\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`student_id\`) REFERENCES \`students\`(\`id\`) ON UPDATE no action ON DELETE restrict,
        FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE set null,
        CONSTRAINT "chk_discounts_value" CHECK("discount_value" > 0)
      );
      CREATE INDEX IF NOT EXISTS \`idx_discounts_student\` ON \`student_discounts\` (\`student_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_discounts_status\` ON \`student_discounts\` (\`status\`);

      CREATE TABLE IF NOT EXISTS \`payments\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`receipt_number\` text NOT NULL,
        \`student_id\` text NOT NULL,
        \`group_id\` text,
        \`amount_cents\` integer NOT NULL,
        \`payment_method\` text DEFAULT 'CASH' NOT NULL,
        \`payment_date\` text NOT NULL,
        \`period_month\` text,
        \`notes\` text,
        \`recorded_by_user_id\` text NOT NULL,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`student_id\`) REFERENCES \`students\`(\`id\`) ON UPDATE no action ON DELETE restrict,
        FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE set null,
        CONSTRAINT "chk_payments_amount" CHECK("amount_cents" > 0)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`payments_receipt_number_unique\` ON \`payments\` (\`receipt_number\`);
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_payments_receipt\` ON \`payments\` (\`receipt_number\`);
      CREATE INDEX IF NOT EXISTS \`idx_payments_student\` ON \`payments\` (\`student_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_payments_date\` ON \`payments\` (\`payment_date\`);

      CREATE TABLE IF NOT EXISTS \`invoices\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`invoice_number\` text NOT NULL,
        \`student_id\` text NOT NULL,
        \`group_id\` text,
        \`issue_date\` text NOT NULL,
        \`due_date\` text,
        \`period_month\` text,
        \`subtotal_cents\` integer NOT NULL,
        \`discount_cents\` integer DEFAULT 0 NOT NULL,
        \`total_cents\` integer NOT NULL,
        \`paid_cents\` integer DEFAULT 0 NOT NULL,
        \`remaining_cents\` integer DEFAULT 0 NOT NULL,
        \`status\` text DEFAULT 'UNPAID' NOT NULL,
        \`notes\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`student_id\`) REFERENCES \`students\`(\`id\`) ON UPDATE no action ON DELETE restrict,
        FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE set null,
        CONSTRAINT "chk_invoices_subtotal" CHECK("subtotal_cents" >= 0),
        CONSTRAINT "chk_invoices_total" CHECK("total_cents" >= 0),
        CONSTRAINT "chk_invoices_paid" CHECK("paid_cents" >= 0)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`invoices_invoice_number_unique\` ON \`invoices\` (\`invoice_number\`);
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_invoices_number\` ON \`invoices\` (\`invoice_number\`);
      CREATE INDEX IF NOT EXISTS \`idx_invoices_student\` ON \`invoices\` (\`student_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_invoices_status\` ON \`invoices\` (\`status\`);

      CREATE TABLE IF NOT EXISTS \`invoice_items\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`invoice_id\` text NOT NULL,
        \`description\` text NOT NULL,
        \`item_type\` text DEFAULT 'CUSTOM' NOT NULL,
        \`quantity\` integer DEFAULT 1 NOT NULL,
        \`unit_price_cents\` integer NOT NULL,
        \`amount_cents\` integer NOT NULL,
        \`session_id\` text,
        FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (\`session_id\`) REFERENCES \`sessions\`(\`id\`) ON UPDATE no action ON DELETE set null,
        CONSTRAINT "chk_invoice_items_quantity" CHECK("quantity" > 0),
        CONSTRAINT "chk_invoice_items_unit_price" CHECK("unit_price_cents" >= 0),
        CONSTRAINT "chk_invoice_items_amount" CHECK("amount_cents" >= 0)
      );
      CREATE INDEX IF NOT EXISTS \`idx_invoice_items_invoice\` ON \`invoice_items\` (\`invoice_id\`);
    `,
  },
  {
    id: '0007_awesome_sunspot',
    sql: `
      CREATE TABLE IF NOT EXISTS \`group_curriculum_assignments\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`group_id\` text NOT NULL,
        \`catalog_id\` text NOT NULL,
        \`catalog_version\` integer NOT NULL,
        \`assigned_at\` text NOT NULL,
        \`assigned_by_user_id\` text,
        \`assigned_name_snapshot\` text NOT NULL,
        \`notes\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_group_curriculum_assignment_group\` ON \`group_curriculum_assignments\` (\`group_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_group_curriculum_assignment_catalog\` ON \`group_curriculum_assignments\` (\`catalog_id\`);

      CREATE TABLE IF NOT EXISTS \`group_curriculum_progress\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`group_id\` text NOT NULL,
        \`catalog_id\` text NOT NULL,
        \`node_id\` text NOT NULL,
        \`status\` text DEFAULT 'NOT_STARTED' NOT NULL,
        \`completed_at\` text,
        \`updated_by_user_id\` text,
        \`updated_name_snapshot\` text NOT NULL,
        \`notes\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_group_curriculum_progress_group_node\` ON \`group_curriculum_progress\` (\`group_id\`,\`node_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_group_curriculum_progress_group_status\` ON \`group_curriculum_progress\` (\`group_id\`,\`status\`);
    `,
  },
  {
    id: '0008_nifty_magus',
    sql: `
      CREATE TABLE IF NOT EXISTS \`lesson_plans\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`curriculum_node_id\` text NOT NULL,
        \`title\` text NOT NULL,
        \`target_duration_minutes\` integer DEFAULT 60 NOT NULL,
        \`status\` text DEFAULT 'DRAFT' NOT NULL,
        \`version\` integer DEFAULT 1 NOT NULL,
        \`sections_json\` text NOT NULL,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL
      );
      CREATE INDEX IF NOT EXISTS \`idx_lesson_plans_curriculum_node\` ON \`lesson_plans\` (\`curriculum_node_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_lesson_plans_status\` ON \`lesson_plans\` (\`status\`);

      CREATE TABLE IF NOT EXISTS \`session_reflections\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`session_id\` text NOT NULL,
        \`lesson_plan_id\` text,
        \`lesson_plan_snapshot_json\` text,
        \`completion_status\` text NOT NULL,
        \`uncompleted_items\` text,
        \`topics_needing_review\` text,
        \`quick_notes\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`session_id\`) REFERENCES \`sessions\`(\`id\`) ON UPDATE no action ON DELETE restrict
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_session_reflections_session\` ON \`session_reflections\` (\`session_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_session_reflections_status\` ON \`session_reflections\` (\`completion_status\`);
    `,
  },
  {
    id: '0009_exotic_carmella_unuscione',
    sql: `
      CREATE TABLE IF NOT EXISTS \`exams\` (
        \`id\` text PRIMARY KEY NOT NULL, \`title\` text NOT NULL, \`blueprint_json\` text NOT NULL,
        \`layout_json\` text NOT NULL, \`status\` text DEFAULT 'DRAFT' NOT NULL,
        \`created_at\` text NOT NULL, \`updated_at\` text NOT NULL
      );
      CREATE INDEX IF NOT EXISTS \`idx_exams_status\` ON \`exams\` (\`status\`);
      CREATE TABLE IF NOT EXISTS \`exam_sections\` (
        \`id\` text PRIMARY KEY NOT NULL, \`exam_id\` text NOT NULL, \`title\` text NOT NULL,
        \`instructions_json\` text NOT NULL, \`position\` integer NOT NULL, \`created_at\` text NOT NULL,
        FOREIGN KEY (\`exam_id\`) REFERENCES \`exams\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_exam_sections_order\` ON \`exam_sections\` (\`exam_id\`, \`position\`);
      CREATE TABLE IF NOT EXISTS \`exam_questions\` (
        \`id\` text PRIMARY KEY NOT NULL, \`exam_section_id\` text NOT NULL, \`question_id_snapshot\` text,
        \`provenance\` text NOT NULL, \`content_json\` text NOT NULL, \`answer_json\` text,
        \`curriculum_node_ids_json\` text NOT NULL, \`source_reference_ids_json\` text NOT NULL,
        \`marks\` integer NOT NULL, \`answer_space_lines\` integer DEFAULT 0 NOT NULL,
        \`position\` integer NOT NULL, \`created_at\` text NOT NULL,
        FOREIGN KEY (\`exam_section_id\`) REFERENCES \`exam_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        CONSTRAINT \"chk_exam_question_marks\" CHECK(\"marks\" > 0),
        CONSTRAINT \"chk_exam_question_space\" CHECK(\"answer_space_lines\" >= 0)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_exam_questions_order\` ON \`exam_questions\` (\`exam_section_id\`, \`position\`);
      CREATE TABLE IF NOT EXISTS \`exam_versions\` (
        \`id\` text PRIMARY KEY NOT NULL, \`exam_id\` text NOT NULL, \`label\` text NOT NULL,
        \`question_order_json\` text NOT NULL, \`answer_key_json\` text NOT NULL, \`created_at\` text NOT NULL,
        FOREIGN KEY (\`exam_id\`) REFERENCES \`exams\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`idx_exam_versions_label\` ON \`exam_versions\` (\`exam_id\`, \`label\`);
    `,
  },
  {
    id: '0010_phase5_capture_grading_analytics',
    sql: `
      CREATE TABLE IF NOT EXISTS \`capture_sessions\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`exam_id\` text NOT NULL,
        \`exam_form_label\` text NOT NULL,
        \`status\` text DEFAULT 'COLLECTING' NOT NULL,
        \`total_submissions\` integer DEFAULT 0 NOT NULL,
        \`completed_submissions\` integer DEFAULT 0 NOT NULL,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`exam_id\`) REFERENCES \`exams\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`idx_capture_sessions_exam\` ON \`capture_sessions\` (\`exam_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_capture_sessions_status\` ON \`capture_sessions\` (\`status\`);

      CREATE TABLE IF NOT EXISTS \`capture_submissions\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`session_id\` text NOT NULL,
        \`student_id\` text,
        \`student_name_snapshot\` text,
        \`student_code_snapshot\` text,
        \`association_method\` text DEFAULT 'UNASSOCIATED' NOT NULL,
        \`status\` text DEFAULT 'PENDING' NOT NULL,
        \`page_count\` integer DEFAULT 0 NOT NULL,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`session_id\`) REFERENCES \`capture_sessions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (\`student_id\`) REFERENCES \`students\`(\`id\`) ON UPDATE no action ON DELETE set null
      );
      CREATE INDEX IF NOT EXISTS \`idx_capture_submissions_session\` ON \`capture_submissions\` (\`session_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_capture_submissions_student\` ON \`capture_submissions\` (\`student_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_capture_submissions_status\` ON \`capture_submissions\` (\`status\`);

      CREATE TABLE IF NOT EXISTS \`capture_pages\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`submission_id\` text NOT NULL,
        \`session_id\` text NOT NULL,
        \`page_order\` integer DEFAULT 0 NOT NULL,
        \`source\` text DEFAULT 'IMAGE' NOT NULL,
        \`original_file_path\` text NOT NULL,
        \`original_file_name\` text NOT NULL,
        \`original_file_size_bytes\` integer NOT NULL,
        \`fingerprint_sha256\` text NOT NULL,
        \`normalized_file_path\` text,
        \`status\` text DEFAULT 'IMPORTED' NOT NULL,
        \`rotation_degrees\` integer DEFAULT 0 NOT NULL,
        \`excluded\` integer DEFAULT 0 NOT NULL,
        \`failure_reason\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`submission_id\`) REFERENCES \`capture_submissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (\`session_id\`) REFERENCES \`capture_sessions\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`idx_capture_pages_submission\` ON \`capture_pages\` (\`submission_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_capture_pages_session\` ON \`capture_pages\` (\`session_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_capture_pages_fingerprint\` ON \`capture_pages\` (\`fingerprint_sha256\`);
      CREATE INDEX IF NOT EXISTS \`idx_capture_pages_status\` ON \`capture_pages\` (\`status\`);

      CREATE TABLE IF NOT EXISTS \`extracted_answers\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`submission_id\` text NOT NULL,
        \`exam_question_id\` text NOT NULL,
        \`exam_version_label\` text,
        \`recognized_response\` text,
        \`recognized_option_label\` text,
        \`extraction_method\` text DEFAULT 'DETERMINISTIC' NOT NULL,
        \`confidence\` real,
        \`evidence_ref_json\` text,
        \`raw_extraction_json\` text,
        \`status\` text DEFAULT 'PENDING' NOT NULL,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`submission_id\`) REFERENCES \`capture_submissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (\`exam_question_id\`) REFERENCES \`exam_questions\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`idx_extracted_answers_submission\` ON \`extracted_answers\` (\`submission_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_extracted_answers_question\` ON \`extracted_answers\` (\`exam_question_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_extracted_answers_status\` ON \`extracted_answers\` (\`status\`);

      CREATE TABLE IF NOT EXISTS \`grading_runs\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`submission_id\` text NOT NULL,
        \`method\` text NOT NULL,
        \`triggered_by_user_id\` text,
        \`started_at\` text NOT NULL,
        \`completed_at\` text,
        \`question_count\` integer DEFAULT 0 NOT NULL,
        \`graded_count\` integer DEFAULT 0 NOT NULL,
        \`failed_count\` integer DEFAULT 0 NOT NULL,
        \`status\` text DEFAULT 'RUNNING' NOT NULL,
        FOREIGN KEY (\`submission_id\`) REFERENCES \`capture_submissions\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`idx_grading_runs_submission\` ON \`grading_runs\` (\`submission_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_grading_runs_status\` ON \`grading_runs\` (\`status\`);

      CREATE TABLE IF NOT EXISTS \`grading_decisions\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`submission_id\` text NOT NULL,
        \`exam_question_id\` text NOT NULL,
        \`question_position\` integer NOT NULL,
        \`question_marks\` integer NOT NULL,
        \`awarded_marks\` integer DEFAULT 0 NOT NULL,
        \`grading_method\` text NOT NULL,
        \`rubric_results_json\` text,
        \`teacher_override\` integer DEFAULT 0 NOT NULL,
        \`teacher_override_at\` text,
        \`ai_proposal_json\` text,
        \`grading_run_id\` text,
        \`status\` text DEFAULT 'PENDING' NOT NULL,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL,
        FOREIGN KEY (\`submission_id\`) REFERENCES \`capture_submissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (\`exam_question_id\`) REFERENCES \`exam_questions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (\`grading_run_id\`) REFERENCES \`grading_runs\`(\`id\`) ON UPDATE no action ON DELETE set null,
        CONSTRAINT "chk_grading_decision_awarded" CHECK("awarded_marks" >= 0),
        CONSTRAINT "chk_grading_decision_question_marks" CHECK("question_marks" > 0),
        CONSTRAINT "chk_grading_decision_awarded_max" CHECK("awarded_marks" <= "question_marks")
      );
      CREATE INDEX IF NOT EXISTS \`idx_grading_decisions_submission\` ON \`grading_decisions\` (\`submission_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_grading_decisions_question\` ON \`grading_decisions\` (\`exam_question_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_grading_decisions_run\` ON \`grading_decisions\` (\`grading_run_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_grading_decisions_status\` ON \`grading_decisions\` (\`status\`);
    `,
  },
  // 0011: Slide decks, slides, and slide blocks
  {
    id: '0011_slide_decks',
    sql: `
      CREATE TABLE IF NOT EXISTS \`slide_decks\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`title\` text NOT NULL,
        \`description\` text,
        \`curriculum_node_id\` text,
        \`group_id\` text,
        \`status\` text DEFAULT 'DRAFT' NOT NULL,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL
      );
      CREATE INDEX IF NOT EXISTS \`idx_slide_decks_status\` ON \`slide_decks\` (\`status\`);
      CREATE INDEX IF NOT EXISTS \`idx_slide_decks_curriculum\` ON \`slide_decks\` (\`curriculum_node_id\`);
      CREATE INDEX IF NOT EXISTS \`idx_slide_decks_group\` ON \`slide_decks\` (\`group_id\`);

      CREATE TABLE IF NOT EXISTS \`slides\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`deck_id\` text NOT NULL,
        \`title\` text,
        \`position\` integer DEFAULT 0 NOT NULL,
        \`notes\` text,
        \`created_at\` text NOT NULL,
        FOREIGN KEY (\`deck_id\`) REFERENCES \`slide_decks\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`idx_slides_deck\` ON \`slides\` (\`deck_id\`);

      CREATE TABLE IF NOT EXISTS \`slide_blocks\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`slide_id\` text NOT NULL,
        \`block_type\` text NOT NULL,
        \`content_json\` text NOT NULL,
        \`question_id\` text,
        \`position\` integer DEFAULT 0 NOT NULL,
        \`created_at\` text NOT NULL,
        FOREIGN KEY (\`slide_id\`) REFERENCES \`slides\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`idx_slide_blocks_slide\` ON \`slide_blocks\` (\`slide_id\`);
    `,
  },
  {
    id: '0012_review_artifacts',
    sql: `CREATE TABLE IF NOT EXISTS review_artifacts (
      id text PRIMARY KEY NOT NULL, source_document_id text NOT NULL, title text NOT NULL,
      review_type text NOT NULL, detail_level text NOT NULL, scope text,
      question_count integer NOT NULL, include_model_answers integer NOT NULL,
      content_json text NOT NULL, created_at text NOT NULL, updated_at text NOT NULL
    );`,
  },
  {
    id: '0013_notes_artifacts',
    sql: `CREATE TABLE IF NOT EXISTS notes_artifacts (
      id text PRIMARY KEY NOT NULL, source_document_id text NOT NULL, title text NOT NULL,
      grade_level text NOT NULL, scope text, detail_style text NOT NULL,
      include_exercises integer NOT NULL, include_model_solutions integer NOT NULL,
      content_json text NOT NULL, created_at text NOT NULL, updated_at text NOT NULL
    );`,
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

const LEGACY_MIGRATION_ALIASES: Record<string, string[]> = {
  // Legacy interim Phase 6 build used 0011_curriculum_library_metadata
  // which performed the same ALTER TABLE statements now in 0006_curriculum_library_metadata.
  // If the legacy ID was already applied, mark the canonical ID as also applied
  // to prevent duplicate ALTER TABLE ADD COLUMN crashes.
  '0006_curriculum_library_metadata': ['0011_curriculum_library_metadata'],
};

function reconcileLegacyMigrations(db: Database.Database, applied: Set<string>): void {
  const insertStmt = db.prepare('INSERT OR IGNORE INTO __tibyan_migrations (id, applied_at) VALUES (?, ?)');
  const now = new Date().toISOString();

  for (const [canonicalId, legacyIds] of Object.entries(LEGACY_MIGRATION_ALIASES)) {
    if (!applied.has(canonicalId)) {
      const legacyFound = legacyIds.some((lid) => applied.has(lid));
      if (legacyFound) {
        insertStmt.run(canonicalId, now);
        applied.add(canonicalId);
      }
    }
  }
}

export function runMigrations(db: Database.Database, migrations: Migration[]): string[] {
  initMigrationTrackingTable(db);
  const applied = new Set(getAppliedMigrations(db));
  const newlyApplied: string[] = [];

  // Reconcile legacy migration IDs before running new migrations
  reconcileLegacyMigrations(db, applied);

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
