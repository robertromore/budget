CREATE TABLE `workspace_counter` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`entity_type` text NOT NULL,
	`next_seq` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_counter_unique_idx` ON `workspace_counter` (`workspace_id`,`entity_type`);--> statement-breakpoint
CREATE INDEX `workspace_counter_workspace_idx` ON `workspace_counter` (`workspace_id`);--> statement-breakpoint
ALTER TABLE `account` ADD `seq` integer;--> statement-breakpoint
ALTER TABLE `budget` ADD `seq` integer;--> statement-breakpoint
ALTER TABLE `categories` ADD `seq` integer;--> statement-breakpoint
ALTER TABLE `payee` ADD `seq` integer;--> statement-breakpoint
ALTER TABLE `schedules` ADD `seq` integer;--> statement-breakpoint
ALTER TABLE `transaction` ADD `seq` integer;--> statement-breakpoint
ALTER TABLE `transaction` ADD `workspace_id` integer REFERENCES workspace(id);--> statement-breakpoint
CREATE INDEX `transaction_workspace_idx` ON `transaction` (`workspace_id`);