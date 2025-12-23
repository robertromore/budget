# New Domain

Scaffold a complete domain with all layers: schema, repository, service, tRPC routes, and query layer.

## Usage

```
/new-domain tags                    # Create 'tags' domain interactively
/new-domain tags --fields "name:string, color:string, description:text?"
```

## Arguments

Parse from `$ARGUMENTS`:
- First arg: Domain name (singular, lowercase, e.g., `tag`, `label`, `note`)
- `--fields`: Optional field definitions (comma-separated)

## Process Overview

Creating a new domain generates these files:

```
apps/budget/src/lib/
├── schema/
│   └── {domain}s.ts                 # Drizzle schema + Zod validation
├── server/domains/{domain}s/
│   ├── index.ts                     # Exports
│   ├── repository.ts                # Database queries
│   ├── services.ts                  # Business logic
│   └── validation.ts                # Input validation schemas
├── trpc/routes/
│   └── {domain}s.ts                 # tRPC procedures
└── query/
    └── {domain}s.ts                 # Query layer (defineQuery/defineMutation)
```

Plus updates to:
- `src/lib/schema/index.ts` - Export new schema
- `src/lib/trpc/router.ts` - Register new routes

---

## Step 1: Gather Domain Information

If `--fields` not provided, ask interactively:

```
Creating domain: tags

Define your fields (one per line, format: name:type:modifiers)
Types: string, text, integer, real, boolean, date, datetime, json
Modifiers: ? (optional), ! (unique), pk (primary key)

Examples:
  name:string          # Required string
  description:text?    # Optional text
  email:string!        # Unique string
  metadata:json?       # Optional JSON

Enter fields (empty line to finish):
> name:string
> color:string
> description:text?
> sortOrder:integer
>

Workspace scoped? (y/n): y
Soft deletes? (y/n): y
```

---

## Step 2: Generate Schema

Create `src/lib/schema/{domain}s.ts`:

```typescript
import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspaces } from "./workspaces";

export const {domain}s = sqliteTable(
  "{domain}",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid").$defaultFn(() => createId()),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Generated fields from user input
    name: text("name").notNull(),
    color: text("color"),
    description: text("description"),
    sortOrder: integer("sort_order").default(0),

    // Timestamps
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"), // Soft delete
  },
  (table) => [
    index("{domain}_workspace_idx").on(table.workspaceId),
    index("{domain}_deleted_at_idx").on(table.deletedAt),
  ]
);

// Relations
export const {domain}sRelations = relations({domain}s, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [{domain}s.workspaceId],
    references: [workspaces.id],
  }),
}));

// Zod schemas
export const select{Domain}Schema = createSelectSchema({domain}s);
export const insert{Domain}Schema = createInsertSchema({domain}s, {
  name: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(
        z.string()
          .min(1, "Name is required")
          .max(100, "Name must be less than 100 characters")
      ),
});

export const formInsert{Domain}Schema = insert{Domain}Schema.omit({
  id: true,
  cuid: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

// Types
export type {Domain} = typeof {domain}s.$inferSelect;
export type New{Domain} = typeof {domain}s.$inferInsert;
export type FormInsert{Domain}Schema = z.infer<typeof formInsert{Domain}Schema>;
```

---

## Step 3: Generate Repository

Create `src/lib/server/domains/{domain}s/repository.ts`:

```typescript
import { and, eq, isNull, desc, asc, like, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "$lib/schema";
import { {domain}s, type {Domain} } from "$lib/schema/{domain}s";

export interface {Domain}WithStats extends {Domain} {
  // Add computed fields here
}

export interface Update{Domain}Data {
  name?: string;
  color?: string;
  description?: string | null;
  sortOrder?: number;
}

export class {Domain}Repository {
  constructor(private db: LibSQLDatabase<typeof schema>) {}

  async findAll(workspaceId: number, includeDeleted = false): Promise<{Domain}[]> {
    const conditions = [eq({domain}s.workspaceId, workspaceId)];
    if (!includeDeleted) {
      conditions.push(isNull({domain}s.deletedAt));
    }

    return this.db.query.{domain}s.findMany({
      where: and(...conditions),
      orderBy: [asc({domain}s.sortOrder), asc({domain}s.name)],
    });
  }

  async findById(id: number, workspaceId: number): Promise<{Domain} | null> {
    const result = await this.db.query.{domain}s.findFirst({
      where: and(
        eq({domain}s.id, id),
        eq({domain}s.workspaceId, workspaceId),
        isNull({domain}s.deletedAt)
      ),
    });
    return result ?? null;
  }

  async create(data: Omit<{Domain}, "id" | "cuid" | "createdAt" | "updatedAt" | "deletedAt">): Promise<{Domain}> {
    const [created] = await this.db
      .insert({domain}s)
      .values(data)
      .returning();
    return created;
  }

  async update(id: number, workspaceId: number, data: Update{Domain}Data): Promise<{Domain} | null> {
    const [updated] = await this.db
      .update({domain}s)
      .set({
        ...data,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq({domain}s.id, id),
          eq({domain}s.workspaceId, workspaceId),
          isNull({domain}s.deletedAt)
        )
      )
      .returning();
    return updated ?? null;
  }

  async softDelete(id: number, workspaceId: number): Promise<boolean> {
    const result = await this.db
      .update({domain}s)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq({domain}s.id, id),
          eq({domain}s.workspaceId, workspaceId),
          isNull({domain}s.deletedAt)
        )
      );
    return (result.rowsAffected ?? 0) > 0;
  }

  async hardDelete(id: number, workspaceId: number): Promise<boolean> {
    const result = await this.db
      .delete({domain}s)
      .where(
        and(
          eq({domain}s.id, id),
          eq({domain}s.workspaceId, workspaceId)
        )
      );
    return (result.rowsAffected ?? 0) > 0;
  }
}
```

