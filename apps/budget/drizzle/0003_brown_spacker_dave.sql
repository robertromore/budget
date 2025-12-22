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
PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
INSERT INTO `__new_payee`("id", "workspace_id", "name", "slug", "notes", "default_category_id", "default_budget_id", "payee_type", "payee_category_id", "avg_amount", "payment_frequency", "last_transaction_date", "tax_relevant", "is_active", "website", "phone", "email", "address", "account_number", "alert_threshold", "is_seasonal", "subscription_info", "tags", "preferred_payment_methods", "merchant_category_code", "date_created", "created_at", "updated_at", "deleted_at") SELECT "id", "workspace_id", "name", "slug", "notes", "default_category_id", "default_budget_id", "payee_type", "payee_category_id", "avg_amount", "payment_frequency", "last_transaction_date", "tax_relevant", "is_active", "website", "phone", "email", "address", "account_number", "alert_threshold", "is_seasonal", "subscription_info", "tags", "preferred_payment_methods", "merchant_category_code", "date_created", "created_at", "updated_at", "deleted_at" FROM `payee`;--> statement-breakpoint
DROP TABLE `payee`;--> statement-breakpoint
ALTER TABLE `__new_payee` RENAME TO `payee`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
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
CREATE INDEX `payee_category_budget_idx` ON `payee` (`default_category_id`,`default_budget_id`);