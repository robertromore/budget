import { z } from "zod";
import { publicProcedure, t } from "../t";
import {
  removeTransactionsSchema,
  insertTransactionSchema,
  transactions,
  type Transaction,
} from "$lib/schema";
import { eq, sql } from "drizzle-orm";

export const transactionRoutes = t.router({
  forAccount: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ ctx: { db }, input }) => {
      const records = await db.query.transactions.findMany({
        where: eq(transactions.id, input.id),
      });
      return records;
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
        input: { id, payeeId, amount, categoryId, notes, date, accountId, status },
        ctx: { db },
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
              date,
              status: status as "cleared" | "pending" | "scheduled" | null | undefined,
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
              accountId,
              status,
            })
            .returning();
        }
        console.log(entity);
        return entity.shift() as Transaction;
      }
    ),
});
