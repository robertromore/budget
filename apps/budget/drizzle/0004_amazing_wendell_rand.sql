CREATE TABLE `payee_ai_enhancements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`payee_id` integer NOT NULL,
	`field_name` text NOT NULL,
	`mode` text NOT NULL,
	`original_value` text,
	`suggested_value` text,
	`applied_value` text,
	`confidence` real,
	`provider` text,
	`model_id` text,
	`was_accepted` integer DEFAULT true NOT NULL,
	`was_modified` integer DEFAULT false NOT NULL,
	`enhanced_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_workspace_idx` ON `payee_ai_enhancements` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_payee_idx` ON `payee_ai_enhancements` (`payee_id`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_field_idx` ON `payee_ai_enhancements` (`field_name`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_mode_idx` ON `payee_ai_enhancements` (`mode`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_provider_idx` ON `payee_ai_enhancements` (`provider`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_payee_field_idx` ON `payee_ai_enhancements` (`payee_id`,`field_name`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_payee_enhanced_idx` ON `payee_ai_enhancements` (`payee_id`,`enhanced_at`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_field_mode_idx` ON `payee_ai_enhancements` (`field_name`,`mode`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_accepted_idx` ON `payee_ai_enhancements` (`was_accepted`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_modified_idx` ON `payee_ai_enhancements` (`was_modified`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_confidence_idx` ON `payee_ai_enhancements` (`confidence`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_provider_confidence_idx` ON `payee_ai_enhancements` (`provider`,`confidence`);--> statement-breakpoint
CREATE INDEX `payee_ai_enhancements_mode_confidence_idx` ON `payee_ai_enhancements` (`mode`,`confidence`);--> statement-breakpoint
ALTER TABLE `payee` ADD `ai_preferences` text DEFAULT 'null';