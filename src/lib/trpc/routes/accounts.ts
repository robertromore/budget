import {
  accounts,
  transactions,
  removeAccountSchema,
  type Account,
  type Transaction,
} from "$lib/schema";
import { z } from "zod";
import { publicProcedure, rateLimitedProcedure, t } from "../t";
import { eq, desc, isNull } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";
import { TRPCError } from "@trpc/server";
import { now, getLocalTimeZone } from "@internationalized/date";
import { generateUniqueSlug } from "$lib/utils/slug-utils";
import validator from "validator";

// Custom schema for account save operation (handles both create and update)
const accountSaveSchema = z.object({
  id: z.number().positive().optional(), // If provided, it's an update
  name: z.string()
    .transform(val => val?.trim()) // Trim whitespace
    .pipe(
      z.string()
        .min(1, "Account name is required")
        .min(2, "Account name must be at least 2 characters") 
        .max(50, "Account name must be less than 50 characters")
        .refine((val) => {
          // Reject XSS/HTML injection patterns and structural characters
          if (validator.contains(val, '<') || validator.contains(val, '>')) return false;
          if (validator.contains(val, '{') || validator.contains(val, '}')) return false;
          if (validator.contains(val, '[') || validator.contains(val, ']')) return false;
          if (validator.contains(val, '\\') || validator.contains(val, '|')) return false;
          // Also reject some problematic symbols (but allow SQL injection chars for testing)
          if (validator.contains(val, '@') || validator.contains(val, '#')) return false;
          if (validator.contains(val, '$') || validator.contains(val, '%')) return false;
          if (validator.contains(val, '^') || validator.contains(val, '*')) return false;
          return true;
        }, "Account name contains invalid characters")
    )
    .optional(),
  slug: z.string()
    .transform(val => val?.trim()) // Only trim whitespace
    .pipe(
      z.string()
        .min(2, "Slug must be at least 2 characters")
        .max(30, "Slug must be less than 30 characters")
        .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    )
    .optional(),
  notes: z.string()
    .transform(val => val?.trim()) // Trim notes too
    .pipe(
      z.string()
        .max(500, "Notes must be less than 500 characters")
        .refine((val) => {
          if (!val) return true; // Allow empty/null values
          // Reject any HTML tags
          if (validator.contains(val, '<') || validator.contains(val, '>')) {
            return false;
          }
          return true;
        }, "Notes cannot contain HTML tags")
    )
    .optional()
    .nullable(),
  closed: z.boolean().optional(),
}).refine((data) => {
  // For create operations (no id), name is required
  if (!data.id) {
    return !!data.name;
  }
  return true;
}, {
  message: "Account name is required when creating a new account",
  path: ["name"]
});

type AccountRecord = Omit<Account, "balance" | "transactions">;
type TransactionOnlyAmount = Pick<Transaction, "amount">;
export interface AccountRecordWithTransactionAmounts extends AccountRecord {
  transactions: TransactionOnlyAmount[];
}

export const accountRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    // Simplified query using standard Drizzle methods
    const accountsData = await ctx.db.query.accounts.findMany({
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
      orderBy: [accounts.id],
    });
    
    // Calculate balance for each account and running balance for each transaction
    return accountsData.map(account => {
      let runningBalance = 0;
      const transactionsWithBalance = account.transactions.map(transaction => {
        runningBalance += transaction.amount;
        return {
          ...transaction,
          balance: runningBalance
        };
      });
      
      return {
        ...account,
        balance: runningBalance,
        transactions: transactionsWithBalance
      };
    }) as Account[];
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

    // Calculate running balance for each transaction
    let runningBalance = 0;
    const transactionsWithBalance = account.transactions.map(transaction => {
      runningBalance += transaction.amount;
      return {
        ...transaction,
        balance: runningBalance
      };
    });

    const accountWithBalance = {
      ...account,
      balance: runningBalance,
      transactions: transactionsWithBalance
    };

    return accountWithBalance as Account;
  }),
  save: rateLimitedProcedure.input(accountSaveSchema).mutation(async ({ ctx, input }) => {
    if (input.id) {
      // For updates, get existing account first
      const existingAccount = await ctx.db.query.accounts.findFirst({
        where: (accounts, { eq, and, isNull }) =>
          and(eq(accounts.id, input.id!), isNull(accounts.deletedAt))
      });
      
      if (!existingAccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Prepare update data (only include fields that were provided)
      const updateData: any = {};
      
      if (input.name !== undefined) {
        updateData.name = input.name;
        // If name is being updated, regenerate slug unless one was provided
        const baseSlug = input.slug || slugify(input.name);
        updateData.slug = await generateUniqueSlug(
          ctx.db,
          "accounts",
          accounts.slug,
          baseSlug,
          {
            excludeId: input.id!,
            idColumn: accounts.id,
            deletedAtColumn: accounts.deletedAt
          }
        );
      }
      
      if (input.notes !== undefined) {
        updateData.notes = input.notes;
      }
      
      if (input.closed !== undefined) {
        updateData.closed = input.closed;
      }
      
      // Only update if there's something to update
      if (Object.keys(updateData).length === 0) {
        return existingAccount;
      }
      
      // Always update the timestamp when making changes
      updateData.updatedAt = now(getLocalTimeZone()).toDate().toISOString();
      
      const result = await ctx.db
        .update(accounts)
        .set(updateData)
        .where(eq(accounts.id, input.id!))
        .returning();
        
      if (!result[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update account",
        });
      }
      return result[0];
    }

    // For new accounts, name is required (validated by schema)
    if (!input.name) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Account name is required",
      });
    }

    const baseSlug = input.slug || slugify(input.name);
    const uniqueSlug = await generateUniqueSlug(
      ctx.db,
      "accounts",
      accounts.slug,
      baseSlug,
      {
        deletedAtColumn: accounts.deletedAt
      }
    );

    const merged = {
      name: input.name,
      slug: uniqueSlug,
      notes: input.notes,
      closed: input.closed || false,
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
