ALTER TABLE `home_floor_plan_node` ADD `deleted_at` text;--> statement-breakpoint
CREATE INDEX `floor_plan_node_lookup_idx` ON `home_floor_plan_node` (`workspace_id`,`home_id`,`floor_level`);--> statement-breakpoint
CREATE INDEX `floor_plan_node_deleted_at_idx` ON `home_floor_plan_node` (`deleted_at`);