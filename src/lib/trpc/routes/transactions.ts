import { z } from "zod";
import { publicProcedure, t } from "../t";
import { TRPCError } from "@trpc/server";
import {
  removeTransactionsSchema,
  insertTransactionSchema,
  transactions,
} from "$lib/schema";
import { eq, sql } from "drizzle-orm";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";

export const transactionRoutes = t.router({
  forAccount: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ ctx: { db }, input }) => {
      const records = await db.query.transactions.findMany({
        where: sql`${transactions.id} = ${input.id} AND ${transactions.deletedAt} IS NULL`,
      });
      return records;
    }),
  delete: publicProcedure
    .input(removeTransactionsSchema)
    .mutation(async ({ input: { entities }, ctx: { db } }) => {
      return await db
        .update(transactions)
        .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
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
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Account ID is required for transaction",
          });
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
          if (date && parseDate(date) > today(getLocalTimeZone())) {
            status = "scheduled";
          }

          entity = await db
            .insert(transactions)
            .values({
              payeeId,
              amount,
              categoryId,
              notes,
              date,
              accountId,
              status: status ?? "pending",
            })
            .returning();
        }

        const result = entity[0];
        if (!result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save transaction",
          });
        }
        return result;
      }
    ),
});
