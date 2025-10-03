ALTER TABLE `categories` ADD `category_icon` text;--> statement-breakpoint
ALTER TABLE `categories` ADD `category_color` text;--> statement-breakpoint
ALTER TABLE `categories` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `display_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `category_icon_idx` ON `categories` (`category_icon`);--> statement-breakpoint
CREATE INDEX `category_is_active_idx` ON `categories` (`is_active`);--> statement-breakpoint
CREATE INDEX `category_display_order_idx` ON `categories` (`display_order`);