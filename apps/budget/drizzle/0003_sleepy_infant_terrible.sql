CREATE TABLE `category_aliases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`raw_string` text NOT NULL,
	`normalized_string` text,
	`category_id` integer NOT NULL,
	`payee_id` integer,
	`trigger` text NOT NULL,
	`confidence` real DEFAULT 1 NOT NULL,
	`match_count` integer DEFAULT 1 NOT NULL,
	`amount_type` text DEFAULT 'any',
	`source_account_id` integer,
	`last_matched_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `category_aliases_workspace_idx` ON `category_aliases` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `category_aliases_category_idx` ON `category_aliases` (`category_id`);--> statement-breakpoint
CREATE INDEX `category_aliases_payee_idx` ON `category_aliases` (`payee_id`);--> statement-breakpoint
CREATE INDEX `category_aliases_raw_string_idx` ON `category_aliases` (`raw_string`);--> statement-breakpoint
CREATE INDEX `category_aliases_normalized_idx` ON `category_aliases` (`normalized_string`);--> statement-breakpoint
CREATE INDEX `category_aliases_workspace_normalized_idx` ON `category_aliases` (`workspace_id`,`normalized_string`);--> statement-breakpoint
CREATE UNIQUE INDEX `category_aliases_workspace_raw_unique_idx` ON `category_aliases` (`workspace_id`,`raw_string`);--> statement-breakpoint
CREATE INDEX `category_aliases_deleted_at_idx` ON `category_aliases` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `category_aliases_trigger_idx` ON `category_aliases` (`trigger`);--> statement-breakpoint
CREATE INDEX `category_aliases_source_account_idx` ON `category_aliases` (`source_account_id`);--> statement-breakpoint
CREATE INDEX `category_aliases_amount_type_idx` ON `category_aliases` (`amount_type`);