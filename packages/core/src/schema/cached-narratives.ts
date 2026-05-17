/**
 * Cached Narratives Schema
 *
 * Per-workspace, per-day cache for LLM-generated dashboard narratives.
 * The cache key combines `workspaceId + dateKey + model + inputHash`:
 * if the model changes (provider switch) or the underlying numbers
 * shift materially (inputHash mismatch), the next request regenerates
 * instead of serving stale prose attributed to the wrong source.
 */

import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { workspaces } from "./workspaces";

export const cachedNarratives = sqliteTable(
  "cached_narrative",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    /** Cache namespace, e.g. "monthly-brief". */
    kind: text("kind").notNull(),
    /** ISO date the narrative is keyed to (YYYY-MM-DD, server local). */
    dateKey: text("date_key").notNull(),
    /** Provider + model identifier the narrative was generated against. */
    model: text("model").notNull(),
    /** Stable hash of the input numbers; mismatch invalidates the cache. */
    inputHash: text("input_hash").notNull(),

    content: text("content").notNull(),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("cached_narrative_unique_key").on(
      table.workspaceId,
      table.kind,
      table.dateKey,
      table.model
    ),
    index("cached_narrative_workspace_idx").on(table.workspaceId),
  ]
);

export const cachedNarrativesRelations = relations(cachedNarratives, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [cachedNarratives.workspaceId],
    references: [workspaces.id],
  }),
}));

export const selectCachedNarrativeSchema = createSelectSchema(cachedNarratives);
export const insertCachedNarrativeSchema = createInsertSchema(cachedNarratives);

export type CachedNarrative = typeof cachedNarratives.$inferSelect;
export type NewCachedNarrative = typeof cachedNarratives.$inferInsert;
