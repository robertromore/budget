import {z} from "zod";
import {publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t} from "$lib/trpc";
import {TRPCError} from "@trpc/server";
import {
  TransactionService,
  createTransactionSchema,
  createTransactionWithAutoPopulationSchema,
  updateTransactionSchema,
  transactionFiltersSchema,
  paginationSchema,
  bulkDeleteSchema,
  transactionSuggestionRequestSchema,
  payeeIntelligenceRequestSchema,
} from "$lib/server/domains/transactions";

const transactionService = new TransactionService();

export const transactionRoutes = t.router({
  // Get all transactions for an account
  forAccount: publicProcedure
    .input(z.object({
      accountId: z.number().positive(),
    }))
    .query(async ({input}) => {
      try {
        return await transactionService.getAccountTransactions(input.accountId);
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch transactions",
        });
      }
    }),

  // Get all transactions for an account including upcoming scheduled transactions
  forAccountWithUpcoming: publicProcedure
    .input(z.object({
      accountId: z.number().positive(),
    }))
    .query(async ({input}) => {
      try {
        return await transactionService.getAccountTransactionsWithUpcoming(input.accountId);
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch transactions with upcoming",
        });
      }
    }),

  // Get transactions with filters and pagination
  list: publicProcedure
    .input(z.object({
      filters: transactionFiltersSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({input}) => {
      try {
        return await transactionService.getTransactions(
          input.filters || {},
          input.pagination
        );
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch transactions",
        });
      }
    }),

  // Get single transaction by ID
  byId: publicProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .query(async ({input}) => {
      try {
        return await transactionService.getTransactionById(input.id);
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch transaction",
        });
      }
    }),

  // Get account summary
  summary: publicProcedure
    .input(z.object({
      accountId: z.number().positive(),
    }))
    .query(async ({input}) => {
      try {
        return await transactionService.getAccountSummary(input.accountId);
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch account summary",
        });
      }
    }),

  // Get monthly spending aggregates for analytics
  monthlySpendingAggregates: publicProcedure
    .input(z.object({
      accountId: z.number().positive(),
    }))
    .query(async ({input}) => {
      try {
        return await transactionService.getMonthlySpendingAggregates(input.accountId);
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch monthly spending aggregates",
        });
      }
    }),

  // Create new transaction
  create: rateLimitedProcedure
    .input(createTransactionSchema)
    .mutation(async ({input}) => {
      try {
        return await transactionService.createTransaction(input);
      } catch (error: any) {
        if (error.statusCode === 400) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        } else if (error.statusCode === 404) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create transaction",
        });
      }
    }),

  // Update existing transaction
  update: rateLimitedProcedure
    .input(z.object({
      id: z.number().positive(),
      data: updateTransactionSchema,
    }))
    .mutation(async ({input}) => {
      try {
        return await transactionService.updateTransaction(input.id, input.data);
      } catch (error: any) {
        if (error.statusCode === 400) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        } else if (error.statusCode === 404) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to update transaction",
        });
      }
    }),

  // Update transaction and return all account transactions with recalculated running balances
  updateWithBalance: rateLimitedProcedure
    .input(z.object({
      id: z.number().positive(),
      data: updateTransactionSchema,
    }))
    .mutation(async ({input}) => {
      try {
        return await transactionService.updateTransactionWithRecalculatedBalance(input.id, input.data);
      } catch (error: any) {
        if (error.statusCode === 400) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        } else if (error.statusCode === 404) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to update transaction",
        });
      }
    }),

  // Delete single transaction
  delete: rateLimitedProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({input}) => {
      try {
        await transactionService.deleteTransaction(input.id);
        return {success: true};
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete transaction",
        });
      }
    }),

  // Bulk delete transactions
  bulkDelete: bulkOperationProcedure
    .input(bulkDeleteSchema)
    .mutation(async ({input}) => {
      try {
        await transactionService.deleteTransactions(input.ids);
        return {success: true, count: input.ids.length};
      } catch (error: any) {
        if (error.statusCode === 400) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        } else if (error.statusCode === 404) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete transactions",
        });
      }
    }),

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
    .mutation(async ({input}) => {
      try {
        return await transactionService.createTransactionWithPayeeDefaults(input);
      } catch (error: any) {
        if (error.statusCode === 400) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        } else if (error.statusCode === 404) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create transaction with auto-population",
        });
      }
    }),

  // Get transaction suggestions based on payee
  getSuggestions: publicProcedure
    .input(transactionSuggestionRequestSchema)
    .query(async ({input}) => {
      try {
        return await transactionService.suggestTransactionDetails(input.payeeId, input.amount);
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to get transaction suggestions",
        });
      }
    }),

  // Get payee transaction intelligence
  getPayeeIntelligence: publicProcedure
    .input(payeeIntelligenceRequestSchema)
    .query(async ({input}) => {
      try {
        return await transactionService.getPayeeTransactionIntelligence(input.payeeId);
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to get payee intelligence",
        });
      }
    }),

  // Update payee statistics after transaction changes
  updatePayeeStats: rateLimitedProcedure
    .input(z.object({
      payeeId: z.number().positive("Payee ID must be a positive number"),
    }))
    .mutation(async ({input}) => {
      try {
        await transactionService.updatePayeeAfterTransaction(input.payeeId);
        return {success: true};
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to update payee statistics",
        });
      }
    }),

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
    .mutation(async ({input}) => {
      try {
        return await transactionService.createTransfer({
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          amount: input.amount,
          date: input.date,
          notes: input.notes,
          categoryId: input.categoryId,
          payeeId: input.payeeId,
        });
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" :
                error.statusCode === 400 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create transfer",
        });
      }
    }),

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
    .mutation(async ({input}) => {
      try {
        const {transferId, ...updates} = input;
        return await transactionService.updateTransfer(transferId, updates);
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" :
                error.statusCode === 400 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to update transfer",
        });
      }
    }),

  // Delete a transfer transaction
  deleteTransfer: rateLimitedProcedure
    .input(z.object({
      transferId: z.string().min(1, "Transfer ID is required"),
    }))
    .mutation(async ({input}) => {
      try {
        await transactionService.deleteTransfer(input.transferId);
        return {success: true};
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete transfer",
        });
      }
    }),
});
