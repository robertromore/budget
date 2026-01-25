CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`persistent` integer DEFAULT false,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_workspace_id_idx` ON `notifications` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `notifications_workspace_created_idx` ON `notifications` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `prediction_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`payee_id` integer NOT NULL,
	`prediction_type` text NOT NULL,
	`original_date` text,
	`original_amount` real,
	`original_confidence` real,
	`prediction_tier` text,
	`corrected_date` text,
	`corrected_amount` real,
	`rating` text,
	`prediction_method` text,
	`transaction_count` integer,
	`was_accurate` integer,
	`actual_date` text,
	`actual_amount` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prediction_feedback_workspace_idx` ON `prediction_feedback` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `prediction_feedback_payee_idx` ON `prediction_feedback` (`payee_id`);--> statement-breakpoint
CREATE INDEX `prediction_feedback_type_idx` ON `prediction_feedback` (`prediction_type`);--> statement-breakpoint
CREATE INDEX `prediction_feedback_rating_idx` ON `prediction_feedback` (`rating`);--> statement-breakpoint
CREATE INDEX `prediction_feedback_created_idx` ON `prediction_feedback` (`created_at`);--> statement-breakpoint
CREATE TABLE `schedule_price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`schedule_id` integer NOT NULL,
	`amount` real NOT NULL,
	`previous_amount` real,
	`effective_date` text NOT NULL,
	`change_type` text NOT NULL,
	`change_percentage` real,
	`detected_from_transaction_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`detected_from_transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `schedule_price_history_schedule_id_idx` ON `schedule_price_history` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `schedule_price_history_effective_date_idx` ON `schedule_price_history` (`effective_date`);--> statement-breakpoint
CREATE INDEX `schedule_price_history_transaction_idx` ON `schedule_price_history` (`detected_from_transaction_id`);--> statement-breakpoint
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
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subscription_alerts_subscription_id_idx` ON `subscription_alerts` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `subscription_alerts_workspace_id_idx` ON `subscription_alerts` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `subscription_alerts_type_idx` ON `subscription_alerts` (`alert_type`);--> statement-breakpoint
CREATE INDEX `subscription_alerts_trigger_date_idx` ON `subscription_alerts` (`trigger_date`);--> statement-breakpoint
CREATE INDEX `subscription_alerts_workspace_dismissed_idx` ON `subscription_alerts` (`workspace_id`,`is_dismissed`);--> statement-breakpoint
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
);
--> statement-breakpoint
CREATE INDEX `subscription_price_history_subscription_id_idx` ON `subscription_price_history` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `subscription_price_history_effective_date_idx` ON `subscription_price_history` (`effective_date`);--> statement-breakpoint
CREATE INDEX `subscription_price_history_transaction_idx` ON `subscription_price_history` (`detected_from_transaction_id`);--> statement-breakpoint
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
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `subscriptions_workspace_id_idx` ON `subscriptions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_payee_id_idx` ON `subscriptions` (`payee_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_account_id_idx` ON `subscriptions` (`account_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_type_idx` ON `subscriptions` (`type`);--> statement-breakpoint
CREATE INDEX `subscriptions_renewal_date_idx` ON `subscriptions` (`renewal_date`);--> statement-breakpoint
CREATE INDEX `subscriptions_workspace_status_idx` ON `subscriptions` (`workspace_id`,`status`);--> statement-breakpoint
ALTER TABLE `schedules` ADD `is_subscription` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `schedules` ADD `subscription_type` text;--> statement-breakpoint
ALTER TABLE `schedules` ADD `subscription_status` text;--> statement-breakpoint
ALTER TABLE `schedules` ADD `last_known_amount` real;--> statement-breakpoint
ALTER TABLE `schedules` ADD `price_change_detected_at` text;--> statement-breakpoint
ALTER TABLE `schedules` ADD `detection_confidence` real;--> statement-breakpoint
ALTER TABLE `schedules` ADD `is_user_confirmed` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `schedules` ADD `detected_at` text;--> statement-breakpoint
ALTER TABLE `schedules` ADD `alert_preferences` text;--> statement-breakpoint
CREATE INDEX `schedule_is_subscription_idx` ON `schedules` (`is_subscription`);--> statement-breakpoint
CREATE INDEX `schedule_subscription_status_idx` ON `schedules` (`subscription_status`);