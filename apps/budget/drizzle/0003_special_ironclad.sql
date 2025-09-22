PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_budget_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_budget_accounts`("id", "budget_id", "account_id", "created_at") SELECT "id", "budget_id", "account_id", "created_at" FROM `budget_accounts`;--> statement-breakpoint
DROP TABLE `budget_accounts`;--> statement-breakpoint
ALTER TABLE `__new_budget_accounts` RENAME TO `budget_accounts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_budget_allocations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`transaction_id` integer NOT NULL,
	`period_id` integer,
	`allocated_amount` real NOT NULL,
	`percentage` real,
	`assignment_type` text DEFAULT 'manual',
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`period_id`) REFERENCES `budget_periods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_budget_allocations`("id", "budget_id", "transaction_id", "period_id", "allocated_amount", "percentage", "assignment_type", "notes", "created_at") SELECT "id", "budget_id", "transaction_id", "period_id", "allocated_amount", "percentage", "assignment_type", "notes", "created_at" FROM `budget_allocations`;--> statement-breakpoint
DROP TABLE `budget_allocations`;--> statement-breakpoint
ALTER TABLE `__new_budget_allocations` RENAME TO `budget_allocations`;--> statement-breakpoint
CREATE TABLE `__new_budget_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`allocated_amount` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_budget_categories`("id", "budget_id", "category_id", "allocated_amount", "created_at") SELECT "id", "budget_id", "category_id", "allocated_amount", "created_at" FROM `budget_categories`;--> statement-breakpoint
DROP TABLE `budget_categories`;--> statement-breakpoint
ALTER TABLE `__new_budget_categories` RENAME TO `budget_categories`;--> statement-breakpoint
CREATE TABLE `__new_budget_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`allocated` real DEFAULT 0 NOT NULL,
	`spent` real DEFAULT 0 NOT NULL,
	`rollover` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'upcoming',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_budget_periods`("id", "budget_id", "name", "start_date", "end_date", "allocated", "spent", "rollover", "status", "created_at", "updated_at") SELECT "id", "budget_id", "name", "start_date", "end_date", "allocated", "spent", "rollover", "status", "created_at", "updated_at" FROM `budget_periods`;--> statement-breakpoint
DROP TABLE `budget_periods`;--> statement-breakpoint
ALTER TABLE `__new_budget_periods` RENAME TO `budget_periods`;--> statement-breakpoint
CREATE TABLE `__new_budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'account-monthly' NOT NULL,
	`enforcement` text DEFAULT 'warning' NOT NULL,
	`is_active` integer DEFAULT true,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_budgets`("id", "cuid", "name", "description", "type", "enforcement", "is_active", "metadata", "created_at", "updated_at", "deleted_at") SELECT "id", "cuid", "name", "description", "type", "enforcement", "is_active", "metadata", "created_at", "updated_at", "deleted_at" FROM `budgets`;--> statement-breakpoint
DROP TABLE `budgets`;--> statement-breakpoint
ALTER TABLE `__new_budgets` RENAME TO `budgets`;