/**
 * AI LLM Calls Schema
 *
 * Per-invocation log of every call to an LLM provider. Distinct from
 * ai_tool_call (which records the *tools* that the chat invokes —
 * those tools call domain services, not the LLM). This table answers
 * questions like:
 *   - How many tokens did we spend on chat vs PDF extraction this
 *     week?
 *   - Which model is the slowest?
 *   - Are statementExtraction calls timing out?
 */

import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { workspaces } from "./workspaces";

/**
 * Logical feature that fired the LLM call. Free-text rather than an
 * enum so new call sites can adopt the table without a migration.
 * Conventional values: "chat", "pdf_extraction", "pdf_describe",
 * "narrative", "test_connection", "document_explain",
 * "category_refinement".
 */
export const aiLlmCalls = sqliteTable(
  "ai_llm_call",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    feature: text("feature").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),

    /** Tokens in the prompt (system + user + context). Null when the provider doesn't report. */
    inputTokens: integer("input_tokens"),
    /** Tokens in the model's response. Null when not reported. */
    outputTokens: integer("output_tokens"),
    /** Tokens in any reasoning trace (Anthropic claude-* reasoning, OpenAI o-series). */
    reasoningTokens: integer("reasoning_tokens"),

    latencyMs: integer("latency_ms").notNull(),
    success: integer("success", { mode: "boolean" }).notNull(),
    errorCode: text("error_code"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("ai_llm_call_workspace_idx").on(table.workspaceId),
    index("ai_llm_call_feature_idx").on(table.feature),
    index("ai_llm_call_created_at_idx").on(table.createdAt),
  ]
);

export const aiLlmCallsRelations = relations(aiLlmCalls, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [aiLlmCalls.workspaceId],
    references: [workspaces.id],
  }),
}));

export const selectAILlmCallSchema = createSelectSchema(aiLlmCalls);
export const insertAILlmCallSchema = createInsertSchema(aiLlmCalls);

export type AILlmCall = typeof aiLlmCalls.$inferSelect;
export type NewAILlmCall = typeof aiLlmCalls.$inferInsert;
