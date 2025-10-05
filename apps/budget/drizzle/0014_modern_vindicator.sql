-- Step 1: Add slug column as nullable
ALTER TABLE `budget` ADD `slug` text;

-- Step 2: Generate slugs from existing budget names
UPDATE `budget`
SET `slug` = lower(
  replace(replace(replace(replace(replace(replace(replace(name, ' ', '-'), '&', 'and'), '/', '-'), '(', ''), ')', ''), ',', ''), '''', '')
) || '-' || `id`
WHERE `slug` IS NULL;

-- Step 3: Add constraints and indexes
CREATE UNIQUE INDEX `budget_slug_unique` ON `budget` (`slug`);--> statement-breakpoint
CREATE INDEX `budget_name_idx` ON `budget` (`name`);--> statement-breakpoint
CREATE INDEX `budget_slug_idx` ON `budget` (`slug`);--> statement-breakpoint
CREATE INDEX `budget_deleted_at_idx` ON `budget` (`deleted_at`);