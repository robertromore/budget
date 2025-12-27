import {
  accounts,
  accountTypeEnum,
  removeAccountSchema,
  transactions,
  type Account,
  type Transaction,
} from "$lib/schema";
import { budgetAccounts, budgets } from "$lib/schema/budgets";
import { detectedPatterns } from "$lib/schema/detected-patterns";
import { importProfiles } from "$lib/schema/import-profiles";
import { scheduleDates } from "$lib/schema/schedule-dates";
import { scheduleSkips } from "$lib/schema/schedule-skips";
import { schedules } from "$lib/schema/schedules";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { isValidIconName } from "$lib/utils/icon-validation";
import { generateUniqueSlugForDB } from "$lib/utils/slug-utils";
import { getLocalTimeZone, now } from "@internationalized/date";
import slugify from "@sindresorhus/slugify";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, ne, notInArray, sql } from "drizzle-orm";
import validator from "validator";
import { z } from "zod";

const accountService = serviceFactory.getAccountService();

// Custom schema for account save operation (handles both create and update)
const accountSaveSchema = z
  .object({
    id: z.number().positive().optional(), // If provided, it's an update
    name: z
      .string()
      .transform((val) => val?.trim()) // Trim whitespace
      .pipe(
        z
          .string()
          .min(1, "Account name is required")
          .min(2, "Account name must be at least 2 characters")
          .max(50, "Account name must be less than 50 characters")
          .refine((val) => {
            // Reject XSS/HTML injection patterns and structural characters
            if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
            if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
            if (validator.contains(val, "[") || validator.contains(val, "]")) return false;
            if (validator.contains(val, "\\") || validator.contains(val, "|")) return false;
            // Also reject some problematic symbols (but allow SQL injection chars for testing)
            if (validator.contains(val, "@") || validator.contains(val, "#")) return false;
            if (validator.contains(val, "$") || validator.contains(val, "%")) return false;
            if (validator.contains(val, "^") || validator.contains(val, "*")) return false;
            return true;
          }, "Account name contains invalid characters")
      )
      .optional(),
    slug: z
      .string()
      .transform((val) => val?.trim()) // Only trim whitespace
      .pipe(
        z
          .string()
          .min(2, "Slug must be at least 2 characters")
          .max(30, "Slug must be less than 30 characters")
          .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
      )
      .optional(),
    notes: z
      .string()
      .transform((val) => val?.trim()) // Trim notes too
      .pipe(
        z
          .string()
          .max(500, "Notes must be less than 500 characters")
          .refine((val) => {
            if (!val) return true; // Allow empty/null values
            // Reject any HTML tags
            if (validator.contains(val, "<") || validator.contains(val, ">")) {
              return false;
            }
            return true;
          }, "Notes cannot contain HTML tags")
      )
      .optional()
      .nullable(),
    closed: z.boolean().optional(),
    // Enhanced account fields
    accountType: z
      .enum(accountTypeEnum, {
        message: "Please select a valid account type",
      })
      .optional(),
    institution: z
      .string()
      .transform((val) => val?.trim())
      .pipe(z.string().max(100, "Institution name must be less than 100 characters"))
      .optional()
      .nullable(),
    accountIcon: z
      .string()
      .refine((val) => !val || isValidIconName(val), "Invalid icon selection")
      .optional()
      .nullable(),
    accountColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code")
      .optional()
      .nullable(),
    initialBalance: z.number().optional(),
    accountNumberLast4: z
      .string()
      .transform((val) => val?.trim())
      .pipe(z.string().regex(/^\d{4}$/, "Account number must be exactly 4 digits"))
      .optional()
      .nullable(),
    onBudget: z.coerce.boolean().optional(),
    // Debt account-specific fields
    debtLimit: z.number().optional().nullable(),
    minimumPayment: z.number().optional().nullable(),
    paymentDueDay: z.number().min(1).max(31).optional().nullable(),
    interestRate: z.number().optional().nullable(),
    // HSA-specific fields
    hsaContributionLimit: z.number().optional().nullable(),
    hsaType: z.enum(["individual", "family"]).optional().nullable(),
    hsaCurrentTaxYear: z.number().optional().nullable(),
    hsaAdministrator: z.string().max(100).optional().nullable(),
    hsaHighDeductiblePlan: z.string().max(200).optional().nullable(),
  })
  .refine(
    (data) => {
      // For create operations (no id), name is required
      if (!data.id) {
        return !!data.name;
      }
      return true;
    },
    {
      message: "Account name is required when creating a new account",
      path: ["name"],
    }
  );

