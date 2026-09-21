CREATE TABLE `slide_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`slide_id` text NOT NULL,
	`block_type` text NOT NULL,
	`content_json` text NOT NULL,
	`question_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`slide_id`) REFERENCES `slides`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_slide_blocks_slide` ON `slide_blocks` (`slide_id`);--> statement-breakpoint
CREATE TABLE `slide_decks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`curriculum_node_id` text,
	`group_id` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_slide_decks_status` ON `slide_decks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_slide_decks_curriculum` ON `slide_decks` (`curriculum_node_id`);--> statement-breakpoint
CREATE INDEX `idx_slide_decks_group` ON `slide_decks` (`group_id`);--> statement-breakpoint
CREATE TABLE `slides` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`title` text,
	`position` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `slide_decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_slides_deck` ON `slides` (`deck_id`);