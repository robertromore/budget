CREATE TABLE `budget_template` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`scope` text NOT NULL,
	`icon` text DEFAULT '📊',
	`suggested_amount` real,
	`enforcement_level` text DEFAULT 'warning' NOT NULL,
	`metadata` text,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
