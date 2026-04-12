CREATE TABLE `net_worth_snapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`snapshot_date` text NOT NULL,
	`total_net_worth` real NOT NULL,
	`total_assets` real NOT NULL,
	`total_liabilities` real NOT NULL,
	`by_account_type` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `net_worth_snapshot_workspace_idx` ON `net_worth_snapshot` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `net_worth_snapshot_date_idx` ON `net_worth_snapshot` (`snapshot_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `net_worth_snapshot_workspace_date_uidx` ON `net_worth_snapshot` (`workspace_id`,`snapshot_date`);