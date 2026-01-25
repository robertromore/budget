-- Subscriptions table
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`payee_id` integer,
	`account_id` integer,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`billing_cycle` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`start_date` text,
	`renewal_date` text,
	`cancelled_at` text,
	`trial_ends_at` text,
	`detection_confidence` real DEFAULT 0,
	`is_manually_added` integer DEFAULT false,
	`is_user_confirmed` integer DEFAULT false,
	`auto_renewal` integer DEFAULT true,
	`metadata` text,
	`alert_preferences` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `subscriptions_workspace_id_idx` ON `subscriptions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_payee_id_idx` ON `subscriptions` (`payee_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_account_id_idx` ON `subscriptions` (`account_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_type_idx` ON `subscriptions` (`type`);--> statement-breakpoint
CREATE INDEX `subscriptions_renewal_date_idx` ON `subscriptions` (`renewal_date`);--> statement-breakpoint
CREATE INDEX `subscriptions_workspace_status_idx` ON `subscriptions` (`workspace_id`, `status`);--> statement-breakpoint

-- Subscription price history table
CREATE TABLE `subscription_price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subscription_id` integer NOT NULL,
	`amount` real NOT NULL,
	`previous_amount` real,
	`effective_date` text NOT NULL,
	`change_type` text NOT NULL,
	`change_percentage` real,
	`detected_from_transaction_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`detected_from_transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `subscription_price_history_subscription_id_idx` ON `subscription_price_history` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `subscription_price_history_effective_date_idx` ON `subscription_price_history` (`effective_date`);--> statement-breakpoint
CREATE INDEX `subscription_price_history_transaction_idx` ON `subscription_price_history` (`detected_from_transaction_id`);--> statement-breakpoint

-- Subscription alerts table
CREATE TABLE `subscription_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subscription_id` integer NOT NULL,
	`workspace_id` integer NOT NULL,
	`alert_type` text NOT NULL,
	`trigger_date` text NOT NULL,
	`is_dismissed` integer DEFAULT false,
	`is_actioned` integer DEFAULT false,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `subscription_alerts_subscription_id_idx` ON `subscription_alerts` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `subscription_alerts_workspace_id_idx` ON `subscription_alerts` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `subscription_alerts_type_idx` ON `subscription_alerts` (`alert_type`);--> statement-breakpoint
CREATE INDEX `subscription_alerts_trigger_date_idx` ON `subscription_alerts` (`trigger_date`);--> statement-breakpoint
CREATE INDEX `subscription_alerts_workspace_dismissed_idx` ON `subscription_alerts` (`workspace_id`, `is_dismissed`);
