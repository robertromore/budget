import type { Context } from "./context";
import {
  accounts,
  transactions,
  categories, 
  payees,
  schedules,
  views,
  type Account,
  type Category,
  type Payee,
  type Schedule,
  type Transaction,
  type View,
} from "$lib/schema";
import {
  accountFormSchema,
  categoryFormSchema,
  payeeFormSchema,
  transactionFormSchema,
  scheduleFormSchema,
  viewFormSchema,
  type AccountFormSchema,
  type CategoryFormSchema,
  type PayeeFormSchema,
  type TransactionFormSchema,
  type ScheduleFormSchema,
  type ViewFormSchema,
} from "$lib/schema/forms";
import { eq, sql, desc, isNull } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";
import { z } from "zod/v4";

// Server-side caller with direct implementations
export function createCaller(context: Context) {
  return {
    accounts: {
      all: async (): Promise<Account[]> => {
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
      },
      load: async (input: { id: number }): Promise<Account> => {
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
          throw new Error("Account not found");
        }
        
        return account as Account;
      },
      save: async (input: z.infer<typeof accountFormSchema>) => {
        if (input.id) {
          const result = await context.db
            .update(accounts)
            .set(input)
            .where(eq(accounts.id, input.id))
            .returning();
          if (!result[0]) {
            throw new Error("Failed to update account");
          }
          return result[0];
        }

        const merged = {
          ...input,
          slug: slugify(input.name),
        };

        const insertResult = await context.db.insert(accounts).values(merged).returning();
        if (!insertResult[0]) {
          throw new Error("Failed to create account");
        }
        return insertResult[0];
      },
      remove: async (input: { id: number }) => {
        const result = await context.db
          .update(accounts)
          .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(accounts.id, input.id))
          .returning();
        if (!result[0]) {
          throw new Error("Account not found or could not be deleted");
        }
        return result[0];
      },
    },
    categories: {
      all: async (): Promise<Category[]> => {
        return await context.db.query.categories.findMany({
          where: isNull(categories.deletedAt),
          orderBy: [categories.name],
        });
      },
      save: async (input: z.infer<typeof categoryFormSchema>) => {
        if (input.id) {
          const result = await context.db
            .update(categories)
            .set(input)
            .where(eq(categories.id, input.id))
            .returning();
          if (!result[0]) {
            throw new Error("Failed to update category");
          }
          return result[0];
        }
        const insertResult = await context.db.insert(categories).values(input).returning();
        if (!insertResult[0]) {
          throw new Error("Failed to create category");
        }
        return insertResult[0];
      },
      remove: async (input: { id: number }) => {
        const result = await context.db
          .update(categories)
          .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(categories.id, input.id))
          .returning();
        if (!result[0]) {
          throw new Error("Category not found or could not be deleted");
        }
        return result[0];
      },
    },
    payees: {
      all: async (): Promise<Payee[]> => {
        return await context.db.query.payees.findMany({
          where: isNull(payees.deletedAt),
          orderBy: [payees.name],
        });
      },
      save: async (input: z.infer<typeof payeeFormSchema>) => {
        if (input.id) {
          const result = await context.db
            .update(payees)
            .set(input)
            .where(eq(payees.id, input.id))
            .returning();
          if (!result[0]) {
            throw new Error("Failed to update payee");
          }
          return result[0];
        }
        const insertResult = await context.db.insert(payees).values(input).returning();
        if (!insertResult[0]) {
          throw new Error("Failed to create payee");
        }
        return insertResult[0];
      },
      remove: async (input: { id: number }) => {
        const result = await context.db
          .update(payees)
          .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(payees.id, input.id))
          .returning();
        if (!result[0]) {
          throw new Error("Payee not found or could not be deleted");
        }
        return result[0];
      },
    },
    transactions: {
      save: async (input: z.infer<typeof transactionFormSchema>) => {
        if (input.id) {
          const result = await context.db
            .update(transactions)
            .set(input)
            .where(eq(transactions.id, input.id))
            .returning();
          if (!result[0]) {
            throw new Error("Failed to update transaction");
          }
          return result[0];
        }
        const insertResult = await context.db.insert(transactions).values(input).returning();
        if (!insertResult[0]) {
          throw new Error("Failed to create transaction");
        }
        return insertResult[0];
      },
    },
    schedules: {
      all: async (): Promise<Schedule[]> => {
        return await context.db.query.schedules.findMany({
          where: isNull(schedules.deletedAt),
          orderBy: [schedules.name],
        });
      },
      save: async (input: z.infer<typeof scheduleFormSchema>) => {
        if (input.id) {
          const result = await context.db
            .update(schedules)
            .set(input)
            .where(eq(schedules.id, input.id))
            .returning();
          if (!result[0]) {
            throw new Error("Failed to update schedule");
          }
          return result[0];
        }
        const insertResult = await context.db.insert(schedules).values(input).returning();
        if (!insertResult[0]) {
          throw new Error("Failed to create schedule");
        }
        return insertResult[0];
      },
      remove: async (input: { id: number }) => {
        const result = await context.db
          .update(schedules)
          .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(schedules.id, input.id))
          .returning();
        if (!result[0]) {
          throw new Error("Schedule not found or could not be deleted");
        }
        return result[0];
      },
    },
    views: {
      all: async (): Promise<View[]> => {
        return await context.db.query.views.findMany({
          orderBy: [views.name],
        });
      },
      save: async (input: z.infer<typeof viewFormSchema>) => {
        if (input.id) {
          const result = await context.db
            .update(views)
            .set(input)
            .where(eq(views.id, input.id))
            .returning();
          if (!result[0]) {
            throw new Error("Failed to update view");
          }
          return result[0];
        }
        const insertResult = await context.db.insert(views).values(input).returning();
        if (!insertResult[0]) {
          throw new Error("Failed to create view");
        }
        return insertResult[0];
      },
      remove: async (input: { id: number }) => {
        const result = await context.db
          .delete(views)
          .where(eq(views.id, input.id))
          .returning();
        if (!result[0]) {
          throw new Error("View not found or could not be deleted");
        }
        return result[0];
      },
    },
  };
}