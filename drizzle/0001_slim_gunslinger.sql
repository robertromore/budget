ALTER TABLE `account` ADD `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `account` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `account` ADD `deleted_at` text;--> statement-breakpoint
CREATE INDEX `account_name_idx` ON `account` (`name`);--> statement-breakpoint
CREATE INDEX `account_slug_idx` ON `account` (`slug`);--> statement-breakpoint
CREATE INDEX `account_closed_idx` ON `account` (`closed`);--> statement-breakpoint
CREATE INDEX `account_deleted_at_idx` ON `account` (`deleted_at`);--> statement-breakpoint
ALTER TABLE `categories` ADD `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `deleted_at` text;--> statement-breakpoint
CREATE INDEX `category_name_idx` ON `categories` (`name`);--> statement-breakpoint
CREATE INDEX `category_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `category_deleted_at_idx` ON `categories` (`deleted_at`);--> statement-breakpoint
ALTER TABLE `payee` ADD `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `payee` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `payee` ADD `deleted_at` text;--> statement-breakpoint
CREATE INDEX `payee_name_idx` ON `payee` (`name`);--> statement-breakpoint
CREATE INDEX `payee_deleted_at_idx` ON `payee` (`deleted_at`);--> statement-breakpoint
ALTER TABLE `schedules` ADD `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `schedules` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
CREATE INDEX `schedule_status_idx` ON `schedules` (`status`);--> statement-breakpoint
CREATE INDEX `schedule_name_idx` ON `schedules` (`name`);--> statement-breakpoint
CREATE INDEX `schedule_slug_idx` ON `schedules` (`slug`);--> statement-breakpoint
ALTER TABLE `transaction` ADD `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `transaction` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `transaction` ADD `deleted_at` text;--> statement-breakpoint
CREATE INDEX `transaction_account_date_idx` ON `transaction` (`account_id`,`date`,`id`);--> statement-breakpoint
CREATE INDEX `transaction_date_idx` ON `transaction` (`date`);--> statement-breakpoint
CREATE INDEX `transaction_status_idx` ON `transaction` (`status`);--> statement-breakpoint
CREATE INDEX `transaction_parent_idx` ON `transaction` (`parent_id`);--> statement-breakpoint
CREATE INDEX `transaction_deleted_at_idx` ON `transaction` (`deleted_at`);