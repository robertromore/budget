CREATE TABLE `access_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`session_id` text,
	`event_type` text NOT NULL,
	`ip_address_hash` text,
	`geo_location` text,
	`device_hash` text,
	`user_agent` text,
	`local_hour` integer,
	`day_of_week` integer,
	`risk_score` real,
	`challenge_required` integer,
	`challenge_type` text,
	`challenge_passed` integer,
	`key_unlocked` integer,
	`metadata` text,
	`timestamp` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `access_log_user_idx` ON `access_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `access_log_session_idx` ON `access_log` (`session_id`);--> statement-breakpoint
CREATE INDEX `access_log_event_type_idx` ON `access_log` (`event_type`);--> statement-breakpoint
CREATE INDEX `access_log_timestamp_idx` ON `access_log` (`timestamp`);--> statement-breakpoint
CREATE INDEX `access_log_user_timestamp_idx` ON `access_log` (`user_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `access_log_ip_hash_idx` ON `access_log` (`ip_address_hash`);--> statement-breakpoint
CREATE TABLE `encryption_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`encrypted_dek` text NOT NULL,
	`key_verification_hash` text,
	`public_key` text,
	`key_type` text NOT NULL,
	`key_version` integer DEFAULT 1 NOT NULL,
	`key_derivation_params` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`rotated_at` text,
	`last_used_at` text
);
--> statement-breakpoint
CREATE INDEX `encryption_keys_target_type_idx` ON `encryption_keys` (`target_type`);--> statement-breakpoint
CREATE INDEX `encryption_keys_target_id_idx` ON `encryption_keys` (`target_id`);--> statement-breakpoint
CREATE INDEX `encryption_keys_target_composite_idx` ON `encryption_keys` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `user_trusted_contexts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`context_type` text NOT NULL,
	`context_value` text NOT NULL,
	`label` text,
	`trust_score` real DEFAULT 0.5 NOT NULL,
	`seen_count` integer DEFAULT 1 NOT NULL,
	`explicitly_trusted` integer DEFAULT false,
	`first_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trusted_contexts_user_idx` ON `user_trusted_contexts` (`user_id`);--> statement-breakpoint
CREATE INDEX `trusted_contexts_type_idx` ON `user_trusted_contexts` (`context_type`);--> statement-breakpoint
CREATE INDEX `trusted_contexts_value_idx` ON `user_trusted_contexts` (`context_value`);--> statement-breakpoint
CREATE INDEX `trusted_contexts_user_type_idx` ON `user_trusted_contexts` (`user_id`,`context_type`);--> statement-breakpoint
CREATE INDEX `trusted_contexts_revoked_idx` ON `user_trusted_contexts` (`revoked_at`);--> statement-breakpoint
ALTER TABLE `account` ADD `encryption_level` text;--> statement-breakpoint
ALTER TABLE `account` ADD `encryption_key_id` text;