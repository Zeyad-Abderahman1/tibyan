CREATE TABLE `academic_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_type` text DEFAULT 'USER' NOT NULL,
	`actor_user_id` text,
	`actor_name_snapshot` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`metadata_json` text,
	`created_at` text NOT NULL,
	CONSTRAINT "chk_academic_audit_actor_invariant" CHECK(("actor_type" = 'USER' AND "actor_user_id" IS NOT NULL) OR ("actor_type" = 'SYSTEM' AND "actor_user_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `idx_academic_audit_created` ON `academic_audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_academic_audit_entity` ON `academic_audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `group_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`student_id` text NOT NULL,
	`enrolled_at` text NOT NULL,
	`left_at` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`payment_type_override` text,
	`payment_amount_override` real,
	`created_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_enrollment_payment_amount_override" CHECK("payment_amount_override" IS NULL OR "payment_amount_override" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_group_enrollments_active` ON `group_enrollments` (`group_id`,`student_id`) WHERE "status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX `idx_enrollments_student` ON `group_enrollments` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_enrollments_group` ON `group_enrollments` (`group_id`);--> statement-breakpoint
CREATE TABLE `group_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`start_time` text NOT NULL,
	`duration_minutes` integer DEFAULT 120 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_schedule_weekday" CHECK("weekday" BETWEEN 0 AND 6),
	CONSTRAINT "chk_schedule_duration" CHECK("duration_minutes" > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_schedules_group` ON `group_schedules` (`group_id`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`education_system` text NOT NULL,
	`grade_level` text NOT NULL,
	`language_track` text NOT NULL,
	`focus_math_branch` text,
	`default_payment_type` text NOT NULL,
	`default_payment_amount` real NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "chk_groups_default_payment_amount" CHECK("default_payment_amount" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_groups_status` ON `groups` (`status`);--> statement-breakpoint
CREATE INDEX `idx_groups_grade` ON `groups` (`grade_level`,`education_system`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`schedule_id` text,
	`occurrence_key` text NOT NULL,
	`scheduled_date` text NOT NULL,
	`scheduled_start_time` text NOT NULL,
	`effective_date` text NOT NULL,
	`effective_start_time` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	`reschedule_reason` text,
	`rescheduled_at` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`schedule_id`) REFERENCES `group_schedules`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_session_duration" CHECK("duration_minutes" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sessions_occurrence` ON `sessions` (`occurrence_key`);--> statement-breakpoint
CREATE INDEX `idx_sessions_effective_slot` ON `sessions` (`group_id`,`effective_date`,`effective_start_time`);--> statement-breakpoint
CREATE INDEX `idx_sessions_effective_date` ON `sessions` (`effective_date`);--> statement-breakpoint
CREATE TABLE `student_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`author_user_id` text,
	`author_name_snapshot` text NOT NULL,
	`note_text` text NOT NULL,
	`tag` text DEFAULT 'GENERAL' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_notes_student` ON `student_notes` (`student_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`student_code` text NOT NULL,
	`full_name` text NOT NULL,
	`photo_path` text,
	`education_system` text NOT NULL,
	`grade_level` text NOT NULL,
	`language_track` text NOT NULL,
	`guardian_phone` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`qr_token` text NOT NULL,
	`barcode_value` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "chk_students_status" CHECK("status" IN ('ACTIVE', 'INACTIVE'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_student_code_unique` ON `students` (`student_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `students_qr_token_unique` ON `students` (`qr_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `students_barcode_value_unique` ON `students` (`barcode_value`);--> statement-breakpoint
CREATE INDEX `idx_students_status` ON `students` (`status`);--> statement-breakpoint
CREATE INDEX `idx_students_grade` ON `students` (`grade_level`,`education_system`);--> statement-breakpoint
CREATE INDEX `idx_students_track` ON `students` (`language_track`);