CREATE TABLE `schedule_skips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`schedule_id` integer NOT NULL,
	`skipped_date` text NOT NULL,
	`skip_type` text DEFAULT 'single' NOT NULL,
	`reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `schedule_skips_workspace_id_idx` ON `schedule_skips` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `schedule_skips_schedule_id_idx` ON `schedule_skips` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `schedule_skips_skipped_date_idx` ON `schedule_skips` (`skipped_date`);--> statement-breakpoint
CREATE INDEX `schedule_skips_schedule_date_idx` ON `schedule_skips` (`schedule_id`,`skipped_date`);