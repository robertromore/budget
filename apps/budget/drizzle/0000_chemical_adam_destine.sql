CREATE TABLE `account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`closed` integer DEFAULT false,
	`notes` text,
	`account_type` text DEFAULT 'checking',
	`institution` text,
	`account_icon` text,
	`account_color` text,
	`initial_balance` real DEFAULT 0,
	`account_number_last4` text,
	`on_budget` integer DEFAULT true NOT NULL,
	`debt_limit` real,
	`minimum_payment` real,
	`payment_due_day` integer,
	`interest_rate` real,
	`date_opened` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `account_name_idx` ON `account` (`name`);--> statement-breakpoint
CREATE INDEX `account_slug_idx` ON `account` (`slug`);--> statement-breakpoint
CREATE INDEX `account_closed_idx` ON `account` (`closed`);--> statement-breakpoint
CREATE INDEX `account_on_budget_idx` ON `account` (`on_budget`);--> statement-breakpoint
CREATE INDEX `account_deleted_at_idx` ON `account` (`deleted_at`);--> statement-breakpoint
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
CREATE TABLE `budget_template` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`scope` text NOT NULL,
	`icon` text DEFAULT '📊',
	`suggested_amount` real,
	`enforcement_level` text DEFAULT 'warning' NOT NULL,
	`metadata` text,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
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
	`slug` text NOT NULL,
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
CREATE UNIQUE INDEX `budget_slug_unique` ON `budget` (`slug`);--> statement-breakpoint
CREATE INDEX `budget_name_idx` ON `budget` (`name`);--> statement-breakpoint
CREATE INDEX `budget_slug_idx` ON `budget` (`slug`);--> statement-breakpoint
CREATE INDEX `budget_type_idx` ON `budget` (`type`);--> statement-breakpoint
CREATE INDEX `budget_scope_idx` ON `budget` (`scope`);--> statement-breakpoint
CREATE INDEX `budget_status_idx` ON `budget` (`status`);--> statement-breakpoint
CREATE INDEX `budget_enforcement_idx` ON `budget` (`enforcement_level`);--> statement-breakpoint
CREATE INDEX `budget_deleted_at_idx` ON `budget` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
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
CREATE TABLE `detected_patterns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`pattern_type` text NOT NULL,
	`confidence_score` real NOT NULL,
	`sample_transaction_ids` text NOT NULL,
	`payee_id` integer,
	`category_id` integer,
	`amount_min` real,
	`amount_max` real,
	`amount_avg` real,
	`interval_days` integer,
	`status` text DEFAULT 'pending',
	`suggested_schedule_config` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_occurrence` text,
	`next_expected` text,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_detected_patterns_account` ON `detected_patterns` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_detected_patterns_status` ON `detected_patterns` (`status`);--> statement-breakpoint
CREATE INDEX `idx_detected_patterns_confidence` ON `detected_patterns` (`confidence_score`);--> statement-breakpoint
CREATE TABLE `filter` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`operator` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payee` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`slug` text NOT NULL,
	`notes` text,
	`default_category_id` integer,
	`default_budget_id` integer,
	`payee_type` text,
	`avg_amount` real,
	`payment_frequency` text,
	`last_transaction_date` text,
	`tax_relevant` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`website` text,
	`phone` text,
	`email` text,
	`address` text,
	`account_number` text,
	`alert_threshold` real,
	`is_seasonal` integer DEFAULT false NOT NULL,
	`subscription_info` text,
	`tags` text,
	`preferred_payment_methods` text,
	`merchant_category_code` text,
	`date_created` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`default_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`default_budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payee_slug_unique` ON `payee` (`slug`);--> statement-breakpoint
CREATE INDEX `payee_name_idx` ON `payee` (`name`);--> statement-breakpoint
CREATE INDEX `payee_slug_idx` ON `payee` (`slug`);--> statement-breakpoint
CREATE INDEX `payee_deleted_at_idx` ON `payee` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `payee_default_category_idx` ON `payee` (`default_category_id`);--> statement-breakpoint
CREATE INDEX `payee_default_budget_idx` ON `payee` (`default_budget_id`);--> statement-breakpoint
CREATE INDEX `payee_type_idx` ON `payee` (`payee_type`);--> statement-breakpoint
CREATE INDEX `payee_is_active_idx` ON `payee` (`is_active`);--> statement-breakpoint
CREATE INDEX `payee_tax_relevant_idx` ON `payee` (`tax_relevant`);--> statement-breakpoint
CREATE INDEX `payee_payment_frequency_idx` ON `payee` (`payment_frequency`);--> statement-breakpoint
CREATE INDEX `payee_last_transaction_date_idx` ON `payee` (`last_transaction_date`);--> statement-breakpoint
CREATE INDEX `payee_active_type_idx` ON `payee` (`is_active`,`payee_type`);--> statement-breakpoint
CREATE INDEX `payee_category_budget_idx` ON `payee` (`default_category_id`,`default_budget_id`);--> statement-breakpoint
CREATE TABLE `payee_category_corrections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`payee_id` integer NOT NULL,
	`transaction_id` integer,
	`from_category_id` integer,
	`to_category_id` integer NOT NULL,
	`correction_trigger` text NOT NULL,
	`correction_context` text,
	`transaction_amount` real,
	`transaction_date` text,
	`user_confidence` integer,
	`system_confidence` real,
	`correction_weight` real DEFAULT 1 NOT NULL,
	`amount_range` text,
	`temporal_context` text,
	`payee_pattern_context` text,
	`is_processed` integer DEFAULT false NOT NULL,
	`processed_at` text,
	`learning_epoch` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`is_override` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payee_corrections_payee_idx` ON `payee_category_corrections` (`payee_id`);--> statement-breakpoint
CREATE INDEX `payee_corrections_transaction_idx` ON `payee_category_corrections` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `payee_corrections_from_category_idx` ON `payee_category_corrections` (`from_category_id`);--> statement-breakpoint
CREATE INDEX `payee_corrections_to_category_idx` ON `payee_category_corrections` (`to_category_id`);--> statement-breakpoint
CREATE INDEX `payee_corrections_trigger_idx` ON `payee_category_corrections` (`correction_trigger`);--> statement-breakpoint
CREATE INDEX `payee_corrections_context_idx` ON `payee_category_corrections` (`correction_context`);--> statement-breakpoint
CREATE INDEX `payee_corrections_processed_idx` ON `payee_category_corrections` (`is_processed`);--> statement-breakpoint
CREATE INDEX `payee_corrections_learning_epoch_idx` ON `payee_category_corrections` (`learning_epoch`);--> statement-breakpoint
CREATE INDEX `payee_corrections_date_idx` ON `payee_category_corrections` (`transaction_date`);--> statement-breakpoint
CREATE INDEX `payee_corrections_amount_idx` ON `payee_category_corrections` (`transaction_amount`);--> statement-breakpoint
CREATE INDEX `payee_corrections_payee_category_idx` ON `payee_category_corrections` (`payee_id`,`to_category_id`);--> statement-breakpoint
CREATE INDEX `payee_corrections_payee_amount_idx` ON `payee_category_corrections` (`payee_id`,`transaction_amount`);--> statement-breakpoint
CREATE INDEX `payee_corrections_payee_date_idx` ON `payee_category_corrections` (`payee_id`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `payee_corrections_category_change_idx` ON `payee_category_corrections` (`from_category_id`,`to_category_id`);--> statement-breakpoint
CREATE INDEX `payee_corrections_unprocessed_idx` ON `payee_category_corrections` (`is_processed`,`created_at`);--> statement-breakpoint
CREATE INDEX `payee_corrections_pattern_analysis_idx` ON `payee_category_corrections` (`payee_id`,`is_processed`,`learning_epoch`);--> statement-breakpoint
CREATE INDEX `payee_corrections_deleted_at_idx` ON `payee_category_corrections` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `payee_corrections_override_idx` ON `payee_category_corrections` (`is_override`);--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
	FOREIGN KEY (`schedule_date_id`) REFERENCES `schedule_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `relations_schedule_schedule_date_idx` ON `schedules` (`schedule_date_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_account_idx` ON `schedules` (`account_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_payee_idx` ON `schedules` (`payee_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_category_idx` ON `schedules` (`category_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_budget_idx` ON `schedules` (`budget_id`);--> statement-breakpoint
CREATE INDEX `schedule_status_idx` ON `schedules` (`status`);--> statement-breakpoint
CREATE INDEX `schedule_name_idx` ON `schedules` (`name`);--> statement-breakpoint
CREATE INDEX `schedule_slug_idx` ON `schedules` (`slug`);--> statement-breakpoint
CREATE TABLE `schedule_dates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`start_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`end_date` text,
	`frequency` text,
	`interval` integer DEFAULT 1,
	`limit` integer DEFAULT 0,
	`move_weekends` text DEFAULT 'none',
	`move_holidays` text DEFAULT 'none',
	`specific_dates` text DEFAULT '[]',
	`on` integer DEFAULT false,
	`on_type` text DEFAULT 'day',
	`days` text DEFAULT '[]',
	`weeks` text DEFAULT '[]',
	`weeks_days` text DEFAULT '[]',
	`week_days` text DEFAULT '[]',
	`schedule_id` integer NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `relations_schedule_date_schedule_idx` ON `schedule_dates` (`schedule_id`);--> statement-breakpoint
CREATE TABLE `transaction` (
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
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transfer_account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transfer_transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
CREATE INDEX `transaction_is_transfer_idx` ON `transaction` (`is_transfer`);--> statement-breakpoint
CREATE TABLE `views` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`filters` text,
	`display` text,
	`dirty` integer
);
--> statement-breakpoint
CREATE TABLE `envelope_allocation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`period_instance_id` integer NOT NULL,
	`allocated_amount` real DEFAULT 0 NOT NULL,
	`spent_amount` real DEFAULT 0 NOT NULL,
	`rollover_amount` real DEFAULT 0 NOT NULL,
	`available_amount` real DEFAULT 0 NOT NULL,
	`deficit_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`rollover_mode` text DEFAULT 'unlimited' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`last_calculated` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`period_instance_id`) REFERENCES `budget_period_instance`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `envelope_allocation_unique` ON `envelope_allocation` (`budget_id`,`category_id`,`period_instance_id`);--> statement-breakpoint
CREATE INDEX `envelope_allocation_budget_idx` ON `envelope_allocation` (`budget_id`);--> statement-breakpoint
CREATE INDEX `envelope_allocation_category_idx` ON `envelope_allocation` (`category_id`);--> statement-breakpoint
CREATE INDEX `envelope_allocation_period_idx` ON `envelope_allocation` (`period_instance_id`);--> statement-breakpoint
CREATE INDEX `envelope_allocation_status_idx` ON `envelope_allocation` (`status`);--> statement-breakpoint
CREATE TABLE `envelope_rollover_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`envelope_id` integer NOT NULL,
	`from_period_id` integer NOT NULL,
	`to_period_id` integer NOT NULL,
	`rolled_amount` real NOT NULL,
	`reset_amount` real DEFAULT 0 NOT NULL,
	`processed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelope_allocation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_period_id`) REFERENCES `budget_period_instance`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_period_id`) REFERENCES `budget_period_instance`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `envelope_rollover_envelope_idx` ON `envelope_rollover_history` (`envelope_id`);--> statement-breakpoint
CREATE INDEX `envelope_rollover_from_period_idx` ON `envelope_rollover_history` (`from_period_id`);--> statement-breakpoint
CREATE INDEX `envelope_rollover_to_period_idx` ON `envelope_rollover_history` (`to_period_id`);--> statement-breakpoint
CREATE TABLE `envelope_transfer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_envelope_id` integer NOT NULL,
	`to_envelope_id` integer NOT NULL,
	`amount` real NOT NULL,
	`reason` text,
	`transferred_by` text NOT NULL,
	`transferred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`from_envelope_id`) REFERENCES `envelope_allocation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_envelope_id`) REFERENCES `envelope_allocation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `envelope_transfer_from_idx` ON `envelope_transfer` (`from_envelope_id`);--> statement-breakpoint
CREATE INDEX `envelope_transfer_to_idx` ON `envelope_transfer` (`to_envelope_id`);--> statement-breakpoint
CREATE INDEX `envelope_transfer_date_idx` ON `envelope_transfer` (`transferred_at`);