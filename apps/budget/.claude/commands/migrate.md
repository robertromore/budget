# Database Migration

Manage Drizzle ORM schema changes and migrations.

## Usage

```
/migrate add-field transactions notes    # Add field to existing table
/migrate create-table tags               # Create new table
/migrate add-index accounts email        # Add index
/migrate add-relation                    # Add relation between tables
/migrate status                          # Check migration status
/migrate generate                        # Generate migration from schema
/migrate apply                           # Apply pending migrations
```

## Arguments

Parse from `$ARGUMENTS`:
- First arg: Action (`add-field`, `create-table`, `add-index`, `add-relation`, `status`, `generate`, `apply`)
- Additional args depend on action:
  - `add-field {table} {field}`: Table name and field name
  - `create-table {table}`: Table name
  - `add-index {table} {field}`: Table and field to index
  - `add-relation {from} {to}`: Source and target tables

## Process

### 1. Validate Action

| Action | Description |
|--------|-------------|
| `add-field` | Add a new column to existing table |
| `create-table` | Create a new table with standard fields |
| `add-index` | Add an index for query optimization |
| `add-relation` | Add foreign key relationship |
| `status` | Check current migration status |
| `generate` | Generate SQL migration from schema changes |
| `apply` | Apply pending migrations to database |

### 2. Execute Action

#### Create New Table

Create schema file at `src/lib/schema/{table}.ts`:

```typescript
// src/lib/schema/{table}s.ts
import { relations, sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

/**
 * {PascalCaseName} - {Description of what this table stores}
 */
export const {tableName}s = sqliteTable(
  "{table_name}",
  {
    // Primary key
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Workspace scoping (required for multi-tenant)
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Core fields
    name: text("name").notNull(),
    description: text("description"),

    // Numeric fields
    // amount: real("amount").notNull().default(0),
    // count: integer("count").notNull().default(0),

    // Status/type fields
    // status: text("status", { enum: ["active", "inactive", "archived"] })
    //   .notNull()
    //   .default("active"),

    // JSON fields
    // metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),

    // Timestamps (always include these)
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),

    // Soft delete (optional but recommended)
    deletedAt: text("deleted_at"),
  },
  (table) => [
    // Indexes for common queries
    index("{table_name}_workspace_idx").on(table.workspaceId),
    index("{table_name}_deleted_at_idx").on(table.deletedAt),
    // Add unique constraints as needed
    // uniqueIndex("{table_name}_name_workspace_idx").on(table.name, table.workspaceId),
  ]
);

/**
 * Relations for {PascalCaseName}
 */
export const {tableName}sRelations = relations({tableName}s, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [{tableName}s.workspaceId],
    references: [workspaces.id],
  }),
  // Add other relations as needed
  // items: many(items),
}));

// Type exports
export type {PascalCaseName} = typeof {tableName}s.$inferSelect;
export type New{PascalCaseName} = typeof {tableName}s.$inferInsert;
```

Update exports in `src/lib/schema/index.ts`:

```typescript
export * from "./{tableName}s";
```

#### Add Field to Existing Table

Edit the schema file to add the new field:

```typescript
// Add to the table definition
{fieldName}: {fieldType}("{field_name}"){modifiers},

// Common field patterns:
// Required text
name: text("name").notNull(),

// Optional text
description: text("description"),

// Required number
amount: real("amount").notNull().default(0),

// Integer with default
count: integer("count").notNull().default(0),

// Boolean (stored as integer)
isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),

// Date as text (ISO string)
dueDate: text("due_date"),

// Enum type
status: text("status", { enum: ["pending", "completed", "cancelled"] })
  .notNull()
  .default("pending"),

// JSON field
settings: text("settings", { mode: "json" }).$type<SettingsType>(),

// Foreign key
categoryId: integer("category_id")
  .references(() => categories.id, { onDelete: "set null" }),

// Required foreign key with cascade
accountId: integer("account_id")
  .notNull()
  .references(() => accounts.id, { onDelete: "cascade" }),
```

#### Add Index

Add to the table's index array:

```typescript
(table) => [
  // Existing indexes...

  // Single column index
  index("{table}_{field}_idx").on(table.{fieldName}),

  // Composite index
  index("{table}_{field1}_{field2}_idx").on(table.{field1}, table.{field2}),

  // Unique index
  uniqueIndex("{table}_{field}_unique_idx").on(table.{fieldName}),

  // Partial index (filtered)
  index("{table}_active_idx")
    .on(table.status)
    .where(sql`${table.deletedAt} IS NULL`),
]
```

#### Add Relation

Add to the relations definition:

