CREATE TABLE `account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`workspace_id` integer NOT NULL,
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
	`enabled_metrics` text,
	`date_opened` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_workspace_id_idx` ON `account` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `account_name_idx` ON `account` (`name`);--> statement-breakpoint
CREATE INDEX `account_slug_idx` ON `account` (`slug`);--> statement-breakpoint
CREATE INDEX `account_closed_idx` ON `account` (`closed`);--> statement-breakpoint
CREATE INDEX `account_on_budget_idx` ON `account` (`on_budget`);--> statement-breakpoint
CREATE INDEX `account_deleted_at_idx` ON `account` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `ai_conversation_message` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`reasoning` text,
	`tools_used` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_message_conversation_idx` ON `ai_conversation_message` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `ai_message_created_at_idx` ON `ai_conversation_message` (`created_at`);--> statement-breakpoint
CREATE TABLE `ai_conversation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`title` text,
	`summary` text,
	`context` text,
	`message_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_conversation_workspace_idx` ON `ai_conversation` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `ai_conversation_updated_at_idx` ON `ai_conversation` (`updated_at`);--> statement-breakpoint
CREATE INDEX `ai_conversation_deleted_at_idx` ON `ai_conversation` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `auth_account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`id_token` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `auth_account_user_id_idx` ON `auth_account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_account_provider_idx` ON `auth_account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_idx` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_expires_at_idx` ON `session` (`expires_at`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `verification_expires_at_idx` ON `verification` (`expires_at`);--> statement-breakpoint
CREATE TABLE `budget_automation_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action_type` text NOT NULL,
	`recommendation_id` integer,
	`group_id` integer,
	`budget_ids` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`rolled_back_at` text,
	FOREIGN KEY (`recommendation_id`) REFERENCES `budget_recommendation`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`group_id`) REFERENCES `budget_group`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `budget_automation_activity_status_idx` ON `budget_automation_activity` (`status`);--> statement-breakpoint
