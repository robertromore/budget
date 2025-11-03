# Database Layer Documentation

Complete guide to the database factories, seeders, migrations, and testing utilities.

## Table of Contents

- [Overview](#overview)
- [Factories](#factories)
- [Seeders](#seeders)
- [Migrations](#migrations)
- [Testing Utilities](#testing-utilities)
- [Best Practices](#best-practices)

---

## Overview

The database layer provides:
- **Factories**: Generate realistic test data programmatically
- **Seeders**: Load predefined data from JSON files
- **Migrations**: Version-controlled schema changes
- **Test Utils**: Isolated test database environments

### Quick Start

```bash
# Run migrations
bun run db:migrate

# Seed default data
bun run db:seed

# Generate factory data
bun run db:factory

# Clean database
bun run ./src/lib/server/db/delete-all.ts --confirm
```

---

## Factories

Factories generate realistic test data with proper workspace isolation and relationships.

### Available Factories

| Factory | Purpose | Example |
|---------|---------|---------|
| `workspaceFactory` | Create workspaces | `await workspaceFactory(1)` |
| `accountFactory` | Create accounts with transactions | `await accountFactory(3, workspaceId)` |
| `categoryFactory` | Create categories | `await categoryFactory(workspaceId, 5)` |
| `payeeFactory` | Create payees | `await payeeFactory(workspaceId, 5)` |
| `transactionFactory` | Create transactions | `await transactionFactory(account, workspaceId, 10)` |

### Usage Examples

#### Basic Factory Usage

```typescript
import {workspaceFactory, accountFactory} from "$lib/server/db/factories";

// Create a workspace
const [workspace] = await workspaceFactory(1);

// Create accounts for that workspace
const accounts = await accountFactory(3, workspace.id);

// Each account automatically gets 1-50 random transactions
```

#### Custom Transaction Count

```typescript
import {accountFactory, transactionFactory} from "$lib/server/db/factories";

const [account] = await accountFactory(1, workspaceId);

// Create specific number of transactions
await transactionFactory(account, workspaceId, 100);
```

### Factory Features

#### Workspace Isolation

All factories now require `workspaceId` to ensure proper multi-workspace isolation:

```typescript
// ✅ CORRECT
await categoryFactory(workspaceId, 5);

// ❌ INCORRECT (old API, will error)
await categoryFactory(5);
```

#### Smart Entity Reuse

`transactionFactory` implements 50/50 logic:
- 50% chance to create new payees/categories
- 50% chance to reuse existing ones
- Creates realistic transaction patterns

#### Sequence Generation

Factories use sequences to ensure unique values:

```typescript
import {sequence} from "./utils/sequence";

const slug = `${slugify(name)}-${sequence('account')}`;
// Results: "checking-account-1", "checking-account-2", etc.
```

#### Transaction Safety

Use the transaction wrapper for atomic operations:

```typescript
import {withTransaction} from "./utils/transaction";

const account = await withTransaction(async (tx) => {
  const [account] = await tx.insert(accounts).values({...}).returning();
  await tx.insert(transactions).values({accountId: account.id, ...});
  return account; // Returns account, or rolls back on error
});
```

### Running Factories

```bash
# Generate random test data
bun run ./src/lib/server/db/factories

# Output:
# 🏭 Starting factory data generation...
# 📦 Creating workspace...
# ✓ Workspace created: "Acme Corp" (ID: 1)
# 🏦 Creating accounts with transactions...
# ✓ Created 7 accounts with transactions
```

---

## Seeders

Seeders load predefined data from JSON files with proper dependency ordering.

### Seeder Files

Located in `src/lib/server/db/seeders/`:

- `workspaces.json` - Default workspace
- `budgets.json` - Budget records
- `budgetTemplates.json` - System budget templates
- `budgetPeriodTemplates.json` - Budget period configs
- `budgetPeriodInstances.json` - Budget period data

### Seeder Features

#### Dependency Ordering

Seeders automatically handle dependencies:

1. **Phase 1**: workspaces (no dependencies)
2. **Phase 2**: workspace-dependent tables
3. **Phase 3**: relationship/junction tables

#### Creating Seed Files

All seed data must include `workspaceId`:

```json
[
  {
    "workspaceId": 1,
    "name": "Monthly Budget",
    "type": "envelope",
    "scope": "account",
    "status": "active"
  }
]
```

### Running Seeders

```bash
# Seed all data
bun run ./src/lib/server/db/seeders

# Output:
# 🌱 Starting seeding process...
# Found 6 seed file(s)
# ✓ Seeded workspaces with 1 record(s).
# ✓ Seeded budgetTemplates with 12 record(s).
# ✅ Seeding complete!
#    Tables seeded: 6
#    Total records: 47
```

---

## Migrations

Database schema changes managed by Drizzle Kit.

### Migration Commands

```bash
# Generate migration from schema changes
bun run db:generate

# Apply migrations
bun run db:migrate

# Drop and recreate database
bun run db:drop && bun run db:generate && bun run db:migrate
```

### Environment Variables

`drizzle.config.ts` now uses environment variables:

```bash
# Set custom database path
export DATABASE_URL="./custom/path/db.sqlite"
bun run db:migrate

# Falls back to default: ./drizzle/db/sqlite.db
```

### Migration Best Practices

1. **Always review generated migrations** before applying
2. **Test migrations** on a copy of production data
3. **Add data migrations** separately if needed
4. **Document breaking changes** in migration files
5. **Never edit applied migrations** (create new ones)

---

## Testing Utilities

The `TestDatabase` class provides isolated test environments with snapshot/restore capabilities.

### Setup

```typescript
import {TestDatabase} from "$lib/server/db/test-utils";

describe("My Test Suite", () => {
  const testDb = new TestDatabase();
  let db: ReturnType<typeof testDb.setup>;

  beforeAll(async () => {
    db = await testDb.setup(); // Creates in-memory DB with migrations
  });

  afterAll(async () => {
    await testDb.teardown(); // Cleanup
  });

  beforeEach(async () => {
    await testDb.truncateAll(db); // Clean between tests
  });
});
```

### Snapshot/Restore

Save and restore database states:

```typescript
beforeAll(async () => {
  db = await testDb.setup();

  // Seed test data
  await workspaceFactory(db, 1);
  await accountFactory(db, 5, 1);

  // Save this state
  await testDb.snapshot('with-seed-data');
});

beforeEach(async () => {
  // Restore to seeded state (faster than re-seeding)
  await testDb.restore('with-seed-data');
});
```

### Utilities

```typescript
// Check row count
const count = await testDb.getRowCount(db, 'accounts');
expect(count).toBe(5);

// Verify all tables empty
const isEmpty = await testDb.verifyEmpty(db);
expect(isEmpty).toBe(true);

// Truncate everything
await testDb.truncateAll(db);
```

---

## Database Cleanup

The `delete-all.ts` script provides safe, comprehensive database cleanup.

### Usage

```bash
# Interactive mode (prompts for confirmation)
bun run ./src/lib/server/db/delete-all.ts

# Auto-confirm (for scripts)
bun run ./src/lib/server/db/delete-all.ts --confirm

# Delete specific tables only
bun run ./src/lib/server/db/delete-all.ts --tables=accounts,transactions

# Dry run (see what would be deleted)
bun run ./src/lib/server/db/delete-all.ts --dry-run
```

### Features

- ✅ Auto-discovers all tables (no hardcoded list)
- ✅ Handles foreign key constraints properly
- ✅ Resets autoincrement sequences
- ✅ Confirmation prompt (unless `--confirm`)
- ✅ Selective table deletion
- ✅ Dry-run mode

---

## Best Practices

### Factories

1. **Always use workspaceId**: All factories now require it
2. **Use transactions**: Wrap complex operations in `withTransaction()`
3. **Leverage sequences**: Use `sequence()` for unique values
4. **Smart reuse**: Let `transactionFactory` handle realistic patterns
5. **Document custom factories**: Add JSDoc comments

### Seeders

1. **Include workspaceId**: All records must have `workspaceId: 1`
2. **Respect dependencies**: List dependencies in `SEEDING_ORDER`
3. **Validate JSON**: Ensure proper formatting before running
4. **Keep files small**: Split large datasets into multiple files
5. **Use templates**: Prefer templates over hardcoded values

### Migrations

1. **Review before applying**: Check generated SQL
2. **Test on copies**: Never test on production first
3. **One change per migration**: Keep migrations focused
4. **Add comments**: Document why changes were made
5. **Never edit applied**: Create new migrations for fixes

### Testing

1. **Use in-memory DB**: Faster than file-based for tests
2. **Snapshot clean states**: Restore instead of re-seed
3. **Truncate between tests**: Ensures isolation
4. **Verify expectations**: Use `getRowCount()` in assertions
5. **Cleanup after**: Always call `teardown()`

---

## Workspace Isolation

### Critical Concept

All data MUST be associated with a workspace. The multi-workspace migration (0010) renamed `user_id` to `workspace_id` across all tables.

### Ensuring Isolation

```typescript
// ✅ CORRECT: Filters by workspace
const accounts = await db
  .select()
  .from(accounts)
  .where(eq(accounts.workspaceId, workspaceId));

// ❌ INCORRECT: Returns data from all workspaces
const accounts = await db.select().from(accounts);
```

### Workspace Filtering Pattern

When querying transactions, always filter by workspace:

```typescript
// Get workspace account IDs first
const workspaceAccounts = await db
  .select({id: accounts.id})
  .from(accounts)
  .where(eq(accounts.workspaceId, workspaceId));

const accountIds = workspaceAccounts.map(a => a.id);

// Filter transactions by those accounts
const transactions = await db
  .select()
  .from(transactions)
  .where(inArray(transactions.accountId, accountIds));
```

---

## Common Workflows

### Fresh Development Environment

```bash
# 1. Drop and recreate
bun run db:drop

# 2. Generate migrations
bun run db:generate

# 3. Apply migrations
bun run db:migrate

# 4. Seed default data
bun run db:seed

# 5. Generate test data
bun run db:factory
```

### Test Data Generation

```bash
# Clean existing data
bun run ./src/lib/server/db/delete-all.ts --confirm

# Generate factory data
bun run db:factory
```

### Seeding for Specific Scenario

```typescript
// Create custom seed script
import {workspaceFactory} from "./factories/workspaces";
import {accountFactory} from "./factories/accounts";

const [workspace] = await workspaceFactory(1);

// Create specific account types
await accountFactory(2, workspace.id); // Checking accounts
await accountFactory(1, workspace.id); // Savings account
```

---

## Troubleshooting

### Foreign Key Violations

**Symptom**: `FOREIGN KEY constraint failed`

**Solution**: Ensure workspace exists before creating dependent records

```typescript
// Create workspace first
const [workspace] = await workspaceFactory(1);

// Then create dependent records
await accountFactory(5, workspace.id);
```

### Unique Constraint Violations

**Symptom**: `UNIQUE constraint failed: account.slug`

**Solution**: Sequences already handle this, but if manually creating:

```typescript
import {sequence} from "./factories/utils/sequence";

const slug = `${slugify(name)}-${sequence('account')}`;
```

### Migration Conflicts

**Symptom**: `table already exists`

**Solution**: Drop and recreate database:

```bash
bun run db:drop
bun run db:generate
bun run db:migrate
```

### Seeder Fails

**Symptom**: `workspaceId` NOT NULL constraint

**Solution**: All seed JSON files must include `workspaceId`:

```json
{
  "workspaceId": 1,
  "name": "..."
}
```

---

## Contributing

### Adding New Factories

1. Create file in `factories/`
2. Use `workspaceId` parameter
3. Use `sequence()` for unique values
4. Add JSDoc comments
5. Export from `factories/index.ts`
6. Update this README

### Adding New Seeders

1. Create JSON file in `seeders/`
2. Include `workspaceId` in all records
3. Add to `SEEDING_ORDER` if has dependencies
4. Validate JSON format
5. Test seeding process
6. Update this README

---

## Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Bun SQLite](https://bun.sh/docs/api/sqlite)
- [Project Schema](../schema/README.md)
- [Migration Guide](../../docs/workspace-filtering-fixes.md)

---

## Summary

The database layer now provides:

✅ Complete workspace isolation
✅ Transaction-safe factory operations
✅ Smart entity reuse patterns
✅ Comprehensive cleanup utilities
✅ Isolated test environments
✅ Snapshot/restore for tests
✅ Dependency-ordered seeding
✅ Environment-aware configuration

**All factories** require `workspaceId` to ensure proper multi-workspace support.
