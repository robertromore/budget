CREATE TABLE `payee_category_corrections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`payee_id` integer NOT NULL,
	`transaction_id` integer,
	`from_category_id` integer,
	`to_category_id` integer NOT NULL,
	`correction_trigger` text NOT NULL,
	`correction_context` text,
	`transaction_amount` real,
	`transaction_date` text,
	`user_confidence` integer,
	`system_confidence` real,
	`correction_weight` real DEFAULT 1 NOT NULL,
	`amount_range` text,
	`temporal_context` text,
	`payee_pattern_context` text,
	`is_processed` integer DEFAULT false NOT NULL,
	`processed_at` text,
	`learning_epoch` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`is_override` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payee_corrections_payee_idx` ON `payee_category_corrections` (`payee_id`);--> statement-breakpoint
CREATE INDEX `payee_corrections_transaction_idx` ON `payee_category_corrections` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `payee_corrections_from_category_idx` ON `payee_category_corrections` (`from_category_id`);--> statement-breakpoint
CREATE INDEX `payee_corrections_to_category_idx` ON `payee_category_corrections` (`to_category_id`);--> statement-breakpoint
CREATE INDEX `payee_corrections_trigger_idx` ON `payee_category_corrections` (`correction_trigger`);--> statement-breakpoint
CREATE INDEX `payee_corrections_context_idx` ON `payee_category_corrections` (`correction_context`);--> statement-breakpoint
CREATE INDEX `payee_corrections_processed_idx` ON `payee_category_corrections` (`is_processed`);--> statement-breakpoint
CREATE INDEX `payee_corrections_learning_epoch_idx` ON `payee_category_corrections` (`learning_epoch`);--> statement-breakpoint
CREATE INDEX `payee_corrections_date_idx` ON `payee_category_corrections` (`transaction_date`);--> statement-breakpoint
CREATE INDEX `payee_corrections_amount_idx` ON `payee_category_corrections` (`transaction_amount`);--> statement-breakpoint
CREATE INDEX `payee_corrections_payee_category_idx` ON `payee_category_corrections` (`payee_id`,`to_category_id`);--> statement-breakpoint
CREATE INDEX `payee_corrections_payee_amount_idx` ON `payee_category_corrections` (`payee_id`,`transaction_amount`);--> statement-breakpoint
CREATE INDEX `payee_corrections_payee_date_idx` ON `payee_category_corrections` (`payee_id`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `payee_corrections_category_change_idx` ON `payee_category_corrections` (`from_category_id`,`to_category_id`);--> statement-breakpoint
CREATE INDEX `payee_corrections_unprocessed_idx` ON `payee_category_corrections` (`is_processed`,`created_at`);--> statement-breakpoint
CREATE INDEX `payee_corrections_pattern_analysis_idx` ON `payee_category_corrections` (`payee_id`,`is_processed`,`learning_epoch`);--> statement-breakpoint
CREATE INDEX `payee_corrections_deleted_at_idx` ON `payee_category_corrections` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `payee_corrections_override_idx` ON `payee_category_corrections` (`is_override`);