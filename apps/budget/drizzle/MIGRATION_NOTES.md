# Budget Schema Migration Notes

## Critical Migration Issue - Data Loss Prevention

### Problem
The initial migration `0004_comprehensive_budget_schema.sql` is **destructive** and will **permanently delete all budget data**. This migration:

- Drops all existing budget tables without preserving data
- Creates new schema from scratch
- Provides no data migration path
- Would cause catastrophic data loss in production

### Solution
The destructive migration has been **removed** from the migration chain and replaced with a safe migration `0004_safe_budget_schema_migration.sql` that:

- ✅ Creates new tables with temporary names first
- ✅ Migrates all existing data to new schema structure
- ✅ Preserves existing budgets, periods, allocations, and associations
- ✅ Creates backup tables for rollback capability
- ✅ Maps old fields to new schema appropriately
- ✅ Includes verification queries to ensure migration success

## Migration Strategy

### Data Mapping

| Old Schema | New Schema | Notes |
|------------|------------|-------|
| `budgets.enforcement` | `budgets.enforcement_level` | Direct field rename |
| `budgets.is_active` | `budgets.status` | `1` → `'active'`, `0` → `'inactive'` |
| `budget_periods` | `budget_period_instances` | Periods become instances |
| N/A | `budget_period_templates` | New: Default monthly templates created |
| N/A | `budgets.scope` | New: Default to `'account'` |
| `budget_allocations.assignment_type` | `budget_transactions.auto_assigned` | `'automatic'` → `true`, others → `false` |
| `budget_allocations.notes` | `budget_transactions.assigned_by` | Notes become assigned_by field |
| `budget_allocations.period_id` | N/A | Removed: No longer needed in new architecture |
| `budget_allocations.percentage` | N/A | Removed: Simplified to amount-only allocation |

### New Features Introduced

1. **Budget Groups**: Hierarchical budget organization (empty after migration)
2. **Template-Instance Pattern**: Flexible period definitions with actual instances
3. **Enhanced Audit Trail**: Better tracking of transaction assignments
4. **Multi-Scope Support**: Account, category, global, and mixed budget scopes
5. **Enforcement Levels**: More granular budget enforcement options

## Usage Instructions

### For Development (No Existing Data)
```bash
# Safe to use the destructive migration in development
bun drizzle-kit push
```

### For Production (With Existing Data)
```bash
# 1. Create backup first
cp drizzle/db/sqlite.db drizzle/db/sqlite.db.backup

# 2. Run the safe migration
sqlite3 drizzle/db/sqlite.db < drizzle/0004_safe_budget_schema_migration.sql

# 3. Verify migration success
sqlite3 drizzle/db/sqlite.db "SELECT budgets_count, templates_count, instances_count, transactions_count FROM (SELECT (SELECT COUNT(*) FROM budgets) as budgets_count, (SELECT COUNT(*) FROM budget_period_templates) as templates_count, (SELECT COUNT(*) FROM budget_period_instances) as instances_count, (SELECT COUNT(*) FROM budget_transactions) as transactions_count);"
```

### Rollback (If Needed)
```bash
# Restore from backup
cp drizzle/db/sqlite.db.backup drizzle/db/sqlite.db

# OR use rollback script
sqlite3 drizzle/db/sqlite.db < drizzle/rollback_0004_budget_schema.sql
```

## Files

- `0004_safe_budget_schema_migration.sql` - **SAFE** - Data-preserving migration
- `rollback_0004_budget_schema.sql` - Rollback script if needed
- `MIGRATION_NOTES.md` - This documentation

**Note**: The destructive migration has been completely removed from the migration chain.

## Verification

After migration, verify these key points:

1. **Data Preservation**: All existing budgets, periods, and allocations should be preserved
2. **New Structure**: New tables should exist with proper relationships
3. **Backup Tables**: Backup tables should exist for rollback capability
4. **Application Compatibility**: The application should work with the new schema

## Architecture Changes

The new schema implements a comprehensive budget system with:

- **Template-Instance Pattern**: `budget_period_templates` define recurring patterns, `budget_period_instances` track actual periods
- **Enhanced Tracking**: `budget_transactions` replace `budget_allocations` with better audit fields
- **Flexible Organization**: Support for budget groups and multiple budget types
- **Improved Relationships**: Better foreign key constraints and unique constraints

This migration enables the comprehensive budget system while preserving all existing user data.