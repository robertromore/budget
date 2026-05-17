CREATE TABLE `ai_llm_call` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`feature` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`reasoning_tokens` integer,
	`latency_ms` integer NOT NULL,
	`success` integer NOT NULL,
	`error_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_llm_call_workspace_idx` ON `ai_llm_call` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `ai_llm_call_feature_idx` ON `ai_llm_call` (`feature`);--> statement-breakpoint
CREATE INDEX `ai_llm_call_created_at_idx` ON `ai_llm_call` (`created_at`);