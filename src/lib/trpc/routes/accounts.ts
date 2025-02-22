import {
  accounts,
  removeAccountSchema,
  type Account,
  type Transaction,
  formInsertAccountSchema,
} from "$lib/schema";
import { z } from "zod";
import { publicProcedure, t } from "../t";
import { eq } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";

type AccountRecord = Omit<Account, "balance" | "transactions">;
type TransactionOnlyAmount = Pick<Transaction, "amount">;
export interface AccountRecordWithTransactionAmounts extends AccountRecord {
  transactions: TransactionOnlyAmount[];
}

export const accountRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    const records: AccountRecordWithTransactionAmounts[] = await ctx.db.query.accounts.findMany({
      with: {
        transactions: {
          with: {
            payee: true,
            category: true,
          },
        },
      },
    });
    return records.map((record) => {
      return Object.assign(record, {
        balance:
          record.transactions
            .map((tx: TransactionOnlyAmount) => tx.amount)
            .reduce((prev, cur) => (prev || 0) + (cur || 0), 0) || 0,
      });
    }) as Account[];
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    let record = (
      await ctx.db.query.accounts.findMany({
        where: eq(accounts.id, input.id),
        with: {
          transactions: {
            with: {
              payee: true,
              category: true,
            },
          },
        },
      })
    )[0];

    // Add a total balance to the account.
    record = Object.assign(record, {
      balance:
        record.transactions
          .map((tx) => tx.amount)
          .reduce((prev, cur) => (prev || 0) + (cur || 0), 0) || 0,
    });

    return record;
  }),
  save: publicProcedure.input(formInsertAccountSchema).mutation(async ({ ctx, input }) => {
    if (input.id) {
      return (
        await ctx.db.update(accounts).set(input).where(eq(accounts.id, input.id)).returning()
      )[0];
    }

    const merged = {
      ...input,
      slug: slugify(input.name),
    };

    const new_account = (await ctx.db.insert(accounts).values(merged).returning())[0];
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
    if (!input) throw new Error("id can't be null when deleting an account");
    return (await ctx.db.delete(accounts).where(eq(accounts.id, input.id)).returning())[0];
  }),
});