CREATE INDEX `budget_automation_activity_created_at_idx` ON `budget_automation_activity` (`created_at`);--> statement-breakpoint
CREATE INDEX `budget_automation_activity_action_type_idx` ON `budget_automation_activity` (`action_type`);--> statement-breakpoint
CREATE INDEX `budget_automation_activity_recommendation_idx` ON `budget_automation_activity` (`recommendation_id`);--> statement-breakpoint
CREATE INDEX `budget_automation_activity_group_idx` ON `budget_automation_activity` (`group_id`);--> statement-breakpoint
CREATE TABLE `budget_automation_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`auto_create_groups` integer DEFAULT false NOT NULL,
	`auto_assign_to_groups` integer DEFAULT false NOT NULL,
	`auto_adjust_group_limits` integer DEFAULT false NOT NULL,
	`require_confirmation_threshold` text DEFAULT 'medium' NOT NULL,
	`enable_smart_grouping` integer DEFAULT true NOT NULL,
	`grouping_strategy` text DEFAULT 'hybrid' NOT NULL,
	`min_similarity_score` real DEFAULT 70 NOT NULL,
	`min_group_size` integer DEFAULT 2 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `budget_automation_settings_workspace_id_idx` ON `budget_automation_settings` (`workspace_id`);--> statement-breakpoint
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
	`workspace_id` integer NOT NULL,
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
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_slug_unique` ON `budget` (`slug`);--> statement-breakpoint
CREATE INDEX `budget_workspace_id_idx` ON `budget` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `budget_name_idx` ON `budget` (`name`);--> statement-breakpoint
CREATE INDEX `budget_slug_idx` ON `budget` (`slug`);--> statement-breakpoint
CREATE INDEX `budget_type_idx` ON `budget` (`type`);--> statement-breakpoint
CREATE INDEX `budget_scope_idx` ON `budget` (`scope`);--> statement-breakpoint
CREATE INDEX `budget_status_idx` ON `budget` (`status`);--> statement-breakpoint
CREATE INDEX `budget_enforcement_idx` ON `budget` (`enforcement_level`);--> statement-breakpoint
CREATE INDEX `budget_deleted_at_idx` ON `budget` (`deleted_at`);--> statement-breakpoint
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
CREATE INDEX `envelope_transfer_date_idx` ON `envelope_transfer` (`transferred_at`);--> statement-breakpoint
CREATE TABLE `categories` (
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
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
CREATE TABLE `category_group_memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_group_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`category_group_id`) REFERENCES `category_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_pair` ON `category_group_memberships` (`category_group_id`,`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_category_single_group` ON `category_group_memberships` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_cgm_group_id` ON `category_group_memberships` (`category_group_id`);--> statement-breakpoint
CREATE TABLE `category_group_recommendations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`suggested_group_id` integer,
	`suggested_group_name` text,
	`confidence_score` real NOT NULL,
	`reasoning` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`suggested_group_id`) REFERENCES `category_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_cgr_category_id` ON `category_group_recommendations` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_cgr_status` ON `category_group_recommendations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_cgr_confidence` ON `category_group_recommendations` (`confidence_score`);--> statement-breakpoint
CREATE TABLE `category_group_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recommendations_enabled` integer DEFAULT true NOT NULL,
	`min_confidence_score` real DEFAULT 0.7 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `category_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`group_icon` text,
	`group_color` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_groups_name_unique` ON `category_groups` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `category_groups_slug_unique` ON `category_groups` (`slug`);--> statement-breakpoint
CREATE INDEX `category_groups_workspace_id_idx` ON `category_groups` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_category_groups_slug` ON `category_groups` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_category_groups_sort_order` ON `category_groups` (`sort_order`);--> statement-breakpoint
CREATE TABLE `detected_patterns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
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
	`schedule_id` integer,
	`suggested_schedule_config` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_occurrence` text,
	`next_expected` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `detected_patterns_workspace_id_idx` ON `detected_patterns` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_detected_patterns_account` ON `detected_patterns` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_detected_patterns_status` ON `detected_patterns` (`status`);--> statement-breakpoint
CREATE INDEX `idx_detected_patterns_confidence` ON `detected_patterns` (`confidence_score`);--> statement-breakpoint
CREATE TABLE `expense_receipt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`medical_expense_id` integer NOT NULL,
	`receipt_type` text DEFAULT 'receipt',
	`file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`storage_path` text NOT NULL,
	`storage_url` text,
	`extracted_text` text,
	`extracted_data` text,
	`description` text,
	`uploaded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`medical_expense_id`) REFERENCES `medical_expense`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `expense_receipt_medical_expense_idx` ON `expense_receipt` (`medical_expense_id`);--> statement-breakpoint
CREATE INDEX `expense_receipt_type_idx` ON `expense_receipt` (`receipt_type`);--> statement-breakpoint
CREATE INDEX `expense_receipt_deleted_at_idx` ON `expense_receipt` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `filter` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`operator` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hsa_claim` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`medical_expense_id` integer NOT NULL,
	`claim_number` text,
	`status` text DEFAULT 'not_submitted' NOT NULL,
	`claimed_amount` real NOT NULL,
	`approved_amount` real DEFAULT 0,
	`denied_amount` real DEFAULT 0,
	`paid_amount` real DEFAULT 0,
	`submitted_date` text,
	`review_date` text,
	`approval_date` text,
	`payment_date` text,
	`denial_reason` text,
	`denial_code` text,
	`administrator_name` text,
	`notes` text,
	`internal_notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`medical_expense_id`) REFERENCES `medical_expense`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `hsa_claim_medical_expense_idx` ON `hsa_claim` (`medical_expense_id`);--> statement-breakpoint
CREATE INDEX `hsa_claim_status_idx` ON `hsa_claim` (`status`);--> statement-breakpoint
CREATE INDEX `hsa_claim_submitted_date_idx` ON `hsa_claim` (`submitted_date`);--> statement-breakpoint
CREATE INDEX `hsa_claim_payment_date_idx` ON `hsa_claim` (`payment_date`);--> statement-breakpoint
CREATE INDEX `hsa_claim_deleted_at_idx` ON `hsa_claim` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `import_profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`column_signature` text,
	`filename_pattern` text,
	`account_id` integer,
	`is_account_default` integer DEFAULT false,
	`mapping` text NOT NULL,
	`last_used_at` text,
	`use_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `import_profile_workspace_id_idx` ON `import_profile` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `import_profile_column_signature_idx` ON `import_profile` (`column_signature`);--> statement-breakpoint
CREATE INDEX `import_profile_account_id_idx` ON `import_profile` (`account_id`);--> statement-breakpoint
CREATE INDEX `import_profile_is_account_default_idx` ON `import_profile` (`is_account_default`);--> statement-breakpoint
CREATE TABLE `anomaly_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`transaction_id` integer NOT NULL,
	`overall_score` real NOT NULL,
	`risk_level` text NOT NULL,
	`score_details` text NOT NULL,
	`explanation` text NOT NULL,
	`recommended_actions` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`reviewed_at` text,
	`notes` text,
	`detected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budget_recommendation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`type` text NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`confidence` real NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`budget_id` integer,
	`account_id` integer,
	`category_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`applied_at` text,
	`dismissed_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recommendation_workspace_id_idx` ON `budget_recommendation` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `recommendation_type_idx` ON `budget_recommendation` (`type`);--> statement-breakpoint
CREATE INDEX `recommendation_status_idx` ON `budget_recommendation` (`status`);--> statement-breakpoint
CREATE INDEX `recommendation_priority_idx` ON `budget_recommendation` (`priority`);--> statement-breakpoint
CREATE INDEX `recommendation_budget_id_idx` ON `budget_recommendation` (`budget_id`);--> statement-breakpoint
CREATE INDEX `recommendation_category_id_idx` ON `budget_recommendation` (`category_id`);--> statement-breakpoint
CREATE INDEX `recommendation_account_id_idx` ON `budget_recommendation` (`account_id`);--> statement-breakpoint
CREATE INDEX `recommendation_created_at_idx` ON `budget_recommendation` (`created_at`);--> statement-breakpoint
CREATE INDEX `recommendation_expires_at_idx` ON `budget_recommendation` (`expires_at`);--> statement-breakpoint
CREATE TABLE `medical_expense` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`transaction_id` integer NOT NULL,
	`hsa_account_id` integer NOT NULL,
	`expense_type` text NOT NULL,
	`is_qualified` integer DEFAULT true NOT NULL,
	`provider` text,
	`patient_name` text,
	`diagnosis` text,
	`treatment_description` text,
	`amount` real NOT NULL,
	`insurance_covered` real DEFAULT 0 NOT NULL,
	`out_of_pocket` real NOT NULL,
	`service_date` text NOT NULL,
	`paid_date` text,
	`tax_year` integer NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`hsa_account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `medical_expense_transaction_unique_idx` ON `medical_expense` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `medical_expense_hsa_account_idx` ON `medical_expense` (`hsa_account_id`);--> statement-breakpoint
CREATE INDEX `medical_expense_type_idx` ON `medical_expense` (`expense_type`);--> statement-breakpoint
CREATE INDEX `medical_expense_tax_year_idx` ON `medical_expense` (`tax_year`);--> statement-breakpoint
CREATE INDEX `medical_expense_service_date_idx` ON `medical_expense` (`service_date`);--> statement-breakpoint
CREATE INDEX `medical_expense_qualified_idx` ON `medical_expense` (`is_qualified`);--> statement-breakpoint
CREATE INDEX `medical_expense_deleted_at_idx` ON `medical_expense` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `ml_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`model_type` text NOT NULL,
	`model_name` text NOT NULL,
	`entity_type` text,
	`entity_id` integer,
	`parameters` text NOT NULL,
	`metrics` text,
	`version` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`trained_at` text NOT NULL,
	`training_samples` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ml_predictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`model_id` integer,
	`prediction_type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`prediction_data` text NOT NULL,
	`confidence` real,
	`actual_outcome` text,
	`predicted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`model_id`) REFERENCES `ml_models`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `ml_training_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`model_type` text NOT NULL,
	`feature_vector` text NOT NULL,
	`label` text,
	`weight` real DEFAULT 1 NOT NULL,
	`source` text,
	`entity_type` text,
	`entity_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payee_ai_enhancements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`payee_id` integer NOT NULL,
	`field_name` text NOT NULL,
	`mode` text NOT NULL,
	`original_value` text,
	`suggested_value` text,
	`applied_value` text,
	`confidence` real,
	`provider` text,
	`model_id` text,
	`was_accepted` integer DEFAULT true NOT NULL,
	`was_modified` integer DEFAULT false NOT NULL,
	`enhanced_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_workspace_idx` ON `payee_ai_enhancements` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_payee_idx` ON `payee_ai_enhancements` (`payee_id`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_field_idx` ON `payee_ai_enhancements` (`field_name`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_mode_idx` ON `payee_ai_enhancements` (`mode`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_provider_idx` ON `payee_ai_enhancements` (`provider`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_payee_field_idx` ON `payee_ai_enhancements` (`payee_id`,`field_name`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_payee_enhanced_idx` ON `payee_ai_enhancements` (`payee_id`,`enhanced_at`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_field_mode_idx` ON `payee_ai_enhancements` (`field_name`,`mode`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_accepted_idx` ON `payee_ai_enhancements` (`was_accepted`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_modified_idx` ON `payee_ai_enhancements` (`was_modified`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_confidence_idx` ON `payee_ai_enhancements` (`confidence`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_provider_confidence_idx` ON `payee_ai_enhancements` (`provider`,`confidence`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_mode_confidence_idx` ON `payee_ai_enhancements` (`mode`,`confidence`);--> statement-breakpoint
CREATE TABLE `payee_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`date_created` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payee_categories_slug_unique` ON `payee_categories` (`slug`);--> statement-breakpoint
CREATE INDEX `payee_category_workspace_id_idx` ON `payee_categories` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `payee_category_name_idx` ON `payee_categories` (`name`);--> statement-breakpoint
CREATE INDEX `payee_category_slug_idx` ON `payee_categories` (`slug`);--> statement-breakpoint
CREATE INDEX `payee_category_deleted_at_idx` ON `payee_categories` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `payee_category_display_order_idx` ON `payee_categories` (`display_order`);--> statement-breakpoint
CREATE INDEX `payee_category_is_active_idx` ON `payee_categories` (`is_active`);--> statement-breakpoint
CREATE TABLE `payee_category_corrections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
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
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payee_corrections_workspace_id_idx` ON `payee_category_corrections` (`workspace_id`);--> statement-breakpoint
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
CREATE TABLE `payee` (
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
	FOREIGN KEY (`default_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`default_budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payee_category_id`) REFERENCES `payee_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
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
CREATE TABLE `schedule_skips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`schedule_id` integer NOT NULL,
	`skipped_date` text NOT NULL,
	`skip_type` text DEFAULT 'single' NOT NULL,
	`reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `schedule_skips_workspace_id_idx` ON `schedule_skips` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `schedule_skips_schedule_id_idx` ON `schedule_skips` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `schedule_skips_skipped_date_idx` ON `schedule_skips` (`skipped_date`);--> statement-breakpoint
CREATE INDEX `schedule_skips_schedule_date_idx` ON `schedule_skips` (`schedule_id`,`skipped_date`);--> statement-breakpoint
CREATE TABLE `schedules` (
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
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `schedules_workspace_id_idx` ON `schedules` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_schedule_date_idx` ON `schedules` (`schedule_date_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_account_idx` ON `schedules` (`account_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_payee_idx` ON `schedules` (`payee_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_category_idx` ON `schedules` (`category_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_budget_idx` ON `schedules` (`budget_id`);--> statement-breakpoint
CREATE INDEX `schedule_status_idx` ON `schedules` (`status`);--> statement-breakpoint
CREATE INDEX `schedule_name_idx` ON `schedules` (`name`);--> statement-breakpoint
CREATE INDEX `schedule_slug_idx` ON `schedules` (`slug`);--> statement-breakpoint
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
CREATE TABLE `user_behavior_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`recommendation_id` text,
	`entity_type` text,
	`entity_id` integer,
	`event_data` text,
	`time_to_action` integer,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`cuid` text,
	`name` text NOT NULL,
	`display_name` text,
	`slug` text,
	`email` text,
	`email_verified` integer DEFAULT false,
	`password_hash` text,
	`image` text,
	`role` text DEFAULT 'user',
	`preferences` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_slug_unique` ON `user` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_slug_idx` ON `user` (`slug`);--> statement-breakpoint
CREATE INDEX `user_email_idx` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_deleted_at_idx` ON `user` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `views` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`entity_type` text DEFAULT 'transactions' NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`filters` text,
	`display` text,
	`dirty` integer,
	`is_default` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `views_workspace_id_idx` ON `views` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_views_workspace_entity` ON `views` (`workspace_id`,`entity_type`);--> statement-breakpoint
CREATE TABLE `workspace_invitation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`workspace_id` integer NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`invited_by` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` text NOT NULL,
	`responded_at` text,
	`accepted_user_id` text,
	`message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accepted_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_invitation_token_idx` ON `workspace_invitation` (`token`);--> statement-breakpoint
CREATE INDEX `workspace_invitation_workspace_idx` ON `workspace_invitation` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_invitation_email_idx` ON `workspace_invitation` (`email`);--> statement-breakpoint
CREATE INDEX `workspace_invitation_status_idx` ON `workspace_invitation` (`status`);--> statement-breakpoint
CREATE INDEX `workspace_invitation_expires_idx` ON `workspace_invitation` (`expires_at`);--> statement-breakpoint
CREATE TABLE `workspace_member` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`workspace_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`invited_by` text,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`is_default` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_member_unique_idx` ON `workspace_member` (`workspace_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `workspace_member_workspace_idx` ON `workspace_member` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_member_user_idx` ON `workspace_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `workspace_member_role_idx` ON `workspace_member` (`role`);--> statement-breakpoint
CREATE INDEX `workspace_member_default_idx` ON `workspace_member` (`user_id`,`is_default`);--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`display_name` text NOT NULL,
	`slug` text NOT NULL,
	`owner_id` text,
	`preferences` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_slug_unique` ON `workspace` (`slug`);--> statement-breakpoint
CREATE INDEX `workspace_slug_idx` ON `workspace` (`slug`);--> statement-breakpoint
CREATE INDEX `workspace_deleted_at_idx` ON `workspace` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `workspace_owner_id_idx` ON `workspace` (`owner_id`);