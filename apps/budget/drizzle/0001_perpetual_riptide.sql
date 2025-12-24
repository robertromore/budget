PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`parent_id` integer,
	`name` text,
	`slug` text NOT NULL,
	`notes` text,
	`category_type` text DEFAULT 'expense' NOT NULL,
	`category_icon` text,
	`category_color` text,
	`is_active` integer DEFAULT true NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_tax_deductible` integer DEFAULT false NOT NULL,
	`tax_category` text,
	`deductible_percentage` integer,
	`is_seasonal` integer DEFAULT false NOT NULL,
	`seasonal_months` text,
	`expected_monthly_min` real,
	`expected_monthly_max` real,
	`spending_priority` text,
	`income_reliability` text,
	`date_created` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_categories`("id", "workspace_id", "parent_id", "name", "slug", "notes", "category_type", "category_icon", "category_color", "is_active", "display_order", "is_tax_deductible", "tax_category", "deductible_percentage", "is_seasonal", "seasonal_months", "expected_monthly_min", "expected_monthly_max", "spending_priority", "income_reliability", "date_created", "created_at", "updated_at", "deleted_at") SELECT "id", "workspace_id", "parent_id", "name", "slug", "notes", "category_type", "category_icon", "category_color", "is_active", "display_order", "is_tax_deductible", "tax_category", "deductible_percentage", "is_seasonal", "seasonal_months", "expected_monthly_min", "expected_monthly_max", "spending_priority", "income_reliability", "date_created", "created_at", "updated_at", "deleted_at" FROM `categories`;--> statement-breakpoint
DROP TABLE `categories`;--> statement-breakpoint
ALTER TABLE `__new_categories` RENAME TO `categories`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `category_workspace_id_idx` ON `categories` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `category_name_idx` ON `categories` (`name`);--> statement-breakpoint
CREATE INDEX `category_slug_idx` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `category_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `category_deleted_at_idx` ON `categories` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `category_type_idx` ON `categories` (`category_type`);--> statement-breakpoint
CREATE INDEX `category_icon_idx` ON `categories` (`category_icon`);--> statement-breakpoint
CREATE INDEX `category_is_active_idx` ON `categories` (`is_active`);--> statement-breakpoint
CREATE INDEX `category_display_order_idx` ON `categories` (`display_order`);--> statement-breakpoint
CREATE INDEX `category_tax_deductible_idx` ON `categories` (`is_tax_deductible`);--> statement-breakpoint
CREATE INDEX `category_is_seasonal_idx` ON `categories` (`is_seasonal`);--> statement-breakpoint
CREATE INDEX `category_spending_priority_idx` ON `categories` (`spending_priority`);--> statement-breakpoint
CREATE INDEX `category_income_reliability_idx` ON `categories` (`income_reliability`);--> statement-breakpoint
CREATE TABLE `__new_payee` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text,
	`slug` text NOT NULL,
	`notes` text,
	`default_category_id` integer,
	`default_budget_id` integer,
	`payee_type` text,
	`payee_category_id` integer,
	`avg_amount` real,
	`payment_frequency` text,
	`last_transaction_date` text,
	`tax_relevant` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`website` text,
	`phone` text,
	`email` text,
	`address` text DEFAULT 'null',
	`account_number` text,
	`alert_threshold` real,
	`is_seasonal` integer DEFAULT false NOT NULL,
	`subscription_info` text DEFAULT 'null',
	`ai_preferences` text DEFAULT 'null',
	`tags` text,
	`preferred_payment_methods` text,
	`merchant_category_code` text,
	`date_created` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`default_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`default_budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`payee_category_id`) REFERENCES `payee_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_payee`("id", "workspace_id", "name", "slug", "notes", "default_category_id", "default_budget_id", "payee_type", "payee_category_id", "avg_amount", "payment_frequency", "last_transaction_date", "tax_relevant", "is_active", "website", "phone", "email", "address", "account_number", "alert_threshold", "is_seasonal", "subscription_info", "ai_preferences", "tags", "preferred_payment_methods", "merchant_category_code", "date_created", "created_at", "updated_at", "deleted_at") SELECT "id", "workspace_id", "name", "slug", "notes", "default_category_id", "default_budget_id", "payee_type", "payee_category_id", "avg_amount", "payment_frequency", "last_transaction_date", "tax_relevant", "is_active", "website", "phone", "email", "address", "account_number", "alert_threshold", "is_seasonal", "subscription_info", "ai_preferences", "tags", "preferred_payment_methods", "merchant_category_code", "date_created", "created_at", "updated_at", "deleted_at" FROM `payee`;--> statement-breakpoint
DROP TABLE `payee`;--> statement-breakpoint
ALTER TABLE `__new_payee` RENAME TO `payee`;--> statement-breakpoint
CREATE UNIQUE INDEX `payee_slug_unique` ON `payee` (`slug`);--> statement-breakpoint
CREATE INDEX `payee_workspace_id_idx` ON `payee` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `payee_name_idx` ON `payee` (`name`);--> statement-breakpoint
CREATE INDEX `payee_slug_idx` ON `payee` (`slug`);--> statement-breakpoint
CREATE INDEX `payee_deleted_at_idx` ON `payee` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `payee_default_category_idx` ON `payee` (`default_category_id`);--> statement-breakpoint
CREATE INDEX `payee_default_budget_idx` ON `payee` (`default_budget_id`);--> statement-breakpoint
CREATE INDEX `payee_category_id_idx` ON `payee` (`payee_category_id`);--> statement-breakpoint
CREATE INDEX `payee_type_idx` ON `payee` (`payee_type`);--> statement-breakpoint
CREATE INDEX `payee_is_active_idx` ON `payee` (`is_active`);--> statement-breakpoint
CREATE INDEX `payee_tax_relevant_idx` ON `payee` (`tax_relevant`);--> statement-breakpoint
CREATE INDEX `payee_payment_frequency_idx` ON `payee` (`payment_frequency`);--> statement-breakpoint
CREATE INDEX `payee_last_transaction_date_idx` ON `payee` (`last_transaction_date`);--> statement-breakpoint
CREATE INDEX `payee_active_type_idx` ON `payee` (`is_active`,`payee_type`);--> statement-breakpoint
CREATE INDEX `payee_category_budget_idx` ON `payee` (`default_category_id`,`default_budget_id`);--> statement-breakpoint
CREATE TABLE `__new_schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'active',
	`amount` real DEFAULT 0 NOT NULL,
	`amount_2` real DEFAULT 0 NOT NULL,
	`amount_type` text DEFAULT 'exact' NOT NULL,
	`recurring` integer DEFAULT false,
	`auto_add` integer DEFAULT false,
	`schedule_date_id` integer,
	`payee_id` integer NOT NULL,
	`category_id` integer,
	`account_id` integer NOT NULL,
	`budget_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schedule_date_id`) REFERENCES `schedule_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_schedules`("id", "workspace_id", "name", "slug", "status", "amount", "amount_2", "amount_type", "recurring", "auto_add", "schedule_date_id", "payee_id", "category_id", "account_id", "budget_id", "created_at", "updated_at") SELECT "id", "workspace_id", "name", "slug", "status", "amount", "amount_2", "amount_type", "recurring", "auto_add", "schedule_date_id", "payee_id", "category_id", "account_id", "budget_id", "created_at", "updated_at" FROM `schedules`;--> statement-breakpoint
