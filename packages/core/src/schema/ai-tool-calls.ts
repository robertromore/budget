/**
 * AI Tool Calls Schema
 *
 * Records every invocation of an AI chat tool so we can observe what
 * users actually ask for, how long calls take, and where the assistant
 * fails. The input/output JSON columns store *shape* (key names + value
 * types) rather than raw values to keep PII out of the telemetry table.
 */

import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { aiConversations } from "./ai-conversations";
import { workspaces } from "./workspaces";

/** Recorded shape of an input/output object — string-typed values per key. */
export type AIToolCallShape = Record<string, string>;

export const aiToolCalls = sqliteTable(
  "ai_tool_call",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    conversationId: integer("conversation_id").references(() => aiConversations.id, {
      onDelete: "set null",
    }),

    toolName: text("tool_name").notNull(),
    inputShape: text("input_shape", { mode: "json" }).$type<AIToolCallShape>(),
    outputShape: text("output_shape", { mode: "json" }).$type<AIToolCallShape>(),

    latencyMs: integer("latency_ms").notNull(),
    success: integer("success", { mode: "boolean" }).notNull(),
    errorCode: text("error_code"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("ai_tool_call_workspace_idx").on(table.workspaceId),
    index("ai_tool_call_conversation_idx").on(table.conversationId),
    index("ai_tool_call_tool_name_idx").on(table.toolName),
    index("ai_tool_call_created_at_idx").on(table.createdAt),
  ]
);

export const aiToolCallsRelations = relations(aiToolCalls, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [aiToolCalls.workspaceId],
    references: [workspaces.id],
  }),
  conversation: one(aiConversations, {
    fields: [aiToolCalls.conversationId],
    references: [aiConversations.id],
  }),
}));

export const selectAIToolCallSchema = createSelectSchema(aiToolCalls);
export const insertAIToolCallSchema = createInsertSchema(aiToolCalls);

export type AIToolCall = typeof aiToolCalls.$inferSelect;
export type NewAIToolCall = typeof aiToolCalls.$inferInsert;
