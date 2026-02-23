DROP INDEX IF EXISTS `category_groups_name_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `category_groups_slug_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `category_groups_workspace_name_unique` ON `category_groups` (`workspace_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `category_groups_workspace_slug_unique` ON `category_groups` (`workspace_id`,`slug`);
