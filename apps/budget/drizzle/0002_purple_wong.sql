CREATE TABLE `budget_account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_account_unique` ON `budget_account` (`budget_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `budget_account_account_idx` ON `budget_account` (`account_id`);--> statement-breakpoint
CREATE TABLE `budget_category` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_category_unique` ON `budget_category` (`budget_id`,`category_id`);--> statement-breakpoint
CREATE INDEX `budget_category_category_idx` ON `budget_category` (`category_id`);--> statement-breakpoint
CREATE TABLE `budget_group_membership` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `budget_group`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_group_membership_unique` ON `budget_group_membership` (`budget_id`,`group_id`);--> statement-breakpoint
CREATE TABLE `budget_group` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_id` integer,
	`color` text,
	`spending_limit` real,
	`inherit_parent_settings` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `budget_group`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `budget_group_parent_idx` ON `budget_group` (`parent_id`);--> statement-breakpoint
CREATE INDEX `budget_group_name_idx` ON `budget_group` (`name`);--> statement-breakpoint
CREATE TABLE `budget_period_instance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`allocated_amount` real NOT NULL,
	`rollover_amount` real DEFAULT 0 NOT NULL,
	`actual_amount` real DEFAULT 0 NOT NULL,
	`last_calculated` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `budget_period_template`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `budget_period_instance_template_idx` ON `budget_period_instance` (`template_id`);--> statement-breakpoint
CREATE INDEX `budget_period_instance_range_idx` ON `budget_period_instance` (`start_date`,`end_date`);--> statement-breakpoint
CREATE TABLE `budget_period_template` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`type` text NOT NULL,
	`interval_count` integer DEFAULT 1 NOT NULL,
	`start_day_of_week` integer,
	`start_day_of_month` integer,
	`start_month` integer,
	`timezone` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `budget_period_template_budget_idx` ON `budget_period_template` (`budget_id`);--> statement-breakpoint
CREATE INDEX `budget_period_template_type_idx` ON `budget_period_template` (`type`);--> statement-breakpoint
CREATE TABLE `budget_transaction` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transaction_id` integer NOT NULL,
	`budget_id` integer NOT NULL,
	`allocated_amount` real NOT NULL,
	`auto_assigned` integer DEFAULT true NOT NULL,
	`assigned_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`assigned_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `budget_transaction_budget_idx` ON `budget_transaction` (`budget_id`);--> statement-breakpoint
CREATE INDEX `budget_transaction_transaction_idx` ON `budget_transaction` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `budget_transaction_assigned_at_idx` ON `budget_transaction` (`assigned_at`);--> statement-breakpoint
CREATE TABLE `budget` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`scope` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`enforcement_level` text DEFAULT 'warning' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `budget_type_idx` ON `budget` (`type`);--> statement-breakpoint
CREATE INDEX `budget_scope_idx` ON `budget` (`scope`);--> statement-breakpoint
CREATE INDEX `budget_status_idx` ON `budget` (`status`);--> statement-breakpoint
CREATE INDEX `budget_enforcement_idx` ON `budget` (`enforcement_level`);--> statement-breakpoint
ALTER TABLE `schedules` ADD `budget_id` integer REFERENCES budget(id);--> statement-breakpoint
CREATE INDEX `relations_schedule_budget_idx` ON `schedules` (`budget_id`);