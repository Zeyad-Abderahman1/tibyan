CREATE TABLE `group_curriculum_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`catalog_id` text NOT NULL,
	`catalog_version` integer NOT NULL,
	`assigned_at` text NOT NULL,
	`assigned_by_user_id` text,
	`assigned_name_snapshot` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_group_curriculum_assignment_group` ON `group_curriculum_assignments` (`group_id`);--> statement-breakpoint
CREATE INDEX `idx_group_curriculum_assignment_catalog` ON `group_curriculum_assignments` (`catalog_id`);--> statement-breakpoint
CREATE TABLE `group_curriculum_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`catalog_id` text NOT NULL,
	`node_id` text NOT NULL,
	`status` text DEFAULT 'NOT_STARTED' NOT NULL,
	`completed_at` text,
	`updated_by_user_id` text,
	`updated_name_snapshot` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_group_curriculum_progress_group_node` ON `group_curriculum_progress` (`group_id`,`node_id`);--> statement-breakpoint
CREATE INDEX `idx_group_curriculum_progress_group_status` ON `group_curriculum_progress` (`group_id`,`status`);