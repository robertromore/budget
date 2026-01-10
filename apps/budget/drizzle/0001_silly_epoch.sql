CREATE TABLE `account_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`workspace_id` integer NOT NULL,
	`provider` text NOT NULL,
	`external_account_id` text NOT NULL,
	`institution_name` text NOT NULL,
	`encrypted_credentials` text NOT NULL,
	`last_sync_at` text,
	`sync_status` text DEFAULT 'active' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_connections_account_idx` ON `account_connections` (`account_id`);--> statement-breakpoint
CREATE INDEX `account_connections_workspace_idx` ON `account_connections` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `account_connections_provider_idx` ON `account_connections` (`provider`);--> statement-breakpoint
CREATE INDEX `account_connections_sync_status_idx` ON `account_connections` (`sync_status`);--> statement-breakpoint
CREATE INDEX `account_connections_deleted_at_idx` ON `account_connections` (`deleted_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_connections_account_unique_idx` ON `account_connections` (`account_id`);--> statement-breakpoint
CREATE TABLE `sync_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`connection_id` integer NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	`status` text DEFAULT 'running' NOT NULL,
	`transactions_fetched` integer DEFAULT 0,
	`transactions_imported` integer DEFAULT 0,
	`duplicates_skipped` integer DEFAULT 0,
	`error_message` text,
	FOREIGN KEY (`connection_id`) REFERENCES `account_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sync_history_connection_idx` ON `sync_history` (`connection_id`);--> statement-breakpoint
CREATE INDEX `sync_history_started_at_idx` ON `sync_history` (`started_at`);--> statement-breakpoint
CREATE INDEX `sync_history_status_idx` ON `sync_history` (`status`);