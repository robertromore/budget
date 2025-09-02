import { z } from "zod";
import { publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t } from "../t";
import { TRPCError } from "@trpc/server";
import { removeTransactionsSchema, formInsertTransactionSchema, transactions, accounts } from "$lib/schema";
import { eq, inArray } from "drizzle-orm";
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
        where: (transactions, { eq, and, isNull }) =>
          and(eq(transactions.id, input.id), isNull(transactions.deletedAt)),
      });
      return records;
    }),
  delete: bulkOperationProcedure
    .input(removeTransactionsSchema)
    .mutation(async ({ input: { entities }, ctx: { db } }) => {
      return await db
        .update(transactions)
        .set({ deletedAt: new Date().toISOString() })
        .where(inArray(transactions.id, entities))
        .returning();
    }),
  save: rateLimitedProcedure
    .input(formInsertTransactionSchema)
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

        // Verify the account exists
        const accountExists = await db.query.accounts.findFirst({
          where: (accounts, { eq, isNull, and }) => 
            and(eq(accounts.id, accountId), isNull(accounts.deletedAt))
        });

        if (!accountExists) {
          throw new TRPCError({
            code: "NOT_FOUND", 
            message: "Account not found",
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
