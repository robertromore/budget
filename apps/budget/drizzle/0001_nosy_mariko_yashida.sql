CREATE TABLE `import_profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`column_signature` text,
	`filename_pattern` text,
	`account_id` integer,
	`is_account_default` integer DEFAULT false,
	`mapping` text NOT NULL,
	`last_used_at` text,
	`use_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `import_profile_workspace_id_idx` ON `import_profile` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `import_profile_column_signature_idx` ON `import_profile` (`column_signature`);--> statement-breakpoint
CREATE INDEX `import_profile_account_id_idx` ON `import_profile` (`account_id`);--> statement-breakpoint
CREATE INDEX `import_profile_is_account_default_idx` ON `import_profile` (`is_account_default`);