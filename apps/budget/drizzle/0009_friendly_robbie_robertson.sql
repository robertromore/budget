CREATE TABLE `price_product_list_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`list_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`added_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `price_product_list`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `price_product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_product_list_item_unique_idx` ON `price_product_list_item` (`list_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `price_product_list` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_product_list_slug_unique` ON `price_product_list` (`slug`);--> statement-breakpoint
CREATE INDEX `price_product_list_workspace_idx` ON `price_product_list` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `price_product_tag` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`tag` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `price_product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_product_tag_unique_idx` ON `price_product_tag` (`product_id`,`tag`);--> statement-breakpoint
CREATE INDEX `price_product_tag_workspace_idx` ON `price_product_tag` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `price_product_tag_tag_idx` ON `price_product_tag` (`tag`);