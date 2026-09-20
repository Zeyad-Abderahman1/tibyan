CREATE TABLE `question_curriculum_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`curriculum_node_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`curriculum_node_id`) REFERENCES `curriculum_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_question_node_unique` ON `question_curriculum_tags` (`question_id`,`curriculum_node_id`);--> statement-breakpoint
CREATE INDEX `idx_question_tag_node` ON `question_curriculum_tags` (`curriculum_node_id`);--> statement-breakpoint
CREATE TABLE `question_source_references` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`source_reference_id` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_reference_id`) REFERENCES `source_references`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_question_source_unique` ON `question_source_references` (`question_id`,`source_reference_id`);--> statement-breakpoint
CREATE INDEX `idx_question_source_ref` ON `question_source_references` (`source_reference_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`body_json` text NOT NULL,
	`model_answer_json` text,
	`question_type` text DEFAULT 'MULTIPLE_CHOICE' NOT NULL,
	`difficulty` text DEFAULT 'MEDIUM' NOT NULL,
	`default_marks` integer DEFAULT 1 NOT NULL,
	`language_track` text DEFAULT 'ARABIC' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`content_fingerprint` text NOT NULL,
	`metadata_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_question_code` ON `questions` (`code`);--> statement-breakpoint
CREATE INDEX `idx_question_fingerprint` ON `questions` (`content_fingerprint`);--> statement-breakpoint
CREATE INDEX `idx_question_type_diff` ON `questions` (`question_type`,`difficulty`);--> statement-breakpoint
CREATE INDEX `idx_question_status` ON `questions` (`status`);--> statement-breakpoint
CREATE TABLE `source_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`publisher` text,
	`edition_year` text,
	`curriculum_catalog_id` text,
	`file_path` text NOT NULL,
	`file_name` text NOT NULL,
	`file_size_bytes` integer NOT NULL,
	`sha256_hash` text NOT NULL,
	`page_count` integer NOT NULL,
	`status` text DEFAULT 'INDEXED' NOT NULL,
	`metadata_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`curriculum_catalog_id`) REFERENCES `curriculum_catalogs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_document_hash` ON `source_documents` (`sha256_hash`);--> statement-breakpoint
CREATE INDEX `idx_source_document_catalog` ON `source_documents` (`curriculum_catalog_id`);--> statement-breakpoint
CREATE TABLE `source_references` (
	`id` text PRIMARY KEY NOT NULL,
	`source_document_id` text NOT NULL,
	`start_page` integer NOT NULL,
	`end_page` integer NOT NULL,
	`reference_label` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_source_ref_document` ON `source_references` (`source_document_id`);--> statement-breakpoint
CREATE INDEX `idx_source_ref_pages` ON `source_references` (`source_document_id`,`start_page`,`end_page`);