CREATE TABLE `curriculum_catalogs` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`education_system` text NOT NULL,
	`grade_level` text NOT NULL,
	`language_track` text NOT NULL,
	`math_branch` text,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`published_at` text,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_curriculum_catalog_scope_version` ON `curriculum_catalogs` (`education_system`,`grade_level`,`language_track`,`math_branch`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_curriculum_catalog_code_version` ON `curriculum_catalogs` (`code`,`version`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_catalog_status` ON `curriculum_catalogs` (`status`);--> statement-breakpoint
CREATE TABLE `curriculum_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`catalog_id` text NOT NULL,
	`parent_id` text,
	`tier` text NOT NULL,
	`title_ar` text NOT NULL,
	`title_en` text,
	`code` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`description` text,
	`metadata_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`catalog_id`) REFERENCES `curriculum_catalogs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_curriculum_node_catalog_parent` ON `curriculum_nodes` (`catalog_id`,`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_node_catalog_order` ON `curriculum_nodes` (`catalog_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_node_catalog_tier` ON `curriculum_nodes` (`catalog_id`,`tier`);