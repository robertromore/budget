import { z } from "zod";
import { publicProcedure } from "../orpc";
import { ORPCError } from "@orpc/server";
import { removeTransactionsSchema, insertTransactionSchema, transactions } from "$lib/schema";
import { eq, sql } from "drizzle-orm";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";

export const transactionsRoutes = {
  forAccount: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      const records = await context.db.query.transactions.findMany({
        where: sql`${transactions.id} = ${input.id} AND ${transactions.deletedAt} IS NULL`,
      });
      return records;
    }),

  delete: publicProcedure.input(removeTransactionsSchema).handler(async ({ input, context }) => {
    return await context.db
      .update(transactions)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(sql`${transactions.id} in ${input.entities}`)
      .returning();
  }),

  save: publicProcedure.input(insertTransactionSchema).handler(async ({ input, context }) => {
    const { id, payeeId, amount, categoryId, notes, date, accountId, status } = input;

    if (!accountId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Account ID is required for transaction",
      });
    }

    let entity;
    if (id) {
      entity = await context.db
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
      let finalStatus = status;
      if (date && parseDate(date) > today(getLocalTimeZone())) {
        finalStatus = "scheduled";
      }

      entity = await context.db
        .insert(transactions)
        .values({
          payeeId,
          amount,
          categoryId,
          notes,
          date,
          accountId,
          status: finalStatus ?? "pending",
        })
        .returning();
    }

    const result = entity[0];
    if (!result) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to save transaction",
      });
    }
    return result;
  }),
};
