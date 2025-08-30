import {
  accounts,
  transactions,
  removeTransactionsSchema,
  type Transaction,
  transactionFormSchema,
} from "$lib/schema";
import { z } from "zod/v4";
import { publicProcedure } from "../orpc";
import { eq, sql, inArray, isNull, desc } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

export const transactionsRoutes = {
  all: publicProcedure.handler(async ({ context }) => {
    return (await context.db.query.transactions.findMany({
      where: isNull(transactions.deletedAt),
      with: {
        payee: true,
        category: true,
      },
      orderBy: [desc(transactions.date), desc(transactions.id)],
    })) as Transaction[];
  }),

  byAccount: publicProcedure
    .input(z.object({ accountId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      return (await context.db.query.transactions.findMany({
        where: sql`${transactions.accountId} = ${input.accountId} AND ${transactions.deletedAt} IS NULL`,
        with: {
          payee: true,
          category: true,
        },
        orderBy: [desc(transactions.date), desc(transactions.id)],
      })) as Transaction[];
    }),

  load: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const transaction = await context.db.query.transactions.findFirst({
        where: sql`${transactions.id} = ${input.id} AND ${transactions.deletedAt} IS NULL`,
        with: {
          payee: true,
          category: true,
        },
      });

      if (!transaction) {
        throw new ORPCError("TRANSACTION_NOT_FOUND", {
          message: "Transaction not found",
        });
      }

      return transaction as Transaction;
    }),

  save: publicProcedure.input(transactionFormSchema).handler(async ({ input, context }) => {
    if (input.id) {
      const result = await context.db
        .update(transactions)
        .set(input)
        .where(eq(transactions.id, input.id))
        .returning();
      if (!result[0]) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to update transaction",
        });
      }
      return result[0];
    }

    const insertResult = await context.db.insert(transactions).values(input).returning();
    if (!insertResult[0]) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create transaction",
      });
    }
    return insertResult[0];
  }),

  removeMany: publicProcedure.input(removeTransactionsSchema).handler(async ({ input, context }) => {
    if (!input?.entities?.length || !input.accountId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Transaction IDs and account ID are required for deletion",
      });
    }
    const result = await context.db
      .update(transactions)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(
        sql`${transactions.id} IN ${inArray(transactions.id, input.entities)} AND ${transactions.accountId} = ${input.accountId}`
      )
      .returning();
    if (!result.length) {
      throw new ORPCError("NOT_FOUND", {
        message: "Transactions not found or could not be deleted",
      });
    }
    return result;
  }),
};