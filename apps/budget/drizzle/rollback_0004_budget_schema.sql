-- ROLLBACK script for safe budget schema migration (0004)
-- This script restores the original schema and data if needed
-- WARNING: This will lose any new data created after the migration

PRAGMA foreign_keys=OFF;

-- Step 1: Drop new schema tables
DROP TABLE IF EXISTS `budget_transactions`;
DROP TABLE IF EXISTS `budget_categories`;
DROP TABLE IF EXISTS `budget_accounts`;
DROP TABLE IF EXISTS `budget_period_instances`;
DROP TABLE IF EXISTS `budget_period_templates`;
DROP TABLE IF EXISTS `budget_group_memberships`;
DROP TABLE IF EXISTS `budget_groups`;
DROP TABLE IF EXISTS `budgets`;

-- Step 2: Restore backup tables to original names
ALTER TABLE budgets_backup_pre_schema_v2 RENAME TO budgets;
ALTER TABLE budget_periods_backup_pre_schema_v2 RENAME TO budget_periods;
ALTER TABLE budget_allocations_backup_pre_schema_v2 RENAME TO budget_allocations;
ALTER TABLE budget_accounts_backup_pre_schema_v2 RENAME TO budget_accounts;
ALTER TABLE budget_categories_backup_pre_schema_v2 RENAME TO budget_categories;

PRAGMA foreign_keys=ON;

-- Step 3: Verify rollback success
SELECT
	(SELECT COUNT(*) FROM budgets) as budgets_count,
	(SELECT COUNT(*) FROM budget_periods) as periods_count,
	(SELECT COUNT(*) FROM budget_allocations) as allocations_count;