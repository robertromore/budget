import { accounts, transactions } from "$lib/schema";
import { publicProcedure, t } from "$lib/trpc";
import { cacheKeys, queryCache } from "$lib/utils/cache";
import { trackQuery } from "$lib/utils/performance";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

/**
 * Optimized account routes with performance improvements:
 * - Separate endpoints for summary vs full data
 * - Pagination for transactions
 * - Server-side search and filtering
 * - SQL-based balance calculations
 * - Caching integration
 */
export const serverAccountsRoutes = t.router({
  /**
   * Get account summary with balance but no transactions
   * Much faster for dashboard and account lists
   */
  loadSummary: publicProcedure
    .input(z.object({id: z.coerce.number()}))
    .query(async ({ctx, input}) => {
      const cacheKey = cacheKeys.accountSummary(input.id);

      // Check cache first
      const cached = queryCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await trackQuery("account-summary", async () => {
        const account = await ctx.db.query.accounts.findFirst({
          where: (accounts, {eq, and, isNull}) =>
            and(eq(accounts.id, input.id), isNull(accounts.deletedAt)),
        });

        if (!account) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Account not found",
          });
        }

        // Get balance and transaction count using SQL aggregation (much faster)
        const [balanceResult] = await ctx.db
          .select({
            balance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
            transactionCount: count(transactions.id),
          })
          .from(transactions)
          .where(and(eq(transactions.accountId, input.id), isNull(transactions.deletedAt)));

        return {
          ...account,
          balance: balanceResult?.balance || 0,
          transactionCount: balanceResult?.transactionCount || 0,
        };
      });

      // Cache for 5 minutes
      queryCache.set(cacheKey, result, 300000);
      return result;
    }),

  /**
   * Get all account summaries (for sidebar, dashboard)
   * Only loads account metadata + calculated balances
   */
  loadAllSummaries: publicProcedure.query(async ({ctx}) => {
    const cacheKey = cacheKeys.allAccounts();

    // Check cache first
    const cached = queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await trackQuery("all-account-summaries", async () => {
      // Get all accounts
      const accountsData = await ctx.db.query.accounts.findMany({
        where: isNull(accounts.deletedAt),
        orderBy: [accounts.name],
      });

      // Get balances for all accounts in a single query
      const balances = await ctx.db
        .select({
          accountId: transactions.accountId,
          balance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          transactionCount: count(transactions.id),
        })
        .from(transactions)
        .where(isNull(transactions.deletedAt))
        .groupBy(transactions.accountId);

      // Combine account data with balances
      return accountsData.map((account) => {
        const balanceData = balances.find((b) => b.accountId === account.id);
        return {
          ...account,
          balance: balanceData?.balance || 0,
          transactionCount: balanceData?.transactionCount || 0,
        };
      });
    });

    // Cache for 2 minutes
    queryCache.set(cacheKey, result, 120000);
    return result;
  }),

  /**
   * Load transactions with pagination and optional filtering
   * Separate from account metadata for better performance
   */
  loadTransactions: publicProcedure
    .input(
      z.object({
        accountId: z.coerce.number(),
        page: z.number().min(0).default(0),
        pageSize: z.number().min(10).max(100).default(50),
        sortBy: z.enum(["date", "amount", "notes"]).default("date"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        searchQuery: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ctx, input}) => {
      const {accountId, page, pageSize, sortBy, sortOrder, searchQuery, dateFrom, dateTo} = input;
      const offset = page * pageSize;

      // Create cache key based on all parameters
      const cacheKey = searchQuery
        ? cacheKeys.searchTransactions(accountId, searchQuery)
        : cacheKeys.accountTransactions(accountId, page, pageSize, sortBy, sortOrder, dateFrom, dateTo);

      // Check cache first (skip for searches to get real-time results)
      if (!searchQuery) {
        const cached = queryCache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const result = await trackQuery("paginated-transactions", async () => {
        // Build where conditions
        let whereConditions = [
          eq(transactions.accountId, accountId),
          isNull(transactions.deletedAt),
        ];

        // Add search filter
        if (searchQuery) {
          whereConditions.push(
            sql`(
              ${transactions.notes} LIKE ${`%${searchQuery}%`} OR
              CAST(${transactions.amount} AS TEXT) LIKE ${`%${searchQuery}%`}
            )`
          );
        }

        // Add date filters
        if (dateFrom) {
          whereConditions.push(sql`${transactions.date} >= ${dateFrom}`);
        }
        if (dateTo) {
          whereConditions.push(sql`${transactions.date} <= ${dateTo}`);
        }

        // Get total count for pagination
        const [countResult] = await ctx.db
          .select({count: count(transactions.id)})
          .from(transactions)
          .where(and(...whereConditions));

        const totalCount = countResult?.count || 0;

        // Get paginated transactions
        const paginatedTransactions = await ctx.db.query.transactions.findMany({
          where: and(...whereConditions),
          with: {
            payee: {
              columns: {id: true, name: true}, // Only select needed fields
            },
            category: {
              columns: {id: true, name: true}, // Only select needed fields
            },
          },
          orderBy: sortOrder === "desc" ? desc(transactions[sortBy]) : asc(transactions[sortBy]),
          limit: pageSize,
          offset,
        });

        // Calculate running balance for the visible transactions
        let transactionsWithBalance;

        if (page === 0 && sortBy === "date") {
          // Calculate running balance for first page with date sorting
          if (sortOrder === "asc") {
            // Ascending order: start from 0 and add each transaction
            let runningBalance = 0;
            transactionsWithBalance = paginatedTransactions.map((transaction) => {
              runningBalance += transaction.amount;
              return {
                ...transaction,
                balance: runningBalance,
              };
            });
          } else {
            // Descending order: get total account balance and work backwards
            const [totalBalanceResult] = await ctx.db
              .select({
                balance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
              })
              .from(transactions)
              .where(and(eq(transactions.accountId, accountId), isNull(transactions.deletedAt)));

            let runningBalance = totalBalanceResult?.balance ?? 0;
            transactionsWithBalance = paginatedTransactions.map((transaction) => {
              const currentBalance = runningBalance;
              runningBalance -= transaction.amount;
              return {
                ...transaction,
                balance: currentBalance,
              };
            });
          }
        } else {
          // For other pages/sorting, don't calculate running balance
          transactionsWithBalance = paginatedTransactions.map((t) => ({...t, balance: null}));
        }

        return {
          transactions: transactionsWithBalance,
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
            hasNextPage: offset + pageSize < totalCount,
            hasPreviousPage: page > 0,
          },
        };
      });

      // Cache non-search results for 1 minute
      if (!searchQuery) {
        queryCache.set(cacheKey, result, 60000);
      }

      return result;
    }),

  /**
   * Load ALL transactions for an account (for client-side pagination)
   */
  loadAllTransactions: publicProcedure
    .input(
      z.object({
        accountId: z.coerce.number(),
        sortBy: z.enum(["date", "amount", "notes"]).default("date"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        searchQuery: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ctx, input}) => {
      const {accountId, sortBy, sortOrder, searchQuery, dateFrom, dateTo} = input;

      const cacheKey = searchQuery
        ? `account:${accountId}:all:search:${searchQuery}`
        : `account:${accountId}:all:${sortBy}:${sortOrder}:${dateFrom || "null"}:${dateTo || "null"}`;

      // Check cache first (skip for searches to get real-time results)
      if (!searchQuery) {
        const cached = queryCache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const result = await trackQuery("all-transactions", async () => {
        // Build where conditions
        const whereConditions = [
          eq(transactions.accountId, accountId),
          isNull(transactions.deletedAt),
        ];

        if (searchQuery) {
          whereConditions.push(
            sql`(${transactions.notes} LIKE ${'%' + searchQuery + '%'} OR
                 ${accounts.name} LIKE ${'%' + searchQuery + '%'})`
          );
        }

        if (dateFrom) {
          whereConditions.push(sql`${transactions.date} >= ${dateFrom}`);
        }

        if (dateTo) {
          whereConditions.push(sql`${transactions.date} <= ${dateTo}`);
        }

        // Get ALL transactions for the account
        const allTransactions = await ctx.db.query.transactions.findMany({
          where: and(...whereConditions),
          with: {
            payee: {
              columns: {
                id: true,
                name: true,
              },
            },
            category: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: sortOrder === "desc" ? desc(transactions[sortBy]) : asc(transactions[sortBy]),
        });

        // Calculate running balance for ALL transactions
        let transactionsWithBalance;

        if (sortBy === "date") {
          if (sortOrder === "asc") {
            // Ascending order: start from 0 and add each transaction
            let runningBalance = 0;
            transactionsWithBalance = allTransactions.map((transaction) => {
              runningBalance += transaction.amount;
              return {
                ...transaction,
                balance: runningBalance,
              };
            });
          } else {
            // Descending order: get total account balance and work backwards
            const [totalBalanceResult] = await ctx.db
              .select({
                balance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
              })
              .from(transactions)
              .where(and(eq(transactions.accountId, accountId), isNull(transactions.deletedAt)));

            let runningBalance = totalBalanceResult?.balance || 0;
            transactionsWithBalance = allTransactions.map((transaction) => {
              const currentBalance = runningBalance;
              runningBalance -= transaction.amount;
              return {
                ...transaction,
                balance: currentBalance,
              };
            });
          }
        } else {
          // For non-date sorting, don't calculate running balance
          transactionsWithBalance = allTransactions.map((transaction) => ({
            ...transaction,
            balance: null,
          }));
        }

        return transactionsWithBalance;
      });

      // Cache non-search results for 1 minute
      if (!searchQuery) {
        queryCache.set(cacheKey, result, 60000);
      }

      return result;
    }),

  /**
   * Get recent transactions (optimized for dashboard widgets)
   */
  loadRecentTransactions: publicProcedure
    .input(
      z.object({
        accountId: z.coerce.number(),
        limit: z.number().min(5).max(20).default(10),
      })
    )
    .query(async ({ctx, input}) => {
      const cacheKey = cacheKeys.recentTransactions(input.accountId, input.limit);

      // Check cache first
      const cached = queryCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await trackQuery("recent-transactions", async () => {
        return ctx.db.query.transactions.findMany({
          where: and(eq(transactions.accountId, input.accountId), isNull(transactions.deletedAt)),
          with: {
            payee: {
              columns: {id: true, name: true},
            },
            category: {
              columns: {id: true, name: true},
            },
          },
          orderBy: [desc(transactions.date), desc(transactions.id)],
          limit: input.limit,
        });
      });

      // Cache for 2 minutes
      queryCache.set(cacheKey, result, 120000);
      return result;
    }),

  /**
   * Get balance history grouped by time periods
   * Useful for charts and analytics
   */
  getBalanceHistory: publicProcedure
    .input(
      z.object({
        accountId: z.coerce.number(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ctx, input}) => {
      const {accountId, fromDate, toDate, groupBy} = input;

      return trackQuery("balance-history", async () => {
        let whereConditions = [
          eq(transactions.accountId, accountId),
          isNull(transactions.deletedAt),
        ];

        // Add date filters if provided
        if (fromDate) {
          whereConditions.push(sql`${transactions.date} >= ${fromDate}`);
        }
        if (toDate) {
          whereConditions.push(sql`${transactions.date} <= ${toDate}`);
        }

        // Group by date intervals using SQL
        const dateFormat =
          groupBy === "month"
            ? "strftime('%Y-%m', date)"
            : groupBy === "week"
              ? "strftime('%Y-%W', date)"
              : "date(date)";

        const balanceHistory = await ctx.db
          .select({
            period: sql<string>`${sql.raw(dateFormat)}`,
            totalAmount: sql<number>`SUM(${transactions.amount})`,
            transactionCount: count(transactions.id),
          })
          .from(transactions)
          .where(and(...whereConditions))
          .groupBy(sql.raw(dateFormat))
          .orderBy(sql.raw(dateFormat));

        return balanceHistory;
      });
    }),
});
