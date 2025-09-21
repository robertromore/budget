CREATE TABLE `budget_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budget_allocations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`transaction_id` integer NOT NULL,
	`period_id` integer,
	`allocated_amount` real NOT NULL,
	`percentage` real,
	`assignment_type` text DEFAULT 'manual',
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`period_id`) REFERENCES `budget_periods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budget_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`allocated_amount` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budget_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`allocated` real DEFAULT 0 NOT NULL,
	`spent` real DEFAULT 0 NOT NULL,
	`rollover` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'upcoming',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'account-monthly' NOT NULL,
	`enforcement` text DEFAULT 'warning' NOT NULL,
	`is_active` integer DEFAULT true,
	`metadata` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`deleted_at` text
);
