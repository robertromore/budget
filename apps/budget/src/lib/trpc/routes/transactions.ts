import {z} from "zod";
import {publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t} from "$lib/trpc";
import {
  createTransactionSchema,
  createTransactionWithAutoPopulationSchema,
  updateTransactionSchema,
  transactionFiltersSchema,
  paginationSchema,
  bulkDeleteSchema,
  transactionSuggestionRequestSchema,
  payeeIntelligenceRequestSchema,
} from "$lib/server/domains/transactions";
import {serviceFactory} from "$lib/server/shared/container/service-factory";
import {withErrorHandler} from "$lib/trpc/shared/errors";

const transactionService = serviceFactory.getTransactionService();

export const transactionRoutes = t.router({
  // Get all transactions for an account
  forAccount: publicProcedure
    .input(z.object({
      accountId: z.number().positive(),
    }))
    .query(withErrorHandler(async ({input}) => transactionService.getAccountTransactions(input.accountId))),

  // Get all transactions for an account including upcoming scheduled transactions
  forAccountWithUpcoming: publicProcedure
    .input(z.object({
      accountId: z.number().positive(),
    }))
    .query(withErrorHandler(async ({input}) => transactionService.getAccountTransactionsWithUpcoming(input.accountId))),

  // Get transactions with filters and pagination
  list: publicProcedure
    .input(z.object({
      filters: transactionFiltersSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(withErrorHandler(async ({input}) => transactionService.getTransactions(
      input.filters || {},
      input.pagination
    ))),

  // Get single transaction by ID
  byId: publicProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .query(withErrorHandler(async ({input}) => transactionService.getTransactionById(input.id))),

  // Get account summary
  summary: publicProcedure
    .input(z.object({
      accountId: z.number().positive(),
    }))
    .query(withErrorHandler(async ({input}) => transactionService.getAccountSummary(input.accountId))),

  // Get monthly spending aggregates for analytics
  monthlySpendingAggregates: publicProcedure
    .input(z.object({
      accountId: z.number().positive(),
    }))
    .query(withErrorHandler(async ({input}) => transactionService.getMonthlySpendingAggregates(input.accountId))),

  // Create new transaction
  create: rateLimitedProcedure
    .input(createTransactionSchema)
    .mutation(withErrorHandler(async ({input}) => transactionService.createTransaction(input))),

  // Update existing transaction
  update: rateLimitedProcedure
    .input(z.object({
      id: z.number().positive(),
      data: updateTransactionSchema,
    }))
    .mutation(withErrorHandler(async ({input}) => transactionService.updateTransaction(input.id, input.data))),

  // Update transaction and return all account transactions with recalculated running balances
  updateWithBalance: rateLimitedProcedure
    .input(z.object({
      id: z.number().positive(),
      data: updateTransactionSchema,
    }))
    .mutation(withErrorHandler(async ({input}) => transactionService.updateTransactionWithRecalculatedBalance(input.id, input.data))),

  // Delete single transaction
  delete: rateLimitedProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(withErrorHandler(async ({input}) => {
      await transactionService.deleteTransaction(input.id);
      return {success: true};
    })),

  // Bulk delete transactions
  bulkDelete: bulkOperationProcedure
    .input(bulkDeleteSchema)
    .mutation(withErrorHandler(async ({input}) => {
      await transactionService.deleteTransactions(input.ids);
      return {success: true, count: input.ids.length};
    })),

  // Legacy save endpoint (for backwards compatibility - will be deprecated)
  save: rateLimitedProcedure
    .input(z.object({
      id: z.number().nullable().optional(),
      accountId: z.number().optional(),
      amount: z.number(),
      date: z.string(),
      payeeId: z.number().nullable().optional(),
      categoryId: z.number().nullable().optional(),
      notes: z.string().nullable().optional(),
      status: z.enum(["cleared", "pending", "scheduled"]).nullable().optional(),
      budgetId: z.number().nullable().optional(),
      budgetAllocation: z.number().nullable().optional(),
    }))
    .mutation(async ({input}) => {
      try {
        if (input.id) {
          // Update existing transaction
          const {id, accountId, ...updateData} = input;
          return await transactionService.updateTransaction(id, updateData);
        } else {
          // Create new transaction
          if (!input.accountId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Account ID is required for new transaction",
            });
          }
          const {id, ...createData} = input;
          return await transactionService.createTransaction({
            ...createData,
            accountId: input.accountId,
          });
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
    .mutation(withErrorHandler(async ({input}) => transactionService.createTransactionWithPayeeDefaults(input))),

  // Get transaction suggestions based on payee
  getSuggestions: publicProcedure
    .input(transactionSuggestionRequestSchema)
    .query(withErrorHandler(async ({input}) => transactionService.suggestTransactionDetails(input.payeeId, input.amount))),

  // Get payee transaction intelligence
  getPayeeIntelligence: publicProcedure
    .input(payeeIntelligenceRequestSchema)
    .query(withErrorHandler(async ({input}) => transactionService.getPayeeTransactionIntelligence(input.payeeId))),

  // Update payee statistics after transaction changes
  updatePayeeStats: rateLimitedProcedure
    .input(z.object({
      payeeId: z.number().positive("Payee ID must be a positive number"),
    }))
    .mutation(withErrorHandler(async ({input}) => {
      await transactionService.updatePayeeAfterTransaction(input.payeeId);
      return {success: true};
    })),

  // Create a transfer transaction between two accounts
  createTransfer: rateLimitedProcedure
    .input(z.object({
      fromAccountId: z.number().positive("From account ID must be positive"),
      toAccountId: z.number().positive("To account ID must be positive"),
      amount: z.number().positive("Amount must be positive"),
      date: z.string().min(1, "Date is required"),
      notes: z.string().optional(),
      categoryId: z.number().positive().nullable().optional(),
      payeeId: z.number().positive().nullable().optional(),
    }))
    .mutation(withErrorHandler(async ({input}) => transactionService.createTransfer({
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: input.amount,
      date: input.date,
      notes: input.notes,
      categoryId: input.categoryId,
      payeeId: input.payeeId,
    }))),

  // Update a transfer transaction
  updateTransfer: rateLimitedProcedure
    .input(z.object({
      transferId: z.string().min(1, "Transfer ID is required"),
      amount: z.number().positive("Amount must be positive").optional(),
      date: z.string().min(1).optional(),
      notes: z.string().optional(),
      categoryId: z.number().positive().nullable().optional(),
      payeeId: z.number().positive().nullable().optional(),
    }))
    .mutation(withErrorHandler(async ({input}) => {
      const {transferId, ...updates} = input;
      return await transactionService.updateTransfer(transferId, updates);
    })),

  // Delete a transfer transaction
  deleteTransfer: rateLimitedProcedure
    .input(z.object({
      transferId: z.string().min(1, "Transfer ID is required"),
    }))
    .mutation(withErrorHandler(async ({input}) => {
      await transactionService.deleteTransfer(input.transferId);
      return {success: true};
    })),
});
