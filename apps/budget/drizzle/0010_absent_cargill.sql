CREATE TABLE `home_attachment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text DEFAULT 'other' NOT NULL,
	`mime_type` text,
	`file_size` integer,
	`url` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `home_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `home_attachment_workspace_id_idx` ON `home_attachment` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `home_attachment_item_id_idx` ON `home_attachment` (`item_id`);--> statement-breakpoint
CREATE TABLE `home_item_label` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`label_id` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `home_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `home_label`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `home_item_label_unique_idx` ON `home_item_label` (`item_id`,`label_id`);--> statement-breakpoint
CREATE TABLE `home_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`home_id` integer NOT NULL,
	`location_id` integer,
	`parent_item_id` integer,
	`asset_id` integer,
	`name` text NOT NULL,
	`description` text,
	`notes` text,
	`serial_number` text,
	`model_number` text,
	`manufacturer` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`is_insured` integer DEFAULT false NOT NULL,
	`purchase_date` text,
	`purchase_vendor` text,
	`purchase_price` real,
	`warranty_expires` text,
	`warranty_notes` text,
	`lifetime_warranty` integer DEFAULT false NOT NULL,
	`current_value` real,
	`custom_fields` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`home_id`) REFERENCES `home`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `home_location`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_item_id`) REFERENCES `home_item`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `home_item_workspace_id_idx` ON `home_item` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `home_item_home_id_idx` ON `home_item` (`home_id`);--> statement-breakpoint
CREATE INDEX `home_item_location_id_idx` ON `home_item` (`location_id`);--> statement-breakpoint
CREATE INDEX `home_item_parent_item_id_idx` ON `home_item` (`parent_item_id`);--> statement-breakpoint
CREATE INDEX `home_item_asset_id_idx` ON `home_item` (`home_id`,`asset_id`);--> statement-breakpoint
CREATE INDEX `home_item_deleted_at_idx` ON `home_item` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `home_item_name_idx` ON `home_item` (`name`);--> statement-breakpoint
CREATE TABLE `home_label` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`home_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`home_id`) REFERENCES `home`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `home_label_workspace_id_idx` ON `home_label` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `home_label_home_id_idx` ON `home_label` (`home_id`);--> statement-breakpoint
CREATE INDEX `home_label_deleted_at_idx` ON `home_label` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `home_location` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`home_id` integer NOT NULL,
	`parent_id` integer,
	`name` text NOT NULL,
	`description` text,
	`location_type` text DEFAULT 'room',
	`icon` text,
	`color` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`home_id`) REFERENCES `home`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `home_location`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `home_location_workspace_id_idx` ON `home_location` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `home_location_home_id_idx` ON `home_location` (`home_id`);--> statement-breakpoint
CREATE INDEX `home_location_parent_id_idx` ON `home_location` (`parent_id`);--> statement-breakpoint
CREATE INDEX `home_location_deleted_at_idx` ON `home_location` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `home_maintenance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`maintenance_type` text DEFAULT 'completed' NOT NULL,
	`scheduled_date` text,
	`completed_date` text,
	`cost` real,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `home_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `home_maintenance_workspace_id_idx` ON `home_maintenance` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `home_maintenance_item_id_idx` ON `home_maintenance` (`item_id`);--> statement-breakpoint
CREATE INDEX `home_maintenance_scheduled_date_idx` ON `home_maintenance` (`scheduled_date`);--> statement-breakpoint
CREATE TABLE `home` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`address` text,
	`notes` text,
	`cover_image_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `home_workspace_id_idx` ON `home` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `home_slug_idx` ON `home` (`slug`);--> statement-breakpoint
CREATE INDEX `home_deleted_at_idx` ON `home` (`deleted_at`);