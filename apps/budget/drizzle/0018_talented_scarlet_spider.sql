CREATE TABLE `dashboard_widget_group_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`widget_type` text NOT NULL,
	`title` text,
	`size` text DEFAULT 'medium' NOT NULL,
	`column_span` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`settings` text,
	FOREIGN KEY (`group_id`) REFERENCES `dashboard_widget_group`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dashboard_widget_group_item_group_idx` ON `dashboard_widget_group_item` (`group_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `dashboard_widget_group` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`icon` text,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dashboard_widget_group_workspace_idx` ON `dashboard_widget_group` (`workspace_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `dashboard_widget_group_workspace_slug_idx` ON `dashboard_widget_group` (`workspace_id`,`slug`);