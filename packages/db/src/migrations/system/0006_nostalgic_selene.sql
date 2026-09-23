ALTER TABLE `source_documents` ADD `grade_level` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `education_system` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `subject` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `description` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `academic_year_id` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `import_source` text DEFAULT 'MANUAL' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_source_document_grade` ON `source_documents` (`grade_level`);--> statement-breakpoint
CREATE INDEX `idx_source_document_subject` ON `source_documents` (`subject`);