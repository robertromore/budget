import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";
import { payees } from "./payees";
import {
  billingCycles,
  subscriptionStatuses,
  subscriptionTypes,
} from "./subscriptions";
import { transactions } from "./transactions";
import { workspaces } from "./workspaces";

// ==================== ALERT TYPE ENUM ====================

export const subscriptionAlertTypes = [
  "renewal_upcoming",
  "price_increase",
  "trial_ending",
  "payment_failed",
  "duplicate_detected",
  "unused",
  "confirmation_needed",
] as const;

export type SubscriptionAlertType = (typeof subscriptionAlertTypes)[number];

// ==================== PRICE CHANGE TYPE ENUM ====================

export const priceChangeTypes = ["increase", "decrease", "initial"] as const;

export type PriceChangeType = (typeof priceChangeTypes)[number];

// ==================== SUBSCRIPTIONS TABLE ====================

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    payeeId: integer("payee_id").references(() => payees.id, { onDelete: "set null" }),
    accountId: integer("account_id").references(() => accounts.id, { onDelete: "set null" }),

    // Core subscription info
    name: text("name").notNull(),
    type: text("type", { enum: subscriptionTypes }).notNull(),
    billingCycle: text("billing_cycle", { enum: billingCycles }).notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").default("USD").notNull(),
    status: text("status", { enum: subscriptionStatuses }).default("active").notNull(),

    // Dates
    startDate: text("start_date"),
    renewalDate: text("renewal_date"),
    cancelledAt: text("cancelled_at"),
    trialEndsAt: text("trial_ends_at"),

    // Detection metadata
    detectionConfidence: real("detection_confidence").default(0),
    isManuallyAdded: integer("is_manually_added", { mode: "boolean" }).default(false),
    isUserConfirmed: integer("is_user_confirmed", { mode: "boolean" }).default(false),

    // Preferences
    autoRenewal: integer("auto_renewal", { mode: "boolean" }).default(true),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    alertPreferences: text("alert_preferences", { mode: "json" }).$type<{
      renewalReminder?: boolean;
      renewalReminderDays?: number;
      priceChangeAlert?: boolean;
      unusedAlert?: boolean;
      unusedAlertDays?: number;
    }>(),

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
    index("subscriptions_workspace_id_idx").on(table.workspaceId),
    index("subscriptions_payee_id_idx").on(table.payeeId),
    index("subscriptions_account_id_idx").on(table.accountId),
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_type_idx").on(table.type),
    index("subscriptions_renewal_date_idx").on(table.renewalDate),
    index("subscriptions_workspace_status_idx").on(table.workspaceId, table.status),
  ]
);

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [subscriptions.workspaceId],
    references: [workspaces.id],
  }),
  payee: one(payees, {
    fields: [subscriptions.payeeId],
    references: [payees.id],
  }),
  account: one(accounts, {
    fields: [subscriptions.accountId],
    references: [accounts.id],
  }),
  priceHistory: many(subscriptionPriceHistory),
  alerts: many(subscriptionAlerts),
}));

// ==================== SUBSCRIPTION PRICE HISTORY TABLE ====================

export const subscriptionPriceHistory = sqliteTable(
  "subscription_price_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    subscriptionId: integer("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
    previousAmount: real("previous_amount"),
    effectiveDate: text("effective_date").notNull(),
    changeType: text("change_type", { enum: priceChangeTypes }).notNull(),
    changePercentage: real("change_percentage"),
    detectedFromTransactionId: integer("detected_from_transaction_id").references(
      () => transactions.id,
      { onDelete: "set null" }
    ),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("subscription_price_history_subscription_id_idx").on(table.subscriptionId),
    index("subscription_price_history_effective_date_idx").on(table.effectiveDate),
    index("subscription_price_history_transaction_idx").on(table.detectedFromTransactionId),
  ]
);

export const subscriptionPriceHistoryRelations = relations(
  subscriptionPriceHistory,
  ({ one }) => ({
    subscription: one(subscriptions, {
      fields: [subscriptionPriceHistory.subscriptionId],
      references: [subscriptions.id],
    }),
    transaction: one(transactions, {
      fields: [subscriptionPriceHistory.detectedFromTransactionId],
      references: [transactions.id],
    }),
  })
);

// ==================== SUBSCRIPTION ALERTS TABLE ====================

export const subscriptionAlerts = sqliteTable(
  "subscription_alerts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    subscriptionId: integer("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    alertType: text("alert_type", { enum: subscriptionAlertTypes }).notNull(),
    triggerDate: text("trigger_date").notNull(),
    isDismissed: integer("is_dismissed", { mode: "boolean" }).default(false),
    isActioned: integer("is_actioned", { mode: "boolean" }).default(false),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("subscription_alerts_subscription_id_idx").on(table.subscriptionId),
    index("subscription_alerts_workspace_id_idx").on(table.workspaceId),
    index("subscription_alerts_type_idx").on(table.alertType),
    index("subscription_alerts_trigger_date_idx").on(table.triggerDate),
    index("subscription_alerts_workspace_dismissed_idx").on(table.workspaceId, table.isDismissed),
  ]
);

export const subscriptionAlertsRelations = relations(subscriptionAlerts, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [subscriptionAlerts.subscriptionId],
    references: [subscriptions.id],
  }),
  workspace: one(workspaces, {
    fields: [subscriptionAlerts.workspaceId],
    references: [workspaces.id],
  }),
}));

// ==================== ZOD SCHEMAS ====================

// Subscription schemas
export const selectSubscriptionSchema = createSelectSchema(subscriptions);
export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  name: (schema) => schema.min(1, "Name is required"),
  amount: (schema) => schema.positive("Amount must be positive"),
  type: z.enum(subscriptionTypes),
  billingCycle: z.enum(billingCycles),
  status: z.enum(subscriptionStatuses).optional(),
}).omit({ workspaceId: true });

export const updateSubscriptionSchema = insertSubscriptionSchema.partial().extend({
  id: z.number().positive(),
});

// Price history schemas
export const selectPriceHistorySchema = createSelectSchema(subscriptionPriceHistory);
export const insertPriceHistorySchema = createInsertSchema(subscriptionPriceHistory, {
  amount: (schema) => schema.positive("Amount must be positive"),
  changeType: z.enum(priceChangeTypes),
});

// Alert schemas
export const selectAlertSchema = createSelectSchema(subscriptionAlerts);
export const insertAlertSchema = createInsertSchema(subscriptionAlerts, {
  alertType: z.enum(subscriptionAlertTypes),
}).omit({ workspaceId: true });

export const dismissAlertSchema = z.object({
  id: z.number().positive(),
});

// ==================== TYPE EXPORTS ====================

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// Client-side input type (without workspaceId, matches insertSubscriptionSchema)
export type CreateSubscriptionInput = z.infer<typeof insertSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

export type SubscriptionPriceHistory = typeof subscriptionPriceHistory.$inferSelect;
export type InsertSubscriptionPriceHistory = typeof subscriptionPriceHistory.$inferInsert;

export type SubscriptionAlert = typeof subscriptionAlerts.$inferSelect;
export type InsertSubscriptionAlert = typeof subscriptionAlerts.$inferInsert;

// Extended types with relations
export interface SubscriptionWithRelations extends Subscription {
  payee?: typeof payees.$inferSelect | null;
  account?: typeof accounts.$inferSelect | null;
  priceHistory?: SubscriptionPriceHistory[];
  alerts?: SubscriptionAlert[];
}
