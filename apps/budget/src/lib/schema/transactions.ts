// A "transaction" is a representation of the transfer of an amount of resources
// from one account to another. Transactions can be "split" into multiple
// transactions. Split transactions have the same parent transaction.

import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import validator from "validator";
import { z } from "zod/v4";
import { accounts } from "./accounts";
import { budgetTransactions } from "./budgets";
import { categories, type Category } from "./categories";
import { payees, type Payee } from "./payees";
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

    // Transfer transaction fields
    transferId: text("transfer_id"), // Shared ID for both transactions in the pair (CUID)
    transferAccountId: integer("transfer_account_id").references(() => accounts.id), // The OTHER account in the transfer
    transferTransactionId: integer("transfer_transaction_id").references(
      (): AnySQLiteColumn => transactions.id
    ), // The linked transaction
    isTransfer: integer("is_transfer", { mode: "boolean" }).default(false), // Quick check for transfers

    // Import metadata
    importedFrom: text("imported_from"), // File name or source of import
    importedAt: text("imported_at"), // When the transaction was imported
    originalPayeeName: text("original_payee_name"), // Original payee name from import file before normalization
    originalCategoryName: text("original_category_name"), // Original category from import file
    inferredCategory: text("inferred_category"), // Category suggested by smart categorization
    importDetails: text("import_details"), // Additional details extracted during import (e.g., transaction IDs, location)
    rawImportData: text("raw_import_data"), // Complete unmodified raw data from import file (JSON)

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
    index("transaction_transfer_id_idx").on(table.transferId),
    index("transaction_transfer_account_idx").on(table.transferAccountId),
    index("transaction_is_transfer_idx").on(table.isTransfer),
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
  budgetAllocations: many(budgetTransactions),
}));

export const selectTransactionSchema = createSelectSchema(transactions);
export const insertTransactionSchema = createInsertSchema(transactions);
export const formInsertTransactionSchema = createInsertSchema(transactions, {
  amount: z
    .number({
      message: "Amount must be a number",
    })
    .min(-999999.99, "Amount cannot be less than -$999,999.99")
    .max(999999.99, "Amount cannot exceed $999,999.99")
    .multipleOf(0.01, "Amount must be a valid currency value"),
  notes: (schema) =>
    schema
      .max(500, "Notes must be less than 500 characters")
      .refine((val) => {
        if (!val) return true; // Allow empty/null values
        // Reject any HTML tags
        if (validator.contains(val, "<") || validator.contains(val, ">")) {
          return false;
        }
        return true;
      }, "Notes cannot contain HTML tags")
      .optional()
      .nullable(),
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
  accountId: z.number().positive("Account ID must be positive"),
});

type TransactionExtraFields = {
  payee: Payee | null;
  category: Category | null;
  balance: number | null;
} & {
  // Schedule metadata (only present for scheduled transactions)
  scheduleId?: number | undefined;
  scheduleName?: string | undefined;
  scheduleSlug?: string | undefined;
  scheduleFrequency?: string | undefined;
  scheduleInterval?: number | undefined;
  scheduleNextOccurrence?: string | undefined;
  // Budget allocation data (only present when loaded with relation)
  budgetAllocations?:
    | Array<{
        id: number;
        budgetId: number;
        budgetName: string;
        allocatedAmount: number;
        autoAssigned: boolean;
        assignedBy: string | null;
      }>
    | undefined;
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
