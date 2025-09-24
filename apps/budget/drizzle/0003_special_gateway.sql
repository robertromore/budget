CREATE TABLE `envelope_allocation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`period_instance_id` integer NOT NULL,
	`allocated_amount` real DEFAULT 0 NOT NULL,
	`spent_amount` real DEFAULT 0 NOT NULL,
	`rollover_amount` real DEFAULT 0 NOT NULL,
	`available_amount` real DEFAULT 0 NOT NULL,
	`deficit_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`rollover_mode` text DEFAULT 'unlimited' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`last_calculated` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`period_instance_id`) REFERENCES `budget_period_instance`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `envelope_allocation_unique` ON `envelope_allocation` (`budget_id`,`category_id`,`period_instance_id`);--> statement-breakpoint
CREATE INDEX `envelope_allocation_budget_idx` ON `envelope_allocation` (`budget_id`);--> statement-breakpoint
CREATE INDEX `envelope_allocation_category_idx` ON `envelope_allocation` (`category_id`);--> statement-breakpoint
CREATE INDEX `envelope_allocation_period_idx` ON `envelope_allocation` (`period_instance_id`);--> statement-breakpoint
CREATE INDEX `envelope_allocation_status_idx` ON `envelope_allocation` (`status`);--> statement-breakpoint
CREATE TABLE `envelope_rollover_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`envelope_id` integer NOT NULL,
	`from_period_id` integer NOT NULL,
	`to_period_id` integer NOT NULL,
	`rolled_amount` real NOT NULL,
	`reset_amount` real DEFAULT 0 NOT NULL,
	`processed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelope_allocation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_period_id`) REFERENCES `budget_period_instance`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_period_id`) REFERENCES `budget_period_instance`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `envelope_rollover_envelope_idx` ON `envelope_rollover_history` (`envelope_id`);--> statement-breakpoint
CREATE INDEX `envelope_rollover_from_period_idx` ON `envelope_rollover_history` (`from_period_id`);--> statement-breakpoint
CREATE INDEX `envelope_rollover_to_period_idx` ON `envelope_rollover_history` (`to_period_id`);--> statement-breakpoint
CREATE TABLE `envelope_transfer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_envelope_id` integer NOT NULL,
	`to_envelope_id` integer NOT NULL,
	`amount` real NOT NULL,
	`reason` text,
	`transferred_by` text NOT NULL,
	`transferred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`from_envelope_id`) REFERENCES `envelope_allocation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_envelope_id`) REFERENCES `envelope_allocation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `envelope_transfer_from_idx` ON `envelope_transfer` (`from_envelope_id`);--> statement-breakpoint
CREATE INDEX `envelope_transfer_to_idx` ON `envelope_transfer` (`to_envelope_id`);--> statement-breakpoint
CREATE INDEX `envelope_transfer_date_idx` ON `envelope_transfer` (`transferred_at`);