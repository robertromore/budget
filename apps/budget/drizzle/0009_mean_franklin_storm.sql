CREATE TABLE `user` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`display_name` text NOT NULL,
	`slug` text NOT NULL,
	`email` text,
	`preferences` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_slug_unique` ON `user` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_slug_idx` ON `user` (`slug`);--> statement-breakpoint
CREATE INDEX `user_email_idx` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_deleted_at_idx` ON `user` (`deleted_at`);--> statement-breakpoint
ALTER TABLE `account` ADD `user_id` integer REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
ALTER TABLE `budget_automation_settings` ADD `user_id` integer REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `budget_automation_settings_user_id_idx` ON `budget_automation_settings` (`user_id`);--> statement-breakpoint
ALTER TABLE `budget` ADD `user_id` integer REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `budget_user_id_idx` ON `budget` (`user_id`);--> statement-breakpoint
ALTER TABLE `categories` ADD `user_id` integer REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `category_user_id_idx` ON `categories` (`user_id`);--> statement-breakpoint
ALTER TABLE `category_groups` ADD `user_id` integer REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `category_groups_user_id_idx` ON `category_groups` (`user_id`);--> statement-breakpoint
ALTER TABLE `detected_patterns` ADD `user_id` integer REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `detected_patterns_user_id_idx` ON `detected_patterns` (`user_id`);--> statement-breakpoint
ALTER TABLE `budget_recommendation` ADD `user_id` integer REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `recommendation_user_id_idx` ON `budget_recommendation` (`user_id`);--> statement-breakpoint
ALTER TABLE `payee_category_corrections` ADD `user_id` integer REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `payee_corrections_user_id_idx` ON `payee_category_corrections` (`user_id`);--> statement-breakpoint
ALTER TABLE `payee` ADD `user_id` integer REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `payee_user_id_idx` ON `payee` (`user_id`);--> statement-breakpoint
ALTER TABLE `schedules` ADD `user_id` integer REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `schedules_user_id_idx` ON `schedules` (`user_id`);--> statement-breakpoint
ALTER TABLE `views` ADD `user_id` integer REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `views_user_id_idx` ON `views` (`user_id`);