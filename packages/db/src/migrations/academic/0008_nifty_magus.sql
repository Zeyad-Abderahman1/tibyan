CREATE TABLE `lesson_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`curriculum_node_id` text NOT NULL,
	`title` text NOT NULL,
	`target_duration_minutes` integer DEFAULT 60 NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`sections_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_lesson_plans_curriculum_node` ON `lesson_plans` (`curriculum_node_id`);--> statement-breakpoint
CREATE INDEX `idx_lesson_plans_status` ON `lesson_plans` (`status`);--> statement-breakpoint
CREATE TABLE `session_reflections` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`lesson_plan_id` text,
	`lesson_plan_snapshot_json` text,
	`completion_status` text NOT NULL,
	`uncompleted_items` text,
	`topics_needing_review` text,
	`quick_notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_session_reflections_session` ON `session_reflections` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_session_reflections_status` ON `session_reflections` (`completion_status`);