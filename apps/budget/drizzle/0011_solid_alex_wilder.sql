PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_schedule_dates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`start_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`end_date` text,
	`frequency` text,
	`interval` integer DEFAULT 1,
	`limit` integer DEFAULT 0,
	`move_weekends` text DEFAULT 'none',
	`move_holidays` text DEFAULT 'none',
	`specific_dates` text DEFAULT '[]',
	`on` integer DEFAULT false,
	`on_type` text DEFAULT 'day',
	`days` text DEFAULT '[]',
	`weeks` text DEFAULT '[]',
	`weeks_days` text DEFAULT '[]',
	`week_days` text DEFAULT '[]',
	`schedule_id` integer NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_schedule_dates`("id", "start_date", "end_date", "frequency", "interval", "limit", "move_weekends", "move_holidays", "specific_dates", "on", "on_type", "days", "weeks", "weeks_days", "week_days", "schedule_id") SELECT "id", "start_date", "end_date", "frequency", "interval", "limit", "move_weekends", "move_holidays", "specific_dates", "on", "on_type", "days", "weeks", "weeks_days", "week_days", "schedule_id" FROM `schedule_dates`;--> statement-breakpoint
DROP TABLE `schedule_dates`;--> statement-breakpoint
ALTER TABLE `__new_schedule_dates` RENAME TO `schedule_dates`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `relations_schedule_date_schedule_idx` ON `schedule_dates` (`schedule_id`);