ALTER TABLE `account_document` ADD `extraction_status` text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `account_document` ADD `extraction_method` text;--> statement-breakpoint
ALTER TABLE `account_document` ADD `extraction_error` text;--> statement-breakpoint
ALTER TABLE `account_document` ADD `extracted_at` text;--> statement-breakpoint
CREATE INDEX `account_document_extraction_status_idx` ON `account_document` (`extraction_status`);