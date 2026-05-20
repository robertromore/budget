/**
 * AI Tool Definitions
 *
 * Tools that the AI assistant can call to read data and perform actions
 * on behalf of the user.
 */

import { tool, jsonSchema } from "ai";
import { db } from "$core/server/db";
import {
  accounts,
  accountTypeEnum,
  ACCOUNT_TYPE_LABELS,
  type AccountType,
} from "$core/schema/accounts";
import { transactions } from "$core/schema/transactions";
import { categories } from "$core/schema/categories";
import { payees } from "$core/schema/payees";
import {
  schedules,
  scheduleSubscriptionTypes,
  scheduleSubscriptionStatuses,
  type ScheduleSubscriptionType,
  type ScheduleSubscriptionStatus,
} from "$core/schema/schedules";
import { scheduleDates } from "$core/schema/schedule-dates";
import { generateUniqueSlugForDB } from "$core/utils/slug-utils";
import slugify from "@sindresorhus/slugify";
import {
  budgets,
  budgetCategories,
  budgetPeriodInstances,
  budgetPeriodTemplates,
} from "$core/schema/budgets";
import { and, eq, gte, lte, like, desc, sql, isNull, inArray } from "drizzle-orm";
import { roundToCents } from "$core/utils/math-utilities";
import { serviceFactory } from "$core/server/shared/container/service-factory";
import { getPayeeAliasService } from "$core/server/domains/payees/alias-service";
import { getTransferMappingService } from "$core/server/domains/transfers/transfer-mapping-service";
import { schedulePriceHistory } from "$core/schema/schedule-price-history";
import {
  createMLModelStore,
  createSavingsOpportunityService,
  createRecurringTransactionDetectionService,
  createTimeSeriesForecastingService,
  createAnomalyDetectionService,
  createFeatureEngineeringService,
} from "$core/server/domains/ml";
import {
  type AIToolCallCollector,
  withTelemetry,
} from "$core/server/ai/telemetry";

/**
 * Create tool definitions for a specific workspace. When a telemetry
 * collector is supplied each tool's `execute` is wrapped so latency,
 * success state, and input/output shape land in the ai_tool_call table
 * at flush time.
 */
