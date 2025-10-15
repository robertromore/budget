CREATE TABLE `expense_receipt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`medical_expense_id` integer NOT NULL,
	`receipt_type` text DEFAULT 'receipt',
	`file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`storage_path` text NOT NULL,
	`storage_url` text,
	`extracted_text` text,
	`extracted_data` text,
	`description` text,
	`uploaded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`medical_expense_id`) REFERENCES `medical_expense`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `expense_receipt_medical_expense_idx` ON `expense_receipt` (`medical_expense_id`);--> statement-breakpoint
CREATE INDEX `expense_receipt_type_idx` ON `expense_receipt` (`receipt_type`);--> statement-breakpoint
CREATE INDEX `expense_receipt_deleted_at_idx` ON `expense_receipt` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `hsa_claim` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`medical_expense_id` integer NOT NULL,
	`claim_number` text,
	`status` text DEFAULT 'not_submitted' NOT NULL,
	`claimed_amount` real NOT NULL,
	`approved_amount` real DEFAULT 0,
	`denied_amount` real DEFAULT 0,
	`paid_amount` real DEFAULT 0,
	`submitted_date` text,
	`review_date` text,
	`approval_date` text,
	`payment_date` text,
	`denial_reason` text,
	`denial_code` text,
	`administrator_name` text,
	`notes` text,
	`internal_notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`medical_expense_id`) REFERENCES `medical_expense`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `hsa_claim_medical_expense_idx` ON `hsa_claim` (`medical_expense_id`);--> statement-breakpoint
CREATE INDEX `hsa_claim_status_idx` ON `hsa_claim` (`status`);--> statement-breakpoint
CREATE INDEX `hsa_claim_submitted_date_idx` ON `hsa_claim` (`submitted_date`);--> statement-breakpoint
CREATE INDEX `hsa_claim_payment_date_idx` ON `hsa_claim` (`payment_date`);--> statement-breakpoint
CREATE INDEX `hsa_claim_deleted_at_idx` ON `hsa_claim` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `medical_expense` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`transaction_id` integer NOT NULL,
	`hsa_account_id` integer NOT NULL,
	`expense_type` text NOT NULL,
	`is_qualified` integer DEFAULT true NOT NULL,
	`provider` text,
	`patient_name` text,
	`diagnosis` text,
	`treatment_description` text,
	`amount` real NOT NULL,
	`insurance_covered` real DEFAULT 0 NOT NULL,
	`out_of_pocket` real NOT NULL,
	`service_date` text NOT NULL,
	`paid_date` text,
	`tax_year` integer NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`hsa_account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `medical_expense_transaction_unique_idx` ON `medical_expense` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `medical_expense_hsa_account_idx` ON `medical_expense` (`hsa_account_id`);--> statement-breakpoint
CREATE INDEX `medical_expense_type_idx` ON `medical_expense` (`expense_type`);--> statement-breakpoint
CREATE INDEX `medical_expense_tax_year_idx` ON `medical_expense` (`tax_year`);--> statement-breakpoint
CREATE INDEX `medical_expense_service_date_idx` ON `medical_expense` (`service_date`);--> statement-breakpoint
CREATE INDEX `medical_expense_qualified_idx` ON `medical_expense` (`is_qualified`);--> statement-breakpoint
CREATE INDEX `medical_expense_deleted_at_idx` ON `medical_expense` (`deleted_at`);--> statement-breakpoint
ALTER TABLE `account` ADD `hsa_contribution_limit` real;--> statement-breakpoint
ALTER TABLE `account` ADD `hsa_type` text;--> statement-breakpoint
ALTER TABLE `account` ADD `hsa_current_tax_year` integer;--> statement-breakpoint
ALTER TABLE `account` ADD `hsa_administrator` text;--> statement-breakpoint
ALTER TABLE `account` ADD `hsa_high_deductible_plan` text;