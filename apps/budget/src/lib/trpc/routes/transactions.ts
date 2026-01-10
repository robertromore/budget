import {
  bulkDeleteSchema,
  createTransactionSchema,
  createTransactionWithAutoPopulationSchema,
  paginationSchema,
  payeeIntelligenceRequestSchema,
  transactionFiltersSchema,
  transactionSuggestionRequestSchema,
  updateTransactionSchema,
} from "$lib/server/domains/transactions";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { bulkOperationProcedure, publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { withErrorHandler } from "$lib/trpc/shared/errors";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const transactionService = serviceFactory.getTransactionService();

export const transactionRoutes = t.router({
  // Get all transactions for an account
  forAccount: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.getAccountTransactions(input.accountId, ctx.workspaceId)
      )
    ),

  // Get all transactions for an account including upcoming scheduled transactions
  forAccountWithUpcoming: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.getAccountTransactionsWithUpcoming(input.accountId, ctx.workspaceId)
      )
    ),

  // Get transactions with filters and pagination
  list: publicProcedure
    .input(
      z.object({
        filters: transactionFiltersSchema.optional(),
        pagination: paginationSchema.optional(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.getTransactions(input.filters || {}, input.pagination, ctx.workspaceId)
      )
    ),

  // Get single transaction by ID
  byId: publicProcedure
    .input(
      z.object({
        id: z.number().positive(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.getTransactionById(input.id, ctx.workspaceId)
      )
    ),

  // Get account summary
  summary: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.getAccountSummary(input.accountId, ctx.workspaceId)
      )
    ),

  // Get monthly spending aggregates for analytics
  monthlySpendingAggregates: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.getMonthlySpendingAggregates(input.accountId, ctx.workspaceId)
      )
    ),

  // Get monthly spending forecast for analytics chart overlay
  monthlySpendingForecast: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
        horizon: z.number().min(1).max(12).default(3),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) => {
        const {
          createTimeSeriesForecastingService,
          createMLModelStore,
          createFeatureEngineeringService,
        } = await import("$lib/server/domains/ml");

        const modelStore = createMLModelStore();
        const featureService = createFeatureEngineeringService();
        const forecastingService = createTimeSeriesForecastingService(modelStore, featureService);

        const prediction = await forecastingService.predictCashFlow(ctx.workspaceId, {
          horizon: input.horizon,
          granularity: "monthly",
          accountId: input.accountId,
        });

        return {
          predictions: prediction.expensePredictions,
          confidence: prediction.confidence,
          metrics: prediction.metrics,
        };
      })
    ),

  // Create new transaction
  create: rateLimitedProcedure
    .input(createTransactionSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.createTransaction(input, ctx.workspaceId)
      )
    ),

  // Update existing transaction
  update: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().positive(),
        data: updateTransactionSchema,
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.updateTransaction(input.id, input.data, ctx.workspaceId)
      )
    ),

  // Update transaction and return all account transactions with recalculated running balances
  updateWithBalance: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().positive(),
        data: updateTransactionSchema,
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.updateTransactionWithRecalculatedBalance(
          input.id,
          input.data,
          ctx.workspaceId
        )
      )
    ),

  // Delete single transaction
  delete: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().positive(),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        await transactionService.deleteTransaction(input.id, ctx.workspaceId);
        return { success: true };
      })
    ),

  // Bulk delete transactions
  bulkDelete: bulkOperationProcedure.input(bulkDeleteSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      await transactionService.deleteTransactions(input.ids, ctx.workspaceId);
      return { success: true, count: input.ids.length };
    })
  ),

  // Legacy save endpoint (for backwards compatibility - will be deprecated)
  save: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().nullable().optional(),
        accountId: z.number().optional(),
        amount: z.number(),
        date: z.string(),
        payeeId: z.number().nullable().optional(),
        categoryId: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
        status: z.enum(["cleared", "pending", "scheduled"]).optional(),
        budgetId: z.number().nullable().optional(),
        budgetAllocation: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (input.id) {
          // Update existing transaction
          const { id, accountId, ...updateData } = input;
          return await transactionService.updateTransaction(id, updateData, ctx.workspaceId);
        } else {
          // Create new transaction
          if (!input.accountId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Account ID is required for new transaction",
            });
          }
          const { id, ...createData } = input;
          return await transactionService.createTransaction(
            {
              ...createData,
              accountId: input.accountId,
            },
            ctx.workspaceId
          );
        }
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to save transaction",
        });
      }
    }),

  // Create transaction with payee auto-population
  createWithAutoPopulation: rateLimitedProcedure
    .input(createTransactionWithAutoPopulationSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.createTransactionWithPayeeDefaults(input, ctx.workspaceId)
      )
    ),

  // Get transaction suggestions based on payee
  getSuggestions: publicProcedure
    .input(transactionSuggestionRequestSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.suggestTransactionDetails(input.payeeId, ctx.workspaceId, input.amount)
      )
    ),

  // Get payee transaction intelligence
  getPayeeIntelligence: publicProcedure
    .input(payeeIntelligenceRequestSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.getPayeeTransactionIntelligence(input.payeeId, ctx.workspaceId)
      )
    ),

  // Update payee statistics after transaction changes
  updatePayeeStats: rateLimitedProcedure
    .input(
      z.object({
        payeeId: z.number().positive("Payee ID must be a positive number"),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        await transactionService.updatePayeeAfterTransaction(input.payeeId, ctx.workspaceId);
        return { success: true };
      })
    ),

  // Create a transfer transaction between two accounts
  createTransfer: rateLimitedProcedure
    .input(
      z.object({
        fromAccountId: z.number().positive("From account ID must be positive"),
        toAccountId: z.number().positive("To account ID must be positive"),
        amount: z.number().positive("Amount must be positive"),
        date: z.string().min(1, "Date is required"),
        notes: z.string().optional(),
        categoryId: z.number().positive().nullable().optional(),
        payeeId: z.number().positive().nullable().optional(),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.createTransfer(
          {
            fromAccountId: input.fromAccountId,
            toAccountId: input.toAccountId,
            amount: input.amount,
            date: input.date,
            notes: input.notes,
            categoryId: input.categoryId,
            payeeId: input.payeeId,
          },
          ctx.workspaceId
        )
      )
    ),

  // Update a transfer transaction
  updateTransfer: rateLimitedProcedure
    .input(
      z.object({
        transferId: z.string().min(1, "Transfer ID is required"),
        amount: z.number().positive("Amount must be positive").optional(),
        date: z.string().min(1).optional(),
        notes: z.string().optional(),
        categoryId: z.number().positive().nullable().optional(),
        payeeId: z.number().positive().nullable().optional(),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const { transferId, ...updates } = input;
        return await transactionService.updateTransfer(transferId, updates, ctx.workspaceId);
      })
    ),

  // Delete a transfer transaction
  deleteTransfer: rateLimitedProcedure
    .input(
      z.object({
        transferId: z.string().min(1, "Transfer ID is required"),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        await transactionService.deleteTransfer(input.transferId, ctx.workspaceId);
        return { success: true };
      })
    ),

  // Unlink a transfer - converts linked transactions into independent transactions
  unlinkTransfer: rateLimitedProcedure
    .input(
      z.object({
        transferId: z.string().min(1, "Transfer ID is required"),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        await transactionService.unlinkTransfer(input.transferId, ctx.workspaceId);
        return { success: true };
      })
    ),

  // Convert an existing transaction into a transfer
  convertToTransfer: rateLimitedProcedure
    .input(
      z.object({
        transactionId: z.number().positive("Transaction ID must be positive"),
        targetAccountId: z.number().positive("Target account ID must be positive"),
        rememberMapping: z.boolean().optional().default(false),
        rawPayeeString: z.string().optional(), // Original payee string for mapping
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const result = await transactionService.convertToTransfer(
          input.transactionId,
          input.targetAccountId,
          ctx.workspaceId
        );

        // If user wants to remember this mapping for future imports
        if (input.rememberMapping && input.rawPayeeString) {
          const { getTransferMappingService } = await import(
            "$lib/server/domains/transfers"
          );
          const transferMappingService = getTransferMappingService();

          await transferMappingService.recordMappingFromConversion(
            input.rawPayeeString,
            input.targetAccountId,
            ctx.workspaceId,
            result.sourceTransaction.accountId
          );
        }

        return result;
      })
    ),

  // Find transactions with similar payees (for bulk conversion prompt)
  findSimilarPayeeTransactions: publicProcedure
    .input(
      z.object({
        transactionId: z.number().positive("Transaction ID must be positive"),
        accountId: z.number().positive().optional(), // Optionally limit to a specific account
        limit: z.number().positive().optional().default(100),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.findSimilarPayeeTransactions(input.transactionId, ctx.workspaceId, {
          accountId: input.accountId,
          limit: input.limit,
        })
      )
    ),

  // Convert multiple transactions to transfers (bulk conversion)
  convertToTransferBulk: bulkOperationProcedure
    .input(
      z.object({
        transactionIds: z.array(z.number().positive()).min(1, "At least one transaction ID required"),
        targetAccountId: z.number().positive("Target account ID must be positive"),
        rememberMapping: z.boolean().optional().default(false),
        rawPayeeString: z.string().optional(), // Original payee string for mapping
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.convertToTransferBulk(
          {
            transactionIds: input.transactionIds,
            targetAccountId: input.targetAccountId,
            rememberMapping: input.rememberMapping,
            rawPayeeString: input.rawPayeeString,
          },
          ctx.workspaceId
        )
      )
    ),

  // Bulk update payee for transactions matching criteria
  bulkUpdatePayee: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive("Account ID must be positive"),
        transactionId: z.number().positive("Transaction ID must be positive"),
        newPayeeId: z.number().positive().nullable(),
        originalPayeeName: z.string().min(1, "Original payee name is required"),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        return await transactionService.bulkUpdatePayeeByName(
          input.accountId,
          input.transactionId,
          input.newPayeeId,
          input.originalPayeeName,
          ctx.workspaceId
        );
      })
    ),

  // Bulk update category for transactions matching criteria
  bulkUpdateCategory: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive("Account ID must be positive"),
        transactionId: z.number().positive("Transaction ID must be positive"),
        newCategoryId: z.number().positive().nullable(),
        matchBy: z.enum(["payee", "category"]),
        matchValue: z.union([z.string(), z.number()]).optional(),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        return await transactionService.bulkUpdateCategory(
          input.accountId,
          input.transactionId,
          input.newCategoryId,
          input.matchBy,
          input.matchValue,
          ctx.workspaceId
        );
      })
    ),

  // Get top payees by transaction count/amount for an account
  getTopPayees: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().positive().optional().default(20),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.getTopPayees(
          input.accountId,
          {
            dateFrom: input.dateFrom,
            dateTo: input.dateTo,
            limit: input.limit,
          },
          ctx.workspaceId
        )
      )
    ),

  // Get top categories by transaction count/amount for an account
  getTopCategories: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().positive().optional().default(20),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.getTopCategories(
          input.accountId,
          {
            dateFrom: input.dateFrom,
            dateTo: input.dateTo,
            limit: input.limit,
          },
          ctx.workspaceId
        )
      )
    ),

  // Get recent activity summary for an account
  getRecentActivity: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
        days: z.number().positive().optional().default(7),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        transactionService.getRecentActivity(input.accountId, input.days, ctx.workspaceId)
      )
    ),

  // Get related transactions for budget recommendations
  // Supports filtering by multiple payee IDs, category, account, and date range
  getRelated: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive().optional(),
        categoryId: z.number().positive().optional(),
        payeeIds: z.array(z.number().positive()).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().positive().default(50),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) => {
        const { payeeIds, limit, ...filters } = input;

        // Use existing list endpoint with filters
        const result = await transactionService.getTransactions(
          {
            ...filters,
            sortBy: "date",
            sortOrder: "desc",
          },
          { page: 0, pageSize: limit },
          ctx.workspaceId
        );

        // If payeeIds filter is provided, filter client-side
        // This handles the array case not supported by the base filter
        if (payeeIds && payeeIds.length > 0) {
          const payeeIdSet = new Set(payeeIds);
          return {
            ...result,
            data: result.data.filter(
              (tx: { payeeId?: number | null }) => tx.payeeId && payeeIdSet.has(tx.payeeId)
            ),
          };
        }

        return result;
      })
    ),

  // ==================== Archive & Balance Adjustment Routes ====================

  // Archive a transaction (exclude from balance but keep in history)
  archive: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().positive("Transaction ID must be positive"),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const repository = serviceFactory.getTransactionRepository();
        return await repository.archiveTransaction(input.id, ctx.workspaceId);
      })
    ),

  // Unarchive a transaction (include in balance again)
  unarchive: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().positive("Transaction ID must be positive"),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const repository = serviceFactory.getTransactionRepository();
        return await repository.unarchiveTransaction(input.id, ctx.workspaceId);
      })
    ),

  // Bulk archive transactions
  bulkArchive: bulkOperationProcedure
    .input(
      z.object({
        ids: z.array(z.number().positive()).min(1, "At least one transaction ID required"),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const repository = serviceFactory.getTransactionRepository();
        let archivedCount = 0;
        for (const id of input.ids) {
          await repository.archiveTransaction(id, ctx.workspaceId);
          archivedCount++;
        }
        return { success: true, archivedCount };
      })
    ),

  // Archive all transactions before a specific date
  archiveBeforeDate: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive("Account ID must be positive"),
        beforeDate: z.string().min(1, "Date is required"), // ISO date string
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const repository = serviceFactory.getTransactionRepository();
        const archivedCount = await repository.archiveTransactionsBeforeDate(
          input.accountId,
          input.beforeDate,
          ctx.workspaceId
        );
        return { success: true, archivedCount };
      })
    ),

  // Create a balance adjustment transaction
  createBalanceAdjustment: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive("Account ID must be positive"),
        targetBalance: z.number(), // The balance we want to achieve
        reason: z.string().min(1, "Reason is required"),
        date: z.string().optional(), // ISO date string, defaults to today
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const repository = serviceFactory.getTransactionRepository();

        // Calculate the current balance
        const currentBalance = await repository.getAccountBalance(
          input.accountId,
          ctx.workspaceId
        );

        // Calculate the adjustment amount needed
        const adjustmentAmount = input.targetBalance - currentBalance;

        // Use provided date or today
        const adjustmentDate = input.date || new Date().toISOString().split("T")[0];

        // Create the adjustment transaction
        return await repository.createBalanceAdjustment(
          input.accountId,
          adjustmentAmount,
          input.reason,
          adjustmentDate,
          ctx.workspaceId
        );
      })
    ),

  // Get count of archived transactions for an account
  getArchivedCount: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive("Account ID must be positive"),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) => {
        const repository = serviceFactory.getTransactionRepository();
        const count = await repository.countArchivedTransactions(
          input.accountId,
          ctx.workspaceId
        );
        return { count };
      })
    ),
});
