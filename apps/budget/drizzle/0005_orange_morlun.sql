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
	`auto_create_groups` integer DEFAULT false NOT NULL,
	`auto_assign_to_groups` integer DEFAULT false NOT NULL,
	`auto_adjust_group_limits` integer DEFAULT false NOT NULL,
	`require_confirmation_threshold` text DEFAULT 'medium' NOT NULL,
	`enable_smart_grouping` integer DEFAULT true NOT NULL,
	`grouping_strategy` text DEFAULT 'hybrid' NOT NULL,
	`min_similarity_score` real DEFAULT 70 NOT NULL,
	`min_group_size` integer DEFAULT 2 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
