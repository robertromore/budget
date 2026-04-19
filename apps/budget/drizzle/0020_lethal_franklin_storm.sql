ALTER TABLE `dashboard_group_instance` ADD `style_pinned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `dashboard_widget` ADD `style_pinned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `dashboard` ADD `style_priority` text;