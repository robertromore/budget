import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { budgetPeriodInstances, budgets } from "../budgets";
import { categories } from "../categories";

export const envelopeStatuses = ["active", "paused", "depleted", "overspent"] as const;
export const rolloverModes = ["unlimited", "limited", "reset"] as const;

export type EnvelopeStatus = (typeof envelopeStatuses)[number];
export type RolloverMode = (typeof rolloverModes)[number];

export const rolloverModeOptions = [
  { value: "unlimited", label: "Unlimited", description: "Rollover all unused funds indefinitely" },
  { value: "limited", label: "Limited", description: "Rollover for a specific number of months" },
  { value: "reset", label: "Reset", description: "Clear unused funds at period end" },
] as const satisfies readonly { value: RolloverMode; label: string; description: string }[];

export interface EnvelopeMetadata {
  target?: number;
  maxRolloverMonths?: number;
  priority?: number;
  isEmergencyFund?: boolean;
  autoRefill?: boolean;
  [key: string]: unknown;
}

export const envelopeAllocations = sqliteTable(
  "envelope_allocation",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    budgetId: integer("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    periodInstanceId: integer("period_instance_id")
      .notNull()
      .references(() => budgetPeriodInstances.id, { onDelete: "cascade" }),
    allocatedAmount: real("allocated_amount").default(0).notNull(),
    spentAmount: real("spent_amount").default(0).notNull(),
    rolloverAmount: real("rollover_amount").default(0).notNull(),
    availableAmount: real("available_amount").default(0).notNull(),
    deficitAmount: real("deficit_amount").default(0).notNull(),
    status: text("status", { enum: envelopeStatuses }).default("active").notNull(),
    rolloverMode: text("rollover_mode", { enum: rolloverModes }).default("unlimited").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<EnvelopeMetadata>().default({}).notNull(),
    lastCalculated: text("last_calculated"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("envelope_allocation_unique").on(
      table.budgetId,
      table.categoryId,
      table.periodInstanceId
    ),
    index("envelope_allocation_budget_idx").on(table.budgetId),
    index("envelope_allocation_category_idx").on(table.categoryId),
    index("envelope_allocation_period_idx").on(table.periodInstanceId),
    index("envelope_allocation_status_idx").on(table.status),
  ]
);

export const envelopeTransfers = sqliteTable(
  "envelope_transfer",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fromEnvelopeId: integer("from_envelope_id")
      .notNull()
      .references(() => envelopeAllocations.id, { onDelete: "cascade" }),
    toEnvelopeId: integer("to_envelope_id")
      .notNull()
      .references(() => envelopeAllocations.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
    reason: text("reason"),
    transferredBy: text("transferred_by").notNull(),
    transferredAt: text("transferred_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("envelope_transfer_from_idx").on(table.fromEnvelopeId),
    index("envelope_transfer_to_idx").on(table.toEnvelopeId),
    index("envelope_transfer_date_idx").on(table.transferredAt),
  ]
);

export const envelopeRolloverHistory = sqliteTable(
  "envelope_rollover_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    envelopeId: integer("envelope_id")
      .notNull()
      .references(() => envelopeAllocations.id, { onDelete: "cascade" }),
    fromPeriodId: integer("from_period_id")
      .notNull()
      .references(() => budgetPeriodInstances.id, { onDelete: "cascade" }),
    toPeriodId: integer("to_period_id")
      .notNull()
      .references(() => budgetPeriodInstances.id, { onDelete: "cascade" }),
    rolledAmount: real("rolled_amount").notNull(),
    resetAmount: real("reset_amount").default(0).notNull(),
    processedAt: text("processed_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("envelope_rollover_envelope_idx").on(table.envelopeId),
    index("envelope_rollover_from_period_idx").on(table.fromPeriodId),
    index("envelope_rollover_to_period_idx").on(table.toPeriodId),
  ]
);

export const envelopeAllocationsRelations = relations(envelopeAllocations, ({ one, many }) => ({
  budget: one(budgets, {
    fields: [envelopeAllocations.budgetId],
    references: [budgets.id],
  }),
  category: one(categories, {
    fields: [envelopeAllocations.categoryId],
    references: [categories.id],
  }),
  periodInstance: one(budgetPeriodInstances, {
    fields: [envelopeAllocations.periodInstanceId],
    references: [budgetPeriodInstances.id],
  }),
  transfersFrom: many(envelopeTransfers, {
    relationName: "envelope_transfers_from",
  }),
  transfersTo: many(envelopeTransfers, {
    relationName: "envelope_transfers_to",
  }),
  rolloverHistory: many(envelopeRolloverHistory),
}));

export const envelopeTransfersRelations = relations(envelopeTransfers, ({ one }) => ({
  fromEnvelope: one(envelopeAllocations, {
    fields: [envelopeTransfers.fromEnvelopeId],
    references: [envelopeAllocations.id],
    relationName: "envelope_transfers_from",
  }),
  toEnvelope: one(envelopeAllocations, {
    fields: [envelopeTransfers.toEnvelopeId],
    references: [envelopeAllocations.id],
    relationName: "envelope_transfers_to",
  }),
}));

export const envelopeRolloverHistoryRelations = relations(envelopeRolloverHistory, ({ one }) => ({
  envelope: one(envelopeAllocations, {
    fields: [envelopeRolloverHistory.envelopeId],
    references: [envelopeAllocations.id],
  }),
  fromPeriod: one(budgetPeriodInstances, {
    fields: [envelopeRolloverHistory.fromPeriodId],
    references: [budgetPeriodInstances.id],
    relationName: "rollover_from_period",
  }),
  toPeriod: one(budgetPeriodInstances, {
    fields: [envelopeRolloverHistory.toPeriodId],
    references: [budgetPeriodInstances.id],
    relationName: "rollover_to_period",
  }),
}));

export const selectEnvelopeAllocationSchema = createSelectSchema(envelopeAllocations);
export const insertEnvelopeAllocationSchema = createInsertSchema(envelopeAllocations);

export const selectEnvelopeTransferSchema = createSelectSchema(envelopeTransfers);
export const insertEnvelopeTransferSchema = createInsertSchema(envelopeTransfers);

export const selectEnvelopeRolloverHistorySchema = createSelectSchema(envelopeRolloverHistory);
export const insertEnvelopeRolloverHistorySchema = createInsertSchema(envelopeRolloverHistory);

export type EnvelopeAllocation = typeof envelopeAllocations.$inferSelect;
export type NewEnvelopeAllocation = typeof envelopeAllocations.$inferInsert;
export type EnvelopeTransfer = typeof envelopeTransfers.$inferSelect;
export type NewEnvelopeTransfer = typeof envelopeTransfers.$inferInsert;
export type EnvelopeRolloverHistory = typeof envelopeRolloverHistory.$inferSelect;
export type NewEnvelopeRolloverHistory = typeof envelopeRolloverHistory.$inferInsert;
