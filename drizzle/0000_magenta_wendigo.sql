CREATE TABLE `account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`closed` integer DEFAULT false,
	`notes` text,
	`date_opened` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`name` text,
	`notes` text,
	`date_created` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
	`date_created` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transaction` (
	`id` integer PRIMARY KEY NOT NULL,
	`account_id` integer,
	`parent_id` integer,
	`status` text DEFAULT 'pending',
	`payee_id` integer,
	`amount` real DEFAULT 0,
	`category_id` integer,
	`notes` text,
	`date` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `relations_transaction_account_idx` ON `transaction` (`account_id`);--> statement-breakpoint
CREATE INDEX `relations_transaction_payee_idx` ON `transaction` (`payee_id`);--> statement-breakpoint
CREATE INDEX `relations_transaction_category_idx` ON `transaction` (`category_id`);--> statement-breakpoint
CREATE TABLE `view` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`view_name` text NOT NULL,
	`description` text,
	`icon` text,
	`filters` text,
	`display` text
);
