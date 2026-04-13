CREATE TABLE `price_alert` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`workspace_id` integer NOT NULL,
	`type` text NOT NULL,
	`threshold` real,
	`enabled` integer DEFAULT true NOT NULL,
	`last_triggered_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `price_product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `price_alert_product_idx` ON `price_alert` (`product_id`);--> statement-breakpoint
CREATE INDEX `price_alert_workspace_idx` ON `price_alert` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `price_alert_enabled_idx` ON `price_alert` (`enabled`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`price` real NOT NULL,
	`in_stock` integer DEFAULT true NOT NULL,
	`source` text DEFAULT 'scrape' NOT NULL,
	`checked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `price_product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `price_history_product_idx` ON `price_history` (`product_id`);--> statement-breakpoint
CREATE INDEX `price_history_checked_at_idx` ON `price_history` (`checked_at`);--> statement-breakpoint
CREATE INDEX `price_history_product_checked_idx` ON `price_history` (`product_id`,`checked_at`);--> statement-breakpoint
CREATE TABLE `price_product` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seq` integer,
	`cuid` text,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`retailer` text NOT NULL,
	`image_url` text,
	`current_price` real,
	`lowest_price` real,
	`highest_price` real,
	`target_price` real,
	`currency` text DEFAULT 'USD' NOT NULL,
	`last_checked_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`error_message` text,
	`check_interval` integer DEFAULT 6 NOT NULL,
	`slug` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_product_slug_unique` ON `price_product` (`slug`);--> statement-breakpoint
CREATE INDEX `price_product_workspace_idx` ON `price_product` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `price_product_retailer_idx` ON `price_product` (`retailer`);--> statement-breakpoint
CREATE INDEX `price_product_status_idx` ON `price_product` (`status`);--> statement-breakpoint
CREATE INDEX `price_product_slug_idx` ON `price_product` (`slug`);--> statement-breakpoint
CREATE INDEX `price_product_deleted_at_idx` ON `price_product` (`deleted_at`);