import { z } from "zod";
import { publicProcedure, t } from "../t";
import { accounts, insertTransactionSchema, transactions } from "$lib/schema";
import { eq } from "drizzle-orm";

export const transactionRoutes = t.router({
  forAccount: publicProcedure.input(z.object({
    id: z.number()
  })).query(async ({ ctx: { db }, input }) => {
    return (await db.select());
  }),
  save: publicProcedure.input(insertTransactionSchema.extend({ newAccountBalance: z.number() })).mutation(async({ input: { id, payeeId, amount, categoryId, notes, date, accountId, newAccountBalance }, ctx: { db }}) => {
    if (id) {
      console.log(newAccountBalance);
      if (newAccountBalance && accountId) {
        await db.update(accounts)
          .set({
            balance: newAccountBalance
          })
          .where(eq(accounts.id, accountId));
      }
      return (await db.update(transactions)
        .set({
          payeeId,
          amount,
          categoryId,
          notes,
          date
        })
        .where(eq(transactions.id, id))
        .returning()
      );
    }
    return (await db.insert(transactions).values({
      payeeId,
      amount,
      categoryId,
      notes,
      date
    }));
  })
})
