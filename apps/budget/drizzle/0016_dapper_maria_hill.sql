PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_budget_template` (
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
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_budget_template`("id", "name", "description", "type", "scope", "icon", "suggested_amount", "enforcement_level", "metadata", "is_system", "created_at", "updated_at") SELECT "id", "name", "description", "type", "scope", "icon", "suggested_amount", "enforcement_level", "metadata", "is_system", "created_at", "updated_at" FROM `budget_template`;--> statement-breakpoint
DROP TABLE `budget_template`;--> statement-breakpoint
ALTER TABLE `__new_budget_template` RENAME TO `budget_template`;--> statement-breakpoint
PRAGMA foreign_keys=ON;