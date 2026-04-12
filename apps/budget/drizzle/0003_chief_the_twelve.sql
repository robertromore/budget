CREATE TABLE `financial_goal` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`goal_type` text NOT NULL,
	`target_amount` real NOT NULL,
	`target_date` text,
	`account_id` integer,
	`notes` text,
	`is_completed` integer DEFAULT false NOT NULL,
	`completed_at` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`starting_balance` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `financial_goal_workspace_idx` ON `financial_goal` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `financial_goal_account_idx` ON `financial_goal` (`account_id`);