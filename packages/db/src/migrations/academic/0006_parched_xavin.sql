CREATE TABLE `invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`description` text NOT NULL,
	`item_type` text DEFAULT 'CUSTOM' NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`session_id` text,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_invoice_items_quantity" CHECK("quantity" > 0),
	CONSTRAINT "chk_invoice_items_unit_price" CHECK("unit_price_cents" >= 0),
	CONSTRAINT "chk_invoice_items_amount" CHECK("amount_cents" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_invoice_items_invoice` ON `invoice_items` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_number` text NOT NULL,
	`student_id` text NOT NULL,
	`group_id` text,
	`issue_date` text NOT NULL,
	`due_date` text,
	`period_month` text,
	`subtotal_cents` integer NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`total_cents` integer NOT NULL,
	`paid_cents` integer DEFAULT 0 NOT NULL,
	`remaining_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'UNPAID' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_invoices_subtotal" CHECK("subtotal_cents" >= 0),
	CONSTRAINT "chk_invoices_total" CHECK("total_cents" >= 0),
	CONSTRAINT "chk_invoices_paid" CHECK("paid_cents" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invoices_number` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `idx_invoices_student` ON `invoices` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_invoices_status` ON `invoices` (`status`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_number` text NOT NULL,
	`student_id` text NOT NULL,
	`group_id` text,
	`amount_cents` integer NOT NULL,
	`payment_method` text DEFAULT 'CASH' NOT NULL,
	`payment_date` text NOT NULL,
	`period_month` text,
	`notes` text,
	`recorded_by_user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_payments_amount" CHECK("amount_cents" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_receipt_number_unique` ON `payments` (`receipt_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_receipt` ON `payments` (`receipt_number`);--> statement-breakpoint
CREATE INDEX `idx_payments_student` ON `payments` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_date` ON `payments` (`payment_date`);--> statement-breakpoint
CREATE TABLE `student_discounts` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`group_id` text,
	`discount_type` text NOT NULL,
	`discount_value` integer NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`applied_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_discounts_value" CHECK("discount_value" > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_discounts_student` ON `student_discounts` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_discounts_status` ON `student_discounts` (`status`);