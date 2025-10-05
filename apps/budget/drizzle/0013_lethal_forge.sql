-- Step 1: Add slug column as nullable
ALTER TABLE `payee` ADD `slug` text;

-- Step 2: Generate slugs from existing payee names
UPDATE `payee`
SET `slug` = lower(
  replace(replace(replace(replace(replace(replace(replace(name, ' ', '-'), '&', 'and'), '/', '-'), '(', ''), ')', ''), ',', ''), '''', '')
) || '-' || `id`
WHERE `slug` IS NULL;

-- Step 3: Add constraints and indexes
CREATE UNIQUE INDEX `payee_slug_unique` ON `payee` (`slug`);--> statement-breakpoint
CREATE INDEX `payee_slug_idx` ON `payee` (`slug`);