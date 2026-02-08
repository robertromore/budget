CREATE TABLE `account_document` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`account_id` integer NOT NULL,
	`tax_year` integer NOT NULL,
	`document_type` text DEFAULT 'other',
	`file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`storage_path` text NOT NULL,
	`storage_url` text,
	`title` text,
	`description` text,
	`extracted_text` text,
	`extracted_data` text,
	`uploaded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_document_account_idx` ON `account_document` (`account_id`);--> statement-breakpoint
CREATE INDEX `account_document_tax_year_idx` ON `account_document` (`tax_year`);--> statement-breakpoint
CREATE INDEX `account_document_type_idx` ON `account_document` (`document_type`);--> statement-breakpoint
CREATE INDEX `account_document_deleted_at_idx` ON `account_document` (`deleted_at`);