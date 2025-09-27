ALTER TABLE `account` ADD `account_type` text DEFAULT 'checking';--> statement-breakpoint
ALTER TABLE `account` ADD `institution` text;--> statement-breakpoint
ALTER TABLE `account` ADD `account_icon` text;--> statement-breakpoint
ALTER TABLE `account` ADD `account_color` text;--> statement-breakpoint
ALTER TABLE `account` ADD `initial_balance` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `account` ADD `account_number_last4` text;