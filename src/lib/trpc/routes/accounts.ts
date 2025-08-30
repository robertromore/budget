import {
  accounts,
  transactions,
  removeAccountSchema,
  type Account,
  type Transaction,
  formInsertAccountSchema,
} from "$lib/schema";
import { z } from "zod";
import { publicProcedure, rateLimitedProcedure, t } from "../t";
import { eq, desc, isNull } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";
import { TRPCError } from "@trpc/server";

type AccountRecord = Omit<Account, "balance" | "transactions">;
type TransactionOnlyAmount = Pick<Transaction, "amount">;
export interface AccountRecordWithTransactionAmounts extends AccountRecord {
  transactions: TransactionOnlyAmount[];
}

export const accountRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    // Simplified query using standard Drizzle methods
    return (await ctx.db.query.accounts.findMany({
      where: isNull(accounts.deletedAt),
      with: {
        transactions: {
          where: isNull(transactions.deletedAt),
          with: {
            payee: true,
            category: true,
          },
          orderBy: [desc(transactions.date), desc(transactions.id)],
        },
      },
      orderBy: [accounts.name],
    })) as Account[];
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    const account = await ctx.db.query.accounts.findFirst({
      where: (accounts, { eq, and, isNull }) =>
        and(eq(accounts.id, input.id), isNull(accounts.deletedAt)),
      with: {
        transactions: {
          where: isNull(transactions.deletedAt),
          with: {
            payee: true,
            category: true,
          },
          orderBy: [transactions.date, transactions.id],
        },
      },
    });

    if (!account) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Account not found",
      });
    }

    return account as Account;
  }),
  save: rateLimitedProcedure.input(formInsertAccountSchema).mutation(async ({ ctx, input }) => {
    if (input.id) {
      const result = await ctx.db
        .update(accounts)
        .set(input)
        .where(eq(accounts.id, input.id))
        .returning();
      if (!result[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update account",
        });
      }
      return result[0];
    }

    const merged = {
      ...input,
      slug: slugify(input.name),
    };

    const insertResult = await ctx.db.insert(accounts).values(merged).returning();
    if (!insertResult[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create account",
      });
    }
    const new_account = insertResult[0];
    // if (input.balance) {
    //   const tx: NewTransaction = {
    //     amount: input.balance,
    //     accountId: new_account.id,
    //     notes: 'Starting balance'
    //   };
    //   console.log(tx);
    //   await ctx.db.insert(transactions).values(tx);
    // }
    return new_account;
  }),
  remove: rateLimitedProcedure.input(removeAccountSchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Account ID is required for deletion",
      });
    }
    const result = await ctx.db
      .update(accounts)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(accounts.id, input.id))
      .returning();
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Account not found or could not be deleted",
      });
    }
    return result[0];
  }),
});
