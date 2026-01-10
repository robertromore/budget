import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";
import { workspaces } from "./workspaces";

/**
 * Connection provider types
 */
export const connectionProviders = ["simplefin", "teller"] as const;
export type ConnectionProvider = (typeof connectionProviders)[number];

/**
 * Connection sync status
 */
export const connectionSyncStatuses = ["active", "error", "disconnected"] as const;
export type ConnectionSyncStatus = (typeof connectionSyncStatuses)[number];

/**
 * Sync history status
 */
export const syncHistoryStatuses = ["running", "success", "error"] as const;
export type SyncHistoryStatus = (typeof syncHistoryStatuses)[number];

/**
 * Account Connections Table
 *
 * Stores connections between local accounts and external financial accounts
 * from providers like SimpleFIN or Teller. Each connection stores encrypted
 * credentials for fetching transaction data.
 */
export const accountConnections = sqliteTable(
  "account_connections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Provider info
    provider: text("provider", { enum: connectionProviders }).notNull(),
    externalAccountId: text("external_account_id").notNull(), // Provider's account identifier
    institutionName: text("institution_name").notNull(), // Bank/institution name from provider

    // Encrypted credentials (provider-specific JSON)
    // SimpleFIN: { accessUrl: string }
    // Teller: { accessToken: string, enrollmentId: string }
    encryptedCredentials: text("encrypted_credentials").notNull(),

    // Sync status
    lastSyncAt: text("last_sync_at"), // ISO timestamp of last successful sync
    syncStatus: text("sync_status", { enum: connectionSyncStatuses })
      .notNull()
      .default("active"),
    syncError: text("sync_error"), // Last error message if sync failed

    // Timestamps
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    // Lookup indexes
    index("account_connections_account_idx").on(table.accountId),
    index("account_connections_workspace_idx").on(table.workspaceId),
    index("account_connections_provider_idx").on(table.provider),
    index("account_connections_sync_status_idx").on(table.syncStatus),
    index("account_connections_deleted_at_idx").on(table.deletedAt),

    // One connection per account
    uniqueIndex("account_connections_account_unique_idx").on(table.accountId),
  ]
);

/**
 * Sync History Table
 *
 * Tracks the history of sync operations for each connection.
 * Used for debugging, user visibility, and analytics.
 */
export const syncHistory = sqliteTable(
  "sync_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    connectionId: integer("connection_id")
      .notNull()
      .references(() => accountConnections.id, { onDelete: "cascade" }),

    // Timing
    startedAt: text("started_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    completedAt: text("completed_at"),

    // Results
    status: text("status", { enum: syncHistoryStatuses }).notNull().default("running"),
    transactionsFetched: integer("transactions_fetched").default(0),
    transactionsImported: integer("transactions_imported").default(0),
    duplicatesSkipped: integer("duplicates_skipped").default(0),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("sync_history_connection_idx").on(table.connectionId),
    index("sync_history_started_at_idx").on(table.startedAt),
    index("sync_history_status_idx").on(table.status),
  ]
);

// Relations
export const accountConnectionsRelations = relations(accountConnections, ({ one, many }) => ({
  account: one(accounts, {
    fields: [accountConnections.accountId],
    references: [accounts.id],
  }),
  workspace: one(workspaces, {
    fields: [accountConnections.workspaceId],
    references: [workspaces.id],
  }),
  syncHistory: many(syncHistory),
}));

export const syncHistoryRelations = relations(syncHistory, ({ one }) => ({
  connection: one(accountConnections, {
    fields: [syncHistory.connectionId],
    references: [accountConnections.id],
  }),
}));

// Zod schemas
export const selectAccountConnectionSchema = createSelectSchema(accountConnections);
export const insertAccountConnectionSchema = createInsertSchema(accountConnections);

export const selectSyncHistorySchema = createSelectSchema(syncHistory);
export const insertSyncHistorySchema = createInsertSchema(syncHistory);

// Form schemas
export const formInsertAccountConnectionSchema = createInsertSchema(accountConnections, {
  accountId: (schema) => schema.positive("Invalid account ID"),
  workspaceId: (schema) => schema.optional(),
  provider: (schema) => schema,
  externalAccountId: (schema) => schema.min(1, "External account ID is required"),
  institutionName: (schema) => schema.min(1, "Institution name is required").max(200),
  encryptedCredentials: (schema) => schema.min(1, "Credentials are required"),
  syncStatus: (schema) => schema.default("active"),
});

// API schemas
export const createSimplefinConnectionSchema = z.object({
  accountId: z.number().positive(),
  accessUrl: z.string().min(1, "Access URL is required"),
  externalAccountId: z.string().min(1),
  institutionName: z.string().min(1),
});

export const createTellerConnectionSchema = z.object({
  accountId: z.number().positive(),
  accessToken: z.string().min(1, "Access token is required"),
  enrollmentId: z.string().min(1, "Enrollment ID is required"),
  externalAccountId: z.string().min(1),
  institutionName: z.string().min(1),
});

export const syncConnectionSchema = z.object({
  connectionId: z.number().positive(),
});

export const disconnectConnectionSchema = z.object({
  connectionId: z.number().positive(),
});

// Type exports
export type AccountConnection = typeof accountConnections.$inferSelect;
export type NewAccountConnection = typeof accountConnections.$inferInsert;
export type SyncHistoryRecord = typeof syncHistory.$inferSelect;
export type NewSyncHistoryRecord = typeof syncHistory.$inferInsert;

export type CreateSimplefinConnectionInput = z.infer<typeof createSimplefinConnectionSchema>;
export type CreateTellerConnectionInput = z.infer<typeof createTellerConnectionSchema>;

// Extended types with relations
export interface AccountConnectionWithAccount extends AccountConnection {
  account: {
    id: number;
    name: string;
    slug: string;
    accountIcon: string | null;
    accountColor: string | null;
  };
}

export interface AccountConnectionWithHistory extends AccountConnection {
  syncHistory: SyncHistoryRecord[];
}

export interface SyncHistoryWithConnection extends SyncHistoryRecord {
  connection: AccountConnection;
}

// Provider-specific credential types (stored encrypted as JSON)
export interface SimplefinCredentials {
  accessUrl: string;
}

export interface TellerCredentials {
  accessToken: string;
  enrollmentId: string;
}

export type ProviderCredentials = SimplefinCredentials | TellerCredentials;

// External account representation (from providers)
export interface ExternalAccount {
  id: string;
  name: string;
  institution: string;
  type: string; // checking, savings, credit, etc.
  balance?: number;
  currency?: string;
}