type AccountRecord = Omit<Account, "balance" | "transactions">;
type TransactionOnlyAmount = Pick<Transaction, "amount">;
export interface AccountRecordWithTransactionAmounts extends AccountRecord {
  transactions: TransactionOnlyAmount[];
}

export const accountRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    // Simplified query using standard Drizzle methods
    const accountsData = await ctx.db.query.accounts.findMany({
      where: (accounts, { eq, and, isNull }) =>
        and(eq(accounts.workspaceId, ctx.workspaceId), isNull(accounts.deletedAt)),
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
    });

    // Calculate balance for each account and running balance for each transaction
    return accountsData.map((account) => {
      // Start with initial balance as the base
      const initialBalance = account.initialBalance || 0;
      let runningBalance = initialBalance;
      const transactionsWithBalance = account.transactions.map((transaction) => {
        runningBalance += transaction.amount;
        return {
          ...transaction,
          balance: runningBalance,
        };
      });

      return {
        ...account,
        balance: runningBalance,
        transactions: transactionsWithBalance,
      };
    }) as Account[];
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    const account = await ctx.db.query.accounts.findFirst({
      where: (accounts, { eq, and, isNull }) =>
        and(
          eq(accounts.id, input.id),
          eq(accounts.workspaceId, ctx.workspaceId),
          isNull(accounts.deletedAt)
        ),
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

    // Calculate running balance for each transaction, starting with initial balance
    const initialBalance = account.initialBalance || 0;
    let runningBalance = initialBalance;
    const transactionsWithBalance = account.transactions.map((transaction) => {
      runningBalance += transaction.amount;
      return {
        ...transaction,
        balance: runningBalance,
      };
    });

    const accountWithBalance = {
      ...account,
      balance: runningBalance,
      transactions: transactionsWithBalance,
    };

    return accountWithBalance as Account;
  }),
  getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const account = await ctx.db.query.accounts.findFirst({
      where: (accounts, { eq, and, isNull }) =>
        and(
          eq(accounts.slug, input.slug),
          eq(accounts.workspaceId, ctx.workspaceId),
          isNull(accounts.deletedAt)
        ),
      with: {
        transactions: {
          where: isNull(transactions.deletedAt),
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

    // Calculate running balance from all transactions, starting with initial balance
    const initialBalance = account.initialBalance || 0;
    let runningBalance = initialBalance;
    account.transactions.forEach((transaction) => {
      runningBalance += transaction.amount;
    });

    const accountWithBalance = {
      ...account,
      balance: runningBalance,
    };

    return accountWithBalance as Account;
  }),
  save: rateLimitedProcedure.input(accountSaveSchema).mutation(async ({ ctx, input }) => {
    if (input.id) {
      // For updates, get existing account first
      const existingAccount = await ctx.db.query.accounts.findFirst({
        where: (accounts, { eq, and, isNull }) =>
          and(
            eq(accounts.id, input.id!),
            eq(accounts.workspaceId, ctx.workspaceId),
            isNull(accounts.deletedAt)
          ),
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
        updateData.slug = await generateUniqueSlugForDB(
          ctx.db,
          "accounts",
          accounts.slug,
          baseSlug,
          {
            excludeId: input.id!,
            idColumn: accounts.id,
            deletedAtColumn: accounts.deletedAt,
          }
        );
      }

      if (input.notes !== undefined) {
        updateData.notes = input.notes;
      }

      if (input.closed !== undefined) {
        updateData.closed = input.closed;
      }

      // Enhanced account fields
      if (input.accountType !== undefined) {
        updateData.accountType = input.accountType;
      }

      if (input.institution !== undefined) {
        updateData.institution = input.institution;
      }

      if (input.accountIcon !== undefined) {
        updateData.accountIcon = input.accountIcon;
      }

      if (input.accountColor !== undefined) {
        updateData.accountColor = input.accountColor;
      }

      if (input.initialBalance !== undefined) {
        updateData.initialBalance = input.initialBalance;
      }

      if (input.accountNumberLast4 !== undefined) {
        updateData.accountNumberLast4 = input.accountNumberLast4;
      }

      if (input.onBudget !== undefined) {
        updateData.onBudget = input.onBudget;
      }

      // Debt account-specific fields
      if (input.debtLimit !== undefined) {
        updateData.debtLimit = input.debtLimit;
      }

      if (input.minimumPayment !== undefined) {
        updateData.minimumPayment = input.minimumPayment;
      }

      if (input.paymentDueDay !== undefined) {
        updateData.paymentDueDay = input.paymentDueDay;
      }

      if (input.interestRate !== undefined) {
        updateData.interestRate = input.interestRate;
      }

      // HSA-specific fields
      if (input.hsaContributionLimit !== undefined) {
        updateData.hsaContributionLimit = input.hsaContributionLimit;
      }

      if (input.hsaType !== undefined) {
        updateData.hsaType = input.hsaType;
      }

      if (input.hsaCurrentTaxYear !== undefined) {
        updateData.hsaCurrentTaxYear = input.hsaCurrentTaxYear;
      }

      if (input.hsaAdministrator !== undefined) {
        updateData.hsaAdministrator = input.hsaAdministrator;
      }

      if (input.hsaHighDeductiblePlan !== undefined) {
        updateData.hsaHighDeductiblePlan = input.hsaHighDeductiblePlan;
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
        .where(and(eq(accounts.id, input.id!), eq(accounts.workspaceId, ctx.workspaceId)))
        .returning();

      if (!result[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update account",
        });
      }

      // Calculate balance from transactions plus initial balance
      const [balanceResult] = await ctx.db
        .select({
          balance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(and(eq(transactions.accountId, input.id!), isNull(transactions.deletedAt)));

      const transactionBalance = balanceResult?.balance || 0;
      const initialBalance = result[0].initialBalance || 0;

      return {
        ...result[0],
        balance: transactionBalance + initialBalance,
      };
    }

    // For new accounts, name is required (validated by schema)
    if (!input.name) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Account name is required",
      });
    }

    // Use AccountService to create account with initial balance transaction
    try {
      const createdAccount = await accountService.createAccount(
        {
          name: input.name,
          ...(input.notes && { notes: input.notes }),
          initialBalance: input.initialBalance || 0.0,
        },
        ctx.workspaceId
      );

      // Update the created account with additional fields not handled by the service
      if (
        input.accountType ||
        input.institution ||
        input.accountIcon ||
        input.accountColor ||
        input.accountNumberLast4 ||
        input.onBudget !== undefined ||
        input.debtLimit !== undefined ||
        input.minimumPayment !== undefined ||
        input.paymentDueDay !== undefined ||
        input.interestRate !== undefined ||
        input.hsaContributionLimit !== undefined ||
        input.hsaType ||
        input.hsaCurrentTaxYear !== undefined ||
        input.hsaAdministrator ||
        input.hsaHighDeductiblePlan
      ) {
        const updateData: any = {};

        if (input.accountType) updateData.accountType = input.accountType;
        if (input.institution) updateData.institution = input.institution;
        if (input.accountIcon) updateData.accountIcon = input.accountIcon;
        if (input.accountColor) updateData.accountColor = input.accountColor;
        if (input.accountNumberLast4) updateData.accountNumberLast4 = input.accountNumberLast4;

        // Set onBudget - HSA accounts default to off-budget unless explicitly specified
        if (input.onBudget !== undefined) {
          updateData.onBudget = input.onBudget;
        } else if (input.accountType === "hsa") {
          updateData.onBudget = false;
        }

        // Debt account-specific fields
        if (input.debtLimit !== undefined) updateData.debtLimit = input.debtLimit;
        if (input.minimumPayment !== undefined) updateData.minimumPayment = input.minimumPayment;
        if (input.paymentDueDay !== undefined) updateData.paymentDueDay = input.paymentDueDay;
        if (input.interestRate !== undefined) updateData.interestRate = input.interestRate;

        // HSA-specific fields
        if (input.hsaContributionLimit !== undefined)
          updateData.hsaContributionLimit = input.hsaContributionLimit;
        if (input.hsaType) updateData.hsaType = input.hsaType;
        if (input.hsaCurrentTaxYear !== undefined)
          updateData.hsaCurrentTaxYear = input.hsaCurrentTaxYear;
        if (input.hsaAdministrator) updateData.hsaAdministrator = input.hsaAdministrator;
        if (input.hsaHighDeductiblePlan)
          updateData.hsaHighDeductiblePlan = input.hsaHighDeductiblePlan;

        updateData.updatedAt = now(getLocalTimeZone()).toDate().toISOString();

        await ctx.db
          .update(accounts)
          .set(updateData)
          .where(
            and(eq(accounts.id, createdAccount.id), eq(accounts.workspaceId, ctx.workspaceId))
          );

        // Re-fetch the account with proper balance calculation after update
        // Use the same logic as the load route to get account with calculated balance
        const accountWithBalance = await ctx.db.query.accounts.findFirst({
          where: (accounts, { eq, and, isNull }) =>
            and(
              eq(accounts.id, createdAccount.id),
              eq(accounts.workspaceId, ctx.workspaceId),
              isNull(accounts.deletedAt)
            ),
          with: {
            transactions: {
              where: (transactions, { isNull }) => isNull(transactions.deletedAt),
              with: {
                payee: true,
                category: true,
              },
              orderBy: (transactions, { asc }) => [transactions.date, transactions.id],
            },
          },
        });

        if (!accountWithBalance) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Account not found after creation",
          });
        }

        // Calculate running balance for each transaction, starting with initial balance
        const initialBalance = accountWithBalance.initialBalance || 0;
        let runningBalance = initialBalance;
        const transactionsWithBalance = accountWithBalance.transactions.map((transaction) => {
          runningBalance += transaction.amount;
          return {
            ...transaction,
            balance: runningBalance,
          };
        });

        return {
          ...accountWithBalance,
          balance: runningBalance,
          transactions: transactionsWithBalance,
        } as Account;
      }

      // Even if no additional fields to update, we still need to return account with calculated balance
      const accountWithBalance = await ctx.db.query.accounts.findFirst({
        where: (accounts, { eq, and, isNull }) =>
          and(
            eq(accounts.id, createdAccount.id),
            eq(accounts.workspaceId, ctx.workspaceId),
            isNull(accounts.deletedAt)
          ),
        with: {
          transactions: {
            where: (transactions, { isNull }) => isNull(transactions.deletedAt),
            with: {
              payee: true,
              category: true,
            },
            orderBy: (transactions, { asc }) => [transactions.date, transactions.id],
          },
        },
      });

      if (!accountWithBalance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found after creation",
        });
      }

      // Calculate running balance for each transaction, starting with initial balance
      const initialBalance = accountWithBalance.initialBalance || 0;
      let runningBalance = initialBalance;
      const transactionsWithBalance = accountWithBalance.transactions.map((transaction) => {
        runningBalance += transaction.amount;
        return {
          ...transaction,
          balance: runningBalance,
        };
      });

      return {
        ...accountWithBalance,
        balance: runningBalance,
        transactions: transactionsWithBalance,
      } as Account;
    } catch (error) {
      console.error("Account creation error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to create account",
        cause: error,
      });
    }
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
      .set({ deletedAt: getCurrentTimestamp() })
      .where(and(eq(accounts.id, input.id), eq(accounts.workspaceId, ctx.workspaceId)))
      .returning();
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Account not found or could not be deleted",
      });
    }
    return result[0];
  }),
  updateEnabledMetrics: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
        enabledMetrics: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate account exists and is not deleted
      const account = await ctx.db.query.accounts.findFirst({
        where: and(
          eq(accounts.id, input.accountId),
          eq(accounts.workspaceId, ctx.workspaceId),
          isNull(accounts.deletedAt)
        ),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Update the enabled metrics
      const result = await ctx.db
        .update(accounts)
        .set({
          enabledMetrics: JSON.stringify(input.enabledMetrics),
          updatedAt: getCurrentTimestamp(),
        })
        .where(and(eq(accounts.id, input.accountId), eq(accounts.workspaceId, ctx.workspaceId)))
        .returning();

      if (!result[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update enabled metrics",
        });
      }

      return result[0];
    }),
  seedDefaultAccounts: rateLimitedProcedure
    .input(
      z.object({
        slugs: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const createdAccounts = await accountService.seedDefaultAccounts(
          input.slugs,
          ctx.workspaceId
        );
        return createdAccounts;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to seed default accounts",
          cause: error,
        });
      }
    }),
  defaultAccountsStatus: publicProcedure.query(async () => {
    try {
      return await accountService.getDefaultAccountsStatus();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to get default accounts status",
        cause: error,
      });
    }
  }),
  availableDefaultAccounts: publicProcedure.query(async () => {
    try {
      const status = await accountService.getDefaultAccountsStatus();
      return status.accounts.filter((a) => !a.installed);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to get available default accounts",
        cause: error,
      });
    }
  }),

  // Account data counts for settings
  getAccountDataCounts: publicProcedure
    .input(z.object({ accountId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      // Verify account belongs to workspace
      const account = await ctx.db.query.accounts.findFirst({
        where: (accounts, { eq, and, isNull }) =>
          and(
            eq(accounts.id, input.accountId),
            eq(accounts.workspaceId, ctx.workspaceId),
            isNull(accounts.deletedAt)
          ),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Get transaction count
      const [transactionCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(transactions)
        .where(and(eq(transactions.accountId, input.accountId), isNull(transactions.deletedAt)));

      // Get schedule count (schedules table doesn't have deletedAt)
      const [scheduleCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schedules)
        .where(eq(schedules.accountId, input.accountId));

      // Get import profile count
      const [importProfileCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(importProfiles)
        .where(eq(importProfiles.accountId, input.accountId));

      // Get detected pattern count
      const [patternCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(detectedPatterns)
        .where(eq(detectedPatterns.accountId, input.accountId));

      // Get budget count - only budgets SOLELY linked to this account
      // First find budget IDs linked to other accounts
      const budgetsLinkedToOtherAccounts = ctx.db
        .select({ budgetId: budgetAccounts.budgetId })
        .from(budgetAccounts)
        .where(ne(budgetAccounts.accountId, input.accountId));

      // Count budgets linked to this account that are NOT linked to other accounts
      const [budgetCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(budgetAccounts)
        .innerJoin(budgets, eq(budgetAccounts.budgetId, budgets.id))
        .where(
          and(
            eq(budgetAccounts.accountId, input.accountId),
            isNull(budgets.deletedAt),
            notInArray(budgetAccounts.budgetId, budgetsLinkedToOtherAccounts)
          )
        );

      return {
        transactions: Number(transactionCount?.count || 0),
        schedules: Number(scheduleCount?.count || 0),
        importProfiles: Number(importProfileCount?.count || 0),
        detectedPatterns: Number(patternCount?.count || 0),
        budgets: Number(budgetCount?.count || 0),
      };
    }),

  // Delete all transactions for an account
  deleteAllTransactions: rateLimitedProcedure
    .input(z.object({ accountId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to workspace
      const account = await ctx.db.query.accounts.findFirst({
        where: (accounts, { eq, and, isNull }) =>
          and(
            eq(accounts.id, input.accountId),
            eq(accounts.workspaceId, ctx.workspaceId),
            isNull(accounts.deletedAt)
          ),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Soft delete all transactions for this account
      const result = await ctx.db
        .update(transactions)
        .set({ deletedAt: getCurrentTimestamp() })
        .where(and(eq(transactions.accountId, input.accountId), isNull(transactions.deletedAt)))
        .returning({ id: transactions.id });

      return { deletedCount: result.length };
    }),

  // Delete transactions by date range
  deleteTransactionsByDateRange: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to workspace
      const account = await ctx.db.query.accounts.findFirst({
        where: (accounts, { eq, and, isNull }) =>
          and(
            eq(accounts.id, input.accountId),
            eq(accounts.workspaceId, ctx.workspaceId),
            isNull(accounts.deletedAt)
          ),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Soft delete transactions in the date range
      const result = await ctx.db
        .update(transactions)
        .set({ deletedAt: getCurrentTimestamp() })
        .where(
          and(
            eq(transactions.accountId, input.accountId),
            isNull(transactions.deletedAt),
            sql`${transactions.date} >= ${input.startDate}`,
            sql`${transactions.date} <= ${input.endDate}`
          )
        )
        .returning({ id: transactions.id });

      return { deletedCount: result.length };
    }),

  // Clear import profiles for an account
  clearImportProfiles: rateLimitedProcedure
    .input(z.object({ accountId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to workspace
      const account = await ctx.db.query.accounts.findFirst({
        where: (accounts, { eq, and, isNull }) =>
          and(
            eq(accounts.id, input.accountId),
            eq(accounts.workspaceId, ctx.workspaceId),
            isNull(accounts.deletedAt)
          ),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Delete import profiles for this account (hard delete since they're not soft-deletable)
      const result = await ctx.db
        .delete(importProfiles)
        .where(eq(importProfiles.accountId, input.accountId))
        .returning({ id: importProfiles.id });

      return { deletedCount: result.length };
    }),

  // Clear schedules for an account
  clearSchedules: rateLimitedProcedure
    .input(z.object({ accountId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to workspace
      const account = await ctx.db.query.accounts.findFirst({
        where: (accounts, { eq, and, isNull }) =>
          and(
            eq(accounts.id, input.accountId),
            eq(accounts.workspaceId, ctx.workspaceId),
            isNull(accounts.deletedAt)
          ),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Get schedule IDs for this account first
      const accountSchedules = await ctx.db
        .select({ id: schedules.id })
        .from(schedules)
        .where(eq(schedules.accountId, input.accountId));

      const scheduleIds = accountSchedules.map((s) => s.id);

      if (scheduleIds.length > 0) {
        // First, break the circular reference by setting dateId to null
        await ctx.db
          .update(schedules)
          .set({ dateId: null })
          .where(inArray(schedules.id, scheduleIds));

        // Delete related scheduleDates (no cascade on FK)
        await ctx.db
          .delete(scheduleDates)
          .where(inArray(scheduleDates.scheduleId, scheduleIds));

        // Delete related scheduleSkips (has cascade but delete explicitly for clarity)
        await ctx.db
          .delete(scheduleSkips)
          .where(inArray(scheduleSkips.scheduleId, scheduleIds));
      }

      // Now delete the schedules
      const result = await ctx.db
        .delete(schedules)
        .where(eq(schedules.accountId, input.accountId))
        .returning({ id: schedules.id });

      return { deletedCount: result.length };
    }),

  // Clear detected patterns for an account
  clearDetectedPatterns: rateLimitedProcedure
    .input(z.object({ accountId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to workspace
      const account = await ctx.db.query.accounts.findFirst({
        where: (accounts, { eq, and, isNull }) =>
          and(
            eq(accounts.id, input.accountId),
            eq(accounts.workspaceId, ctx.workspaceId),
            isNull(accounts.deletedAt)
          ),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Delete detected patterns for this account
      const result = await ctx.db
        .delete(detectedPatterns)
        .where(eq(detectedPatterns.accountId, input.accountId))
        .returning({ id: detectedPatterns.id });

      return { deletedCount: result.length };
    }),

  // Clear budgets solely associated with this account
  clearBudgets: rateLimitedProcedure
    .input(z.object({ accountId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to workspace
      const account = await ctx.db.query.accounts.findFirst({
        where: (accounts, { eq, and, isNull }) =>
          and(
            eq(accounts.id, input.accountId),
            eq(accounts.workspaceId, ctx.workspaceId),
            isNull(accounts.deletedAt)
          ),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Find budget IDs linked to other accounts
      const budgetsLinkedToOtherAccounts = ctx.db
        .select({ budgetId: budgetAccounts.budgetId })
        .from(budgetAccounts)
        .where(ne(budgetAccounts.accountId, input.accountId));

      // Get budgets linked ONLY to this account (not linked to other accounts)
      const budgetsToDelete = await ctx.db
        .select({ budgetId: budgetAccounts.budgetId })
        .from(budgetAccounts)
        .innerJoin(budgets, eq(budgetAccounts.budgetId, budgets.id))
        .where(
          and(
            eq(budgetAccounts.accountId, input.accountId),
            isNull(budgets.deletedAt),
            notInArray(budgetAccounts.budgetId, budgetsLinkedToOtherAccounts)
          )
        );

      const budgetIds = budgetsToDelete.map((b) => b.budgetId);

      if (budgetIds.length > 0) {
        // Reset any recommendations that were applied to create these budgets
        // This allows users to reapply the recommendations after deleting the budgets
        const recommendationService = serviceFactory.getRecommendationService();
        for (const budgetId of budgetIds) {
          await recommendationService.resetRecommendationForBudget(budgetId);
        }

        // Soft delete the budgets (they have deletedAt column)
        await ctx.db
          .update(budgets)
          .set({ deletedAt: getCurrentTimestamp() })
          .where(inArray(budgets.id, budgetIds));
      }

      return { deletedCount: budgetIds.length };
    }),

  // Close account (soft hide from views)
  closeAccount: rateLimitedProcedure
    .input(z.object({ accountId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(accounts)
        .set({
          closed: true,
          updatedAt: getCurrentTimestamp(),
        })
        .where(
          and(
            eq(accounts.id, input.accountId),
            eq(accounts.workspaceId, ctx.workspaceId),
            isNull(accounts.deletedAt)
          )
        )
        .returning();

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      return result[0];
    }),

  // Reopen account
  reopenAccount: rateLimitedProcedure
    .input(z.object({ accountId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(accounts)
        .set({
          closed: false,
          updatedAt: getCurrentTimestamp(),
        })
        .where(
          and(
            eq(accounts.id, input.accountId),
            eq(accounts.workspaceId, ctx.workspaceId),
            isNull(accounts.deletedAt)
          )
        )
        .returning();

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      return result[0];
    }),

  // Permanently delete account
  permanentlyDeleteAccount: rateLimitedProcedure
    .input(z.object({ accountId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Verify account exists and belongs to workspace
      const account = await ctx.db.query.accounts.findFirst({
        where: (accounts, { eq, and, isNull }) =>
          and(
            eq(accounts.id, input.accountId),
            eq(accounts.workspaceId, ctx.workspaceId),
            isNull(accounts.deletedAt)
          ),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // First soft delete all transactions
      await ctx.db
        .update(transactions)
        .set({ deletedAt: getCurrentTimestamp() })
        .where(and(eq(transactions.accountId, input.accountId), isNull(transactions.deletedAt)));

      // Get schedule IDs for this account
      const accountSchedules = await ctx.db
        .select({ id: schedules.id })
        .from(schedules)
        .where(eq(schedules.accountId, input.accountId));

      const scheduleIds = accountSchedules.map((s) => s.id);

      if (scheduleIds.length > 0) {
        // First, break the circular reference by setting dateId to null
        await ctx.db
          .update(schedules)
          .set({ dateId: null })
          .where(inArray(schedules.id, scheduleIds));

        // Delete related scheduleDates (no cascade on FK)
        await ctx.db
          .delete(scheduleDates)
          .where(inArray(scheduleDates.scheduleId, scheduleIds));

        // Delete related scheduleSkips
        await ctx.db
          .delete(scheduleSkips)
          .where(inArray(scheduleSkips.scheduleId, scheduleIds));
      }

      // Delete all schedules (hard delete since schedules table doesn't have deletedAt)
      await ctx.db.delete(schedules).where(eq(schedules.accountId, input.accountId));

      // Delete import profiles
      await ctx.db.delete(importProfiles).where(eq(importProfiles.accountId, input.accountId));

      // Delete detected patterns
      await ctx.db.delete(detectedPatterns).where(eq(detectedPatterns.accountId, input.accountId));

      // Finally soft delete the account
      const result = await ctx.db
        .update(accounts)
        .set({ deletedAt: getCurrentTimestamp() })
        .where(and(eq(accounts.id, input.accountId), eq(accounts.workspaceId, ctx.workspaceId)))
        .returning();

      if (!result[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete account",
        });
      }

      return { success: true };
    }),
});
