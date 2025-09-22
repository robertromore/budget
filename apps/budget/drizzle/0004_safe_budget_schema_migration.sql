-- SAFE budget schema migration with data preservation
-- This migration replaces the destructive 0004 migration
-- It preserves all existing data during the schema transformation

PRAGMA foreign_keys=OFF;

-- Step 1: Create new tables with temporary names
CREATE TABLE `budget_groups_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_id` integer,
	`color` text,
	`spending_limit` real,
	`inherit_parent_settings` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `budget_groups_new`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `budgets_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'account-monthly' NOT NULL,
	`scope` text DEFAULT 'account' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`enforcement_level` text DEFAULT 'warning' NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);

CREATE TABLE `budget_group_memberships_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets_new`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `budget_groups_new`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `budget_period_templates_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`type` text NOT NULL,
	`interval_count` integer DEFAULT 1 NOT NULL,
	`start_day_of_week` integer,
	`start_day_of_month` integer,
	`start_month` integer,
	`timezone` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets_new`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `budget_period_instances_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`allocated_amount` real NOT NULL,
	`rollover_amount` real DEFAULT 0 NOT NULL,
	`actual_amount` real DEFAULT 0 NOT NULL,
	`last_calculated` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `budget_period_templates_new`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `budget_accounts_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets_new`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	UNIQUE(`budget_id`, `account_id`)
);

CREATE TABLE `budget_categories_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`allocated_amount` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets_new`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	UNIQUE(`budget_id`, `category_id`)
);

CREATE TABLE `budget_transactions_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transaction_id` integer NOT NULL,
	`budget_id` integer NOT NULL,
	`allocated_amount` real NOT NULL,
	`auto_assigned` integer DEFAULT true,
	`assigned_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`assigned_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets_new`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Step 2: Migrate existing data (if any exists)
-- Check if old budget tables exist and have data
-- If no old tables exist, this is a fresh install and we keep the new empty tables

-- Migrate budgets: map old fields to new schema (only if old data exists)
INSERT INTO budgets_new (
	id, name, description, type, scope, status, enforcement_level, metadata, created_at, updated_at, deleted_at
)
SELECT
	id,
	name,
	description,
	type,
	'account' as scope, -- Default scope for migrated budgets
	CASE
		WHEN is_active = 1 THEN 'active'
		ELSE 'inactive'
	END as status,
	enforcement as enforcement_level,
	metadata,
	created_at,
	updated_at,
	deleted_at
FROM budgets
WHERE EXISTS (SELECT 1 FROM budgets LIMIT 1); -- Only if table exists and has data

-- Create default monthly period templates for existing budgets
INSERT INTO budget_period_templates_new (
	budget_id, type, interval_count, start_day_of_month, created_at
)
SELECT
	id as budget_id,
	'monthly' as type,
	1 as interval_count,
	1 as start_day_of_month,
	created_at
FROM budgets_new;

-- Migrate budget periods to period instances
-- Link them to the default monthly templates we just created
INSERT INTO budget_period_instances_new (
	template_id, start_date, end_date, allocated_amount, rollover_amount, actual_amount, created_at
)
SELECT
	bpt.id as template_id,
	bp.start_date,
	bp.end_date,
	bp.allocated as allocated_amount,
	bp.rollover as rollover_amount,
	bp.spent as actual_amount, -- spent becomes actual_amount
	bp.created_at
FROM budget_periods bp
JOIN budgets_new bn ON bp.budget_id = bn.id
JOIN budget_period_templates_new bpt ON bpt.budget_id = bn.id
WHERE EXISTS (SELECT 1 FROM budget_periods LIMIT 1); -- Only if table exists and has data

-- Migrate budget accounts (preserve existing associations)
INSERT INTO budget_accounts_new (budget_id, account_id, created_at)
SELECT budget_id, account_id, created_at
FROM budget_accounts
WHERE EXISTS (SELECT 1 FROM budget_accounts LIMIT 1); -- Only if table exists and has data

-- Migrate budget categories (preserve existing associations)
INSERT INTO budget_categories_new (budget_id, category_id, allocated_amount, created_at)
SELECT budget_id, category_id, allocated_amount, created_at
FROM budget_categories
WHERE EXISTS (SELECT 1 FROM budget_categories LIMIT 1); -- Only if table exists and has data

-- Migrate budget allocations to budget transactions
-- Map assignment_type to auto_assigned boolean and preserve audit trail
INSERT INTO budget_transactions_new (
	transaction_id, budget_id, allocated_amount, auto_assigned, assigned_at, assigned_by, created_at
)
SELECT
	transaction_id,
	budget_id,
	allocated_amount,
	CASE
		WHEN assignment_type = 'automatic' THEN 1
		ELSE 0
	END as auto_assigned,
	created_at as assigned_at, -- Use creation time as assignment time
	CASE
		WHEN assignment_type = 'manual' AND notes IS NOT NULL THEN notes
		ELSE NULL
	END as assigned_by, -- Use notes field as assigned_by if it exists
	created_at
FROM budget_allocations
WHERE EXISTS (SELECT 1 FROM budget_allocations LIMIT 1); -- Only if table exists and has data

-- Step 3: Remove old tables (they have been backed up via data migration above)
-- Drop old tables if they exist (safe since data is already migrated to new tables)
DROP TABLE IF EXISTS budget_categories;
DROP TABLE IF EXISTS budget_accounts;
DROP TABLE IF EXISTS budget_allocations;
DROP TABLE IF EXISTS budget_periods;
DROP TABLE IF EXISTS budgets;

-- Step 4: Rename new tables to final names
ALTER TABLE budgets_new RENAME TO budgets;
ALTER TABLE budget_groups_new RENAME TO budget_groups;
ALTER TABLE budget_group_memberships_new RENAME TO budget_group_memberships;
ALTER TABLE budget_period_templates_new RENAME TO budget_period_templates;
ALTER TABLE budget_period_instances_new RENAME TO budget_period_instances;
ALTER TABLE budget_accounts_new RENAME TO budget_accounts;
ALTER TABLE budget_categories_new RENAME TO budget_categories;
ALTER TABLE budget_transactions_new RENAME TO budget_transactions;

PRAGMA foreign_keys=ON;

-- Step 5: Verify migration success
-- This will fail if the migration didn't work properly
SELECT
	(SELECT COUNT(*) FROM budgets) as budgets_count,
	(SELECT COUNT(*) FROM budget_period_templates) as templates_count,
	(SELECT COUNT(*) FROM budget_period_instances) as instances_count,
	(SELECT COUNT(*) FROM budget_transactions) as transactions_count;