import { z } from "zod";
import { publicProcedure, rateLimitedProcedure, t } from "../t";
import { eq, desc, isNull, and, count, sql, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { accounts, transactions } from "$lib/schema";

// Optimized account routes with pagination and performance improvements
export const optimizedAccountsRoutes = t.router({
  // Load account metadata only (without all transactions)
  loadSummary: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.query.accounts.findFirst({
        where: (accounts, { eq, and, isNull }) =>
          and(eq(accounts.id, input.id), isNull(accounts.deletedAt)),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Get account balance using SQL aggregation (much faster)
      const [balanceResult] = await ctx.db
        .select({
          balance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          transactionCount: count(transactions.id),
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, input.id),
            isNull(transactions.deletedAt)
          )
        );

      return {
        ...account,
        balance: balanceResult.balance,
        transactionCount: balanceResult.transactionCount,
      };
    }),

  // Load transactions with pagination
  loadTransactions: publicProcedure
    .input(
      z.object({
        accountId: z.coerce.number(),
        page: z.number().min(0).default(0),
        pageSize: z.number().min(10).max(100).default(50),
        sortBy: z.enum(["date", "amount", "description"]).default("date"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { accountId, page, pageSize, sortBy, sortOrder } = input;
      const offset = page * pageSize;

      // Get total count for pagination
      const [countResult] = await ctx.db
        .select({ count: count(transactions.id) })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, accountId),
            isNull(transactions.deletedAt)
          )
        );

      const totalCount = countResult.count;

      // Get paginated transactions with relationships
      const paginatedTransactions = await ctx.db.query.transactions.findMany({
        where: and(
          eq(transactions.accountId, accountId),
          isNull(transactions.deletedAt)
        ),
        with: {
          payee: true,
          category: true,
        },
        orderBy:
          sortOrder === "desc"
            ? desc(transactions[sortBy])
            : asc(transactions[sortBy]),
        limit: pageSize,
        offset,
      });

      // Calculate running balance only for visible transactions
      // For better performance, we could pre-calculate and store this
      let runningBalance = 0;
      const transactionsWithBalance = paginatedTransactions.map((transaction) => {
        runningBalance += transaction.amount;
        return {
          ...transaction,
          balance: runningBalance,
        };
      });

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
    }),

  // Get recent transactions (optimized for dashboard)
  loadRecentTransactions: publicProcedure
    .input(
      z.object({
        accountId: z.coerce.number(),
        limit: z.number().min(5).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const recentTransactions = await ctx.db.query.transactions.findMany({
        where: and(
          eq(transactions.accountId, input.accountId),
          isNull(transactions.deletedAt)
        ),
        with: {
          payee: {
            columns: { id: true, name: true }, // Only select needed fields
          },
          category: {
            columns: { id: true, name: true }, // Only select needed fields
          },
        },
        orderBy: [desc(transactions.date), desc(transactions.id)],
        limit: input.limit,
      });

      return recentTransactions;
    }),

  // Optimized balance calculation with date range
  getBalanceHistory: publicProcedure
    .input(
      z.object({
        accountId: z.coerce.number(),
        fromDate: z.string().datetime().optional(),
        toDate: z.string().datetime().optional(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { accountId, fromDate, toDate, groupBy } = input;

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
    }),

  // Fast transaction search with indexing hints
  searchTransactions: publicProcedure
    .input(
      z.object({
        accountId: z.coerce.number(),
        query: z.string().min(2),
        limit: z.number().min(5).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { accountId, query, limit } = input;

      const searchResults = await ctx.db.query.transactions.findMany({
        where: and(
          eq(transactions.accountId, accountId),
          isNull(transactions.deletedAt),
          sql`(
            ${transactions.description} LIKE ${`%${query}%`} OR
            ${transactions.amount} LIKE ${`%${query}%`}
          )`
        ),
        with: {
          payee: {
            columns: { id: true, name: true },
          },
          category: {
            columns: { id: true, name: true },
          },
        },
        orderBy: [desc(transactions.date)],
        limit,
      });

      return searchResults;
    }),
});