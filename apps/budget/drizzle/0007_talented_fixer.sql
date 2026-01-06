CREATE TABLE `report_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`is_default` integer DEFAULT false,
	`template_type` text NOT NULL,
	`config` text NOT NULL,
	`last_used_at` text,
	`use_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_templates_workspace_idx` ON `report_templates` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `report_templates_type_idx` ON `report_templates` (`template_type`);