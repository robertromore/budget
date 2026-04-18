CREATE TABLE `dashboard_group_instance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dashboard_id` integer NOT NULL,
	`source_group_id` integer,
	`name` text NOT NULL,
	`icon` text,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`dashboard_id`) REFERENCES `dashboard`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dashboard_group_instance_dashboard_id_idx` ON `dashboard_group_instance` (`dashboard_id`);--> statement-breakpoint
CREATE INDEX `dashboard_group_instance_sort_idx` ON `dashboard_group_instance` (`dashboard_id`,`sort_order`);--> statement-breakpoint
ALTER TABLE `dashboard_widget` ADD `group_instance_id` integer REFERENCES dashboard_group_instance(id);--> statement-breakpoint
CREATE INDEX `dashboard_widget_group_instance_idx` ON `dashboard_widget` (`group_instance_id`);