CREATE TABLE `attendance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text NOT NULL,
	`arrival_time` text,
	`notes` text,
	`recorded_by_user_id` text,
	`recorded_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_attendance_session_student` ON `attendance_records` (`session_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_session` ON `attendance_records` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_student` ON `attendance_records` (`student_id`);