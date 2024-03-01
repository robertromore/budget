import { z } from 'zod';
import { publicProcedure, t } from '../t';
import { accounts, categories, formInsertTransactionSchema, payees, transactions } from '$lib/schema';
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
  delete: publicProcedure.input(z.array(z.number())).mutation(async ({ input, ctx: { db } }) => {
    return await db.delete(transactions).where(sql`${transactions.id} in ${input}`).returning();
  }),
  save: publicProcedure
    .input(formInsertTransactionSchema.extend({ newAccountBalance: z.number().optional() }))
    .mutation(
      async ({
        input: { id, payeeId, amount, categoryId, notes, date, accountId, newAccountBalance },
        ctx: { db }
      }) => {
        if (!accountId) {
          return;
        }

        if (newAccountBalance && accountId) {
          await db
            .update(accounts)
            .set({
              balance: newAccountBalance
            })
            .where(eq(accounts.id, accountId));
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
              // date: toCalendarDateTime(date as DateValue).toString()
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
