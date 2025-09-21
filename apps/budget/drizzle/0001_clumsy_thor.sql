ALTER TABLE `schedules` ADD `category_id` integer REFERENCES categories(id);--> statement-breakpoint
CREATE INDEX `relations_schedule_category_idx` ON `schedules` (`category_id`);