```typescript
export const {tableName}sRelations = relations({tableName}s, ({ one, many }) => ({
  // Existing relations...

  // One-to-one relation
  profile: one(profiles, {
    fields: [{tableName}s.profileId],
    references: [profiles.id],
  }),

  // One-to-many relation (this table has many)
  transactions: many(transactions),

  // Many-to-one relation (this table belongs to)
  category: one(categories, {
    fields: [{tableName}s.categoryId],
    references: [categories.id],
  }),

  // Self-referential relation
  parent: one({tableName}s, {
    fields: [{tableName}s.parentId],
    references: [{tableName}s.id],
    relationName: "parentChild",
  }),
  children: many({tableName}s, {
    relationName: "parentChild",
  }),
}));
```

#### Check Status

Run migration status check:

```bash
cd apps/budget && bun run db:status
```

#### Generate Migration

After modifying schema files:

```bash
cd apps/budget && bun run db:generate
```

This creates a new migration file in `drizzle/` directory.

#### Apply Migration

Apply pending migrations:

```bash
cd apps/budget && bun run db:migrate
```

### 3. Post-Migration Steps

After creating a new table or significant schema change:

1. **Update tRPC routes** if needed:
   ```typescript
   // src/lib/trpc/routes/{domain}.ts
   ```

2. **Update services** for business logic:
   ```typescript
   // src/lib/server/domains/{domain}/services.ts
   ```

3. **Update query layer**:
   ```typescript
   // src/lib/query/{domain}.ts
   ```

4. **Verify migration**:
   ```bash
   bun run db:status
   ```

## Field Type Reference

| TypeScript | Drizzle | SQLite | Notes |
|------------|---------|--------|-------|
| `string` | `text("name")` | TEXT | Default for strings |
| `number` (int) | `integer("count")` | INTEGER | Whole numbers |
| `number` (decimal) | `real("amount")` | REAL | Decimals, currency |
| `boolean` | `integer("active", { mode: "boolean" })` | INTEGER | 0/1 storage |
| `Date` | `text("date")` | TEXT | ISO 8601 string |
| `Date` (timestamp) | `integer("timestamp", { mode: "timestamp" })` | INTEGER | Unix timestamp |
| `object` | `text("data", { mode: "json" })` | TEXT | JSON string |
| `enum` | `text("type", { enum: [...] })` | TEXT | Validated string |

## Common Patterns

### Soft Deletes

Always include for data recovery:

```typescript
deletedAt: text("deleted_at"),
```

Query pattern:
```typescript
.where(isNull(table.deletedAt))
```

### Workspace Scoping

Required for multi-tenant data:

```typescript
workspaceId: integer("workspace_id")
  .notNull()
  .references(() => workspaces.id, { onDelete: "cascade" }),
```

### Timestamps

Always include:

```typescript
createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
```

### Cascade Deletes

For required relationships:

```typescript
.references(() => parent.id, { onDelete: "cascade" })
```

For optional relationships:

```typescript
.references(() => parent.id, { onDelete: "set null" })
```

### Unique Constraints

For business rules:

```typescript
uniqueIndex("{table}_name_workspace_idx").on(table.name, table.workspaceId),
```

## Example Outputs

### Create Table

```
## Generated Schema: tags

Created `src/lib/schema/tags.ts`:

\`\`\`typescript
export const tags = sqliteTable(
  "tag",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#6366f1"),
    createdAt: text("created_at").notNull().default(sql\`CURRENT_TIMESTAMP\`),
    updatedAt: text("updated_at").notNull().default(sql\`CURRENT_TIMESTAMP\`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("tag_workspace_idx").on(table.workspaceId),
    uniqueIndex("tag_name_workspace_idx").on(table.name, table.workspaceId),
  ]
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
\`\`\`

Updated `src/lib/schema/index.ts` to export tags.

### Next Steps

1. Run \`bun run db:generate\` to create migration
2. Run \`bun run db:migrate\` to apply migration
3. Create tRPC routes in \`src/lib/trpc/routes/tags.ts\`
4. Create query layer in \`src/lib/query/tags.ts\`
```

### Add Field

```
## Added Field: transactions.notes

Modified `src/lib/schema/transactions.ts`:

\`\`\`typescript
// Added field
notes: text("notes"),
\`\`\`

### Next Steps

1. Run \`bun run db:generate\` to create migration
2. Run \`bun run db:migrate\` to apply migration
3. Update forms/UI to include the new field
```

## Reference Files

| Pattern | Reference |
|---------|-----------|
| Schema definition | `src/lib/schema/accounts.ts` |
| Relations | `src/lib/schema/transactions.ts` |
| Indexes | `src/lib/schema/categories.ts` |
| JSON fields | `src/lib/schema/users.ts` |
| Drizzle config | `apps/budget/drizzle.config.ts` |

## Commands Reference

```bash
# Generate migration from schema changes
bun run db:generate

# Apply pending migrations
bun run db:migrate

# Push schema directly (dev only, no migration file)
bun run db:push

# View database in Drizzle Studio
bun run db:studio

# Check migration status
bun run db:status
```

$ARGUMENTS
