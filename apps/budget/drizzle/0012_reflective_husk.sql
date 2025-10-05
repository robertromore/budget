-- Add slug column as nullable first
ALTER TABLE `categories` ADD `slug` text;--> statement-breakpoint

-- Generate slugs for existing categories
UPDATE `categories`
SET `slug` = lower(
  replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(name, ' ', '-'),
              '&', 'and'
            ),
            '/', '-'
          ),
          '(', ''
        ),
        ')', ''
      ),
      ',', ''
    ),
    '''', ''
  )
) || '-' || `id`
WHERE `slug` IS NULL;--> statement-breakpoint

-- Now make slug NOT NULL and add unique constraint
-- SQLite doesn't support ALTER COLUMN, so we need to handle this differently
-- The unique index will enforce uniqueness
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `category_slug_idx` ON `categories` (`slug`);
