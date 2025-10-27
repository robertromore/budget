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
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE set null,
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