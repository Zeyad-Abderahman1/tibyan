CREATE TABLE `assistant_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`tool_name` text NOT NULL,
	`action` text NOT NULL,
	`input_summary_json` text,
	`affected_entities_json` text,
	`outcome` text NOT NULL,
	`receipt_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_assistant_audit_user` ON `assistant_audit_log` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `idx_assistant_audit_session` ON `assistant_audit_log` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_assistant_audit_tool` ON `assistant_audit_log` (`tool_name`);--> statement-breakpoint
CREATE INDEX `idx_assistant_audit_created` ON `assistant_audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `assistant_confirmations` (
	`id` text PRIMARY KEY NOT NULL,
	`preview_id` text NOT NULL,
	`tool_name` text NOT NULL,
	`tool_input_json` text NOT NULL,
	`summary` text NOT NULL,
	`requires_confirmation` integer DEFAULT true NOT NULL,
	`confirmed` integer DEFAULT false NOT NULL,
	`executed` integer DEFAULT false NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assistant_confirm_preview` ON `assistant_confirmations` (`preview_id`);--> statement-breakpoint
CREATE TABLE `assistant_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`tool_call_id` text,
	`tool_name` text,
	`tool_input_json` text,
	`tool_output_json` text,
	`confirmation_token` text,
	`preview_id` text,
	`receipt_id` text,
	`undo_available` integer DEFAULT false,
	`undo_token` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `assistant_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_assistant_msg_session` ON `assistant_messages` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_assistant_msg_preview` ON `assistant_messages` (`preview_id`);--> statement-breakpoint
CREATE INDEX `idx_assistant_msg_receipt` ON `assistant_messages` (`receipt_id`);--> statement-breakpoint
CREATE TABLE `assistant_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`context_scope` text,
	`context_entity_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_assistant_session_user` ON `assistant_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_assistant_session_updated` ON `assistant_sessions` (`updated_at`);