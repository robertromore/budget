ALTER TABLE `transaction` ADD `imported_from` text;--> statement-breakpoint
ALTER TABLE `transaction` ADD `imported_at` text;--> statement-breakpoint
ALTER TABLE `transaction` ADD `original_payee_name` text;--> statement-breakpoint
ALTER TABLE `transaction` ADD `original_category_name` text;--> statement-breakpoint
ALTER TABLE `transaction` ADD `inferred_category` text;--> statement-breakpoint
ALTER TABLE `transaction` ADD `import_details` text;