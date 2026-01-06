CREATE TABLE `month_annotations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`month` text NOT NULL,
	`account_id` integer,
	`category_id` integer,
	`note` text,
	`flagged_for_review` integer DEFAULT false,
	`tags` text DEFAULT '[]',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `month_annotations_workspace_id_idx` ON `month_annotations` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `month_annotations_workspace_month_idx` ON `month_annotations` (`workspace_id`,`month`);--> statement-breakpoint
CREATE INDEX `month_annotations_account_idx` ON `month_annotations` (`account_id`);--> statement-breakpoint
CREATE INDEX `month_annotations_category_idx` ON `month_annotations` (`category_id`);--> statement-breakpoint
CREATE INDEX `month_annotations_flagged_idx` ON `month_annotations` (`flagged_for_review`);