---

## Step 4: Generate Service

Create `src/lib/server/domains/{domain}s/services.ts`:

```typescript
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "$lib/schema";
import { {Domain}Repository, type Update{Domain}Data } from "./repository";
import type { {Domain} } from "$lib/schema/{domain}s";

export interface Create{Domain}Data {
  name: string;
  color?: string;
  description?: string;
  sortOrder?: number;
}

export class {Domain}Service {
  private repository: {Domain}Repository;

  constructor(private db: LibSQLDatabase<typeof schema>) {
    this.repository = new {Domain}Repository(db);
  }

  async getAll(workspaceId: number): Promise<{Domain}[]> {
    return this.repository.findAll(workspaceId);
  }

  async getById(id: number, workspaceId: number): Promise<{Domain} | null> {
    return this.repository.findById(id, workspaceId);
  }

  async create(data: Create{Domain}Data, workspaceId: number): Promise<{Domain}> {
    return this.repository.create({
      ...data,
      workspaceId,
    });
  }

  async update(id: number, data: Update{Domain}Data, workspaceId: number): Promise<{Domain} | null> {
    const existing = await this.repository.findById(id, workspaceId);
    if (!existing) {
      throw new Error("{Domain} not found");
    }
    return this.repository.update(id, workspaceId, data);
  }

  async delete(id: number, workspaceId: number): Promise<boolean> {
    const existing = await this.repository.findById(id, workspaceId);
    if (!existing) {
      throw new Error("{Domain} not found");
    }
    return this.repository.softDelete(id, workspaceId);
  }
}
```

---

## Step 5: Generate Validation

Create `src/lib/server/domains/{domain}s/validation.ts`:

```typescript
import { z } from "zod/v4";

export const {domain}IdSchema = z.object({
  id: z.number().int().positive(),
});

export const create{Domain}Schema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
});

export const update{Domain}Schema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const search{Domain}sSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

export type {Domain}IdInput = z.infer<typeof {domain}IdSchema>;
export type Create{Domain}Input = z.infer<typeof create{Domain}Schema>;
export type Update{Domain}Input = z.infer<typeof update{Domain}Schema>;
export type Search{Domain}sInput = z.infer<typeof search{Domain}sSchema>;
```

---

## Step 6: Generate Index

Create `src/lib/server/domains/{domain}s/index.ts`:

```typescript
export { {Domain}Repository } from "./repository";
export { {Domain}Service } from "./services";

export type { Update{Domain}Data } from "./repository";
export type { Create{Domain}Data } from "./services";

export {
  {domain}IdSchema,
  create{Domain}Schema,
  update{Domain}Schema,
  search{Domain}sSchema,
} from "./validation";

export type {
  {Domain}IdInput,
  Create{Domain}Input,
  Update{Domain}Input,
  Search{Domain}sInput,
} from "./validation";
```

---

## Step 7: Generate tRPC Routes

Create `src/lib/trpc/routes/{domain}s.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "$lib/trpc/t";
import { {Domain}Service } from "$lib/server/domains/{domain}s";
import {
  {domain}IdSchema,
  create{Domain}Schema,
  update{Domain}Schema,
} from "$lib/server/domains/{domain}s";

export const {domain}Routes = router({
  all: publicProcedure.query(async ({ ctx }) => {
    const service = new {Domain}Service(ctx.db);
    return service.getAll(ctx.workspaceId);
  }),

  load: publicProcedure
    .input({domain}IdSchema)
    .query(async ({ ctx, input }) => {
      const service = new {Domain}Service(ctx.db);
      const result = await service.getById(input.id, ctx.workspaceId);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "{Domain} not found",
        });
      }
      return result;
    }),

  create: publicProcedure
    .input(create{Domain}Schema)
    .mutation(async ({ ctx, input }) => {
      const service = new {Domain}Service(ctx.db);
      return service.create(input, ctx.workspaceId);
    }),

  update: publicProcedure
    .input(update{Domain}Schema)
    .mutation(async ({ ctx, input }) => {
      const service = new {Domain}Service(ctx.db);
      const { id, ...data } = input;
      const result = await service.update(id, data, ctx.workspaceId);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "{Domain} not found",
        });
      }
      return result;
    }),

  remove: publicProcedure
    .input({domain}IdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new {Domain}Service(ctx.db);
      const deleted = await service.delete(input.id, ctx.workspaceId);
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "{Domain} not found",
        });
      }
      return { success: true };
    }),
});
```

