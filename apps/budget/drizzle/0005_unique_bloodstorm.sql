CREATE TABLE `ai_conversation_message` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`reasoning` text,
	`tools_used` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_message_conversation_idx` ON `ai_conversation_message` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `ai_message_created_at_idx` ON `ai_conversation_message` (`created_at`);--> statement-breakpoint
CREATE TABLE `ai_conversation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`title` text,
	`summary` text,
	`context` text,
	`message_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_conversation_workspace_idx` ON `ai_conversation` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `ai_conversation_updated_at_idx` ON `ai_conversation` (`updated_at`);--> statement-breakpoint
CREATE INDEX `ai_conversation_deleted_at_idx` ON `ai_conversation` (`deleted_at`);