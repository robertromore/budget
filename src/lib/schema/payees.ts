// A "transaction" is a representation of the transfer of an amount of resources
// from one account to another. Transactions can be "split" into multiple
// transactions. Split transactions have the same parent transaction.

import { relations, sql } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { transactions } from './transactions';
import { z } from 'zod';

export const payees = sqliteTable('payee', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  notes: text('notes'),
  dateCreated: text('date_created')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const payeesRelations = relations(payees, ({ many }) => ({
  transactions: many(transactions),
}));

export const selectPayeeSchema = createSelectSchema(payees);
export const insertPayeeSchema = createInsertSchema(payees);
export const formInsertPayeeSchema = createInsertSchema(payees, {
  name: z
    .string()
    .min(1, {
      message: 'required'
    })
    .max(30)
});
export const removePayeeSchema = z.object({ id: z.number().nonnegative() });

export type Payee = typeof payees.$inferSelect;
export type NewPayee = typeof payees.$inferInsert;
export type FormInsertPayeeSchema = typeof formInsertPayeeSchema;
export type RemovePayeeSchema = typeof removePayeeSchema;
