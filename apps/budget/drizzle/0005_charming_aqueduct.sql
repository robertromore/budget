ALTER TABLE `payee` ADD `default_category_id` integer REFERENCES categories(id);--> statement-breakpoint
ALTER TABLE `payee` ADD `default_budget_id` integer REFERENCES budget(id);--> statement-breakpoint
ALTER TABLE `payee` ADD `payee_type` text;--> statement-breakpoint
ALTER TABLE `payee` ADD `avg_amount` real;--> statement-breakpoint
ALTER TABLE `payee` ADD `payment_frequency` text;--> statement-breakpoint
ALTER TABLE `payee` ADD `last_transaction_date` text;--> statement-breakpoint
ALTER TABLE `payee` ADD `tax_relevant` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `payee` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `payee` ADD `website` text;--> statement-breakpoint
ALTER TABLE `payee` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `payee` ADD `email` text;--> statement-breakpoint
ALTER TABLE `payee` ADD `address` text;--> statement-breakpoint
ALTER TABLE `payee` ADD `account_number` text;--> statement-breakpoint
ALTER TABLE `payee` ADD `alert_threshold` real;--> statement-breakpoint
ALTER TABLE `payee` ADD `is_seasonal` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `payee` ADD `subscription_info` text;--> statement-breakpoint
ALTER TABLE `payee` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `payee` ADD `preferred_payment_methods` text;--> statement-breakpoint
ALTER TABLE `payee` ADD `merchant_category_code` text;--> statement-breakpoint
CREATE INDEX `payee_default_category_idx` ON `payee` (`default_category_id`);--> statement-breakpoint
CREATE INDEX `payee_default_budget_idx` ON `payee` (`default_budget_id`);--> statement-breakpoint
CREATE INDEX `payee_type_idx` ON `payee` (`payee_type`);--> statement-breakpoint
CREATE INDEX `payee_is_active_idx` ON `payee` (`is_active`);--> statement-breakpoint
CREATE INDEX `payee_tax_relevant_idx` ON `payee` (`tax_relevant`);--> statement-breakpoint
CREATE INDEX `payee_payment_frequency_idx` ON `payee` (`payment_frequency`);--> statement-breakpoint
CREATE INDEX `payee_last_transaction_date_idx` ON `payee` (`last_transaction_date`);--> statement-breakpoint
CREATE INDEX `payee_active_type_idx` ON `payee` (`is_active`,`payee_type`);--> statement-breakpoint
CREATE INDEX `payee_category_budget_idx` ON `payee` (`default_category_id`,`default_budget_id`);