// An "account" is a disparate representation of a user's allocation of
// resources, with an overall balance, and transactions to and from the account
// that affect the account's balance.

import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import { sqliteTable, integer, real, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { transactions } from './transactions';
import type { Transaction } from './transactions';
import { z } from 'zod';

export const accounts = sqliteTable('account', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cuid: text('cuid').$defaultFn(() => createId()),
  name: text('name').notNull(),
  slug: text('slug'),
	closed: integer('closed', { mode: 'boolean' }).default(false),
	balance: real('balance').default(0.0),
  notes: text('notes')
});

export const accountsRelations = relations(accounts, ({ many }) => ({
	transactions: many(transactions)
}));

export const selectAccountSchema = createSelectSchema(accounts);
export const insertAccountSchema = createInsertSchema(accounts);
export const formInsertAccountSchema = createInsertSchema(accounts, {
	name: z
		.string({
			required_error: 'Required.'
		})
		// .min(2)
		.max(30),
	balance: z.coerce.number().optional()
}).pick({
	name: true,
	balance: true
});
export const removeAccountSchema = z.object({ id: z.number().nonnegative() });

export type Account = typeof accounts.$inferSelect | {
  transactions: Transaction[]
};
export type NewAccount = typeof accounts.$inferInsert;
export type InsertAccountSchema = typeof insertAccountSchema;
export type FormInsertAccountSchema = typeof formInsertAccountSchema;
export type RemoveAccountSchema = typeof removeAccountSchema;
