ALTER TABLE `categories` ADD `is_tax_deductible` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `tax_category` text;--> statement-breakpoint
ALTER TABLE `categories` ADD `deductible_percentage` integer;--> statement-breakpoint
ALTER TABLE `categories` ADD `is_seasonal` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `seasonal_months` text;--> statement-breakpoint
ALTER TABLE `categories` ADD `expected_monthly_min` real;--> statement-breakpoint
ALTER TABLE `categories` ADD `expected_monthly_max` real;--> statement-breakpoint
ALTER TABLE `categories` ADD `spending_priority` text;--> statement-breakpoint
CREATE INDEX `category_tax_deductible_idx` ON `categories` (`is_tax_deductible`);--> statement-breakpoint
CREATE INDEX `category_is_seasonal_idx` ON `categories` (`is_seasonal`);--> statement-breakpoint
CREATE INDEX `category_spending_priority_idx` ON `categories` (`spending_priority`);