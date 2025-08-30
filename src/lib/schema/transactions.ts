// A "transaction" is a representation of the transfer of an amount of resources
// from one account to another. Transactions can be "split" into multiple
// transactions. Split transactions have the same parent transaction.

import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  real,
  text,
  type AnySQLiteColumn,
  index,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { categories, type Category } from "./categories";
import { payees, type Payee } from "./payees";
import { accounts } from "./accounts";
import { z } from "zod/v4";
import { schedules } from "./schedules";

export const transactions = sqliteTable(
  "transaction",
  {
    id: integer("id").primaryKey().notNull(),
    accountId: integer("account_id")
      .references(() => accounts.id, { onDelete: "cascade" })
      .notNull(),
    parentId: integer("parent_id").references((): AnySQLiteColumn => transactions.id),
    status: text("status", { enum: ["cleared", "pending", "scheduled"] }).default("pending"),
    payeeId: integer("payee_id").references(() => payees.id),
    amount: real("amount").default(0).notNull(),
    categoryId: integer("category_id").references(() => categories.id),
    notes: text("notes"),
    date: text("date")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    scheduleId: integer("schedule_id").references(() => schedules.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("relations_transaction_account_idx").on(table.accountId),
    index("relations_transaction_payee_idx").on(table.payeeId),
    index("relations_transaction_category_idx").on(table.categoryId),
    index("relations_transaction_schedule_idx").on(table.scheduleId),
    index("transaction_account_date_idx").on(table.accountId, table.date, table.id),
    index("transaction_date_idx").on(table.date),
    index("transaction_status_idx").on(table.status),
    index("transaction_parent_idx").on(table.parentId),
    index("transaction_deleted_at_idx").on(table.deletedAt),
  ]
);

export const transactionsRelations = relations(transactions, ({ many, one }) => ({
  parent: one(transactions, {
    fields: [transactions.parentId],
    references: [transactions.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  payee: one(payees, {
    fields: [transactions.payeeId],
    references: [payees.id],
  }),
  schedule: one(schedules, {
    fields: [transactions.scheduleId],
    references: [schedules.id],
  }),
}));

export const selectTransactionSchema = createSelectSchema(transactions);
export const insertTransactionSchema = createInsertSchema(transactions);
export const formInsertTransactionSchema = createInsertSchema(transactions, {
  amount: (schema) =>
    schema
      .min(-999999.99, "Amount cannot be less than -$999,999.99")
      .max(999999.99, "Amount cannot exceed $999,999.99")
      .multipleOf(0.01, "Amount must be a valid currency value"),
  notes: (schema) =>
    schema.max(500, "Notes must be less than 500 characters").optional().nullable(),
  status: (schema) =>
    schema
      .refine((val) => !val || ["cleared", "pending", "scheduled"].includes(val), {
        message: "Invalid transaction status",
      })
      .optional(),
});
export const removeTransactionsSchema = z.object({
  entities: z
    .array(z.number().nonnegative())
    .max(100, "Too many transactions selected for deletion"),
  accountId: z.number(),
});

type TransactionExtraFields = {
  payee: Payee | null;
  category: Category | null;
  balance: number;
};

export type Transaction = typeof transactions.$inferSelect & TransactionExtraFields;
export type NewTransaction = typeof transactions.$inferInsert;
export type InsertTransactionSchema = typeof insertTransactionSchema;
export type FormInsertTransactionSchema = typeof formInsertTransactionSchema;
export type RemoveTransactionSchema = typeof removeTransactionsSchema;
export enum TransactionStatuses {
  CLEARED = "cleared",
  PENDING = "pending",
  SCHEDULED = "scheduled",
}
export type TransactionStatus = keyof TransactionStatuses;
