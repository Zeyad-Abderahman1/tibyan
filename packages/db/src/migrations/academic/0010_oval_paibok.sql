CREATE TABLE `capture_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`session_id` text NOT NULL,
	`page_order` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'IMAGE' NOT NULL,
	`original_file_path` text NOT NULL,
	`original_file_name` text NOT NULL,
	`original_file_size_bytes` integer NOT NULL,
	`fingerprint_sha256` text NOT NULL,
	`normalized_file_path` text,
	`status` text DEFAULT 'IMPORTED' NOT NULL,
	`rotation_degrees` integer DEFAULT 0 NOT NULL,
	`excluded` integer DEFAULT false NOT NULL,
	`failure_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `capture_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `capture_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_capture_pages_submission` ON `capture_pages` (`submission_id`);--> statement-breakpoint
CREATE INDEX `idx_capture_pages_session` ON `capture_pages` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_capture_pages_fingerprint` ON `capture_pages` (`fingerprint_sha256`);--> statement-breakpoint
CREATE INDEX `idx_capture_pages_status` ON `capture_pages` (`status`);--> statement-breakpoint
CREATE TABLE `capture_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`exam_form_label` text NOT NULL,
	`status` text DEFAULT 'COLLECTING' NOT NULL,
	`total_submissions` integer DEFAULT 0 NOT NULL,
	`completed_submissions` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_capture_sessions_exam` ON `capture_sessions` (`exam_id`);--> statement-breakpoint
CREATE INDEX `idx_capture_sessions_status` ON `capture_sessions` (`status`);--> statement-breakpoint
CREATE TABLE `capture_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text,
	`student_name_snapshot` text,
	`student_code_snapshot` text,
	`association_method` text DEFAULT 'UNASSOCIATED' NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`page_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `capture_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_capture_submissions_session` ON `capture_submissions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_capture_submissions_student` ON `capture_submissions` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_capture_submissions_status` ON `capture_submissions` (`status`);--> statement-breakpoint
CREATE TABLE `extracted_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`exam_question_id` text NOT NULL,
	`exam_version_label` text,
	`recognized_response` text,
	`recognized_option_label` text,
	`extraction_method` text DEFAULT 'DETERMINISTIC' NOT NULL,
	`confidence` real,
	`evidence_ref_json` text,
	`raw_extraction_json` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `capture_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exam_question_id`) REFERENCES `exam_questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_extracted_answers_submission` ON `extracted_answers` (`submission_id`);--> statement-breakpoint
CREATE INDEX `idx_extracted_answers_question` ON `extracted_answers` (`exam_question_id`);--> statement-breakpoint
CREATE INDEX `idx_extracted_answers_status` ON `extracted_answers` (`status`);--> statement-breakpoint
CREATE TABLE `grading_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`exam_question_id` text NOT NULL,
	`question_position` integer NOT NULL,
	`question_marks` integer NOT NULL,
	`awarded_marks` integer DEFAULT 0 NOT NULL,
	`grading_method` text NOT NULL,
	`rubric_results_json` text,
	`teacher_override` integer DEFAULT false NOT NULL,
	`teacher_override_at` text,
	`ai_proposal_json` text,
	`grading_run_id` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `capture_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exam_question_id`) REFERENCES `exam_questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`grading_run_id`) REFERENCES `grading_runs`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_grading_decision_awarded" CHECK("awarded_marks" >= 0),
	CONSTRAINT "chk_grading_decision_question_marks" CHECK("question_marks" > 0),
	CONSTRAINT "chk_grading_decision_awarded_max" CHECK("awarded_marks" <= "question_marks")
);
--> statement-breakpoint
CREATE INDEX `idx_grading_decisions_submission` ON `grading_decisions` (`submission_id`);--> statement-breakpoint
CREATE INDEX `idx_grading_decisions_question` ON `grading_decisions` (`exam_question_id`);--> statement-breakpoint
CREATE INDEX `idx_grading_decisions_run` ON `grading_decisions` (`grading_run_id`);--> statement-breakpoint
CREATE INDEX `idx_grading_decisions_status` ON `grading_decisions` (`status`);--> statement-breakpoint
CREATE TABLE `grading_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`method` text NOT NULL,
	`triggered_by_user_id` text,
	`started_at` text NOT NULL,
	`completed_at` text,
	`question_count` integer DEFAULT 0 NOT NULL,
	`graded_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'RUNNING' NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `capture_submissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_grading_runs_submission` ON `grading_runs` (`submission_id`);--> statement-breakpoint
CREATE INDEX `idx_grading_runs_status` ON `grading_runs` (`status`);