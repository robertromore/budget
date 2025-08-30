import {
  accounts,
  transactions,
  removeAccountSchema,
  type Account,
  accountFormSchema,
} from "$lib/schema";
import { z } from "zod/v4";
import { publicProcedure } from "../orpc";
import { eq, sql, desc, isNull } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";
import { ORPCError } from "@orpc/server";

export const accountRoutes = {
  all: publicProcedure.handler(async ({ context }) => {
    // Simplified query using standard Drizzle methods
    return (await context.db.query.accounts.findMany({
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

  load: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const account = await context.db.query.accounts.findFirst({
        where: sql`${accounts.id} = ${input.id} AND ${accounts.deletedAt} IS NULL`,
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
        throw new ORPCError("ACCOUNT_NOT_FOUND", {
          message: "Account not found",
        });
      }

      return account as Account;
    }),

  save: publicProcedure.input(accountFormSchema).handler(async ({ input, context }) => {
    if (input.id) {
      const result = await context.db
        .update(accounts)
        .set(input)
        .where(eq(accounts.id, input.id))
        .returning();
      if (!result[0]) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to update account",
        });
      }
      return result[0];
    }

    const merged = {
      ...input,
      slug: slugify(input.name),
    };

    const insertResult = await context.db.insert(accounts).values(merged).returning();
    if (!insertResult[0]) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create account",
      });
    }
    const new_account = insertResult[0];
    return new_account;
  }),

  remove: publicProcedure.input(removeAccountSchema).handler(async ({ input, context }) => {
    if (!input) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Account ID is required for deletion",
      });
    }
    const result = await context.db
      .update(accounts)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(accounts.id, input.id))
      .returning();
    if (!result[0]) {
      throw new ORPCError("NOT_FOUND", {
        message: "Account not found or could not be deleted",
      });
    }
    return result[0];
  }),
};