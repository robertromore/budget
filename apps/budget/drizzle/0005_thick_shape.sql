CREATE TABLE `automation_rule_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rule_id` integer NOT NULL,
	`trigger_event` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer,
	`status` text NOT NULL,
	`conditions_matched` integer,
	`actions_executed` text,
	`error_message` text,
	`execution_time_ms` integer,
	`entity_snapshot` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`rule_id`) REFERENCES `automation_rules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `automation_rule_logs_rule_id_idx` ON `automation_rule_logs` (`rule_id`);--> statement-breakpoint
CREATE INDEX `automation_rule_logs_status_idx` ON `automation_rule_logs` (`status`);--> statement-breakpoint
CREATE INDEX `automation_rule_logs_created_at_idx` ON `automation_rule_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `automation_rule_logs_entity_idx` ON `automation_rule_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `automation_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_enabled` integer DEFAULT true NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`trigger` text NOT NULL,
	`conditions` text NOT NULL,
	`actions` text NOT NULL,
	`flow_state` text,
	`stop_on_match` integer DEFAULT true,
	`run_once` integer DEFAULT false,
	`last_triggered_at` text,
	`trigger_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `automation_rules_workspace_id_idx` ON `automation_rules` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `automation_rules_enabled_idx` ON `automation_rules` (`workspace_id`,`is_enabled`);--> statement-breakpoint
CREATE INDEX `automation_rules_priority_idx` ON `automation_rules` (`workspace_id`,`priority`);