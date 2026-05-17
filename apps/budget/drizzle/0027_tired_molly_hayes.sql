PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_prediction_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`payee_id` integer,
	`prediction_type` text NOT NULL,
	`original_date` text,
	`original_amount` real,
	`original_confidence` real,
	`prediction_tier` text,
	`corrected_date` text,
	`corrected_amount` real,
	`rating` text,
	`prediction_method` text,
	`transaction_count` integer,
	`was_accurate` integer,
	`actual_date` text,
	`actual_amount` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_prediction_feedback`("id", "workspace_id", "payee_id", "prediction_type", "original_date", "original_amount", "original_confidence", "prediction_tier", "corrected_date", "corrected_amount", "rating", "prediction_method", "transaction_count", "was_accurate", "actual_date", "actual_amount", "created_at", "resolved_at") SELECT "id", "workspace_id", "payee_id", "prediction_type", "original_date", "original_amount", "original_confidence", "prediction_tier", "corrected_date", "corrected_amount", "rating", "prediction_method", "transaction_count", "was_accurate", "actual_date", "actual_amount", "created_at", "resolved_at" FROM `prediction_feedback`;--> statement-breakpoint
DROP TABLE `prediction_feedback`;--> statement-breakpoint
ALTER TABLE `__new_prediction_feedback` RENAME TO `prediction_feedback`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `prediction_feedback_workspace_idx` ON `prediction_feedback` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `prediction_feedback_payee_idx` ON `prediction_feedback` (`payee_id`);--> statement-breakpoint
CREATE INDEX `prediction_feedback_type_idx` ON `prediction_feedback` (`prediction_type`);--> statement-breakpoint
CREATE INDEX `prediction_feedback_rating_idx` ON `prediction_feedback` (`rating`);--> statement-breakpoint
CREATE INDEX `prediction_feedback_created_idx` ON `prediction_feedback` (`created_at`);