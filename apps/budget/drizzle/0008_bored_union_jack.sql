ALTER TABLE `categories` ADD `category_type` text DEFAULT 'expense' NOT NULL;--> statement-breakpoint
CREATE INDEX `category_type_idx` ON `categories` (`category_type`);