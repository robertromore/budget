import {
  accounts,
  removeAccountSchema,
  type Account,
  type Transaction,
  formInsertAccountSchema,
} from "$lib/schema";
import { z } from "zod";
import { publicProcedure, t } from "../t";
import { eq, sql, desc, isNull } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";
import { TRPCError } from "@trpc/server";

type AccountRecord = Omit<Account, "balance" | "transactions">;
type TransactionOnlyAmount = Pick<Transaction, "amount">;
export interface AccountRecordWithTransactionAmounts extends AccountRecord {
  transactions: TransactionOnlyAmount[];
}

export const accountRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    // Use raw SQL for better performance with window functions
    const accountsWithBalances = await ctx.db.execute(sql`
      SELECT 
        a.id,
        a.name,
        a.slug,
        a.notes,
        COALESCE(SUM(t.amount), 0) as balance,
        COUNT(CASE WHEN t.id IS NOT NULL THEN 1 END) as transaction_count
      FROM accounts a
      LEFT JOIN transactions t ON a.id = t.account_id AND t.deleted_at IS NULL
      WHERE a.deleted_at IS NULL
      GROUP BY a.id, a.name, a.slug, a.notes
      ORDER BY a.name
    `);

    // Get transactions with running balances for each account
    const accountsWithTransactions = await Promise.all(
      accountsWithBalances.map(async (account) => {
        const transactions = await ctx.db.execute(sql`
          SELECT 
            t.*,
            p.name as payee_name,
            c.name as category_name,
            SUM(t2.amount) OVER (
              PARTITION BY t.account_id 
              ORDER BY t.date, t.id 
              ROWS UNBOUNDED PRECEDING
            ) as balance
          FROM transactions t
          LEFT JOIN payees p ON t.payee_id = p.id
          LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN transactions t2 ON t2.account_id = t.account_id 
            AND (t2.date < t.date OR (t2.date = t.date AND t2.id <= t.id))
            AND t2.deleted_at IS NULL
          WHERE t.account_id = ${account.id} AND t.deleted_at IS NULL
          ORDER BY t.date DESC, t.id DESC
        `);

        return {
          ...account,
          transactions: transactions.map(tx => ({
            ...tx,
            payee: tx.payee_name ? { name: tx.payee_name } : null,
            category: tx.category_name ? { name: tx.category_name } : null
          }))
        };
      })
    );

    return accountsWithTransactions as Account[];
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    // Get account info with total balance
    const accountResult = await ctx.db.execute(sql`
      SELECT 
        a.id,
        a.name,
        a.slug,
        a.notes,
        COALESCE(SUM(t.amount), 0) as balance
      FROM accounts a
      LEFT JOIN transactions t ON a.id = t.account_id AND t.deleted_at IS NULL
      WHERE a.id = ${input.id} AND a.deleted_at IS NULL
      GROUP BY a.id, a.name, a.slug, a.notes
    `);

    if (!accountResult.length) {
      return null;
    }

    if (!accountResult[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Account not found",
      });
    }
    const account = accountResult[0];

    // Get transactions with running balances using window function
    const transactions = await ctx.db.execute(sql`
      SELECT 
        t.*,
        p.name as payee_name,
        c.name as category_name,
        SUM(t2.amount) OVER (
          PARTITION BY t.account_id 
          ORDER BY t.date, t.id 
          ROWS UNBOUNDED PRECEDING
        ) as balance
      FROM transactions t
      LEFT JOIN payees p ON t.payee_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN transactions t2 ON t2.account_id = t.account_id 
        AND (t2.date < t.date OR (t2.date = t.date AND t2.id <= t.id))
        AND t2.deleted_at IS NULL
      WHERE t.account_id = ${input.id} AND t.deleted_at IS NULL
      ORDER BY t.date, t.id
    `);

    return {
      ...account,
      transactions: transactions.map(tx => ({
        ...tx,
        payee: tx.payee_name ? { name: tx.payee_name } : null,
        category: tx.category_name ? { name: tx.category_name } : null
      }))
    };
  }),
  save: publicProcedure.input(formInsertAccountSchema).mutation(async ({ ctx, input }) => {
    if (input.id) {
      const result = await ctx.db.update(accounts).set(input).where(eq(accounts.id, input.id)).returning();
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
  remove: publicProcedure.input(removeAccountSchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Account ID is required for deletion",
      });
    }
    const result = await ctx.db.update(accounts)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
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