---

## Step 8: Generate Query Layer

Create `src/lib/query/{domain}s.ts`:

```typescript
import type { {Domain} } from "$lib/schema/{domain}s";
import { trpc } from "$lib/trpc/client";
import { cachePatterns, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const {domain}Keys = createQueryKeys("{domain}s", {
  lists: () => ["{domain}s", "list"] as const,
  list: () => ["{domain}s", "list"] as const,
  details: () => ["{domain}s", "detail"] as const,
  detail: (id: number) => ["{domain}s", "detail", id] as const,
});

export const list{Domain}s = () =>
  defineQuery<{Domain}[]>({
    queryKey: {domain}Keys.list(),
    queryFn: () => trpc().{domain}Routes.all.query() as Promise<{Domain}[]>,
    options: {
      ...queryPresets.static,
    },
  });

export const get{Domain}Detail = (id: number) =>
  defineQuery<{Domain}>({
    queryKey: {domain}Keys.detail(id),
    queryFn: () => trpc().{domain}Routes.load.query({ id }) as Promise<{Domain}>,
    options: {
      staleTime: 60 * 1000,
    },
  });

export const create{Domain} = defineMutation<
  Parameters<ReturnType<typeof trpc>["{domain}Routes"]["create"]["mutate"]>[0],
  {Domain}
>({
  mutationFn: (input) => trpc().{domain}Routes.create.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix({domain}Keys.all());
  },
  successMessage: "{Domain} created successfully",
  errorMessage: "Failed to create {domain}",
});

export const update{Domain} = defineMutation<
  Parameters<ReturnType<typeof trpc>["{domain}Routes"]["update"]["mutate"]>[0],
  {Domain}
>({
  mutationFn: (input) => trpc().{domain}Routes.update.mutate(input),
  onSuccess: (updated) => {
    cachePatterns.invalidatePrefix({domain}Keys.all());
    if (updated?.id) {
      cachePatterns.invalidatePrefix({domain}Keys.detail(updated.id));
    }
  },
  successMessage: "{Domain} updated successfully",
  errorMessage: "Failed to update {domain}",
});

export const delete{Domain} = defineMutation<{ id: number }, { success: boolean }>({
  mutationFn: (input) => trpc().{domain}Routes.remove.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix({domain}Keys.all());
  },
  successMessage: "{Domain} deleted successfully",
  errorMessage: "Failed to delete {domain}",
});

// Convenience namespace export
export const {Domain}s = {
  keys: {domain}Keys,
  list: list{Domain}s,
  detail: get{Domain}Detail,
  create: create{Domain},
  update: update{Domain},
  delete: delete{Domain},
};
```

---

## Step 9: Update Exports

### Update `src/lib/schema/index.ts`:

```typescript
// Add export
export * from "./{domain}s";
```

### Update `src/lib/trpc/router.ts`:

```typescript
import { {domain}Routes } from "./routes/{domain}s";

export const appRouter = router({
  // ... existing routes
  {domain}Routes,
});
```

---

## Step 10: Generate Migration

Run the migration generator:

```bash
cd apps/budget && bun run db:generate
```

This creates a migration file in `drizzle/` with the new table.

---

## Final Output

```
## Domain Created: tags

### Files Created
- `src/lib/schema/tags.ts` - Drizzle schema + Zod validation
- `src/lib/server/domains/tags/repository.ts` - Database queries
- `src/lib/server/domains/tags/services.ts` - Business logic
- `src/lib/server/domains/tags/validation.ts` - Input schemas
- `src/lib/server/domains/tags/index.ts` - Exports
- `src/lib/trpc/routes/tags.ts` - tRPC procedures
- `src/lib/query/tags.ts` - Query layer

### Files Updated
- `src/lib/schema/index.ts` - Added export
- `src/lib/trpc/router.ts` - Registered routes

### Next Steps
1. Run `bun run db:generate` to create migration
2. Run `bun run db:migrate` to apply migration
3. Create UI components in `src/routes/tags/`
4. Add help documentation with `/help-docs tags`
```

$ARGUMENTS
