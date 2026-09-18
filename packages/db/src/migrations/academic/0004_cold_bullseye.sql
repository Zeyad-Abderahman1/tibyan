PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_attendance_records` (
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
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_attendance_status" CHECK("status" IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
	CONSTRAINT "chk_attendance_arrival_time" CHECK(("status" = 'LATE' AND "arrival_time" IS NOT NULL AND ("arrival_time" GLOB '[0-1][0-9]:[0-5][0-9]' OR "arrival_time" GLOB '2[0-3]:[0-5][0-9]'))
        OR ("status" = 'PRESENT' AND ("arrival_time" IS NULL OR "arrival_time" GLOB '[0-1][0-9]:[0-5][0-9]' OR "arrival_time" GLOB '2[0-3]:[0-5][0-9]'))
        OR ("status" IN ('ABSENT', 'EXCUSED') AND "arrival_time" IS NULL))
);
--> statement-breakpoint
INSERT INTO `__new_attendance_records`("id", "session_id", "student_id", "status", "arrival_time", "notes", "recorded_by_user_id", "recorded_at", "updated_at") SELECT "id", "session_id", "student_id", "status", "arrival_time", "notes", "recorded_by_user_id", "recorded_at", "updated_at" FROM `attendance_records`;--> statement-breakpoint
DROP TABLE `attendance_records`;--> statement-breakpoint
ALTER TABLE `__new_attendance_records` RENAME TO `attendance_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_attendance_session_student` ON `attendance_records` (`session_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_session` ON `attendance_records` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_student` ON `attendance_records` (`student_id`);