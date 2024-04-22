import { z } from 'zod';
import { publicProcedure, t } from '../t';
import {
  removeTransactionsSchema,
  insertTransactionSchema,
  transactions,
  type Transaction
} from '$lib/schema';
import { eq, sql } from 'drizzle-orm';

export const transactionRoutes = t.router({
  forAccount: publicProcedure
    .input(
      z.object({
        id: z.number()
      })
    )
    .query(async ({ ctx: { db } }) => {
      return await db.select();
    }),
  delete: publicProcedure
    .input(removeTransactionsSchema)
    .mutation(async ({ input: { entities }, ctx: { db } }) => {
      return await db
        .delete(transactions)
        .where(sql`${transactions.id} in ${entities}`)
        .returning();
    }),
  save: publicProcedure
    .input(insertTransactionSchema)
    .mutation(
      async ({
        input: { id, payeeId, amount, categoryId, notes, date, accountId },
        ctx: { db }
      }) => {
        if (!accountId) {
          return;
        }

        let entity;
        if (id) {
          entity = await db
            .update(transactions)
            .set({
              payeeId,
              amount,
              categoryId,
              notes,
              date
            })
            .where(eq(transactions.id, id))
            .returning();
        } else {
          entity = await db
            .insert(transactions)
            .values({
              payeeId,
              amount,
              categoryId,
              notes,
              date,
              accountId
            })
            .returning();
        }
        const ent = entity[0] as Transaction;

        return ent;
      }
    )
});
