CREATE TABLE `home_floor_plan_node` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`home_id` integer NOT NULL,
	`floor_level` integer DEFAULT 0 NOT NULL,
	`parent_id` text,
	`node_type` text NOT NULL,
	`name` text,
	`pos_x` real DEFAULT 0 NOT NULL,
	`pos_y` real DEFAULT 0 NOT NULL,
	`width` real DEFAULT 0 NOT NULL,
	`height` real DEFAULT 0 NOT NULL,
	`rotation` real DEFAULT 0 NOT NULL,
	`x2` real,
	`y2` real,
	`color` text,
	`opacity` real DEFAULT 1 NOT NULL,
	`linked_location_id` integer,
	`linked_item_id` integer,
	`properties` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`home_id`) REFERENCES `home`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `home_floor_plan_node`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`linked_location_id`) REFERENCES `home_location`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`linked_item_id`) REFERENCES `home_item`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `floor_plan_node_workspace_id_idx` ON `home_floor_plan_node` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_node_home_id_idx` ON `home_floor_plan_node` (`home_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_node_floor_level_idx` ON `home_floor_plan_node` (`home_id`,`floor_level`);--> statement-breakpoint
CREATE INDEX `floor_plan_node_parent_id_idx` ON `home_floor_plan_node` (`parent_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_node_type_idx` ON `home_floor_plan_node` (`node_type`);