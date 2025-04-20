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
import { z } from "zod";

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
  },
  (table) => [
    index("relations_transaction_account_idx").on(table.accountId),
    index("relations_transaction_payee_idx").on(table.payeeId),
    index("relations_transaction_category_idx").on(table.categoryId),
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
}));

export const selectTransactionSchema = createSelectSchema(transactions);
export const insertTransactionSchema = createInsertSchema(transactions);
export const removeTransactionsSchema = z.object({
  entities: z.array(z.number().nonnegative()),
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
export type RemoveTransactionSchema = typeof removeTransactionsSchema;
export enum TransactionStatuses {
  CLEARED = "cleared",
  PENDING = "pending",
  SCHEDULED = "scheduled",
}
export type TransactionStatus = keyof TransactionStatuses;
