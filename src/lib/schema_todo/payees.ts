// A "transaction" is a representation of the transfer of an amount of resources
// from one account to another. Transactions can be "split" into multiple
// transactions. Split transactions have the same parent transaction.

import { relations } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { createSelectSchema } from 'drizzle-zod';
import { transactions } from '../schema/transactions';
// import { z } from 'zod';

export const payees = sqliteTable('payee', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name')
});

export const payeesRelations = relations(payees, ({ many }) => ({
  transactions: many(transactions),
}));

export const selectPayeeSchema = createSelectSchema(payees);

export type Payee = typeof payees.$inferSelect;
