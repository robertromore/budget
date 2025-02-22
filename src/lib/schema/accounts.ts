// An "account" is a disparate representation of a user's allocation of
// resources, with an overall balance, and transactions to and from the account
// that affect the account's balance.

import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { transactions } from "./transactions";
import type { Transaction } from "./transactions";
import { z } from "zod";
import type { Category } from "./categories";
import type { Payee } from "./payees";

export const accounts = sqliteTable("account", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cuid: text("cuid").$defaultFn(() => createId()),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  // @todo maybe change to enum to allow for archiving?
  closed: integer("closed", { mode: "boolean" }).default(false),
  // @todo decide if it's better to calculate and store this value or aggregate
  // the value based on the transaction rows.
  // balance: real('balance').default(0.0).notNull(),
  notes: text("notes"),
  dateOpened: text("date_opened")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  // @todo only useful if allowing account archival?
  // dateClosed: integer('date_closed', { mode: 'timestamp' })
});

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
}));

export const selectAccountSchema = createSelectSchema(accounts);
export const insertAccountSchema = createInsertSchema(accounts);
export const formInsertAccountSchema = createInsertSchema(accounts, {
  name: z
    .string({
      required_error: "Required.",
    })
    .min(2)
    .max(30),
});
export const removeAccountSchema = z.object({ id: z.number().nonnegative() });

type WithTransactions = {
  transactions: Transaction[];
};
type WithBalance = {
  balance: number;
};

interface AccountExtraFields extends WithTransactions, WithBalance {}

export type Account = typeof accounts.$inferSelect & AccountExtraFields;
export type NewAccount = typeof accounts.$inferInsert;
export type InsertAccountSchema = typeof insertAccountSchema;
export type FormInsertAccountSchema = typeof formInsertAccountSchema;
export type RemoveAccountSchema = typeof removeAccountSchema;
