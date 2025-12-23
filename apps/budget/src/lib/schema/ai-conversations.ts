/**
 * AI Conversations Schema
 *
 * Stores conversation history for the AI chat assistant.
 * Enables persistent chat history, conversation resumption, and message navigation.
 */

import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspaces } from "./workspaces";

// Context type for storing page/entity context
export interface AIConversationContext {
	page?: string;
	entityType?: "account" | "payee" | "transaction" | "category" | "budget";
	entityId?: number;
	data?: Record<string, unknown>;
}

// Conversations table
export const aiConversations = sqliteTable(
	"ai_conversation",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		workspaceId: integer("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),

		// Conversation metadata
		title: text("title"), // Auto-generated from first message or user-set
		summary: text("summary"), // Optional AI-generated summary

		// Context when conversation was started
		context: text("context", { mode: "json" }).$type<AIConversationContext>(),

		// Statistics
		messageCount: integer("message_count").notNull().default(0),

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
		index("ai_conversation_workspace_idx").on(table.workspaceId),
		index("ai_conversation_updated_at_idx").on(table.updatedAt),
		index("ai_conversation_deleted_at_idx").on(table.deletedAt),
	]
);

// Messages table
export const aiConversationMessages = sqliteTable(
	"ai_conversation_message",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		conversationId: integer("conversation_id")
			.notNull()
			.references(() => aiConversations.id, { onDelete: "cascade" }),

		// Message content
		role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
		content: text("content").notNull(),

		// AI-specific fields
		reasoning: text("reasoning"), // Chain of thought reasoning
		toolsUsed: text("tools_used", { mode: "json" }).$type<string[]>(), // Tools invoked

		// Timestamps
		createdAt: text("created_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		index("ai_message_conversation_idx").on(table.conversationId),
		index("ai_message_created_at_idx").on(table.createdAt),
	]
);

// Relations
export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
	workspace: one(workspaces, {
		fields: [aiConversations.workspaceId],
		references: [workspaces.id],
	}),
	messages: many(aiConversationMessages),
}));

export const aiConversationMessagesRelations = relations(aiConversationMessages, ({ one }) => ({
	conversation: one(aiConversations, {
		fields: [aiConversationMessages.conversationId],
		references: [aiConversations.id],
	}),
}));

// Zod schemas
export const selectAIConversationSchema = createSelectSchema(aiConversations);
export const insertAIConversationSchema = createInsertSchema(aiConversations, {
	title: (schema) =>
		schema
			.max(100, "Title must be less than 100 characters")
			.optional()
			.nullable(),
	summary: (schema) =>
		schema
			.max(500, "Summary must be less than 500 characters")
			.optional()
			.nullable(),
});

export const selectAIConversationMessageSchema = createSelectSchema(aiConversationMessages);
export const insertAIConversationMessageSchema = createInsertSchema(aiConversationMessages, {
	content: (schema) =>
		schema
			.min(1, "Message content is required")
			.max(50000, "Message content must be less than 50000 characters"),
	reasoning: (schema) =>
		schema
			.max(10000, "Reasoning must be less than 10000 characters")
			.optional()
			.nullable(),
});

// Types
export type AIConversation = typeof aiConversations.$inferSelect;
export type NewAIConversation = typeof aiConversations.$inferInsert;
export type AIConversationMessage = typeof aiConversationMessages.$inferSelect;
export type NewAIConversationMessage = typeof aiConversationMessages.$inferInsert;
