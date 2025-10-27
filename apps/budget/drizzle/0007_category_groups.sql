-- Category Groups Implementation
-- Phase 1.1: Database Tables

-- Table 1: category_groups
CREATE TABLE `category_groups` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL UNIQUE,
  `description` text,
  `group_icon` text,
  `group_color` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL
);

CREATE INDEX `idx_category_groups_slug` ON `category_groups` (`slug`);
CREATE INDEX `idx_category_groups_sort_order` ON `category_groups` (`sort_order`);

-- Table 2: category_group_memberships
-- CRITICAL: unique_category_single_group ensures each category belongs to only ONE group
CREATE TABLE `category_group_memberships` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `category_group_id` integer NOT NULL REFERENCES `category_groups`(`id`) ON DELETE CASCADE,
  `category_id` integer NOT NULL REFERENCES `categories`(`id`) ON DELETE CASCADE,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  CONSTRAINT `unique_pair` UNIQUE(`category_group_id`, `category_id`),
  CONSTRAINT `unique_category_single_group` UNIQUE(`category_id`)
);

CREATE INDEX `idx_cgm_group_id` ON `category_group_memberships` (`category_group_id`);

-- Table 3: category_group_recommendations
CREATE TABLE `category_group_recommendations` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `category_id` integer NOT NULL REFERENCES `categories`(`id`) ON DELETE CASCADE,
  `suggested_group_id` integer REFERENCES `category_groups`(`id`) ON DELETE SET NULL,
  `suggested_group_name` text,
  `confidence_score` real NOT NULL,
  `reasoning` text,
  `status` text NOT NULL DEFAULT 'pending',
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL,
  CONSTRAINT `chk_status` CHECK (`status` IN ('pending', 'approved', 'dismissed', 'rejected'))
);

CREATE INDEX `idx_cgr_category_id` ON `category_group_recommendations` (`category_id`);
CREATE INDEX `idx_cgr_status` ON `category_group_recommendations` (`status`);
CREATE INDEX `idx_cgr_confidence` ON `category_group_recommendations` (`confidence_score`);

-- Table 4: category_group_settings
-- Singleton table with single row
CREATE TABLE `category_group_settings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `recommendations_enabled` integer NOT NULL DEFAULT 1,
  `min_confidence_score` real DEFAULT 0.7 NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL
);

-- Seed settings with default values
INSERT INTO `category_group_settings` (`id`, `recommendations_enabled`, `min_confidence_score`) VALUES (1, 1, 0.7);
