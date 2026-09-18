CREATE TABLE `attendance_follow_ups` (
	`id` text PRIMARY KEY NOT NULL,
	`attendance_record_id` text NOT NULL,
	`contact_status` text DEFAULT 'UNCONTACTED' NOT NULL,
	`note` text,
	`contacted_at` text,
	`contacted_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`attendance_record_id`) REFERENCES `attendance_records`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_contact_status" CHECK("contact_status" IN ('UNCONTACTED', 'CONTACTED', 'UNREACHABLE'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_attendance_follow_up_record` ON `attendance_follow_ups` (`attendance_record_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_follow_up_status` ON `attendance_follow_ups` (`contact_status`);