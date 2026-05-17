CREATE TABLE `external_api_key` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`scope` text NOT NULL,
	`last_used_at` text,
	`expires_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `external_api_key_workspace_idx` ON `external_api_key` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `external_api_key_hash_idx` ON `external_api_key` (`key_hash`);--> statement-breakpoint
CREATE INDEX `external_api_key_revoked_idx` ON `external_api_key` (`revoked_at`);