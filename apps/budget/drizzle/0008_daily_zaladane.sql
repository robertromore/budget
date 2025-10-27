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
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`group_icon` text,
	`group_color` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_groups_name_unique` ON `category_groups` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `category_groups_slug_unique` ON `category_groups` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_category_groups_slug` ON `category_groups` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_category_groups_sort_order` ON `category_groups` (`sort_order`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_budget_recommendation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_budget_recommendation`("id", "type", "priority", "title", "description", "confidence", "metadata", "status", "budget_id", "account_id", "category_id", "created_at", "expires_at", "updated_at", "applied_at", "dismissed_at") SELECT "id", "type", "priority", "title", "description", "confidence", "metadata", "status", "budget_id", "account_id", "category_id", "created_at", "expires_at", "updated_at", "applied_at", "dismissed_at" FROM `budget_recommendation`;--> statement-breakpoint
DROP TABLE `budget_recommendation`;--> statement-breakpoint
ALTER TABLE `__new_budget_recommendation` RENAME TO `budget_recommendation`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `recommendation_type_idx` ON `budget_recommendation` (`type`);--> statement-breakpoint
CREATE INDEX `recommendation_status_idx` ON `budget_recommendation` (`status`);--> statement-breakpoint
CREATE INDEX `recommendation_priority_idx` ON `budget_recommendation` (`priority`);--> statement-breakpoint
CREATE INDEX `recommendation_budget_id_idx` ON `budget_recommendation` (`budget_id`);--> statement-breakpoint
CREATE INDEX `recommendation_category_id_idx` ON `budget_recommendation` (`category_id`);--> statement-breakpoint
CREATE INDEX `recommendation_account_id_idx` ON `budget_recommendation` (`account_id`);--> statement-breakpoint
CREATE INDEX `recommendation_created_at_idx` ON `budget_recommendation` (`created_at`);--> statement-breakpoint
CREATE INDEX `recommendation_expires_at_idx` ON `budget_recommendation` (`expires_at`);