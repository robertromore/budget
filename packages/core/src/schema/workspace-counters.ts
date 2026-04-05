import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

/**
 * Entity types that support per-workspace sequential IDs.
 * Each entity type has its own counter per workspace.
 */
export const sequencedEntityTypes = [
  "account",
  "transaction",
  "budget",
  "category",
  "schedule",
  "payee",
] as const;

export type SequencedEntityType = (typeof sequencedEntityTypes)[number];

/**
 * Workspace counters table stores the next sequence number for each entity type
 * within each workspace. This enables per-workspace sequential IDs that don't
 * leak information about global entity counts.
 *
 * Usage:
 * 1. When creating a new entity, atomically increment `nextSeq` and use the previous value
 * 2. The `nextSeq` value is always the next number to be assigned
 */
export const workspaceCounters = sqliteTable(
  "workspace_counter",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    entityType: text("entity_type", { enum: sequencedEntityTypes }).notNull(),
    nextSeq: integer("next_seq").default(1).notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("workspace_counter_unique_idx").on(table.workspaceId, table.entityType),
    index("workspace_counter_workspace_idx").on(table.workspaceId),
  ]
);

// Relations
export const workspaceCountersRelations = relations(workspaceCounters, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceCounters.workspaceId],
    references: [workspaces.id],
  }),
}));

export type WorkspaceCounter = typeof workspaceCounters.$inferSelect;
export type NewWorkspaceCounter = typeof workspaceCounters.$inferInsert;
