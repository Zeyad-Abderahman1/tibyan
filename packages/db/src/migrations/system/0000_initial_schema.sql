CREATE TABLE `academic_years` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`db_filename` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_years_name_unique` ON `academic_years` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `academic_years_db_filename_unique` ON `academic_years` (`db_filename`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_academic_years_single_active` ON `academic_years` (`is_active`) WHERE is_active = 1;--> statement-breakpoint
CREATE TABLE `backup_records` (
	`id` text PRIMARY KEY NOT NULL,
	`backup_path` text NOT NULL,
	`backup_date` text NOT NULL,
	`status` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`academic_years_included_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `global_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`code` text PRIMARY KEY NOT NULL,
	`name_ar` text NOT NULL,
	`description_ar` text NOT NULL,
	`category` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `system_audit_log` (
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
	CONSTRAINT "chk_system_audit_actor_invariant" CHECK(("actor_type" = 'USER' AND "actor_user_id" IS NOT NULL) OR ("actor_type" = 'SYSTEM' AND "actor_user_id" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_system_audit_created` ON `system_audit_log` (`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `user_permissions` (
	`user_id` text NOT NULL,
	`permission_code` text NOT NULL,
	`granted_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `permission_code`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_code`) REFERENCES `permissions`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`username` text NOT NULL,
	`pin_hash` text NOT NULL,
	`salt` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);