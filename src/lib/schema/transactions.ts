// A "transaction" is a representation of the transfer of an amount of resources
// from one account to another. Transactions can be "split" into multiple
// transactions. Split transactions have the same parent transaction.

import { relations, sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  real,
  text,
  type AnySQLiteColumn,
  index
} from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { categories, type Category } from './categories';
import { payees, type Payee } from './payees';
import { accounts } from './accounts';
import { z } from 'zod';

export const transactions = sqliteTable(
  'transaction',
  {
    id: integer('id').primaryKey(),
    accountId: integer('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
    parentId: integer('parent_id').references((): AnySQLiteColumn => transactions.id),
    // false = pending, true = cleared
    // @todo maybe switch to enum and add scheduled as status
    status: integer('status', { mode: 'boolean' }).default(false),
    payeeId: integer('payee_id').references(() => payees.id),
    amount: real('amount').default(0),
    categoryId: integer('category_id').references(() => categories.id),
    notes: text('notes'),
    date: text('date')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    account: index('relations_transaction_account_idx').on(table.accountId),
    payee: index('relations_transaction_payee_idx').on(table.payeeId),
    category: index('relations_transaction_category_idx').on(table.categoryId)
  })
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  parent: one(transactions, {
    fields: [transactions.parentId],
    references: [transactions.id]
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id]
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id]
  }),
  payee: one(payees, {
    fields: [transactions.payeeId],
    references: [payees.id]
  })
}));

export const selectTransactionSchema = createSelectSchema(transactions);
export const insertTransactionSchema = createInsertSchema(transactions);
// export const formInsertTransactionSchema = createInsertSchema(transactions);
export const removeTransactionsSchema = z.object({
  entities: z.array(z.number().nonnegative()),
  accountId: z.number(),
});

type TransactionExtraFields = {
  payee: Payee | null;
  category: Category | null;
};

export type Transaction = typeof transactions.$inferSelect & TransactionExtraFields;
export type NewTransaction = typeof transactions.$inferInsert;
export type InsertTransactionSchema = typeof insertTransactionSchema;
export type RemoveTransactionSchema = typeof removeTransactionsSchema;