DROP TABLE `schedules`;--> statement-breakpoint
ALTER TABLE `__new_schedules` RENAME TO `schedules`;--> statement-breakpoint
CREATE INDEX `schedules_workspace_id_idx` ON `schedules` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_schedule_date_idx` ON `schedules` (`schedule_date_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_account_idx` ON `schedules` (`account_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_payee_idx` ON `schedules` (`payee_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_category_idx` ON `schedules` (`category_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_budget_idx` ON `schedules` (`budget_id`);--> statement-breakpoint
CREATE INDEX `schedule_status_idx` ON `schedules` (`status`);--> statement-breakpoint
CREATE INDEX `schedule_name_idx` ON `schedules` (`name`);--> statement-breakpoint
CREATE INDEX `schedule_slug_idx` ON `schedules` (`slug`);--> statement-breakpoint
CREATE TABLE `__new_transaction` (
	`id` integer PRIMARY KEY NOT NULL,
	`account_id` integer NOT NULL,
	`parent_id` integer,
	`status` text DEFAULT 'pending',
	`payee_id` integer,
	`amount` real DEFAULT 0 NOT NULL,
	`category_id` integer,
	`notes` text,
	`date` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`schedule_id` integer,
	`transfer_id` text,
	`transfer_account_id` integer,
	`transfer_transaction_id` integer,
	`is_transfer` integer DEFAULT false,
	`imported_from` text,
	`imported_at` text,
	`original_payee_name` text,
	`original_category_name` text,
	`inferred_category` text,
	`import_details` text,
	`raw_import_data` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`transfer_account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transfer_transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_transaction`("id", "account_id", "parent_id", "status", "payee_id", "amount", "category_id", "notes", "date", "schedule_id", "transfer_id", "transfer_account_id", "transfer_transaction_id", "is_transfer", "imported_from", "imported_at", "original_payee_name", "original_category_name", "inferred_category", "import_details", "raw_import_data", "created_at", "updated_at", "deleted_at") SELECT "id", "account_id", "parent_id", "status", "payee_id", "amount", "category_id", "notes", "date", "schedule_id", "transfer_id", "transfer_account_id", "transfer_transaction_id", "is_transfer", "imported_from", "imported_at", "original_payee_name", "original_category_name", "inferred_category", "import_details", "raw_import_data", "created_at", "updated_at", "deleted_at" FROM `transaction`;--> statement-breakpoint
DROP TABLE `transaction`;--> statement-breakpoint
ALTER TABLE `__new_transaction` RENAME TO `transaction`;--> statement-breakpoint
CREATE INDEX `relations_transaction_account_idx` ON `transaction` (`account_id`);--> statement-breakpoint
CREATE INDEX `relations_transaction_payee_idx` ON `transaction` (`payee_id`);--> statement-breakpoint
CREATE INDEX `relations_transaction_category_idx` ON `transaction` (`category_id`);--> statement-breakpoint
CREATE INDEX `relations_transaction_schedule_idx` ON `transaction` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `transaction_account_date_idx` ON `transaction` (`account_id`,`date`,`id`);--> statement-breakpoint
CREATE INDEX `transaction_date_idx` ON `transaction` (`date`);--> statement-breakpoint
CREATE INDEX `transaction_status_idx` ON `transaction` (`status`);--> statement-breakpoint
CREATE INDEX `transaction_parent_idx` ON `transaction` (`parent_id`);--> statement-breakpoint
CREATE INDEX `transaction_deleted_at_idx` ON `transaction` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `transaction_transfer_id_idx` ON `transaction` (`transfer_id`);--> statement-breakpoint
CREATE INDEX `transaction_transfer_account_idx` ON `transaction` (`transfer_account_id`);--> statement-breakpoint
CREATE INDEX `transaction_is_transfer_idx` ON `transaction` (`is_transfer`);