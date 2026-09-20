CREATE TABLE `exam_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_section_id` text NOT NULL,
	`question_id_snapshot` text,
	`provenance` text NOT NULL,
	`content_json` text NOT NULL,
	`answer_json` text,
	`curriculum_node_ids_json` text NOT NULL,
	`source_reference_ids_json` text NOT NULL,
	`marks` integer NOT NULL,
	`answer_space_lines` integer DEFAULT 0 NOT NULL,
	`position` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`exam_section_id`) REFERENCES `exam_sections`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_exam_question_marks" CHECK("exam_questions"."marks" > 0),
	CONSTRAINT "chk_exam_question_space" CHECK("exam_questions"."answer_space_lines" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_exam_questions_order` ON `exam_questions` (`exam_section_id`,`position`);--> statement-breakpoint
CREATE TABLE `exam_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`title` text NOT NULL,
	`instructions_json` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_exam_sections_order` ON `exam_sections` (`exam_id`,`position`);--> statement-breakpoint
CREATE TABLE `exam_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`label` text NOT NULL,
	`question_order_json` text NOT NULL,
	`answer_key_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_exam_versions_label` ON `exam_versions` (`exam_id`,`label`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`blueprint_json` text NOT NULL,
	`layout_json` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_exams_status` ON `exams` (`status`);