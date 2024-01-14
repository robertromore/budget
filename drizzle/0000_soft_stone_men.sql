CREATE TABLE `account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text,
	`name` text NOT NULL,
	`slug` text,
	`closed` integer DEFAULT false,
	`balance` real DEFAULT 0,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `transaction` (
	`id` integer,
	`parentId` integer DEFAULT -1,
	`status` integer DEFAULT false,
	`payeeId` integer,
	`amount` real DEFAULT 0,
	`categoryId` integer,
	`notes` text,
	`date` integer,
	FOREIGN KEY (`id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parentId`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `relations_user_idx` ON `transaction` (`id`);