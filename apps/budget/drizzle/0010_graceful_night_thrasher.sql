ALTER TABLE `categories` ADD `income_reliability` text;--> statement-breakpoint
CREATE INDEX `category_income_reliability_idx` ON `categories` (`income_reliability`);