CREATE TABLE `account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`closed` integer DEFAULT false,
	`notes` text,
	`date_opened` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `account_name_idx` ON `account` (`name`);--> statement-breakpoint
CREATE INDEX `account_slug_idx` ON `account` (`slug`);--> statement-breakpoint
CREATE INDEX `account_closed_idx` ON `account` (`closed`);--> statement-breakpoint
CREATE INDEX `account_deleted_at_idx` ON `account` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`name` text,
	`notes` text,
	`date_created` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `category_name_idx` ON `categories` (`name`);--> statement-breakpoint
CREATE INDEX `category_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `category_deleted_at_idx` ON `categories` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `filter` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`operator` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payee` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`notes` text,
	`date_created` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `payee_name_idx` ON `payee` (`name`);--> statement-breakpoint
CREATE INDEX `payee_deleted_at_idx` ON `payee` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'active',
	`amount` real DEFAULT 0 NOT NULL,
	`amount_2` real DEFAULT 0 NOT NULL,
	`amount_type` text DEFAULT 'exact' NOT NULL,
	`recurring` integer DEFAULT false,
	`auto_add` integer DEFAULT false,
	`schedule_date_id` integer,
	`payee_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`schedule_date_id`) REFERENCES `schedule_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `relations_schedule_schedule_date_idx` ON `schedules` (`schedule_date_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_account_idx` ON `schedules` (`account_id`);--> statement-breakpoint
CREATE INDEX `relations_schedule_payee_idx` ON `schedules` (`payee_id`);--> statement-breakpoint
CREATE INDEX `schedule_status_idx` ON `schedules` (`status`);--> statement-breakpoint
CREATE INDEX `schedule_name_idx` ON `schedules` (`name`);--> statement-breakpoint
CREATE INDEX `schedule_slug_idx` ON `schedules` (`slug`);--> statement-breakpoint
CREATE TABLE `transaction` (
	`id` integer PRIMARY KEY NOT NULL,
	`account_id` integer NOT NULL,
	`parent_id` integer,
	`status` text DEFAULT 'pending',
	`payee_id` integer,
	`amount` real DEFAULT 0 NOT NULL,
	`category_id` integer,
	`notes` text,
	`date` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`schedule_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `relations_transaction_account_idx` ON `transaction` (`account_id`);--> statement-breakpoint
CREATE INDEX `relations_transaction_payee_idx` ON `transaction` (`payee_id`);--> statement-breakpoint
CREATE INDEX `relations_transaction_category_idx` ON `transaction` (`category_id`);--> statement-breakpoint
CREATE INDEX `relations_transaction_schedule_idx` ON `transaction` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `transaction_account_date_idx` ON `transaction` (`account_id`,`date`,`id`);--> statement-breakpoint
CREATE INDEX `transaction_date_idx` ON `transaction` (`date`);--> statement-breakpoint
CREATE INDEX `transaction_status_idx` ON `transaction` (`status`);--> statement-breakpoint
CREATE INDEX `transaction_parent_idx` ON `transaction` (`parent_id`);--> statement-breakpoint
CREATE INDEX `transaction_deleted_at_idx` ON `transaction` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `views` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`filters` text,
	`display` text,
	`dirty` integer
);
--> statement-breakpoint
CREATE TABLE `schedule_dates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`start_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`end_date` text,
	`frequency` text,
	`interval` integer DEFAULT 1,
	`limit` integer DEFAULT 0,
	`move_weekends` text DEFAULT 'none',
	`move_holidays` text DEFAULT 'none',
	`specific_dates` text DEFAULT '{}',
	`schedule_id` integer NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `relations_schedule_date_schedule_idx` ON `schedule_dates` (`schedule_id`);