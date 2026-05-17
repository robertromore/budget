/**
 * External Agent API Keys
 *
 * Bearer tokens that let external AI assistants (Claude Desktop,
 * Codex, custom agents) authenticate to this workspace's MCP server
 * surface. The plaintext key is shown ONCE at creation and never
 * stored — we keep a sha256 hash for lookup. Each key is scoped to:
 *
 *   - a single workspace,
 *   - a permission scope (read-only or read-write),
 *   - optionally an expiry,
 *   - and may be revoked at any time.
 *
 * The "user" who created the key is also tracked so the activity feed
 * can attribute calls to "Robert's Claude Desktop key" rather than
 * just the workspace.
 */

import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const externalApiKeyScopes = ["read_only", "read_write"] as const;
export type ExternalApiKeyScope = (typeof externalApiKeyScopes)[number];

export const externalApiKeys = sqliteTable(
  "external_api_key",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Display label for the key (e.g. "Claude Desktop"). */
    name: text("name").notNull(),
    /** sha256 of the plaintext token; how we look up incoming bearer tokens. */
    keyHash: text("key_hash").notNull(),
    /**
     * First few characters of the plaintext key (e.g. "bgt_abcd1234")
     * shown in the UI so users can identify which key is which without
     * exposing the full secret.
     */
    keyPrefix: text("key_prefix").notNull(),

    scope: text("scope", { enum: externalApiKeyScopes }).notNull(),

    /** Stamped whenever verifyApiKey succeeds. Null for never-used keys. */
    lastUsedAt: text("last_used_at"),
    /** Optional expiry; nulls mean the key lives until revoked. */
    expiresAt: text("expires_at"),
    /** Set when the user revokes the key; the row is kept for audit. */
    revokedAt: text("revoked_at"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("external_api_key_workspace_idx").on(table.workspaceId),
    index("external_api_key_hash_idx").on(table.keyHash),
    index("external_api_key_revoked_idx").on(table.revokedAt),
  ]
);

export const externalApiKeysRelations = relations(externalApiKeys, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [externalApiKeys.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [externalApiKeys.userId],
    references: [users.id],
  }),
}));

export const externalApiKeyScopeSchema = z.enum(externalApiKeyScopes);

export const selectExternalApiKeySchema = createSelectSchema(externalApiKeys);
export const insertExternalApiKeySchema = createInsertSchema(externalApiKeys);

export type ExternalApiKey = typeof externalApiKeys.$inferSelect;
export type NewExternalApiKey = typeof externalApiKeys.$inferInsert;
