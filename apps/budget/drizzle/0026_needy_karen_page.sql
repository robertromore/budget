CREATE TABLE `cached_narrative` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`kind` text NOT NULL,
	`date_key` text NOT NULL,
	`model` text NOT NULL,
	`input_hash` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cached_narrative_unique_key` ON `cached_narrative` (`workspace_id`,`kind`,`date_key`,`model`);--> statement-breakpoint
CREATE INDEX `cached_narrative_workspace_idx` ON `cached_narrative` (`workspace_id`);