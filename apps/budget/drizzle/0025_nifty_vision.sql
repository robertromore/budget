CREATE TABLE `ai_tool_call` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`conversation_id` integer,
	`tool_name` text NOT NULL,
	`input_shape` text,
	`output_shape` text,
	`latency_ms` integer NOT NULL,
	`success` integer NOT NULL,
	`error_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversation`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_tool_call_workspace_idx` ON `ai_tool_call` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `ai_tool_call_conversation_idx` ON `ai_tool_call` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `ai_tool_call_tool_name_idx` ON `ai_tool_call` (`tool_name`);--> statement-breakpoint
CREATE INDEX `ai_tool_call_created_at_idx` ON `ai_tool_call` (`created_at`);