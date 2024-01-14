// A "transaction" is a representation of the transfer of an amount of resources
// from one account to another. Transactions can be "split" into multiple
// transactions. Split transactions have the same parent transaction.

import { relations } from 'drizzle-orm';
import { sqliteTable, integer, real, text, type AnySQLiteColumn, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { categories } from '../schema_todo/categories';
import { payees } from '../schema_todo/payees';
import { accounts } from './accounts';
// import { z } from 'zod';

export const transactions = sqliteTable(
	'transaction',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		accountId: integer('id').references(() => accounts.id),
		parentId: integer('parentId')
			.default(-1)
			.references((): AnySQLiteColumn => transactions.id),
		// false = pending, true = cleared
		// @todo maybe switch to enum and add scheduled as status
		status: integer('status', { mode: 'boolean' }).default(false),
		payeeId: integer('payeeId'),
		amount: real('amount').default(0),
		categoryId: integer('categoryId'),
		notes: text('notes'),
		date: integer('date', { mode: 'timestamp' })
	},
	(table) => ({
		account: index('relations_user_idx').on(table.accountId),
	})
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  // parent: one(transactions, {
  //   fields: [transactions.parentId],
  //   references: [transactions.id]
  // }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  // category: one(categories, {
  //   fields: [transactions.categoryId],
  //   references: [categories.id]
  // }),
  // payee: one(payees, {
  //   fields: [transactions.payeeId],
  //   references: [payees.id]
  // })
}));

export const selectTransactionSchema = createSelectSchema(transactions);
// export const formDataMovieSchema = createInsertSchema(account, {
// 	allow_user_registrations: z.boolean(),
// 	enforce_user_registrations: z.boolean()
// });

export type Transaction = typeof transactions.$inferSelect;
