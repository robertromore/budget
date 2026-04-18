ALTER TABLE `price_product_list_item` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `price_product_list` ADD `kind` text DEFAULT 'collection' NOT NULL;--> statement-breakpoint
CREATE INDEX `price_product_list_kind_idx` ON `price_product_list` (`workspace_id`,`kind`);