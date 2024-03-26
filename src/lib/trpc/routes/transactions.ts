import { z } from 'zod';
import { publicProcedure, t } from '../t';
import { categories, removeTransactionsSchema, insertTransactionSchema, payees, transactions } from '$lib/schema';
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
  delete: publicProcedure.input(removeTransactionsSchema).mutation(async ({ input: { entities }, ctx: { db } }) => {
    return await db.delete(transactions).where(sql`${transactions.id} in ${entities}`).returning();
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
        if (entity[0].categoryId && !entity[0].category) {
          const categoriesResult = await db
            .select()
            .from(categories)
            .where(eq(categories.id, entity[0].categoryId));
          if (categoriesResult[0]) {
            entity[0].category = categoriesResult[0];
          }
        }
        if (entity[0].payeeId && !entity[0].payee) {
          const payeesResult = await db
            .select()
            .from(payees)
            .where(eq(payees.id, entity[0].payeeId));
          if (payeesResult[0]) {
            entity[0].payee = payeesResult[0];
          }
        }

        return entity[0];
      }
    )
});
