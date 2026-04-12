CREATE TABLE `investment_value_snapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`workspace_id` integer NOT NULL,
	`snapshot_date` text NOT NULL,
	`value` real NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `inv_snapshot_account_idx` ON `investment_value_snapshot` (`account_id`);--> statement-breakpoint
CREATE INDEX `inv_snapshot_workspace_idx` ON `investment_value_snapshot` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `inv_snapshot_date_idx` ON `investment_value_snapshot` (`snapshot_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `inv_snapshot_account_date_uidx` ON `investment_value_snapshot` (`account_id`,`snapshot_date`);--> statement-breakpoint
ALTER TABLE `account` ADD `expense_ratio` real;--> statement-breakpoint
ALTER TABLE `account` ADD `benchmark_symbol` text;