export function createAITools(workspaceId: number, collector?: AIToolCallCollector) {
  // Initialize ML services (lazy initialization via closures)
  const modelStore = createMLModelStore();
  const featureService = createFeatureEngineeringService();
  const savingsService = createSavingsOpportunityService(modelStore);
  const recurringService = createRecurringTransactionDetectionService(modelStore);
  const forecastingService = createTimeSeriesForecastingService(modelStore, featureService);
  const anomalyService = createAnomalyDetectionService(modelStore);

  const tools = {
    // ============================================
    // READ-ONLY TOOLS
    // ============================================

    /**
     * Get account details and balance
     */
    getAccountBalance: tool({
      description: "Get the current balance and details for a specific account by name or ID",
      inputSchema: jsonSchema<{ accountName?: string; accountId?: number }>({
        type: "object",
        properties: {
          accountName: { type: "string", description: "The name of the account to look up" },
          accountId: { type: "number", description: "The ID of the account to look up" },
        },
      }),
      execute: async ({ accountName, accountId }) => {
        // Build conditions
        const conditions: ReturnType<typeof eq>[] = [
          eq(accounts.workspaceId, workspaceId),
          isNull(accounts.deletedAt),
        ];

        if (accountId) {
          conditions.push(eq(accounts.id, accountId));
        }
        if (accountName) {
          conditions.push(like(accounts.name, `%${accountName}%`));
        }

        // Query accounts
        const results = await db
          .select({
            id: accounts.id,
            name: accounts.name,
            accountType: accounts.accountType,
            initialBalance: accounts.initialBalance,
            institution: accounts.institution,
          })
          .from(accounts)
          .where(and(...conditions))
          .limit(5);

        if (results.length === 0) {
          return { success: false as const, message: "No accounts found matching that criteria" };
        }

        // Calculate balances from transactions
        const accountIds = results.map((a) => a.id);
        const balances = await db
          .select({
            accountId: transactions.accountId,
            balance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(and(inArray(transactions.accountId, accountIds), isNull(transactions.deletedAt)))
          .groupBy(transactions.accountId);

        const balanceMap = new Map(balances.map((b) => [b.accountId, Number(b.balance)]));

        return {
          success: true as const,
          accounts: results.map((a) => {
            const txnBalance = balanceMap.get(a.id) || 0;
            const totalBalance = (a.initialBalance || 0) + txnBalance;
            return {
              id: a.id,
              name: a.name,
              type: a.accountType,
              balance: totalBalance, // Amounts are stored in dollars (real type)
              institution: a.institution,
            };
          }),
        };
      },
    }),

    /**
     * Get recent transactions - use this for "last N transactions" queries
     */
    getRecentTransactions: tool({
      description:
        "Get the most recent transactions. Use this when the user asks for 'last N transactions' or 'recent transactions'. No date filters needed - just specify how many transactions to return.",
      inputSchema: jsonSchema<{ limit?: number }>({
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of transactions to return (default 10, max 50)",
          },
        },
      }),
      execute: async ({ limit = 10 }) => {
        console.log("[AI Tool] getRecentTransactions called with limit:", limit);

        const results = await db
          .select({
            id: transactions.id,
            date: transactions.date,
            amount: transactions.amount,
            notes: transactions.notes,
            payeeName: payees.name,
            categoryName: categories.name,
            accountName: accounts.name,
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .leftJoin(payees, eq(transactions.payeeId, payees.id))
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(and(eq(accounts.workspaceId, workspaceId), isNull(transactions.deletedAt)))
          .orderBy(desc(transactions.date))
          .limit(Math.min(limit, 50));

        console.log("[AI Tool] getRecentTransactions found:", results.length, "transactions");

        return {
          success: true as const,
          count: results.length,
          transactions: results.map((t) => ({
            id: t.id,
            date: t.date,
            amount: Number(t.amount), // Amounts are stored in dollars (real type)
            notes: t.notes,
            payee: t.payeeName,
            category: t.categoryName,
            account: t.accountName,
          })),
        };
      },
    }),

    /**
     * Search transactions with filters
     */
    searchTransactions: tool({
      description:
        "Search and filter transactions by payee, category, amount, or date range. Use getRecentTransactions instead if user just wants the last N transactions without filters.",
      inputSchema: jsonSchema<{
        payeeName?: string;
        categoryName?: string;
        minAmount?: number;
        maxAmount?: number;
        startDate?: string;
        endDate?: string;
        limit?: number;
      }>({
        type: "object",
        properties: {
          payeeName: { type: "string", description: "Filter by payee name (partial match)" },
          categoryName: { type: "string", description: "Filter by category name (partial match)" },
          minAmount: {
            type: "number",
            description: "Minimum transaction amount (absolute value in dollars)",
          },
          maxAmount: {
            type: "number",
            description: "Maximum transaction amount (absolute value in dollars)",
          },
          startDate: {
            type: "string",
            description: "Start date in YYYY-MM-DD format (only if user specifies a date range)",
          },
          endDate: {
            type: "string",
            description: "End date in YYYY-MM-DD format (only if user specifies a date range)",
          },
          limit: { type: "number", description: "Maximum number of results (default 20, max 50)" },
        },
      }),
      execute: async (params) => {
        const {
          payeeName,
          categoryName,
          minAmount,
          maxAmount,
          startDate,
          endDate,
          limit = 20,
        } = params;
        console.log("[AI Tool] searchTransactions called with:", JSON.stringify(params));

        // Filter through accounts since transactions don't have workspaceId directly
        const conditions: ReturnType<typeof eq>[] = [
          eq(accounts.workspaceId, workspaceId),
          isNull(transactions.deletedAt),
        ];

        if (startDate) {
          conditions.push(gte(transactions.date, startDate));
        }
        if (endDate) {
          conditions.push(lte(transactions.date, endDate));
        }
        if (minAmount !== undefined) {
          conditions.push(sql`ABS(${transactions.amount}) >= ${minAmount}`);
        }
        if (maxAmount !== undefined) {
          conditions.push(sql`ABS(${transactions.amount}) <= ${maxAmount}`);
        }

        const results = await db
          .select({
            id: transactions.id,
            date: transactions.date,
            amount: transactions.amount,
            notes: transactions.notes,
            payeeName: payees.name,
            categoryName: categories.name,
            accountName: accounts.name,
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .leftJoin(payees, eq(transactions.payeeId, payees.id))
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(and(...conditions))
          .orderBy(desc(transactions.date))
          .limit(Math.min(limit, 50));

        // Filter by payee/category name in memory if specified
        let filtered = results;
        if (payeeName) {
          const lowerPayee = payeeName.toLowerCase();
          filtered = filtered.filter((t) => t.payeeName?.toLowerCase().includes(lowerPayee));
        }
        if (categoryName) {
          const lowerCategory = categoryName.toLowerCase();
          filtered = filtered.filter((t) => t.categoryName?.toLowerCase().includes(lowerCategory));
        }

        return {
          success: true as const,
          count: filtered.length,
          transactions: filtered.map((t) => ({
            id: t.id,
            date: t.date,
            amount: Number(t.amount), // Amounts are stored in dollars (real type)
            notes: t.notes,
            payee: t.payeeName,
            category: t.categoryName,
            account: t.accountName,
          })),
        };
      },
    }),

    /**
     * Get budget status and spending
     */
    getBudgetStatus: tool({
      description:
        "Get the current status of a budget including allocated amount, spent amount, and remaining balance",
      inputSchema: jsonSchema<{ budgetName?: string; budgetId?: number }>({
        type: "object",
        properties: {
          budgetName: { type: "string", description: "The name of the budget to look up" },
          budgetId: { type: "number", description: "The ID of the budget to look up" },
        },
      }),
      execute: async ({ budgetName, budgetId }) => {
        const conditions: ReturnType<typeof eq>[] = [
          eq(budgets.workspaceId, workspaceId),
          isNull(budgets.deletedAt),
        ];

        if (budgetId) {
          conditions.push(eq(budgets.id, budgetId));
        }

        const results = await db
          .select({
            id: budgets.id,
            name: budgets.name,
            type: budgets.type,
            status: budgets.status,
            metadata: budgets.metadata,
          })
          .from(budgets)
          .where(and(...conditions))
          .limit(10);

        // Filter by name in memory
        let filtered = results;
        if (budgetName) {
          const lowerName = budgetName.toLowerCase();
          filtered = filtered.filter((b) => b.name.toLowerCase().includes(lowerName));
        }

        if (filtered.length === 0) {
          return { success: false as const, message: "No budgets found matching that criteria" };
        }

        // Get period instances for spending data
        const budgetIds = filtered.map((b) => b.id);
        const periodData = await db
          .select({
            budgetId: budgetPeriodTemplates.budgetId,
            allocatedAmount: budgetPeriodInstances.allocatedAmount,
            actualAmount: budgetPeriodInstances.actualAmount,
            startDate: budgetPeriodInstances.startDate,
            endDate: budgetPeriodInstances.endDate,
          })
          .from(budgetPeriodInstances)
          .innerJoin(
            budgetPeriodTemplates,
            eq(budgetPeriodInstances.templateId, budgetPeriodTemplates.id)
          )
          .where(inArray(budgetPeriodTemplates.budgetId, budgetIds));

        const periodsByBudget = new Map<number, typeof periodData>();
        for (const p of periodData) {
          if (!periodsByBudget.has(p.budgetId)) {
            periodsByBudget.set(p.budgetId, []);
          }
          periodsByBudget.get(p.budgetId)!.push(p);
        }

        return {
          success: true as const,
          budgets: filtered.map((b) => {
            const periods = periodsByBudget.get(b.id) || [];
            const latestPeriod = periods[0];
            const metadata = b.metadata as { allocatedAmount?: number } | null;
            const allocated = latestPeriod?.allocatedAmount ?? metadata?.allocatedAmount ?? 0;
            const spent = Math.abs(latestPeriod?.actualAmount ?? 0);
            const remaining = allocated - spent;
            const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0;

            return {
              id: b.id,
              name: b.name,
              type: b.type,
              status: b.status,
              allocated: Number(allocated), // Amounts are stored in dollars (real type)
              spent: Number(spent),
              remaining: Number(remaining),
              percentUsed: Math.round(percentUsed),
              period: latestPeriod
                ? { start: latestPeriod.startDate, end: latestPeriod.endDate }
                : null,
            };
          }),
        };
      },
    }),

    /**
     * Get spending for a payee
     */
    getPayeeSpending: tool({
      description: "Get total spending for a specific payee, optionally within a date range",
      inputSchema: jsonSchema<{ payeeName: string; startDate?: string; endDate?: string }>({
        type: "object",
        properties: {
          payeeName: { type: "string", description: "The name of the payee to look up" },
          startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
          endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
        },
        required: ["payeeName"],
      }),
      execute: async ({ payeeName, startDate, endDate }) => {
        // Find matching payees
        const matchingPayees = await db
          .select({ id: payees.id, name: payees.name })
          .from(payees)
          .where(
            and(
              eq(payees.workspaceId, workspaceId),
              like(payees.name, `%${payeeName}%`),
              isNull(payees.deletedAt)
            )
          )
          .limit(5);

        if (matchingPayees.length === 0) {
          return { success: false as const, message: `No payees found matching "${payeeName}"` };
        }

        const payeeIds = matchingPayees.map((p) => p.id);

        // Filter through accounts since transactions don't have workspaceId directly
        const conditions: ReturnType<typeof eq>[] = [
          inArray(transactions.payeeId, payeeIds),
          eq(accounts.workspaceId, workspaceId),
          isNull(transactions.deletedAt),
        ];

        if (startDate) {
          conditions.push(gte(transactions.date, startDate));
        }
        if (endDate) {
          conditions.push(lte(transactions.date, endDate));
        }

        const spending = await db
          .select({
            payeeId: transactions.payeeId,
            totalAmount: sql<number>`SUM(${transactions.amount})`,
            transactionCount: sql<number>`COUNT(*)`,
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(and(...conditions))
          .groupBy(transactions.payeeId);

        const payeeMap = new Map(matchingPayees.map((p) => [p.id, p.name]));

        return {
          success: true as const,
          payees: spending.map((s) => ({
            name: payeeMap.get(s.payeeId!) || "Unknown",
            totalSpent: Math.abs(Number(s.totalAmount)), // Amounts are stored in dollars (real type)
            transactionCount: Number(s.transactionCount),
          })),
        };
      },
    }),

    /**
     * Get spending by category
     */
    getCategorySpending: tool({
      description: "Get spending breakdown by category, optionally within a date range",
      inputSchema: jsonSchema<{ startDate?: string; endDate?: string; limit?: number }>({
        type: "object",
        properties: {
          startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
          endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
          limit: {
            type: "number",
            description: "Maximum number of categories to return (default 10)",
          },
        },
      }),
      execute: async (params) => {
        const { startDate, endDate, limit = 10 } = params;

        // Filter through accounts since transactions don't have workspaceId directly
        const conditions: ReturnType<typeof eq>[] = [
          eq(accounts.workspaceId, workspaceId),
          isNull(transactions.deletedAt),
          sql`${transactions.amount} < 0`, // Only expenses
        ];

        if (startDate) {
          conditions.push(gte(transactions.date, startDate));
        }
        if (endDate) {
          conditions.push(lte(transactions.date, endDate));
        }

        const spending = await db
          .select({
            categoryId: transactions.categoryId,
            categoryName: categories.name,
            totalAmount: sql<number>`SUM(ABS(${transactions.amount}))`,
            transactionCount: sql<number>`COUNT(*)`,
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(and(...conditions))
          .groupBy(transactions.categoryId, categories.name)
          .orderBy(desc(sql`SUM(ABS(${transactions.amount}))`))
          .limit(limit);

        const total = spending.reduce((sum, s) => sum + Number(s.totalAmount), 0);

        return {
          success: true as const,
          categories: spending.map((s) => ({
            name: s.categoryName || "Uncategorized",
            totalSpent: Number(s.totalAmount), // Amounts are stored in dollars (real type)
            transactionCount: Number(s.transactionCount),
            percentOfTotal: total > 0 ? Math.round((Number(s.totalAmount) / total) * 100) : 0,
          })),
          totalSpending: total,
        };
      },
    }),

    // ============================================
    // WRITE TOOLS
    // ============================================

    /**
     * Create a new budget
     */
    createBudget: tool({
      description: "Create a new budget for tracking spending on a category",
      inputSchema: jsonSchema<{ name: string; categoryName: string; monthlyAmount: number }>({
        type: "object",
        properties: {
          name: { type: "string", description: "Name for the budget" },
          categoryName: {
            type: "string",
            description: "Category to track (must match an existing category)",
          },
          monthlyAmount: { type: "number", description: "Monthly budget amount in dollars" },
        },
        required: ["name", "categoryName", "monthlyAmount"],
      }),
      execute: async ({ name, categoryName, monthlyAmount }) => {
        // Find the category
        const matchingCategories = await db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(
            and(
              eq(categories.workspaceId, workspaceId),
              like(categories.name, `%${categoryName}%`),
              isNull(categories.deletedAt)
            )
          )
          .limit(1);

        if (matchingCategories.length === 0) {
          return {
            success: false as const,
            message: `No category found matching "${categoryName}". Please check the category name.`,
          };
        }

        const category = matchingCategories[0]!;

        // Generate slug
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();

        // Create the budget
        const [newBudget] = await db
          .insert(budgets)
          .values({
            workspaceId,
            name,
            slug,
            type: "category-envelope",
            scope: "category",
            status: "active",
            enforcementLevel: "warning",
            metadata: {
              allocatedAmount: monthlyAmount, // Amounts are stored in dollars (real type)
            },
          })
          .returning();

        if (!newBudget) {
          return { success: false as const, message: "Failed to create budget" };
        }

        // Link to category
        await db.insert(budgetCategories).values({
          budgetId: newBudget.id,
          categoryId: category.id,
        });

        // Create monthly period template
        await db.insert(budgetPeriodTemplates).values({
          budgetId: newBudget.id,
          type: "monthly",
          intervalCount: 1,
          startDayOfMonth: 1,
        });

        return {
          success: true as const,
          message: `Created budget "${name}" for ${category.name} with $${monthlyAmount}/month`,
          budget: {
            id: newBudget.id,
            name: newBudget.name,
            category: category.name,
            monthlyAmount,
          },
        };
      },
    }),

    /**
     * Create a new category
     */
    createCategory: tool({
      description:
        "Create a new category for organizing transactions. Use 'expense' (default) for spending categories, 'income' for paychecks/freelance/etc., 'savings' for goal-based saving, 'transfer' for inter-account moves. Pass parentCategoryName to nest under an existing category.",
      inputSchema: jsonSchema<{
        name: string;
        categoryType?: "expense" | "income" | "savings" | "transfer";
        notes?: string;
        parentCategoryName?: string;
      }>({
        type: "object",
        properties: {
          name: { type: "string", description: "Name for the category" },
          categoryType: {
            type: "string",
            enum: ["expense", "income", "savings", "transfer"],
            description: "Type of category. Defaults to 'expense'.",
          },
          notes: { type: "string", description: "Optional notes about the category" },
          parentCategoryName: {
            type: "string",
            description:
              "Optional parent category name to nest under. Must match an existing category (case-insensitive partial match).",
          },
        },
        required: ["name"],
      }),
      execute: async ({ name, categoryType, notes, parentCategoryName }) => {
        try {
          let parentId: number | undefined = undefined;
          if (parentCategoryName) {
            const matches = await db
              .select({ id: categories.id })
              .from(categories)
              .where(
                and(
                  eq(categories.workspaceId, workspaceId),
                  like(categories.name, `%${parentCategoryName}%`),
                  isNull(categories.deletedAt)
                )
              )
              .limit(1);
            if (matches.length === 0) {
              return {
                success: false as const,
                message: `Parent category "${parentCategoryName}" not found`,
              };
            }
            parentId = matches[0]!.id;
          }

          const categoryService = serviceFactory.getCategoryService();
          const created = await categoryService.createCategory(
            {
              name,
              categoryType,
              notes,
              parentId,
            },
            workspaceId
          );
          return {
            success: true as const,
            message: `Created ${created.categoryType ?? "expense"} category "${created.name}"`,
            category: {
              id: created.id,
              name: created.name,
              slug: created.slug,
              categoryType: created.categoryType,
              parentId: created.parentId,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to create category: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Create a new payee
     */
    createPayee: tool({
      description: "Create a new payee for tracking transactions",
      inputSchema: jsonSchema<{ name: string; defaultCategoryName?: string }>({
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the payee/merchant" },
          defaultCategoryName: {
            type: "string",
            description: "Default category for transactions with this payee",
          },
        },
        required: ["name"],
      }),
      execute: async ({ name, defaultCategoryName }) => {
        try {
          console.log("[AI Tool] createPayee called with:", {
            name,
            defaultCategoryName,
            workspaceId,
          });

          // Check if payee already exists
          const existing = await db
            .select({ id: payees.id })
            .from(payees)
            .where(
              and(
                eq(payees.workspaceId, workspaceId),
                eq(payees.name, name),
                isNull(payees.deletedAt)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            console.log("[AI Tool] createPayee: Payee already exists");
            return {
              success: false as const,
              message: `Payee "${name}" already exists`,
            };
          }

          // Find default category if specified
          let defaultCategoryId: number | null = null;
          if (defaultCategoryName) {
            const matchingCategories = await db
              .select({ id: categories.id, name: categories.name })
              .from(categories)
              .where(
                and(
                  eq(categories.workspaceId, workspaceId),
                  like(categories.name, `%${defaultCategoryName}%`),
                  isNull(categories.deletedAt)
                )
              )
              .limit(1);

            if (matchingCategories.length > 0) {
              defaultCategoryId = matchingCategories[0]!.id;
            }
          }

          // Generate slug
          const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();

          console.log("[AI Tool] createPayee: Generated slug:", slug);

          // Create the payee
          const [newPayee] = await db
            .insert(payees)
            .values({
              workspaceId,
              name,
              slug,
              defaultCategoryId,
            })
            .returning();

          console.log("[AI Tool] createPayee: Insert result:", newPayee);

          if (!newPayee) {
            return { success: false as const, message: "Failed to create payee" };
          }

          return {
            success: true as const,
            message: `Created payee "${name}"${defaultCategoryId ? " with default category" : ""}`,
            payee: {
              id: newPayee.id,
              name: newPayee.name,
            },
          };
        } catch (error) {
          console.error("[AI Tool] createPayee error:", error);
          return {
            success: false as const,
            message: `Failed to create payee: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Categorize a transaction
     */
    categorizeTransaction: tool({
      description: "Update the category of a transaction",
      inputSchema: jsonSchema<{ transactionId: number; categoryName: string }>({
        type: "object",
        properties: {
          transactionId: { type: "number", description: "The ID of the transaction to categorize" },
          categoryName: { type: "string", description: "The name of the category to assign" },
        },
        required: ["transactionId", "categoryName"],
      }),
      execute: async ({ transactionId, categoryName }) => {
        // Verify transaction exists and belongs to workspace (via account)
        const txnResults = await db
          .select({
            id: transactions.id,
            payeeName: payees.name,
            currentCategory: categories.name,
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .leftJoin(payees, eq(transactions.payeeId, payees.id))
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(
            and(
              eq(transactions.id, transactionId),
              eq(accounts.workspaceId, workspaceId),
              isNull(transactions.deletedAt)
            )
          )
          .limit(1);

        if (txnResults.length === 0) {
          return {
            success: false as const,
            message: `Transaction ${transactionId} not found`,
          };
        }

        const txn = txnResults[0]!;

        // Find the category
        const matchingCategories = await db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(
            and(
              eq(categories.workspaceId, workspaceId),
              like(categories.name, `%${categoryName}%`),
              isNull(categories.deletedAt)
            )
          )
          .limit(1);

        if (matchingCategories.length === 0) {
          return {
            success: false as const,
            message: `No category found matching "${categoryName}"`,
          };
        }

        const category = matchingCategories[0]!;

        // Update the transaction — defense in depth: even though the preceding
        // SELECT confirmed the transaction belongs to this workspace, the
        // UPDATE scopes its own WHERE clause by workspaceId so any future
        // refactor that changes or skips the SELECT can never cross tenants.
        await db
          .update(transactions)
          .set({ categoryId: category.id })
          .where(
            and(
              eq(transactions.id, transactionId),
              eq(transactions.workspaceId, workspaceId),
              isNull(transactions.deletedAt)
            )
          );

        return {
          success: true as const,
          message: `Updated transaction from ${txn.currentCategory || "uncategorized"} to ${category.name}`,
          transaction: {
            id: transactionId,
            payee: txn.payeeName,
            previousCategory: txn.currentCategory,
            newCategory: category.name,
          },
        };
      },
    }),

    /**
     * Create a new account
     */
    createAccount: tool({
      description:
        "Create a new account (checking, savings, credit card, etc.). Optionally seeds an initial balance transaction.",
      inputSchema: jsonSchema<{
        name: string;
        accountType?: AccountType;
        initialBalance?: number;
        notes?: string;
        onBudget?: boolean;
      }>({
        type: "object",
        properties: {
          name: { type: "string", description: "Display name for the account" },
          accountType: {
            type: "string",
            enum: [...accountTypeEnum],
            description:
              "Account type. Defaults to 'checking' if omitted. Investment/loan accounts are off-budget by default.",
          },
          initialBalance: {
            type: "number",
            description:
              "Opening balance. If non-zero, a 'cleared' transaction dated today is created so the running balance is correct.",
          },
          notes: { type: "string", description: "Optional notes" },
          onBudget: {
            type: "boolean",
            description:
              "Whether the account is included in budget calculations. Omit for the type-default.",
          },
        },
        required: ["name"],
      }),
      execute: async ({ name, accountType, initialBalance, notes, onBudget }) => {
        try {
          const accountService = serviceFactory.getAccountService();
          const created = await accountService.createAccount(
            {
              name,
              accountType,
              initialBalance,
              notes,
              onBudget,
            },
            workspaceId
          );
          return {
            success: true as const,
            message: `Created ${ACCOUNT_TYPE_LABELS[accountType ?? "checking"]} account "${created.name}"`,
            account: {
              id: created.id,
              name: created.name,
              slug: created.slug,
              accountType: created.accountType,
              onBudget: created.onBudget,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to create account: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Update an existing transaction
     */
    updateTransaction: tool({
      description:
        "Update fields on an existing transaction. Only the fields you provide are changed. Pass null for payeeId/categoryId/notes to clear them.",
      inputSchema: jsonSchema<{
        transactionId: number;
        amount?: number;
        date?: string;
        payeeId?: number | null;
        categoryId?: number | null;
        notes?: string | null;
        status?: "cleared" | "pending" | "scheduled";
      }>({
        type: "object",
        properties: {
          transactionId: { type: "number", description: "ID of the transaction to update" },
          amount: { type: "number", description: "New amount (positive = income, negative = expense)" },
          date: { type: "string", description: "New date in YYYY-MM-DD format" },
          payeeId: {
            type: ["number", "null"],
            description: "Payee ID to assign, or null to clear",
          },
          categoryId: {
            type: ["number", "null"],
            description: "Category ID to assign, or null to clear",
          },
          notes: { type: ["string", "null"], description: "Notes text, or null to clear" },
          status: {
            type: "string",
            enum: ["cleared", "pending", "scheduled"],
            description: "Transaction status",
          },
        },
        required: ["transactionId"],
      }),
      execute: async ({
        transactionId,
        amount,
        date,
        payeeId,
        categoryId,
        notes,
        status,
      }) => {
        try {
          const transactionService = serviceFactory.getTransactionService();
          const updated = await transactionService.updateTransaction(
            transactionId,
            { amount, date, payeeId, categoryId, notes, status },
            workspaceId
          );
          return {
            success: true as const,
            message: `Updated transaction ${transactionId}`,
            transaction: {
              id: updated.id,
              amount: updated.amount,
              date: updated.date,
              payeeId: updated.payeeId,
              categoryId: updated.categoryId,
              status: updated.status,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to update transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Delete (soft-delete) a transaction
     */
    deleteTransaction: tool({
      description:
        "Soft-delete a transaction by ID. The row is retained for audit but excluded from balances, budgets, and listings. Use with care.",
      inputSchema: jsonSchema<{ transactionId: number }>({
        type: "object",
        properties: {
          transactionId: {
            type: "number",
            description: "ID of the transaction to delete",
          },
        },
        required: ["transactionId"],
      }),
      execute: async ({ transactionId }) => {
        try {
          const transactionService = serviceFactory.getTransactionService();
          await transactionService.deleteTransaction(transactionId, workspaceId);
          return {
            success: true as const,
            message: `Deleted transaction ${transactionId}`,
            transactionId,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to delete transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // SINGLE-TRANSACTION CREATE
    // ============================================

    createTransaction: tool({
      description:
        "Add a single transaction to an account. Negative amount = expense; positive = income/deposit. Use this for one-off entries (e.g. cash purchases). For bulk imports from a statement, use commitStatement.",
      inputSchema: jsonSchema<{
        accountId: number;
        amount: number;
        date: string;
        payeeId?: number;
        categoryId?: number;
        notes?: string;
        status?: "cleared" | "pending" | "scheduled";
      }>({
        type: "object",
        properties: {
          accountId: { type: "number", description: "Account ID this transaction belongs to" },
          amount: {
            type: "number",
            description: "Signed amount. Negative for expenses, positive for income/deposits.",
          },
          date: { type: "string", description: "YYYY-MM-DD" },
          payeeId: { type: "number", description: "Optional payee ID" },
          categoryId: { type: "number", description: "Optional category ID" },
          notes: { type: "string", description: "Optional notes" },
          status: {
            type: "string",
            enum: ["cleared", "pending", "scheduled"],
            description: "Defaults to 'pending'",
          },
        },
        required: ["accountId", "amount", "date"],
      }),
      execute: async ({ accountId, amount, date, payeeId, categoryId, notes, status }) => {
        try {
          const transactionService = serviceFactory.getTransactionService();
          const created = await transactionService.createTransaction(
            { accountId, amount, date, payeeId, categoryId, notes, status },
            workspaceId
          );
          return {
            success: true as const,
            message: `Created transaction ${created.id} for ${amount} on ${date}`,
            transaction: {
              id: created.id,
              accountId: created.accountId,
              amount: created.amount,
              date: created.date,
              payeeId: created.payeeId,
              categoryId: created.categoryId,
              status: created.status,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to create transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Split a transaction into multiple child rows by category
     */
    splitTransaction: tool({
      description:
        "Split a single transaction into multiple child transactions (e.g. a Costco purchase split between Groceries and Electronics). Child amounts must sum to the parent's amount within 1 cent. The parent is preserved; children inherit its account, date, and payee unless overridden.",
      inputSchema: jsonSchema<{
        transactionId: number;
        splits: Array<{ amount: number; categoryId?: number; notes?: string }>;
      }>({
        type: "object",
        properties: {
          transactionId: { type: "number", description: "Parent transaction ID to split" },
          splits: {
            type: "array",
            minItems: 2,
            description: "Two or more child rows; amounts must sum to parent's amount.",
            items: {
              type: "object",
              properties: {
                amount: { type: "number", description: "Signed amount for this split" },
                categoryId: { type: "number", description: "Optional category" },
                notes: { type: "string", description: "Optional notes" },
              },
              required: ["amount"],
            },
          },
        },
        required: ["transactionId", "splits"],
      }),
      execute: async ({ transactionId, splits }) => {
        try {
          const transactionService = serviceFactory.getTransactionService();
          const children = await transactionService.splitTransaction(
            transactionId,
            splits.map((s) => ({
              amount: s.amount,
              categoryId: s.categoryId ?? null,
              notes: s.notes ?? null,
            })),
            workspaceId
          );
          return {
            success: true as const,
            message: `Split transaction ${transactionId} into ${children.length} children`,
            parentId: transactionId,
            childTransactionIds: children.map((c) => c.id),
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to split transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // ACCOUNT LIFECYCLE
    // ============================================

    listAccounts: tool({
      description:
        "List all non-deleted accounts in the workspace, with id, name, type, balance, and on/off-budget flag. Use this to discover account IDs before referencing them in other tools.",
      inputSchema: jsonSchema<Record<string, never>>({
        type: "object",
        properties: {},
      }),
      execute: async () => {
        try {
          const accountService = serviceFactory.getAccountService();
          const list = await accountService.getActiveAccounts();
          return {
            success: true as const,
            count: list.length,
            accounts: list.map((a) => ({
              id: a.id,
              name: a.name,
              slug: a.slug,
              accountType: a.accountType,
              balance: (a as { balance?: number }).balance ?? 0,
              onBudget: a.onBudget,
            })),
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to list accounts: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    updateAccount: tool({
      description:
        "Update fields on an existing account. Only provided fields change.",
      inputSchema: jsonSchema<{
        accountId: number;
        name?: string;
        notes?: string;
        balance?: number;
        onBudget?: boolean;
      }>({
        type: "object",
        properties: {
          accountId: { type: "number" },
          name: { type: "string", description: "New display name" },
          notes: { type: "string", description: "Notes text" },
          balance: { type: "number", description: "Set the stored balance" },
          onBudget: {
            type: "boolean",
            description: "Whether the account is included in budget calculations",
          },
        },
        required: ["accountId"],
      }),
      execute: async ({ accountId, name, notes, balance, onBudget }) => {
        try {
          const accountService = serviceFactory.getAccountService();
          await accountService.getAccountById(accountId); // workspace ownership check via repo
          const updated = await accountService.updateAccount(accountId, {
            name,
            notes,
            balance,
            onBudget,
          });
          return {
            success: true as const,
            message: `Updated account ${accountId}`,
            account: {
              id: updated.id,
              name: updated.name,
              accountType: updated.accountType,
              onBudget: updated.onBudget,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to update account: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    deleteAccount: tool({
      description:
        "Soft-delete an account. Its transactions are preserved but the account is hidden from listings. ⚠️ Use with care.",
      inputSchema: jsonSchema<{ accountId: number; force?: boolean }>({
        type: "object",
        properties: {
          accountId: { type: "number" },
          force: {
            type: "boolean",
            description:
              "If true, delete even when the account still has transactions. Default false errors out for non-empty accounts.",
          },
        },
        required: ["accountId"],
      }),
      execute: async ({ accountId, force }) => {
        try {
          const accountService = serviceFactory.getAccountService();
          await accountService.deleteAccount(accountId, { force });
          return {
            success: true as const,
            message: `Deleted account ${accountId}`,
            accountId,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to delete account: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    reconcileAccount: tool({
      description:
        "Set the account's reconciled balance and date as a manual checkpoint. Use when a user confirms their actual current balance.",
      inputSchema: jsonSchema<{
        accountId: number;
        balance: number;
        reconciledDate?: string;
      }>({
        type: "object",
        properties: {
          accountId: { type: "number" },
          balance: { type: "number", description: "The reconciled balance in dollars" },
          reconciledDate: {
            type: "string",
            description: "YYYY-MM-DD; defaults to today",
          },
        },
        required: ["accountId", "balance"],
      }),
      execute: async ({ accountId, balance, reconciledDate }) => {
        try {
          // Verify ownership.
          const [acct] = await db
            .select({ id: accounts.id })
            .from(accounts)
            .where(
              and(
                eq(accounts.id, accountId),
                eq(accounts.workspaceId, workspaceId),
                isNull(accounts.deletedAt)
              )
            )
            .limit(1);
          if (!acct) {
            return { success: false as const, message: `Account ${accountId} not found` };
          }
          const date = reconciledDate ?? new Date().toISOString().slice(0, 10);
          await db
            .update(accounts)
            .set({
              reconciledBalance: balance,
              reconciledDate: date,
            })
            .where(
              and(eq(accounts.id, accountId), eq(accounts.workspaceId, workspaceId))
            );
          return {
            success: true as const,
            message: `Reconciled account ${accountId} to $${balance} as of ${date}`,
            accountId,
            balance,
            reconciledDate: date,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to reconcile account: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // PAYEE LIFECYCLE
    // ============================================

    listPayees: tool({
      description:
        "List all payees in the workspace with id, name, and default category.",
      inputSchema: jsonSchema<{ search?: string }>({
        type: "object",
        properties: {
          search: { type: "string", description: "Optional partial-name filter" },
        },
      }),
      execute: async ({ search }) => {
        try {
          const payeeService = serviceFactory.getPayeeService();
          const list = search
            ? await payeeService.searchPayees(search, workspaceId)
            : await payeeService.getAllPayees(workspaceId);
          return {
            success: true as const,
            count: list.length,
            payees: list.map((p) => ({
              id: p.id,
              name: p.name,
              defaultCategoryId: p.defaultCategoryId,
            })),
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to list payees: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    updatePayee: tool({
      description: "Update a payee's name, default category, or notes.",
      inputSchema: jsonSchema<{
        payeeId: number;
        name?: string;
        defaultCategoryId?: number | null;
        notes?: string;
      }>({
        type: "object",
        properties: {
          payeeId: { type: "number" },
          name: { type: "string" },
          defaultCategoryId: {
            type: ["number", "null"],
            description: "Default category, or null to clear",
          },
          notes: { type: "string" },
        },
        required: ["payeeId"],
      }),
      execute: async ({ payeeId, name, defaultCategoryId, notes }) => {
        try {
          const payeeService = serviceFactory.getPayeeService();
          const updated = await payeeService.updatePayee(
            payeeId,
            { name, defaultCategoryId, notes },
            workspaceId
          );
          return {
            success: true as const,
            message: `Updated payee ${payeeId}`,
            payee: { id: updated.id, name: updated.name },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to update payee: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    deletePayee: tool({
      description:
        "Soft-delete a payee. Transactions referencing it have their payeeId set to null but are otherwise preserved.",
      inputSchema: jsonSchema<{ payeeId: number }>({
        type: "object",
        properties: { payeeId: { type: "number" } },
        required: ["payeeId"],
      }),
      execute: async ({ payeeId }) => {
        try {
          const payeeService = serviceFactory.getPayeeService();
          await payeeService.deletePayee(payeeId, workspaceId);
          return {
            success: true as const,
            message: `Deleted payee ${payeeId}`,
            payeeId,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to delete payee: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // CATEGORY LIFECYCLE (updateCategory / deleteCategory)
    // ============================================

    updateCategory: tool({
      description:
        "Update an existing category. Pass parentId=null to detach from a parent.",
      inputSchema: jsonSchema<{
        categoryId: number;
        name?: string;
        categoryType?: "expense" | "income" | "savings" | "transfer";
        notes?: string;
        parentId?: number | null;
      }>({
        type: "object",
        properties: {
          categoryId: { type: "number" },
          name: { type: "string" },
          categoryType: {
            type: "string",
            enum: ["expense", "income", "savings", "transfer"],
          },
          notes: { type: "string" },
          parentId: {
            type: ["number", "null"],
            description: "Parent category ID, or null to detach",
          },
        },
        required: ["categoryId"],
      }),
      execute: async ({ categoryId, name, categoryType, notes, parentId }) => {
        try {
          const categoryService = serviceFactory.getCategoryService();
          const updated = await categoryService.updateCategory(
            categoryId,
            { name, categoryType, notes, parentId },
            workspaceId
          );
          return {
            success: true as const,
            message: `Updated category ${categoryId}`,
            category: {
              id: updated.id,
              name: updated.name,
              categoryType: updated.categoryType,
              parentId: updated.parentId,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to update category: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    deleteCategory: tool({
      description:
        "Soft-delete a category. Transactions referencing it have their categoryId cleared.",
      inputSchema: jsonSchema<{ categoryId: number }>({
        type: "object",
        properties: { categoryId: { type: "number" } },
        required: ["categoryId"],
      }),
      execute: async ({ categoryId }) => {
        try {
          const categoryService = serviceFactory.getCategoryService();
          await categoryService.deleteCategory(categoryId, workspaceId);
          return {
            success: true as const,
            message: `Deleted category ${categoryId}`,
            categoryId,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to delete category: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // BUDGET LIFECYCLE
    // ============================================

    listBudgets: tool({
      description:
        "List all budgets in the workspace with id, name, type, status, and allocated amount.",
      inputSchema: jsonSchema<{ status?: "active" | "paused" | "archived" }>({
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["active", "paused", "archived"],
            description: "Optional status filter",
          },
        },
      }),
      execute: async ({ status }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const list = await budgetService.listBudgets(workspaceId, status as any);
          return {
            success: true as const,
            count: list.length,
            budgets: list.map((b) => ({
              id: b.id,
              name: b.name,
              type: b.type,
              status: b.status,
              allocatedAmount:
                (b.metadata as { allocatedAmount?: number } | null)?.allocatedAmount ?? null,
            })),
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to list budgets: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    updateBudget: tool({
      description:
        "Update a budget's name, status, or allocated amount.",
      inputSchema: jsonSchema<{
        budgetId: number;
        name?: string;
        status?: "active" | "paused" | "archived";
        allocatedAmount?: number;
      }>({
        type: "object",
        properties: {
          budgetId: { type: "number" },
          name: { type: "string" },
          status: { type: "string", enum: ["active", "paused", "archived"] },
          allocatedAmount: {
            type: "number",
            description: "New monthly/period allocation in dollars",
          },
        },
        required: ["budgetId"],
      }),
      execute: async ({ budgetId, name, status, allocatedAmount }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          const existing = await budgetService.getBudget(budgetId, workspaceId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mergedMetadata: any =
            allocatedAmount !== undefined
              ? { ...(existing.metadata ?? {}), allocatedAmount }
              : undefined;
          const updated = await budgetService.updateBudget(
            budgetId,
            {
              name,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              status: status as any,
              ...(mergedMetadata ? { metadata: mergedMetadata } : {}),
            },
            workspaceId
          );
          return {
            success: true as const,
            message: `Updated budget ${budgetId}`,
            budget: { id: updated.id, name: updated.name, status: updated.status },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to update budget: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    deleteBudget: tool({
      description: "Soft-delete a budget.",
      inputSchema: jsonSchema<{ budgetId: number }>({
        type: "object",
        properties: { budgetId: { type: "number" } },
        required: ["budgetId"],
      }),
      execute: async ({ budgetId }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          await budgetService.deleteBudget(budgetId, workspaceId);
          return {
            success: true as const,
            message: `Deleted budget ${budgetId}`,
            budgetId,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to delete budget: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // ENVELOPE BUDGETING
    // ============================================

    listBudgetPeriods: tool({
      description:
        "List period instances for an envelope budget. Each instance has an id (use as periodInstanceId for envelope tools), date range, templateId, and allocated/rollover/actual amounts. Use this to find which period an envelope should attach to.",
      inputSchema: jsonSchema<{ budgetId: number }>({
        type: "object",
        properties: {
          budgetId: { type: "number", description: "Budget to list periods for" },
        },
        required: ["budgetId"],
      }),
      execute: async ({ budgetId }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          const periodService = serviceFactory.getBudgetPeriodService();
          // Workspace check + grab templates via the detail relations.
          const detail = await budgetService.getBudget(budgetId, workspaceId);
          const templates =
            (detail as { periodTemplates?: Array<{ id: number; type: string }> })
              .periodTemplates ?? [];
          if (templates.length === 0) {
            return {
              success: true as const,
              count: 0,
              periods: [],
              message: `Budget ${budgetId} has no period templates yet`,
            };
          }
          const periodGroups = await Promise.all(
            templates.map(async (t) => ({
              templateId: t.id,
              templateType: t.type,
              instances: await periodService.listInstances(t.id),
            }))
          );
          const flat = periodGroups.flatMap((g) =>
            g.instances.map((i) => ({
              id: i.id,
              templateId: g.templateId,
              templateType: g.templateType,
              startDate: i.startDate,
              endDate: i.endDate,
              allocatedAmount: i.allocatedAmount,
              rolloverAmount: i.rolloverAmount,
              actualAmount: i.actualAmount,
            }))
          );
          return {
            success: true as const,
            count: flat.length,
            periods: flat,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to list budget periods: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    ensurePeriodInstance: tool({
      description:
        "Get-or-create a period instance for a template. Idempotent — if a period covering referenceDate already exists, returns it; otherwise creates one using the template's frequency rules. Use before createEnvelopeAllocation when the target period might not exist yet.",
      inputSchema: jsonSchema<{
        templateId: number;
        referenceDate?: string;
        allocatedAmount?: number;
      }>({
        type: "object",
        properties: {
          templateId: { type: "number", description: "Period template ID (from listBudgetPeriods)" },
          referenceDate: {
            type: "string",
            description: "YYYY-MM-DD inside the desired period. Defaults to today.",
          },
          allocatedAmount: {
            type: "number",
            description:
              "Override the budget's default allocation for this period. Omit to inherit.",
          },
        },
        required: ["templateId"],
      }),
      execute: async ({ templateId, referenceDate, allocatedAmount }) => {
        try {
          const periodService = serviceFactory.getBudgetPeriodService();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const options: any = {};
          if (referenceDate) {
            const { parseDate } = await import("@internationalized/date");
            options.referenceDate = parseDate(referenceDate);
          }
          if (allocatedAmount !== undefined) options.allocatedAmount = allocatedAmount;
          const instance = await periodService.ensureInstanceForDate(templateId, options);
          return {
            success: true as const,
            message: `Period ${instance.id} for template ${templateId} (${instance.startDate} → ${instance.endDate})`,
            period: {
              id: instance.id,
              templateId: instance.templateId,
              startDate: instance.startDate,
              endDate: instance.endDate,
              allocatedAmount: instance.allocatedAmount,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to ensure period: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    listEnvelopeAllocations: tool({
      description:
        "List envelope allocations for a budget. Each envelope ties one category to one period instance with an allocated amount, spent total, rollover, and computed available balance.",
      inputSchema: jsonSchema<{ budgetId: number }>({
        type: "object",
        properties: { budgetId: { type: "number" } },
        required: ["budgetId"],
      }),
      execute: async ({ budgetId }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          // Workspace ownership check via budget lookup.
          await budgetService.getBudget(budgetId, workspaceId);
          const envelopes = await budgetService.getEnvelopeAllocations(budgetId);
          return {
            success: true as const,
            count: envelopes.length,
            envelopes: envelopes.map((e) => ({
              id: e.id,
              categoryId: e.categoryId,
              periodInstanceId: e.periodInstanceId,
              allocatedAmount: e.allocatedAmount,
              spentAmount: e.spentAmount,
              rolloverAmount: e.rolloverAmount,
              availableAmount: e.availableAmount,
              deficitAmount: e.deficitAmount,
              status: e.status,
              rolloverMode: e.rolloverMode,
            })),
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to list envelopes: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    createEnvelopeAllocation: tool({
      description:
        "Create a new envelope: assign an allocation amount to a category within a period of an envelope budget. The (budget, category, period) triple must be unique. Use listBudgetPeriods to find the periodInstanceId.",
      inputSchema: jsonSchema<{
        budgetId: number;
        categoryId: number;
        periodInstanceId: number;
        allocatedAmount: number;
        rolloverMode?: "unlimited" | "reset" | "limited";
      }>({
        type: "object",
        properties: {
          budgetId: { type: "number" },
          categoryId: { type: "number" },
          periodInstanceId: { type: "number" },
          allocatedAmount: { type: "number", description: "Amount in dollars" },
          rolloverMode: {
            type: "string",
            enum: ["unlimited", "reset", "limited"],
            description:
              "How leftover funds carry over. unlimited (default) accumulates forever; reset zeroes each period; limited caps the carryover.",
          },
        },
        required: ["budgetId", "categoryId", "periodInstanceId", "allocatedAmount"],
      }),
      execute: async ({
        budgetId,
        categoryId,
        periodInstanceId,
        allocatedAmount,
        rolloverMode,
      }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          // Ownership check.
          await budgetService.getBudget(budgetId, workspaceId);
          const envelope = await budgetService.createEnvelopeAllocation({
            budgetId,
            categoryId,
            periodInstanceId,
            allocatedAmount,
            rolloverMode,
          });
          return {
            success: true as const,
            message: `Created envelope ${envelope.id} for category ${categoryId} in period ${periodInstanceId}`,
            envelope: {
              id: envelope.id,
              budgetId: envelope.budgetId,
              categoryId: envelope.categoryId,
              periodInstanceId: envelope.periodInstanceId,
              allocatedAmount: envelope.allocatedAmount,
              availableAmount: envelope.availableAmount,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to create envelope: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    updateEnvelopeAllocation: tool({
      description:
        "Update an existing envelope's allocated amount. Spent/rollover values are recomputed automatically.",
      inputSchema: jsonSchema<{ envelopeId: number; allocatedAmount: number }>({
        type: "object",
        properties: {
          envelopeId: { type: "number" },
          allocatedAmount: { type: "number", description: "New amount in dollars" },
        },
        required: ["envelopeId", "allocatedAmount"],
      }),
      execute: async ({ envelopeId, allocatedAmount }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          const updated = await budgetService.updateEnvelopeAllocation(
            envelopeId,
            allocatedAmount
          );
          // Workspace check after the fact via budget lookup — the envelope
          // service doesn't currently scope by workspaceId, so verify the
          // parent budget belongs to this workspace.
          try {
            await budgetService.getBudget(updated.budgetId, workspaceId);
          } catch {
            return {
              success: false as const,
              message: `Envelope ${envelopeId} belongs to a different workspace`,
            };
          }
          return {
            success: true as const,
            message: `Updated envelope ${envelopeId} to $${allocatedAmount}`,
            envelope: {
              id: updated.id,
              allocatedAmount: updated.allocatedAmount,
              availableAmount: updated.availableAmount,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to update envelope: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    transferEnvelopeFunds: tool({
      description:
        "Move allocated dollars from one envelope to another in the same period. Both envelopes must belong to the same period instance. Useful for reallocating without changing the total budget.",
      inputSchema: jsonSchema<{
        fromEnvelopeId: number;
        toEnvelopeId: number;
        amount: number;
        reason?: string;
      }>({
        type: "object",
        properties: {
          fromEnvelopeId: { type: "number" },
          toEnvelopeId: { type: "number" },
          amount: { type: "number", description: "Positive amount in dollars" },
          reason: { type: "string", description: "Optional note about why" },
        },
        required: ["fromEnvelopeId", "toEnvelopeId", "amount"],
      }),
      execute: async ({ fromEnvelopeId, toEnvelopeId, amount, reason }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          const result = await budgetService.transferEnvelopeFunds(
            fromEnvelopeId,
            toEnvelopeId,
            amount,
            reason,
            "mcp"
          );
          return {
            success: true as const,
            message: `Transferred $${amount} from envelope ${fromEnvelopeId} to envelope ${toEnvelopeId}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result: result as any,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to transfer funds: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // GOALS
    // ============================================

    getGoalProgress: tool({
      description:
        "Get progress toward target for a goal-based budget (vacation fund, emergency fund, etc.). Returns current amount, target, percentage, and projected completion date.",
      inputSchema: jsonSchema<{ budgetId: number }>({
        type: "object",
        properties: { budgetId: { type: "number" } },
        required: ["budgetId"],
      }),
      execute: async ({ budgetId }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          const progress = await budgetService.getGoalProgress(budgetId, workspaceId);
          return { success: true as const, progress };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to get goal progress: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // SCHEDULE PRICE HISTORY
    // ============================================

    getSchedulePriceHistory: tool({
      description:
        "List recorded price changes for a recurring schedule (e.g. Netflix raised from $14.99 to $15.49 on 2025-09-01). Each entry has amount, previousAmount, effectiveDate, changeType (increase|decrease|initial), and changePercentage.",
      inputSchema: jsonSchema<{ scheduleId: number; limit?: number }>({
        type: "object",
        properties: {
          scheduleId: { type: "number" },
          limit: { type: "number", description: "Max entries (default 50)" },
        },
        required: ["scheduleId"],
      }),
      execute: async ({ scheduleId, limit }) => {
        try {
          // Ownership check via the schedule.
          const [sched] = await db
            .select({ id: schedules.id })
            .from(schedules)
            .where(
              and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, workspaceId))
            )
            .limit(1);
          if (!sched) {
            return { success: false as const, message: `Schedule ${scheduleId} not found` };
          }
          const rows = await db
            .select()
            .from(schedulePriceHistory)
            .where(eq(schedulePriceHistory.scheduleId, scheduleId))
            .orderBy(desc(schedulePriceHistory.effectiveDate))
            .limit(Math.min(limit ?? 50, 200));
          return { success: true as const, count: rows.length, history: rows };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to get price history: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // PAYEE ALIASES
    // ============================================

    listPayeeAliases: tool({
      description:
        "List raw-name → payee mappings used by import normalization. Each alias has a rawString (the unnormalized string seen on a statement), the payeeId it resolves to, and the payee's current name.",
      inputSchema: jsonSchema<Record<string, never>>({
        type: "object",
        properties: {},
      }),
      execute: async () => {
        try {
          const aliasService = getPayeeAliasService();
          const rows = await aliasService.getAllAliasesWithPayees(workspaceId);
          return {
            success: true as const,
            count: rows.length,
            aliases: rows.map((a) => ({
              id: a.id,
              rawString: a.rawString,
              payeeId: a.payeeId,
              payeeName: (a as { payee?: { name?: string } }).payee?.name ?? null,
            })),
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to list payee aliases: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    createPayeeAlias: tool({
      description:
        "Teach the system that a raw import string (e.g. 'WALMART #1234 DAL') maps to a payee. Future imports will auto-resolve. If the rawString already exists, its mapping is updated.",
      inputSchema: jsonSchema<{ rawString: string; payeeId: number }>({
        type: "object",
        properties: {
          rawString: {
            type: "string",
            description: "The unnormalized string as it appears in statements",
          },
          payeeId: { type: "number", description: "Payee to map the string to" },
        },
        required: ["rawString", "payeeId"],
      }),
      execute: async ({ rawString, payeeId }) => {
        try {
          const aliasService = getPayeeAliasService();
          const alias = await aliasService.createManualAlias(rawString, payeeId, workspaceId);
          return {
            success: true as const,
            message: `Mapped "${rawString}" to payee ${payeeId}`,
            alias: { id: alias.id, rawString: alias.rawString, payeeId: alias.payeeId },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to create alias: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    deletePayeeAlias: tool({
      description: "Remove a payee alias mapping.",
      inputSchema: jsonSchema<{ aliasId: number }>({
        type: "object",
        properties: { aliasId: { type: "number" } },
        required: ["aliasId"],
      }),
      execute: async ({ aliasId }) => {
        try {
          const aliasService = getPayeeAliasService();
          await aliasService.deleteAlias(aliasId, workspaceId);
          return { success: true as const, message: `Deleted alias ${aliasId}`, aliasId };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to delete alias: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // TRANSFER MAPPINGS
    // ============================================

    listTransferMappings: tool({
      description:
        "List saved payee→account mappings used to auto-detect transfers on import. Each maps a raw payee string to a target account so an outgoing transaction with that payee is recognized as a transfer.",
      inputSchema: jsonSchema<Record<string, never>>({
        type: "object",
        properties: {},
      }),
      execute: async () => {
        try {
          const mappingService = getTransferMappingService();
          const rows = await mappingService.getAllMappingsWithAccounts(workspaceId);
          return {
            success: true as const,
            count: rows.length,
            mappings: rows.map((m) => ({
              id: m.id,
              rawPayeeString: m.rawPayeeString,
              targetAccountId: m.targetAccountId,
              targetAccountName: (m as { targetAccount?: { name?: string } }).targetAccount?.name ?? null,
              sourceAccountId: m.sourceAccountId,
            })),
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to list transfer mappings: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    createTransferMapping: tool({
      description:
        "Teach the system that a raw payee string is actually a transfer to a specific account. Subsequent imports with that payee will auto-link as transfers. Optionally restrict to a single source account.",
      inputSchema: jsonSchema<{
        rawPayeeString: string;
        targetAccountId: number;
        sourceAccountId?: number;
      }>({
        type: "object",
        properties: {
          rawPayeeString: {
            type: "string",
            description: "The payee string as it appears on statements",
          },
          targetAccountId: {
            type: "number",
            description: "Account that money goes to when this payee appears",
          },
          sourceAccountId: {
            type: "number",
            description: "Optional: limit this mapping to transactions from a specific account",
          },
        },
        required: ["rawPayeeString", "targetAccountId"],
      }),
      execute: async ({ rawPayeeString, targetAccountId, sourceAccountId }) => {
        try {
          const mappingService = getTransferMappingService();
          const mapping = await mappingService.createManualMapping(
            rawPayeeString,
            targetAccountId,
            workspaceId,
            sourceAccountId
          );
          return {
            success: true as const,
            message: `Mapped "${rawPayeeString}" as a transfer to account ${targetAccountId}`,
            mapping: {
              id: mapping.id,
              rawPayeeString: mapping.rawPayeeString,
              targetAccountId: mapping.targetAccountId,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to create transfer mapping: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    deleteTransferMapping: tool({
      description: "Remove a saved transfer mapping.",
      inputSchema: jsonSchema<{ mappingId: number }>({
        type: "object",
        properties: { mappingId: { type: "number" } },
        required: ["mappingId"],
      }),
      execute: async ({ mappingId }) => {
        try {
          const mappingService = getTransferMappingService();
          await mappingService.deleteMapping(mappingId, workspaceId);
          return { success: true as const, message: `Deleted mapping ${mappingId}`, mappingId };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to delete mapping: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // ACCOUNT DOCUMENTS + MEDICAL RECEIPTS
    // ============================================

    uploadAccountDocument: tool({
      description:
        "Attach a document (statement, W2, 1099, tax form, etc.) to an account, organized by tax year. The file is sent as base64. PDF and common image types accepted.",
      inputSchema: jsonSchema<{
        accountId: number;
        taxYear: number;
        documentType?: string;
        fileName: string;
        mimeType: string;
        contentBase64: string;
        title?: string;
        description?: string;
      }>({
        type: "object",
        properties: {
          accountId: { type: "number" },
          taxYear: { type: "number", description: "Calendar year the document belongs to" },
          documentType: {
            type: "string",
            description: "Optional document type tag (statement, w2, 1099, tax_form, other)",
          },
          fileName: { type: "string" },
          mimeType: { type: "string" },
          contentBase64: { type: "string", description: "Base64-encoded file contents" },
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["accountId", "taxYear", "fileName", "mimeType", "contentBase64"],
      }),
      execute: async ({
        accountId,
        taxYear,
        documentType,
        fileName,
        mimeType,
        contentBase64,
        title,
        description,
      }) => {
        try {
          const buffer = Buffer.from(contentBase64, "base64");
          const file = new File([buffer], fileName, { type: mimeType });
          const docService = serviceFactory.getAccountDocumentService();
          const uploadData: {
            accountId: number;
            taxYear: number;
            file: File;
            documentType?: import("$core/schema/account-documents").DocumentType;
            title?: string;
            description?: string;
          } = { accountId, taxYear, file };
          if (documentType !== undefined)
            uploadData.documentType =
              documentType as import("$core/schema/account-documents").DocumentType;
          if (title !== undefined) uploadData.title = title;
          if (description !== undefined) uploadData.description = description;
          const created = await docService.uploadDocument(uploadData, workspaceId);
          return {
            success: true as const,
            message: `Uploaded ${created.fileName} for account ${accountId} (tax year ${taxYear})`,
            document: {
              id: created.id,
              accountId: created.accountId,
              fileName: created.fileName,
              taxYear: created.taxYear,
              documentType: created.documentType,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to upload document: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    listAccountDocuments: tool({
      description:
        "List documents attached to an account, optionally filtered by tax year. Returns metadata only (file name, size, type, title). Use the in-app downloader to retrieve content.",
      inputSchema: jsonSchema<{ accountId: number; taxYear?: number }>({
        type: "object",
        properties: {
          accountId: { type: "number" },
          taxYear: { type: "number" },
        },
        required: ["accountId"],
      }),
      execute: async ({ accountId, taxYear }) => {
        try {
          const docService = serviceFactory.getAccountDocumentService();
          const docs = taxYear
            ? await docService.getDocumentsByAccountAndTaxYear(accountId, taxYear, workspaceId)
            : await docService.getDocumentsByAccount(accountId, workspaceId);
          return {
            success: true as const,
            count: docs.length,
            documents: docs.map((d) => ({
              id: d.id,
              fileName: d.fileName,
              fileSize: d.fileSize,
              mimeType: d.mimeType,
              taxYear: d.taxYear,
              documentType: d.documentType,
              title: d.title,
              description: d.description,
              createdAt: d.createdAt,
            })),
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to list documents: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    deleteAccountDocument: tool({
      description: "Delete an account document and its underlying file.",
      inputSchema: jsonSchema<{ documentId: number }>({
        type: "object",
        properties: { documentId: { type: "number" } },
        required: ["documentId"],
      }),
      execute: async ({ documentId }) => {
        try {
          const docService = serviceFactory.getAccountDocumentService();
          await docService.deleteDocument(documentId, workspaceId);
          return { success: true as const, message: `Deleted document ${documentId}`, documentId };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to delete document: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    uploadMedicalExpenseReceipt: tool({
      description:
        "Attach a receipt to a medical expense. File is sent as base64. Useful for HSA tax substantiation.",
      inputSchema: jsonSchema<{
        medicalExpenseId: number;
        fileName: string;
        mimeType: string;
        contentBase64: string;
        receiptType?: string;
        description?: string;
      }>({
        type: "object",
        properties: {
          medicalExpenseId: { type: "number" },
          fileName: { type: "string" },
          mimeType: { type: "string" },
          contentBase64: { type: "string" },
          receiptType: {
            type: "string",
            description: "e.g. receipt, eob, prescription, invoice (default 'receipt')",
          },
          description: { type: "string" },
        },
        required: ["medicalExpenseId", "fileName", "mimeType", "contentBase64"],
      }),
      execute: async ({
        medicalExpenseId,
        fileName,
        mimeType,
        contentBase64,
        receiptType,
        description,
      }) => {
        try {
          const buffer = Buffer.from(contentBase64, "base64");
          const file = new File([buffer], fileName, { type: mimeType });
          const receiptService = serviceFactory.getReceiptService();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const uploadData: any = { medicalExpenseId, file };
          if (receiptType !== undefined) uploadData.receiptType = receiptType;
          if (description !== undefined) uploadData.description = description;
          const created = await receiptService.uploadReceipt(uploadData, workspaceId);
          return {
            success: true as const,
            message: `Uploaded receipt ${created.id} for medical expense ${medicalExpenseId}`,
            receipt: {
              id: created.id,
              medicalExpenseId: created.medicalExpenseId,
              fileName: created.fileName,
              receiptType: created.receiptType,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to upload receipt: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    listMedicalExpenseReceipts: tool({
      description: "List receipts attached to a medical expense.",
      inputSchema: jsonSchema<{ medicalExpenseId: number }>({
        type: "object",
        properties: { medicalExpenseId: { type: "number" } },
        required: ["medicalExpenseId"],
      }),
      execute: async ({ medicalExpenseId }) => {
        try {
          const receiptService = serviceFactory.getReceiptService();
          const receipts = await receiptService.getReceiptsByExpense(
            medicalExpenseId,
            workspaceId
          );
          return { success: true as const, count: receipts.length, receipts };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to list receipts: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    deleteMedicalExpenseReceipt: tool({
      description: "Delete a medical expense receipt.",
      inputSchema: jsonSchema<{ receiptId: number }>({
        type: "object",
        properties: { receiptId: { type: "number" } },
        required: ["receiptId"],
      }),
      execute: async ({ receiptId }) => {
        try {
          const receiptService = serviceFactory.getReceiptService();
          await receiptService.deleteReceipt(receiptId, workspaceId);
          return { success: true as const, message: `Deleted receipt ${receiptId}`, receiptId };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to delete receipt: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // SCHEDULE LIFECYCLE
    // ============================================

    listSchedules: tool({
      description:
        "List schedules in the workspace with id, name, amount, account, payee, frequency, status, and auto-add flag.",
      inputSchema: jsonSchema<{ status?: "active" | "inactive" }>({
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["active", "inactive"],
            description: "Optional status filter",
          },
        },
      }),
      execute: async ({ status }) => {
        try {
          const conditions = [eq(schedules.workspaceId, workspaceId)];
          if (status) conditions.push(eq(schedules.status, status));
          const rows = await db
            .select({
              id: schedules.id,
              name: schedules.name,
              amount: schedules.amount,
              accountId: schedules.accountId,
              payeeId: schedules.payeeId,
              categoryId: schedules.categoryId,
              status: schedules.status,
              auto_add: schedules.auto_add,
              isSubscription: schedules.isSubscription,
              subscriptionType: schedules.subscriptionType,
              subscriptionStatus: schedules.subscriptionStatus,
              frequency: scheduleDates.frequency,
              interval: scheduleDates.interval,
              startDate: scheduleDates.start,
              endDate: scheduleDates.end,
            })
            .from(schedules)
            .leftJoin(scheduleDates, eq(schedules.dateId, scheduleDates.id))
            .where(and(...conditions))
            .orderBy(desc(schedules.createdAt));
          return {
            success: true as const,
            count: rows.length,
            schedules: rows,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to list schedules: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    updateSchedule: tool({
      description:
        "Update a schedule's fields. Covers basic fields (name, amount, payee, category, status, auto-add) plus subscription metadata (isSubscription, subscriptionType, subscriptionStatus) so a recurring schedule can be marked as a tracked subscription. Pause vs. cancel: set status='inactive' to pause the schedule (still recurring, just not firing); set subscriptionStatus='cancelled' to record that the underlying service is cancelled.",
      inputSchema: jsonSchema<{
        scheduleId: number;
        name?: string;
        amount?: number;
        payeeId?: number;
        categoryId?: number | null;
        status?: "active" | "inactive";
        autoAdd?: boolean;
        isSubscription?: boolean;
        subscriptionType?: ScheduleSubscriptionType;
        subscriptionStatus?: ScheduleSubscriptionStatus;
      }>({
        type: "object",
        properties: {
          scheduleId: { type: "number" },
          name: { type: "string" },
          amount: { type: "number" },
          payeeId: { type: "number" },
          categoryId: {
            type: ["number", "null"],
            description: "Category, or null to clear",
          },
          status: {
            type: "string",
            enum: ["active", "inactive"],
            description: "Set 'inactive' to pause; 'active' to resume.",
          },
          autoAdd: { type: "boolean" },
          isSubscription: {
            type: "boolean",
            description: "Mark this schedule as a tracked subscription (e.g. Netflix, gym).",
          },
          subscriptionType: {
            type: "string",
            enum: [...scheduleSubscriptionTypes],
            description:
              "Subscription category. Setting this implicitly marks the schedule as a subscription.",
          },
          subscriptionStatus: {
            type: "string",
            enum: [...scheduleSubscriptionStatuses],
            description:
              "Lifecycle state of the subscription. Distinct from the schedule's status field — schedule.status pauses firing, subscriptionStatus tracks the real-world subscription.",
          },
        },
        required: ["scheduleId"],
      }),
      execute: async ({
        scheduleId,
        name,
        amount,
        payeeId,
        categoryId,
        status,
        autoAdd,
        isSubscription,
        subscriptionType,
        subscriptionStatus,
      }) => {
        try {
          // Ownership check.
          const [existing] = await db
            .select({ id: schedules.id })
            .from(schedules)
            .where(
              and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, workspaceId))
            )
            .limit(1);
          if (!existing) {
            return { success: false as const, message: `Schedule ${scheduleId} not found` };
          }
          const updates: Record<string, unknown> = {};
          if (name !== undefined) updates.name = name;
          if (amount !== undefined) updates.amount = amount;
          if (payeeId !== undefined) updates.payeeId = payeeId;
          if (categoryId !== undefined) updates.categoryId = categoryId;
          if (status !== undefined) updates.status = status;
          if (autoAdd !== undefined) updates.auto_add = autoAdd;
          // Setting a subscriptionType without explicit isSubscription is a
          // reasonable shortcut for "this is a subscription of type X".
          if (isSubscription !== undefined) updates.isSubscription = isSubscription;
          if (subscriptionType !== undefined) {
            updates.subscriptionType = subscriptionType;
            if (isSubscription === undefined) updates.isSubscription = true;
          }
          if (subscriptionStatus !== undefined) {
            updates.subscriptionStatus = subscriptionStatus;
            if (isSubscription === undefined) updates.isSubscription = true;
          }
          if (Object.keys(updates).length === 0) {
            return {
              success: false as const,
              message: "No fields provided to update",
            };
          }
          await db
            .update(schedules)
            .set(updates)
            .where(
              and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, workspaceId))
            );
          return {
            success: true as const,
            message: `Updated schedule ${scheduleId}`,
            scheduleId,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to update schedule: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    deleteSchedule: tool({
      description:
        "Delete a schedule. Existing transactions previously generated by this schedule are preserved (their scheduleId is cleared).",
      inputSchema: jsonSchema<{ scheduleId: number }>({
        type: "object",
        properties: { scheduleId: { type: "number" } },
        required: ["scheduleId"],
      }),
      execute: async ({ scheduleId }) => {
        try {
          const [existing] = await db
            .select({ dateId: schedules.dateId })
            .from(schedules)
            .where(
              and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, workspaceId))
            )
            .limit(1);
          if (!existing) {
            return { success: false as const, message: `Schedule ${scheduleId} not found` };
          }
          // Clear scheduleId on transactions.
          await db
            .update(transactions)
            .set({ scheduleId: null })
            .where(eq(transactions.scheduleId, scheduleId));
          // Unlink date row (circular reference) then delete.
          if (existing.dateId) {
            await db
              .update(schedules)
              .set({ dateId: null })
              .where(eq(schedules.id, scheduleId));
            await db.delete(scheduleDates).where(eq(scheduleDates.id, existing.dateId));
          }
          await db.delete(scheduleDates).where(eq(scheduleDates.scheduleId, scheduleId));
          await db
            .delete(schedules)
            .where(
              and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, workspaceId))
            );
          return {
            success: true as const,
            message: `Deleted schedule ${scheduleId}`,
            scheduleId,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to delete schedule: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    skipScheduleOccurrence: tool({
      description:
        "Skip a single occurrence of a recurring schedule (e.g. user is on vacation, no rent due this month). The schedule itself continues normally.",
      inputSchema: jsonSchema<{
        scheduleId: number;
        skippedDate: string;
        reason?: string;
      }>({
        type: "object",
        properties: {
          scheduleId: { type: "number" },
          skippedDate: { type: "string", description: "YYYY-MM-DD of the occurrence to skip" },
          reason: { type: "string", description: "Optional reason for the skip" },
        },
        required: ["scheduleId", "skippedDate"],
      }),
      execute: async ({ scheduleId, skippedDate, reason }) => {
        try {
          const scheduleService = serviceFactory.getScheduleService();
          const skip = await scheduleService.skipSingleOccurrence(
            scheduleId,
            skippedDate,
            workspaceId,
            reason
          );
          return {
            success: true as const,
            message: `Skipped ${skippedDate} for schedule ${scheduleId}`,
            skipId: skip.id,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to skip occurrence: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Create a new transfer pair between two accounts
     */
    createTransfer: tool({
      description:
        "Record a new transfer between two accounts. Creates two paired transactions (one negative on the source account, one positive on the destination). Use this when neither side of the transfer has been recorded yet.",
      inputSchema: jsonSchema<{
        fromAccountId: number;
        toAccountId: number;
        amount: number;
        date: string;
        notes?: string;
      }>({
        type: "object",
        properties: {
          fromAccountId: { type: "number", description: "Source account (money leaves this account)" },
          toAccountId: { type: "number", description: "Destination account (money arrives in this account)" },
          amount: {
            type: "number",
            description: "Transfer amount in dollars. Always positive; direction is determined by from/to.",
          },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          notes: { type: "string", description: "Optional shared notes for both transactions" },
        },
        required: ["fromAccountId", "toAccountId", "amount", "date"],
      }),
      execute: async ({ fromAccountId, toAccountId, amount, date, notes }) => {
        try {
          const transactionService = serviceFactory.getTransactionService();
          const result = await transactionService.createTransfer(
            { fromAccountId, toAccountId, amount, date, notes },
            workspaceId
          );
          return {
            success: true as const,
            message: `Created transfer of $${amount} from account ${fromAccountId} to account ${toAccountId}`,
            transferId: result.transferId,
            fromTransactionId: result.fromTransaction.id,
            toTransactionId: result.toTransaction.id,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to create transfer: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Convert an existing transaction into one half of a transfer
     */
    convertToTransfer: tool({
      description:
        "Convert an existing transaction into one half of a transfer pair. Creates the matching transaction in the target account automatically (opposite sign, same date). Use this when one side of the transfer is already recorded.",
      inputSchema: jsonSchema<{
        transactionId: number;
        targetAccountId: number;
      }>({
        type: "object",
        properties: {
          transactionId: {
            type: "number",
            description: "ID of the existing transaction to convert",
          },
          targetAccountId: {
            type: "number",
            description: "Account where the paired transaction will be created",
          },
        },
        required: ["transactionId", "targetAccountId"],
      }),
      execute: async ({ transactionId, targetAccountId }) => {
        try {
          const transactionService = serviceFactory.getTransactionService();
          const result = await transactionService.convertToTransfer(
            transactionId,
            targetAccountId,
            workspaceId
          );
          return {
            success: true as const,
            message: `Converted transaction ${transactionId} into a transfer; paired transaction ${result.targetTransaction.id} created in account ${targetAccountId}`,
            transferId: result.transferId,
            sourceTransactionId: result.sourceTransaction.id,
            targetTransactionId: result.targetTransaction.id,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to convert to transfer: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Find groups of payees that look like duplicates
     */
    findDuplicatePayees: tool({
      description:
        "Find groups of payees that appear to be duplicates of each other (e.g. 'WALMART', 'Walmart Store #123', 'walmart.com'). Returns groups with a primary plus the duplicates. Use this before calling mergePayees so the user can confirm what's being merged.",
      inputSchema: jsonSchema<{
        similarityThreshold?: number;
        groupingStrategy?: "name" | "contact" | "transaction_pattern" | "comprehensive";
      }>({
        type: "object",
        properties: {
          similarityThreshold: {
            type: "number",
            description: "Match strictness 0..1. Default 0.8. Higher = fewer false positives.",
          },
          groupingStrategy: {
            type: "string",
            enum: ["name", "contact", "transaction_pattern", "comprehensive"],
            description: "What to compare. Default 'name'.",
          },
        },
      }),
      execute: async ({ similarityThreshold = 0.8, groupingStrategy = "name" }) => {
        try {
          const payeeService = serviceFactory.getPayeeService();
          const result = await payeeService.findDuplicatePayees(
            similarityThreshold,
            false, // includeInactive
            groupingStrategy,
            workspaceId,
            "simple" // detectionMethod — keep it fast, no nested LLM
          );

          // Hydrate names for every payee referenced in any group.
          const allIds = new Set<number>();
          for (const g of result.groups) {
            allIds.add(g.primaryPayeeId);
            for (const id of g.duplicatePayeeIds) allIds.add(id);
          }
          const nameRows =
            allIds.size > 0
              ? await db
                  .select({ id: payees.id, name: payees.name })
                  .from(payees)
                  .where(
                    and(
                      eq(payees.workspaceId, workspaceId),
                      inArray(payees.id, Array.from(allIds))
                    )
                  )
              : [];
          const nameById = new Map(nameRows.map((r) => [r.id, r.name]));

          return {
            success: true as const,
            groupCount: result.groups.length,
            groups: result.groups.map((g) => ({
              primary: { id: g.primaryPayeeId, name: nameById.get(g.primaryPayeeId) ?? null },
              duplicates: g.duplicatePayeeIds.map((id) => ({
                id,
                name: nameById.get(id) ?? null,
              })),
              similarityScore: g.similarityScore,
              recommendedAction: g.recommendedAction,
              riskLevel: g.riskLevel,
            })),
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to find duplicates: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Merge duplicate payees into a single keeper
     */
    mergePayees: tool({
      description:
        "Merge one or more duplicate payees into a primary (keeper) payee. All transactions from the duplicates are reassigned to the primary, then the duplicates are soft-deleted. ⚠️ Destructive — confirm with the user before calling.",
      inputSchema: jsonSchema<{
        primaryPayeeId: number;
        duplicatePayeeIds: number[];
      }>({
        type: "object",
        properties: {
          primaryPayeeId: {
            type: "number",
            description: "The payee that survives the merge (the keeper)",
          },
          duplicatePayeeIds: {
            type: "array",
            items: { type: "number" },
            description: "One or more payee IDs to merge into the primary. Cannot include primary.",
            minItems: 1,
          },
        },
        required: ["primaryPayeeId", "duplicatePayeeIds"],
      }),
      execute: async ({ primaryPayeeId, duplicatePayeeIds }) => {
        try {
          if (duplicatePayeeIds.includes(primaryPayeeId)) {
            return {
              success: false as const,
              message: "primaryPayeeId cannot be in duplicatePayeeIds",
            };
          }
          const payeeService = serviceFactory.getPayeeService();
          const result = await payeeService.mergeDuplicatePayees(
            primaryPayeeId,
            duplicatePayeeIds,
            { preserveTransactionHistory: true, mergeContactInfo: true },
            true, // confirmMerge — scope toggle is the auth gate
            workspaceId
          );
          return {
            success: result.success,
            message:
              result.success && result.warnings.length === 0
                ? `Merged ${result.deletedPayeeIds.length} payee(s) into payee ${result.mergedPayeeId}; ${result.transactionsUpdated} transactions reassigned`
                : `Merge completed with warnings: ${result.warnings.join("; ")}`,
            mergedPayeeId: result.mergedPayeeId,
            deletedPayeeIds: result.deletedPayeeIds,
            transactionsUpdated: result.transactionsUpdated,
            warnings: result.warnings,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to merge payees: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Create a recurring schedule
     */
    createSchedule: tool({
      description:
        "Create a recurring transaction schedule (e.g. 'Netflix $15/mo', 'Rent $2400 on the 1st'). Use this for any transaction that repeats. For a single one-off transaction, use createTransaction-style tools instead. autoAdd=true makes the app auto-create transactions on the due date.",
      inputSchema: jsonSchema<{
        name: string;
        accountId: number;
        payeeId: number;
        amount: number;
        categoryId?: number;
        amountType?: "exact" | "approximate" | "range";
        amount2?: number;
        autoAdd?: boolean;
        recurrence: {
          frequency: "daily" | "weekly" | "monthly" | "yearly";
          interval?: number;
          startDate: string;
          endDate?: string;
          limit?: number;
          daysOfWeek?: number[];
          dayOfMonth?: number;
        };
      }>({
        type: "object",
        properties: {
          name: { type: "string", description: "Display name for the schedule" },
          accountId: { type: "number", description: "Account that the recurring transaction posts to" },
          payeeId: { type: "number", description: "Payee for the recurring transaction (required)" },
          amount: {
            type: "number",
            description: "Amount in dollars. Negative for expenses, positive for income.",
          },
          categoryId: { type: "number", description: "Optional category for the recurring transaction" },
          amountType: {
            type: "string",
            enum: ["exact", "approximate", "range"],
            description:
              "How the amount is interpreted. 'exact' = same every time, 'approximate' ≈ amount, 'range' = use amount2 as the high end and average is used. Default 'exact'.",
          },
          amount2: {
            type: "number",
            description: "Upper bound when amountType is 'range'",
          },
          autoAdd: {
            type: "boolean",
            description:
              "If true, the app auto-creates transactions on each due date. If false, the schedule just appears in the upcoming-transactions list.",
          },
          recurrence: {
            type: "object",
            properties: {
              frequency: {
                type: "string",
                enum: ["daily", "weekly", "monthly", "yearly"],
                description: "How often the schedule fires",
              },
              interval: {
                type: "number",
                description: "Every N (e.g. frequency=weekly + interval=2 → every other week). Default 1.",
              },
              startDate: { type: "string", description: "First occurrence in YYYY-MM-DD" },
              endDate: { type: "string", description: "Optional end date in YYYY-MM-DD" },
              limit: {
                type: "number",
                description: "Maximum number of occurrences. 0 = unlimited (default).",
              },
              daysOfWeek: {
                type: "array",
                items: { type: "number" },
                description: "For weekly: which days of the week (0=Sun..6=Sat). Multiple allowed.",
              },
              dayOfMonth: {
                type: "number",
                description: "For monthly/yearly: which day of the month (1-31).",
              },
            },
            required: ["frequency", "startDate"],
          },
        },
        required: ["name", "accountId", "payeeId", "amount", "recurrence"],
      }),
      execute: async ({
        name,
        accountId,
        payeeId,
        amount,
        categoryId,
        amountType = "exact",
        amount2,
        autoAdd,
        recurrence,
      }) => {
        try {
          // Verify ownership of the referenced rows. The route handler
          // doesn't do this since the form's selects already constrain
          // it, but the agent could pass anything.
          const [account] = await db
            .select({ id: accounts.id })
            .from(accounts)
            .where(
              and(
                eq(accounts.id, accountId),
                eq(accounts.workspaceId, workspaceId),
                isNull(accounts.deletedAt)
              )
            )
            .limit(1);
          if (!account) {
            return { success: false as const, message: `Account ${accountId} not found` };
          }
          const [payee] = await db
            .select({ id: payees.id })
            .from(payees)
            .where(
              and(
                eq(payees.id, payeeId),
                eq(payees.workspaceId, workspaceId),
                isNull(payees.deletedAt)
              )
            )
            .limit(1);
          if (!payee) {
            return { success: false as const, message: `Payee ${payeeId} not found` };
          }
          if (categoryId !== undefined) {
            const [cat] = await db
              .select({ id: categories.id })
              .from(categories)
              .where(
                and(
                  eq(categories.id, categoryId),
                  eq(categories.workspaceId, workspaceId),
                  isNull(categories.deletedAt)
                )
              )
              .limit(1);
            if (!cat) {
              return { success: false as const, message: `Category ${categoryId} not found` };
            }
          }

          const slug = await generateUniqueSlugForDB(
            db,
            "schedules",
            schedules.slug,
            slugify(name)
          );

          // 1. Insert the schedule row.
          const [created] = await db
            .insert(schedules)
            .values({
              workspaceId,
              name,
              slug,
              status: "active",
              accountId,
              payeeId,
              categoryId: categoryId ?? null,
              amount,
              amount_2: amount2 ?? 0,
              amount_type: amountType,
              recurring: true,
              auto_add: autoAdd ?? false,
            })
            .returning();
          if (!created) {
            return { success: false as const, message: "Failed to create schedule" };
          }

          // 2. Insert the recurrence row.
          const [dateRow] = await db
            .insert(scheduleDates)
            .values({
              scheduleId: created.id,
              start: recurrence.startDate,
              end: recurrence.endDate ?? null,
              frequency: recurrence.frequency,
              interval: recurrence.interval ?? 1,
              limit: recurrence.limit ?? 0,
              days:
                recurrence.frequency === "monthly" && recurrence.dayOfMonth !== undefined
                  ? [recurrence.dayOfMonth]
                  : [],
              week_days:
                recurrence.frequency === "weekly" && recurrence.daysOfWeek
                  ? recurrence.daysOfWeek
                  : [],
              on: false,
              on_type: "day",
            })
            .returning();
          if (!dateRow) {
            return { success: false as const, message: "Failed to create schedule recurrence" };
          }

          // 3. Link the schedule to its date row.
          await db
            .update(schedules)
            .set({ dateId: dateRow.id })
            .where(eq(schedules.id, created.id));

          return {
            success: true as const,
            message: (() => {
              const every =
                (recurrence.interval ?? 1) === 1 ? "" : `every ${recurrence.interval} `;
              const unit =
                recurrence.frequency === "daily"
                  ? "day"
                  : recurrence.frequency === "weekly"
                    ? "week"
                    : recurrence.frequency === "monthly"
                      ? "month"
                      : "year";
              return `Created schedule "${name}" — recurs ${every}${unit}${(recurrence.interval ?? 1) > 1 ? "s" : ""} starting ${recurrence.startDate}`;
            })(),
            schedule: {
              id: created.id,
              name: created.name,
              slug: created.slug,
              amount: created.amount,
              accountId: created.accountId,
              payeeId: created.payeeId,
              categoryId: created.categoryId,
              autoAdd: created.auto_add,
              frequency: recurrence.frequency,
              interval: recurrence.interval ?? 1,
              startDate: recurrence.startDate,
              endDate: recurrence.endDate ?? null,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to create schedule: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Break a transfer link, restoring both transactions to independent state
     */
    unlinkTransfer: tool({
      description:
        "Break the link between two transactions that are currently a transfer pair. Both transactions are retained as independent transactions. Pass any transaction ID from the pair.",
      inputSchema: jsonSchema<{ transactionId: number }>({
        type: "object",
        properties: {
          transactionId: {
            type: "number",
            description: "ID of either transaction in the transfer pair",
          },
        },
        required: ["transactionId"],
      }),
      execute: async ({ transactionId }) => {
        try {
          // Resolve the shared transferId from the given transaction.
          const [row] = await db
            .select({ transferId: transactions.transferId })
            .from(transactions)
            .innerJoin(accounts, eq(transactions.accountId, accounts.id))
            .where(
              and(
                eq(transactions.id, transactionId),
                eq(accounts.workspaceId, workspaceId),
                isNull(transactions.deletedAt)
              )
            )
            .limit(1);
          if (!row) {
            return {
              success: false as const,
              message: `Transaction ${transactionId} not found`,
            };
          }
          if (!row.transferId) {
            return {
              success: false as const,
              message: `Transaction ${transactionId} is not part of a transfer`,
            };
          }
          const transactionService = serviceFactory.getTransactionService();
          await transactionService.unlinkTransfer(row.transferId, workspaceId);
          return {
            success: true as const,
            message: `Unlinked transfer; transactions are now independent`,
            transferId: row.transferId,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to unlink transfer: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * List available categories
     */
    listCategories: tool({
      description: "List all available categories for categorizing transactions",
      inputSchema: jsonSchema<{ search?: string }>({
        type: "object",
        properties: {
          search: { type: "string", description: "Optional search term to filter categories" },
        },
      }),
      execute: async ({ search }) => {
        const conditions: ReturnType<typeof eq>[] = [
          eq(categories.workspaceId, workspaceId),
          isNull(categories.deletedAt),
        ];

        if (search) {
          conditions.push(like(categories.name, `%${search}%`));
        }

        const results = await db
          .select({
            id: categories.id,
            name: categories.name,
            categoryType: categories.categoryType,
          })
          .from(categories)
          .where(and(...conditions))
          .orderBy(categories.categoryType, categories.name)
          .limit(50);

        return {
          success: true as const,
          count: results.length,
          categories: results.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.categoryType,
          })),
        };
      },
    }),

    // ============================================
    // BULK TRANSACTION EDITS
    // ============================================

    bulkCategorizeTransactions: tool({
      description:
        "Apply a single category to many transactions at once. Pass a list of transactionIds and one categoryId (or null to clear). Single SQL update — far cheaper than calling categorizeTransaction N times.",
      inputSchema: jsonSchema<{ transactionIds: number[]; categoryId: number | null }>({
        type: "object",
        properties: {
          transactionIds: {
            type: "array",
            items: { type: "number" },
            minItems: 1,
            description: "Transaction IDs to update",
          },
          categoryId: {
            type: ["number", "null"],
            description: "Category to assign, or null to clear",
          },
        },
        required: ["transactionIds", "categoryId"],
      }),
      execute: async ({ transactionIds, categoryId }) => {
        try {
          if (categoryId !== null) {
            const [cat] = await db
              .select({ id: categories.id })
              .from(categories)
              .where(
                and(
                  eq(categories.id, categoryId),
                  eq(categories.workspaceId, workspaceId),
                  isNull(categories.deletedAt)
                )
              )
              .limit(1);
            if (!cat) {
              return { success: false as const, message: `Category ${categoryId} not found` };
            }
          }
          const updated = await db
            .update(transactions)
            .set({ categoryId })
            .where(
              and(
                inArray(transactions.id, transactionIds),
                eq(transactions.workspaceId, workspaceId),
                isNull(transactions.deletedAt)
              )
            )
            .returning({ id: transactions.id });
          return {
            success: true as const,
            message: `Updated ${updated.length} transaction(s)`,
            updatedCount: updated.length,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Bulk categorize failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    bulkSetPayee: tool({
      description:
        "Assign a single payee to many transactions at once. Pass transactionIds and one payeeId (or null to clear).",
      inputSchema: jsonSchema<{ transactionIds: number[]; payeeId: number | null }>({
        type: "object",
        properties: {
          transactionIds: {
            type: "array",
            items: { type: "number" },
            minItems: 1,
          },
          payeeId: { type: ["number", "null"] },
        },
        required: ["transactionIds", "payeeId"],
      }),
      execute: async ({ transactionIds, payeeId }) => {
        try {
          if (payeeId !== null) {
            const [p] = await db
              .select({ id: payees.id })
              .from(payees)
              .where(
                and(
                  eq(payees.id, payeeId),
                  eq(payees.workspaceId, workspaceId),
                  isNull(payees.deletedAt)
                )
              )
              .limit(1);
            if (!p) {
              return { success: false as const, message: `Payee ${payeeId} not found` };
            }
          }
          const updated = await db
            .update(transactions)
            .set({ payeeId })
            .where(
              and(
                inArray(transactions.id, transactionIds),
                eq(transactions.workspaceId, workspaceId),
                isNull(transactions.deletedAt)
              )
            )
            .returning({ id: transactions.id });
          return {
            success: true as const,
            message: `Updated ${updated.length} transaction(s)`,
            updatedCount: updated.length,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Bulk set payee failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    clearPendingTransactions: tool({
      description:
        "Mark all 'pending' transactions in an account as 'cleared'. Returns the count promoted.",
      inputSchema: jsonSchema<{ accountId: number }>({
        type: "object",
        properties: { accountId: { type: "number" } },
        required: ["accountId"],
      }),
      execute: async ({ accountId }) => {
        try {
          const transactionService = serviceFactory.getTransactionService();
          const count = await transactionService.clearPendingTransactions(accountId, workspaceId);
          return {
            success: true as const,
            message: `Cleared ${count} pending transaction(s) in account ${accountId}`,
            clearedCount: count,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to clear pending: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // ANALYTICS — WORKSPACE / TIME-SERIES
    // ============================================

    getWorkspaceSummary: tool({
      description:
        "Workspace-wide summary: total pending balance, pending in/outflow counts, 30-day spending + receipts + net cashflow. Useful for high-level financial snapshot.",
      inputSchema: jsonSchema<Record<string, never>>({
        type: "object",
        properties: {},
      }),
      execute: async () => {
        try {
          const transactionService = serviceFactory.getTransactionService();
          const summary = await transactionService.getWorkspaceSummary(workspaceId);
          return { success: true as const, ...summary };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to get summary: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    getNetWorthOverTime: tool({
      description:
        "Net worth (assets minus liabilities) snapshot at each month-end for the past N months. Computed from the workspace's transactions across all on-budget accounts.",
      inputSchema: jsonSchema<{ months?: number }>({
        type: "object",
        properties: {
          months: {
            type: "number",
            description: "Number of months back to include (default 12, max 60)",
          },
        },
      }),
      execute: async ({ months = 12 }) => {
        try {
          const n = Math.min(Math.max(months, 1), 60);
          const since = new Date();
          since.setMonth(since.getMonth() - n);
          const sinceIso = since.toISOString().slice(0, 10);
          // Cumulative balance per (account, month-end) by summing all
          // transactions on or before each month end. Heavy if N is large
          // but bounded; SQLite handles it fine for a personal app.
          const rows = await db
            .select({
              month: sql<string>`strftime('%Y-%m', ${transactions.date})`,
              accountId: transactions.accountId,
              monthSum: sql<number>`SUM(${transactions.amount})`,
            })
            .from(transactions)
            .innerJoin(accounts, eq(transactions.accountId, accounts.id))
            .where(
              and(
                eq(accounts.workspaceId, workspaceId),
                isNull(transactions.deletedAt),
                isNull(accounts.deletedAt),
                gte(transactions.date, sinceIso)
              )
            )
            .groupBy(sql`strftime('%Y-%m', ${transactions.date})`, transactions.accountId);
          // Aggregate per month across accounts (running sum maintained client-side).
          const monthsSet = new Set<string>();
          const byMonth = new Map<string, number>();
          for (const r of rows) {
            monthsSet.add(r.month);
            byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + Number(r.monthSum));
          }
          const sortedMonths = Array.from(monthsSet).sort();
          let runningTotal = 0;
          const series = sortedMonths.map((m) => {
            runningTotal += byMonth.get(m) ?? 0;
            return { month: m, netWorth: roundToCents(runningTotal) };
          });
          return {
            success: true as const,
            count: series.length,
            series,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to compute net worth: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    getMonthlySummary: tool({
      description:
        "Per-month income vs expenses vs net for the past N months across all workspace accounts. Income = positive amounts, expenses = absolute value of negative amounts.",
      inputSchema: jsonSchema<{ months?: number }>({
        type: "object",
        properties: {
          months: { type: "number", description: "How many months back (default 12, max 60)" },
        },
      }),
      execute: async ({ months = 12 }) => {
        try {
          const n = Math.min(Math.max(months, 1), 60);
          const since = new Date();
          since.setMonth(since.getMonth() - n);
          const sinceIso = since.toISOString().slice(0, 10);
          const rows = await db
            .select({
              month: sql<string>`strftime('%Y-%m', ${transactions.date})`,
              income: sql<number>`SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END)`,
              expense: sql<number>`SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END)`,
              count: sql<number>`COUNT(*)`,
            })
            .from(transactions)
            .innerJoin(accounts, eq(transactions.accountId, accounts.id))
            .where(
              and(
                eq(accounts.workspaceId, workspaceId),
                isNull(transactions.deletedAt),
                isNull(accounts.deletedAt),
                gte(transactions.date, sinceIso)
              )
            )
            .groupBy(sql`strftime('%Y-%m', ${transactions.date})`)
            .orderBy(sql`strftime('%Y-%m', ${transactions.date})`);
          return {
            success: true as const,
            count: rows.length,
            months: rows.map((r) => ({
              month: r.month,
              income: Number(r.income) || 0,
              expenses: Number(r.expense) || 0,
              net: (Number(r.income) || 0) - (Number(r.expense) || 0),
              transactionCount: Number(r.count) || 0,
            })),
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to compute monthly summary: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    getTaxDeductibleSpending: tool({
      description:
        "Total tax-deductible spending for a year, grouped by tax category. Uses categories flagged as isTaxDeductible. Returns gross spend, deductible portion (applying deductiblePercentage), and category breakdown.",
      inputSchema: jsonSchema<{ year?: number }>({
        type: "object",
        properties: {
          year: {
            type: "number",
            description: "Calendar year. Defaults to current year.",
          },
        },
      }),
      execute: async ({ year }) => {
        try {
          const y = year ?? new Date().getFullYear();
          const start = `${y}-01-01`;
          const end = `${y}-12-31`;
          const rows = await db
            .select({
              categoryId: categories.id,
              categoryName: categories.name,
              taxCategory: categories.taxCategory,
              deductiblePercentage: categories.deductiblePercentage,
              gross: sql<number>`SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END)`,
              count: sql<number>`COUNT(*)`,
            })
            .from(transactions)
            .innerJoin(accounts, eq(transactions.accountId, accounts.id))
            .innerJoin(categories, eq(transactions.categoryId, categories.id))
            .where(
              and(
                eq(accounts.workspaceId, workspaceId),
                isNull(transactions.deletedAt),
                eq(categories.isTaxDeductible, true),
                gte(transactions.date, start),
                lte(transactions.date, end)
              )
            )
            .groupBy(categories.id);
          let totalGross = 0;
          let totalDeductible = 0;
          const breakdown = rows.map((r) => {
            const gross = Number(r.gross) || 0;
            const pct = Number(r.deductiblePercentage ?? 100);
            const deductible = roundToCents((gross * pct) / 100);
            totalGross += gross;
            totalDeductible += deductible;
            return {
              categoryId: r.categoryId,
              categoryName: r.categoryName,
              taxCategory: r.taxCategory,
              deductiblePercentage: pct,
              grossAmount: roundToCents(gross),
              deductibleAmount: deductible,
              transactionCount: Number(r.count) || 0,
            };
          });
          return {
            success: true as const,
            year: y,
            totalGross: roundToCents(totalGross),
            totalDeductible: roundToCents(totalDeductible),
            categories: breakdown,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to compute tax deductible spending: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    suggestTransactionDetails: tool({
      description:
        "Get ML-suggested payee/category/budget for a single transaction based on similar past entries. Returns suggestions with confidence scores. Useful for auto-categorizing imported rows.",
      inputSchema: jsonSchema<{ transactionId: number }>({
        type: "object",
        properties: { transactionId: { type: "number" } },
        required: ["transactionId"],
      }),
      execute: async ({ transactionId }) => {
        try {
          const transactionService = serviceFactory.getTransactionService();
          const suggestion = await transactionService.suggestTransactionDetails(
            transactionId,
            workspaceId
          );
          return { success: true as const, suggestion };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to suggest details: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    recordPredictionFeedback: tool({
      description:
        "Tell the system whether an ML prediction was correct or what the right value would have been. Improves future predictions. predictionType is the kind of prediction the feedback is for (next_transaction, budget_suggestion, anomaly, pdf_extraction_row).",
      inputSchema: jsonSchema<{
        predictionType:
          | "next_transaction"
          | "budget_suggestion"
          | "anomaly"
          | "pdf_extraction_row";
        rating?: "positive" | "negative";
        payeeId?: number;
        originalAmount?: number;
        originalDate?: string;
        correctedAmount?: number;
        correctedDate?: string;
      }>({
        type: "object",
        properties: {
          predictionType: {
            type: "string",
            enum: [
              "next_transaction",
              "budget_suggestion",
              "anomaly",
              "pdf_extraction_row",
            ],
          },
          rating: { type: "string", enum: ["positive", "negative"] },
          payeeId: { type: "number" },
          originalAmount: { type: "number" },
          originalDate: { type: "string" },
          correctedAmount: { type: "number" },
          correctedDate: { type: "string" },
        },
        required: ["predictionType"],
      }),
      execute: async ({
        predictionType,
        rating,
        payeeId,
        originalAmount,
        originalDate,
        correctedAmount,
        correctedDate,
      }) => {
        try {
          const payeeService = serviceFactory.getPayeeService();
          const feedback = await payeeService.recordPredictionFeedback(
            {
              predictionType,
              rating,
              payeeId,
              originalAmount,
              originalDate,
              correctedAmount,
              correctedDate,
            },
            workspaceId
          );
          return {
            success: true as const,
            message: `Recorded ${rating ?? "details"} feedback for ${predictionType}`,
            feedbackId: feedback.id,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to record feedback: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // PERIOD TEMPLATES
    // ============================================

    createPeriodTemplate: tool({
      description:
        "Add an additional period template to an existing budget (e.g. add a weekly cycle alongside the default monthly one).",
      inputSchema: jsonSchema<{
        budgetId: number;
        type: "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
        intervalCount?: number;
        startDayOfWeek?: number;
        startDayOfMonth?: number;
        startMonth?: number;
        timezone?: string;
        allocatedAmount?: number;
      }>({
        type: "object",
        properties: {
          budgetId: { type: "number" },
          type: {
            type: "string",
            enum: ["weekly", "monthly", "quarterly", "yearly", "custom"],
          },
          intervalCount: { type: "number", description: "Every N (default 1)" },
          startDayOfWeek: { type: "number", description: "Weekly: 0-6 (Sun=0)" },
          startDayOfMonth: { type: "number", description: "Monthly: 1-31" },
          startMonth: { type: "number", description: "Yearly: 1-12" },
          timezone: { type: "string", description: "IANA timezone; defaults to UTC" },
          allocatedAmount: { type: "number", description: "Default allocation per period" },
        },
        required: ["budgetId", "type"],
      }),
      execute: async (input) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          const created = await budgetService.createPeriodTemplate(input, workspaceId);
          return {
            success: true as const,
            message: `Created ${created.type} period template ${created.id} for budget ${input.budgetId}`,
            template: {
              id: created.id,
              budgetId: created.budgetId,
              type: created.type,
              intervalCount: created.intervalCount,
            },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to create period template: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    updatePeriodTemplate: tool({
      description: "Update a period template's frequency / interval / start fields.",
      inputSchema: jsonSchema<{
        templateId: number;
        type?: "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
        intervalCount?: number;
        startDayOfWeek?: number;
        startDayOfMonth?: number;
        startMonth?: number;
        timezone?: string;
      }>({
        type: "object",
        properties: {
          templateId: { type: "number" },
          type: {
            type: "string",
            enum: ["weekly", "monthly", "quarterly", "yearly", "custom"],
          },
          intervalCount: { type: "number" },
          startDayOfWeek: { type: "number" },
          startDayOfMonth: { type: "number" },
          startMonth: { type: "number" },
          timezone: { type: "string" },
        },
        required: ["templateId"],
      }),
      execute: async ({ templateId, ...updates }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          const updated = await budgetService.updatePeriodTemplate(templateId, updates);
          return {
            success: true as const,
            message: `Updated period template ${templateId}`,
            template: { id: updated.id, type: updated.type, intervalCount: updated.intervalCount },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to update period template: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    deletePeriodTemplate: tool({
      description: "Delete a period template. Its period instances and envelope allocations cascade.",
      inputSchema: jsonSchema<{ templateId: number }>({
        type: "object",
        properties: { templateId: { type: "number" } },
        required: ["templateId"],
      }),
      execute: async ({ templateId }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          await budgetService.deletePeriodTemplate(templateId);
          return {
            success: true as const,
            message: `Deleted period template ${templateId}`,
            templateId,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to delete period template: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // ENVELOPE ROLLOVER + DEFICIT
    // ============================================

    previewEnvelopeRollover: tool({
      description:
        "Preview what would happen if you rolled envelope balances from one period to another. No changes made. Shows per-envelope rollover/deficit/reset projections.",
      inputSchema: jsonSchema<{ fromPeriodId: number; toPeriodId: number }>({
        type: "object",
        properties: {
          fromPeriodId: { type: "number" },
          toPeriodId: { type: "number" },
        },
        required: ["fromPeriodId", "toPeriodId"],
      }),
      execute: async ({ fromPeriodId, toPeriodId }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          const preview = await budgetService.previewEnvelopeRollover(fromPeriodId, toPeriodId);
          return { success: true as const, preview };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to preview rollover: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    processEnvelopeRollover: tool({
      description:
        "Execute the envelope rollover from one period to the next. Applies each envelope's rolloverMode (unlimited/reset/limited). Idempotent — re-running is safe.",
      inputSchema: jsonSchema<{ fromPeriodId: number; toPeriodId: number }>({
        type: "object",
        properties: {
          fromPeriodId: { type: "number" },
          toPeriodId: { type: "number" },
        },
        required: ["fromPeriodId", "toPeriodId"],
      }),
      execute: async ({ fromPeriodId, toPeriodId }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          const result = await budgetService.processEnvelopeRollover(fromPeriodId, toPeriodId);
          return { success: true as const, result };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to process rollover: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    analyzeEnvelopeDeficit: tool({
      description:
        "Analyze why an envelope is in deficit and what level of recovery effort would be needed. Returns severity, projected timeline, and suggested actions.",
      inputSchema: jsonSchema<{ envelopeId: number }>({
        type: "object",
        properties: { envelopeId: { type: "number" } },
        required: ["envelopeId"],
      }),
      execute: async ({ envelopeId }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          const analysis = await budgetService.analyzeEnvelopeDeficit(envelopeId);
          return { success: true as const, analysis };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to analyze deficit: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    createEnvelopeDeficitRecoveryPlan: tool({
      description:
        "Generate a structured recovery plan for an envelope deficit (e.g. transfer suggestions, allocation increases). Doesn't apply changes — returns a plan to review/execute.",
      inputSchema: jsonSchema<{ envelopeId: number }>({
        type: "object",
        properties: { envelopeId: { type: "number" } },
        required: ["envelopeId"],
      }),
      execute: async ({ envelopeId }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          const plan = await budgetService.createEnvelopeDeficitRecoveryPlan(envelopeId);
          return { success: true as const, plan };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to create recovery plan: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    getBudgetRolloverHistory: tool({
      description:
        "Audit trail of envelope rollovers for a budget. Each entry records which envelope rolled what amount between which periods.",
      inputSchema: jsonSchema<{ budgetId: number; limit?: number }>({
        type: "object",
        properties: {
          budgetId: { type: "number" },
          limit: { type: "number", description: "Max entries (default 50)" },
        },
        required: ["budgetId"],
      }),
      execute: async ({ budgetId, limit }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          await budgetService.getBudget(budgetId, workspaceId);
          const history = await budgetService.getBudgetRolloverHistory(budgetId, limit);
          return { success: true as const, count: history.length, history };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to get rollover history: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // BUDGET MISC
    // ============================================

    duplicateBudget: tool({
      description:
        "Clone an existing budget (name, type, period templates, accounts, categories). Useful for setting up next year's budget from this year's, or replicating a structure.",
      inputSchema: jsonSchema<{ budgetId: number; name?: string }>({
        type: "object",
        properties: {
          budgetId: { type: "number" },
          name: {
            type: "string",
            description: "Name for the copy. Defaults to '<original> (Copy)'.",
          },
        },
        required: ["budgetId"],
      }),
      execute: async ({ budgetId, name }) => {
        try {
          const budgetService = serviceFactory.getBudgetService();
          await budgetService.getBudget(budgetId, workspaceId);
          const duplicated = await budgetService.duplicateBudget(budgetId, workspaceId, name);
          return {
            success: true as const,
            message: `Duplicated budget ${budgetId} as ${duplicated.id}`,
            budget: { id: duplicated.id, name: duplicated.name },
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to duplicate budget: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // SCHEDULES — ADVANCED
    // ============================================

    pushSchedulesForward: tool({
      description:
        "Push all future occurrences of a schedule forward by one interval (e.g. rent moved from the 1st to the 2nd of every month). Recorded as a 'push_forward' skip — reversible via removeScheduleSkip.",
      inputSchema: jsonSchema<{
        scheduleId: number;
        skippedDate: string;
        reason?: string;
      }>({
        type: "object",
        properties: {
          scheduleId: { type: "number" },
          skippedDate: {
            type: "string",
            description: "YYYY-MM-DD of the occurrence to push forward from",
          },
          reason: { type: "string" },
        },
        required: ["scheduleId", "skippedDate"],
      }),
      execute: async ({ scheduleId, skippedDate, reason }) => {
        try {
          const scheduleService = serviceFactory.getScheduleService();
          const skip = await scheduleService.pushDatesForward(
            scheduleId,
            skippedDate,
            workspaceId,
            reason
          );
          return {
            success: true as const,
            message: `Pushed schedule ${scheduleId} forward from ${skippedDate}`,
            skipId: skip.id,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to push schedule: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    getScheduleSkipHistory: tool({
      description: "List all skip/push-forward records for a schedule.",
      inputSchema: jsonSchema<{ scheduleId: number }>({
        type: "object",
        properties: { scheduleId: { type: "number" } },
        required: ["scheduleId"],
      }),
      execute: async ({ scheduleId }) => {
        try {
          const scheduleService = serviceFactory.getScheduleService();
          const skips = await scheduleService.getSkipHistory(scheduleId);
          return { success: true as const, count: skips.length, skips };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to get skip history: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    removeScheduleSkip: tool({
      description:
        "Undo a single schedule skip or push-forward by skip ID (from getScheduleSkipHistory).",
      inputSchema: jsonSchema<{ skipId: number }>({
        type: "object",
        properties: { skipId: { type: "number" } },
        required: ["skipId"],
      }),
      execute: async ({ skipId }) => {
        try {
          const scheduleService = serviceFactory.getScheduleService();
          await scheduleService.removeSkip(skipId, workspaceId);
          return { success: true as const, message: `Removed skip ${skipId}`, skipId };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to remove skip: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // HSA / MEDICAL EXPENSES
    // ============================================

    createMedicalExpense: tool({
      description:
        "Record a medical expense linked to an existing transaction in an HSA account. Captures provider, amounts, qualified flag, and tax year for HSA reporting.",
      inputSchema: jsonSchema<{
        transactionId: number;
        hsaAccountId: number;
        expenseType: string;
        amount: number;
        serviceDate: string;
        isQualified?: boolean;
        provider?: string;
        patientName?: string;
        diagnosis?: string;
        treatmentDescription?: string;
        insuranceCovered?: number;
        outOfPocket?: number;
        paidDate?: string;
        taxYear?: number;
        notes?: string;
      }>({
        type: "object",
        properties: {
          transactionId: { type: "number" },
          hsaAccountId: { type: "number" },
          expenseType: {
            type: "string",
            description: "e.g. medical, dental, vision, prescription, mental_health",
          },
          amount: { type: "number" },
          serviceDate: { type: "string", description: "YYYY-MM-DD" },
          isQualified: { type: "boolean" },
          provider: { type: "string" },
          patientName: { type: "string" },
          diagnosis: { type: "string" },
          treatmentDescription: { type: "string" },
          insuranceCovered: { type: "number" },
          outOfPocket: { type: "number" },
          paidDate: { type: "string" },
          taxYear: { type: "number" },
          notes: { type: "string" },
        },
        required: ["transactionId", "hsaAccountId", "expenseType", "amount", "serviceDate"],
      }),
      execute: async (input) => {
        try {
          const medicalService = serviceFactory.getMedicalExpenseService();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const created = await medicalService.createMedicalExpense(input as any);
          return {
            success: true as const,
            message: `Created medical expense ${created.id}`,
            expense: created,
          };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to create medical expense: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    listMedicalExpenses: tool({
      description:
        "List medical expenses for an HSA account, optionally filtered by tax year.",
      inputSchema: jsonSchema<{ hsaAccountId: number; taxYear?: number }>({
        type: "object",
        properties: {
          hsaAccountId: { type: "number" },
          taxYear: { type: "number" },
        },
        required: ["hsaAccountId"],
      }),
      execute: async ({ hsaAccountId, taxYear }) => {
        try {
          const medicalService = serviceFactory.getMedicalExpenseService();
          const expenses = taxYear
            ? await medicalService.getMedicalExpensesByTaxYear(hsaAccountId, taxYear)
            : await medicalService.getMedicalExpensesByAccount(hsaAccountId);
          return { success: true as const, count: expenses.length, expenses };
        } catch (error) {
          return {
            success: false as const,
            message: `Failed to list medical expenses: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // ============================================
    // ML-POWERED INSIGHT TOOLS
    // ============================================

    /**
     * Find opportunities to save money
     */
    findSavingsOpportunities: tool({
      description:
        "Find opportunities to save money. Detects unused subscriptions, price increases on bills, duplicate streaming services, and bills that could be negotiated. Use when user asks about saving money, reducing expenses, or finding wasteful spending.",
      inputSchema: jsonSchema<{
        type?:
          | "all"
          | "unused_subscription"
          | "price_increase"
          | "duplicate_service"
          | "negotiation_candidate";
      }>({
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "all",
              "unused_subscription",
              "price_increase",
              "duplicate_service",
              "negotiation_candidate",
            ],
            description: "Type of savings to look for (default: all)",
          },
        },
      }),
      execute: async ({ type = "all" }) => {
        try {
          console.log("[AI Tool] findSavingsOpportunities called with type:", type);

          const summary = await savingsService.getOpportunities(workspaceId);

          let opportunities = summary.opportunities;
          if (type !== "all") {
            opportunities = opportunities.filter((o) => o.type === type);
          }

          console.log(
            "[AI Tool] findSavingsOpportunities found:",
            opportunities.length,
            "opportunities"
          );

          return {
            success: true as const,
            totalMonthlyPotential: summary.totalMonthlyPotential,
            totalAnnualPotential: summary.totalAnnualPotential,
            count: opportunities.length,
            opportunities: opportunities.slice(0, 10).map((o) => ({
              title: o.title,
              type: o.type,
              priority: o.priority,
              estimatedMonthlySavings: o.estimatedMonthlySavings,
              estimatedAnnualSavings: o.estimatedAnnualSavings,
              description: o.description,
              payeeName: o.payeeName,
              suggestedActions: o.suggestedActions.slice(0, 3),
              confidence: o.confidence,
            })),
          };
        } catch (error) {
          console.error("[AI Tool] findSavingsOpportunities error:", error);
          return {
            success: false as const,
            message: `Failed to find savings opportunities: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Detect recurring transactions like subscriptions and bills
     */
    detectRecurringPatterns: tool({
      description:
        "Detect recurring transactions like subscriptions, bills, and regular payments. Use when user asks about subscriptions, recurring charges, regular payments, or 'what do I pay for monthly'.",
      inputSchema: jsonSchema<{
        payeeId?: number;
        frequency?: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "all";
      }>({
        type: "object",
        properties: {
          payeeId: { type: "number", description: "Optional: only check a specific payee" },
          frequency: {
            type: "string",
            enum: ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly", "all"],
            description: "Filter by frequency (default: all)",
          },
        },
      }),
      execute: async ({ payeeId, frequency = "all" }) => {
        try {
          console.log("[AI Tool] detectRecurringPatterns called with:", { payeeId, frequency });

          let patterns;
          if (payeeId) {
            patterns = await recurringService.detectForPayee(workspaceId, payeeId);
          } else {
            const result = await recurringService.detectPatterns(workspaceId, {
              minConfidence: 0.5,
            });
            patterns = result.patterns;
          }

          // Filter by frequency if specified
          if (frequency !== "all") {
            patterns = patterns.filter((p) => p.frequency === frequency);
          }

          console.log("[AI Tool] detectRecurringPatterns found:", patterns.length, "patterns");

          // Calculate summary stats
          const totalMonthlyValue = patterns.reduce((sum, p) => {
            const monthlyMultiplier = {
              daily: 30,
              weekly: 4.33,
              biweekly: 2.17,
              monthly: 1,
              quarterly: 0.33,
              yearly: 1 / 12,
              irregular: 30 / p.interval,
            }[p.frequency];
            return sum + Math.abs(p.averageAmount) * monthlyMultiplier;
          }, 0);

          return {
            success: true as const,
            count: patterns.length,
            totalMonthlyValue: roundToCents(totalMonthlyValue),
            patterns: patterns.slice(0, 15).map((p) => ({
              payeeName: p.payeeName,
              frequency: p.frequency,
              averageAmount: Math.abs(p.averageAmount),
              nextPredicted: p.nextPredicted,
              confidence: Math.round(p.confidence * 100),
              occurrenceCount: p.occurrenceCount,
              isActive: p.isActive,
              categoryName: p.categoryName,
              lastOccurrence: p.lastOccurrence,
            })),
            summary: {
              subscriptions: patterns.filter(
                (p) => p.amountType === "exact" && Math.abs(p.averageAmount) < 100
              ).length,
              bills: patterns.filter((p) => p.averageAmount < 0).length,
              income: patterns.filter((p) => p.averageAmount > 0).length,
            },
          };
        } catch (error) {
          console.error("[AI Tool] detectRecurringPatterns error:", error);
          return {
            success: false as const,
            message: `Failed to detect recurring patterns: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Predict future cash flow
     */
    predictCashFlow: tool({
      description:
        "Predict future cash flow based on historical spending patterns. Use when user asks about future finances, upcoming months, cash flow forecast, or 'will I have enough money'.",
      inputSchema: jsonSchema<{
        horizon?: number;
        granularity?: "daily" | "weekly" | "monthly";
      }>({
        type: "object",
        properties: {
          horizon: {
            type: "number",
            description:
              "Number of periods to predict (default: 30 for daily, 4 for weekly, 3 for monthly)",
          },
          granularity: {
            type: "string",
            enum: ["daily", "weekly", "monthly"],
            description: "Time granularity for predictions (default: monthly)",
          },
        },
      }),
      execute: async ({ horizon, granularity = "monthly" }) => {
        try {
          // Set default horizon based on granularity
          const defaultHorizon = granularity === "daily" ? 30 : granularity === "weekly" ? 4 : 3;
          const predictionHorizon = horizon ?? defaultHorizon;

          console.log("[AI Tool] predictCashFlow called with:", {
            horizon: predictionHorizon,
            granularity,
          });

          const forecast = await forecastingService.predictCashFlow(workspaceId, {
            horizon: predictionHorizon,
            granularity,
          });

          console.log(
            "[AI Tool] predictCashFlow generated:",
            forecast.predictions.length,
            "predictions"
          );

          if (forecast.predictions.length === 0) {
            return {
              success: true as const,
              message:
                "Not enough historical data to generate predictions. Need at least 3 periods of transaction history.",
              predictions: [],
            };
          }

          return {
            success: true as const,
            confidence: Math.round(forecast.confidence * 100),
            predictionCount: forecast.predictions.length,
            predictions: forecast.predictions.map((p) => ({
              date: p.date,
              predictedAmount: roundToCents(p.value),
              lowerBound: roundToCents(p.lowerBound),
              upperBound: roundToCents(p.upperBound),
            })),
            incomePredictions: forecast.incomePredictions.slice(0, 5).map((p) => ({
              date: p.date,
              predictedAmount: roundToCents(p.value),
            })),
            expensePredictions: forecast.expensePredictions.slice(0, 5).map((p) => ({
              date: p.date,
              predictedAmount: roundToCents(p.value),
            })),
            summary: {
              avgPredictedCashFlow:
                Math.round(
                  (forecast.predictions.reduce((sum, p) => sum + p.value, 0) /
                    forecast.predictions.length) *
                    100
                ) / 100,
              totalPredictedIncome:
                Math.round(forecast.incomePredictions.reduce((sum, p) => sum + p.value, 0) * 100) /
                100,
              totalPredictedExpenses:
                Math.round(forecast.expensePredictions.reduce((sum, p) => sum + p.value, 0) * 100) /
                100,
            },
          };
        } catch (error) {
          console.error("[AI Tool] predictCashFlow error:", error);
          return {
            success: false as const,
            message: `Failed to predict cash flow: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    /**
     * Check for unusual or suspicious transactions
     */
    checkForAnomalies: tool({
      description:
        "Check for unusual or potentially suspicious transactions. Use when user asks about suspicious activity, fraud detection, unusual spending, or anomalies.",
      inputSchema: jsonSchema<{
        days?: number;
        minRiskLevel?: "low" | "medium" | "high";
      }>({
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Number of days to scan (default: 7, max: 30)",
          },
          minRiskLevel: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Minimum risk level to report (default: medium)",
          },
        },
      }),
      execute: async ({ days = 7, minRiskLevel = "medium" }) => {
        try {
          console.log("[AI Tool] checkForAnomalies called with:", { days, minRiskLevel });

          const anomalies = await anomalyService.scanRecentTransactions(workspaceId, {
            days: Math.min(days, 30),
            minRiskLevel,
            limit: 20,
          });

          console.log("[AI Tool] checkForAnomalies found:", anomalies.length, "anomalies");

          if (anomalies.length === 0) {
            return {
              success: true as const,
              message: `No ${minRiskLevel}+ risk transactions found in the last ${days} days.`,
              count: 0,
              anomalies: [],
            };
          }

          // Group by risk level
          const riskCounts = {
            critical: anomalies.filter((a) => a.riskLevel === "critical").length,
            high: anomalies.filter((a) => a.riskLevel === "high").length,
            medium: anomalies.filter((a) => a.riskLevel === "medium").length,
            low: anomalies.filter((a) => a.riskLevel === "low").length,
          };

          return {
            success: true as const,
            count: anomalies.length,
            riskSummary: riskCounts,
            anomalies: anomalies.slice(0, 10).map((a) => ({
              transactionId: a.transactionId,
              riskLevel: a.riskLevel,
              overallScore: Math.round(a.overallScore * 100),
              explanation: a.explanation,
              recommendedActions: a.recommendedActions.slice(0, 3),
              dimensions: {
                amount: {
                  score: Math.round(a.dimensions.amount.score * 100),
                  reason: a.dimensions.amount.reason,
                },
                timing: {
                  score: Math.round(a.dimensions.timing.score * 100),
                  reason: a.dimensions.timing.reason,
                },
                payee: {
                  score: Math.round(a.dimensions.payee.score * 100),
                  reason: a.dimensions.payee.reason,
                },
              },
            })),
          };
        } catch (error) {
          console.error("[AI Tool] checkForAnomalies error:", error);
          return {
            success: false as const,
            message: `Failed to check for anomalies: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),
  };

  if (!collector) return tools;

  // Wrap each tool's execute so the per-call latency/shape lands in the
  // collector. Spread the existing tool so description and inputSchema
  // remain unchanged.
  const wrapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tools)) {
    const original = value as unknown as {
      execute: (input: unknown) => Promise<unknown>;
      [k: string]: unknown;
    };
    wrapped[key] = {
      ...original,
      execute: withTelemetry(key, collector, original.execute),
    };
  }
  return wrapped as typeof tools;
}

/**
 * Tool names for reference
 */
export const AI_TOOL_NAMES = [
  // Read-only tools
  "getAccountBalance",
  "getRecentTransactions",
  "searchTransactions",
  "getBudgetStatus",
  "getPayeeSpending",
  "getCategorySpending",
  "listAccounts",
  "listPayees",
  "listBudgets",
  "listSchedules",
  "listCategories",
  "listBudgetPeriods",
  "listEnvelopeAllocations",
  "findDuplicatePayees",
  "getWorkspaceSummary",
  "getNetWorthOverTime",
  "getMonthlySummary",
  "getTaxDeductibleSpending",
  "suggestTransactionDetails",
  "previewEnvelopeRollover",
  "analyzeEnvelopeDeficit",
  "createEnvelopeDeficitRecoveryPlan",
  "getBudgetRolloverHistory",
  "getScheduleSkipHistory",
  "listMedicalExpenses",
  "getGoalProgress",
  "getSchedulePriceHistory",
  "listPayeeAliases",
  "listTransferMappings",
  "listAccountDocuments",
  "listMedicalExpenseReceipts",
  // Write tools
  "createBudget",
  "createCategory",
  "createPayee",
  "createAccount",
  "createTransaction",
  "createTransfer",
  "createSchedule",
  "updateTransaction",
  "updateAccount",
  "updatePayee",
  "updateCategory",
  "updateBudget",
  "updateSchedule",
  "deleteTransaction",
  "deleteAccount",
  "deletePayee",
  "deleteCategory",
  "deleteBudget",
  "deleteSchedule",
  "categorizeTransaction",
  "splitTransaction",
  "reconcileAccount",
  "convertToTransfer",
  "ensurePeriodInstance",
  "createEnvelopeAllocation",
  "updateEnvelopeAllocation",
  "transferEnvelopeFunds",
  "bulkCategorizeTransactions",
  "bulkSetPayee",
  "clearPendingTransactions",
  "recordPredictionFeedback",
  "createPeriodTemplate",
  "updatePeriodTemplate",
  "deletePeriodTemplate",
  "processEnvelopeRollover",
  "duplicateBudget",
  "pushSchedulesForward",
  "removeScheduleSkip",
  "createMedicalExpense",
  "createPayeeAlias",
  "deletePayeeAlias",
  "createTransferMapping",
  "deleteTransferMapping",
  "uploadAccountDocument",
  "deleteAccountDocument",
  "uploadMedicalExpenseReceipt",
  "deleteMedicalExpenseReceipt",
  "unlinkTransfer",
  "mergePayees",
  "skipScheduleOccurrence",
  // ML-powered insight tools
  "findSavingsOpportunities",
  "detectRecurringPatterns",
  "predictCashFlow",
  "checkForAnomalies",
] as const;

export type AIToolName = (typeof AI_TOOL_NAMES)[number];

/**
 * Per-tool scope tag. The external MCP server filters tools/list by
 * this so read-only API keys never see write tools, and tools/call
 * rejects write attempts on a read-only key.
 *
 * Treat ML-insight tools as "read" — they don't mutate workspace data,
 * they just inspect and forecast. listCategories is also read despite
 * being grouped with write tools historically; it's a query.
 */
export const AI_TOOL_SCOPES: Record<AIToolName, "read" | "write"> = {
  // Read-only
  getAccountBalance: "read",
  getRecentTransactions: "read",
  searchTransactions: "read",
  getBudgetStatus: "read",
  getPayeeSpending: "read",
  getCategorySpending: "read",
  listAccounts: "read",
  listPayees: "read",
  listBudgets: "read",
  listSchedules: "read",
  listCategories: "read",
  listBudgetPeriods: "read",
  listEnvelopeAllocations: "read",
  findDuplicatePayees: "read",
  getWorkspaceSummary: "read",
  getNetWorthOverTime: "read",
  getMonthlySummary: "read",
  getTaxDeductibleSpending: "read",
  suggestTransactionDetails: "read",
  previewEnvelopeRollover: "read",
  analyzeEnvelopeDeficit: "read",
  createEnvelopeDeficitRecoveryPlan: "read",
  getBudgetRolloverHistory: "read",
  getScheduleSkipHistory: "read",
  listMedicalExpenses: "read",
  getGoalProgress: "read",
  getSchedulePriceHistory: "read",
  listPayeeAliases: "read",
  listTransferMappings: "read",
  listAccountDocuments: "read",
  listMedicalExpenseReceipts: "read",
  findSavingsOpportunities: "read",
  detectRecurringPatterns: "read",
  predictCashFlow: "read",
  checkForAnomalies: "read",
  // Write — creates
  createBudget: "write",
  createCategory: "write",
  createPayee: "write",
  createAccount: "write",
  createTransaction: "write",
  createTransfer: "write",
  createSchedule: "write",
  // Write — updates
  updateTransaction: "write",
  updateAccount: "write",
  updatePayee: "write",
  updateCategory: "write",
  updateBudget: "write",
  updateSchedule: "write",
  categorizeTransaction: "write",
  splitTransaction: "write",
  reconcileAccount: "write",
  convertToTransfer: "write",
  ensurePeriodInstance: "write",
  createEnvelopeAllocation: "write",
  updateEnvelopeAllocation: "write",
  transferEnvelopeFunds: "write",
  bulkCategorizeTransactions: "write",
  bulkSetPayee: "write",
  clearPendingTransactions: "write",
  recordPredictionFeedback: "write",
  createPeriodTemplate: "write",
  updatePeriodTemplate: "write",
  deletePeriodTemplate: "write",
  processEnvelopeRollover: "write",
  duplicateBudget: "write",
  pushSchedulesForward: "write",
  removeScheduleSkip: "write",
  createMedicalExpense: "write",
  createPayeeAlias: "write",
  deletePayeeAlias: "write",
  createTransferMapping: "write",
  deleteTransferMapping: "write",
  uploadAccountDocument: "write",
  deleteAccountDocument: "write",
  uploadMedicalExpenseReceipt: "write",
  deleteMedicalExpenseReceipt: "write",
  // Write — deletes / dangerous
  deleteTransaction: "write",
  deleteAccount: "write",
  deletePayee: "write",
  deleteCategory: "write",
  deleteBudget: "write",
  deleteSchedule: "write",
  unlinkTransfer: "write",
  mergePayees: "write",
  skipScheduleOccurrence: "write",
};
