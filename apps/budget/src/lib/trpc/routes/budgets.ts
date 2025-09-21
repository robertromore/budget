import { z } from "zod";
import { publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import {
  BudgetService,
  type CreateBudgetData,
  type UpdateBudgetData,
  type CreateBudgetPeriodData,
  type UpdateBudgetPeriodData,
  type CreateBudgetAllocationData,
  type UpdateBudgetAllocationData,
  type BudgetFilters,
  type PeriodFilters,
  type AllocationFilters,
  type PaginationParams,
  createBudgetSchema,
  updateBudgetSchema,
  budgetFiltersSchema,
  periodFiltersSchema,
  allocationFiltersSchema,
  paginationSchema,
  createBudgetPeriodSchema,
  updateBudgetPeriodSchema,
  createAllocationSchema,
  updateAllocationSchema,
  validateAllocationSchema
} from "$lib/server/domains/budgets";

const budgetService = new BudgetService();

export const budgetRoutes = t.router({
  // Create a new budget
  create: rateLimitedProcedure
    .input(createBudgetSchema)
    .mutation(async ({ input }) => {
      try {
        return await budgetService.createBudget(input as CreateBudgetData);
      } catch (error: any) {
        if (error.statusCode === 400) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        } else if (error.statusCode === 409) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create budget",
        });
      }
    }),

  // Get budget by ID with relations
  getById: publicProcedure
    .input(z.object({
      id: z.number().positive(),
      includeRelations: z.boolean().default(false)
    }))
    .query(async ({ input }) => {
      try {
        if (input.includeRelations) {
          return await budgetService.getBudgetByIdWithRelations(input.id);
        } else {
          return await budgetService.getBudgetById(input.id);
        }
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch budget",
        });
      }
    }),

  // Get all budgets with filtering and pagination
  getAll: publicProcedure
    .input(z.object({
      filters: budgetFiltersSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ input }) => {
      try {
        return await budgetService.getBudgets(
          input.filters || {},
          input.pagination
        );
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch budgets",
        });
      }
    }),

  // Update budget fields
  update: rateLimitedProcedure
    .input(z.object({
      id: z.number().positive(),
      data: updateBudgetSchema,
    }))
    .mutation(async ({ input }) => {
      try {
        await budgetService.updateBudget(input.id, input.data as UpdateBudgetData);
        return { success: true };
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
          message: error.message || "Failed to update budget",
        });
      }
    }),

  // Soft delete budget
  delete: rateLimitedProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      try {
        await budgetService.deleteBudget(input.id);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete budget",
        });
      }
    }),

  // Add account to budget
  addAccount: rateLimitedProcedure
    .input(z.object({
      budgetId: z.number().positive(),
      accountId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      try {
        await budgetService.addAccountToBudget(input.budgetId, input.accountId);
        return { success: true };
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
        } else if (error.statusCode === 409) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to add account to budget",
        });
      }
    }),

  // Remove account from budget
  removeAccount: rateLimitedProcedure
    .input(z.object({
      budgetId: z.number().positive(),
      accountId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      try {
        await budgetService.removeAccountFromBudget(input.budgetId, input.accountId);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to remove account from budget",
        });
      }
    }),

  // Add category to budget with allocation amount
  addCategory: rateLimitedProcedure
    .input(z.object({
      budgetId: z.number().positive(),
      categoryId: z.number().positive(),
      allocatedAmount: z.number().min(0, "Allocated amount must be positive").default(0),
    }))
    .mutation(async ({ input }) => {
      try {
        await budgetService.addCategoryToBudget(
          input.budgetId,
          input.categoryId,
          input.allocatedAmount
        );
        return { success: true };
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
        } else if (error.statusCode === 409) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to add category to budget",
        });
      }
    }),

  // Remove category from budget
  removeCategory: rateLimitedProcedure
    .input(z.object({
      budgetId: z.number().positive(),
      categoryId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      try {
        await budgetService.removeCategoryFromBudget(input.budgetId, input.categoryId);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to remove category from budget",
        });
      }
    }),

  // Get budget progress and summary
  getProgress: publicProcedure
    .input(z.object({
      budgetId: z.number().positive(),
      periodId: z.number().positive().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    }))
    .query(async ({ input }) => {
      try {
        if (input.periodId) {
          return await budgetService.getBudgetProgress(input.budgetId, input.periodId);
        } else {
          return await budgetService.getBudgetSummary(input.budgetId, input.date);
        }
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch budget progress",
        });
      }
    }),

  // Validate proposed transaction allocation
  validateAllocation: publicProcedure
    .input(validateAllocationSchema)
    .query(async ({ input }) => {
      try {
        return await budgetService.validateProposedAllocation(
          input.transactionId,
          input.budgetId,
          input.proposedAmount,
          input.periodId
        );
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to validate allocation",
        });
      }
    }),

  // Period management routes
  periods: t.router({
    // Create budget period
    create: rateLimitedProcedure
      .input(createBudgetPeriodSchema)
      .mutation(async ({ input }) => {
        try {
          return await budgetService.createBudgetPeriod(input as CreateBudgetPeriodData);
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
            message: error.message || "Failed to create budget period",
          });
        }
      }),

    // Update budget period
    update: rateLimitedProcedure
      .input(z.object({
        id: z.number().positive(),
        data: updateBudgetPeriodSchema,
      }))
      .mutation(async ({ input }) => {
        try {
          await budgetService.updateBudgetPeriod(input.id, input.data as UpdateBudgetPeriodData);
          return { success: true };
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
            message: error.message || "Failed to update budget period",
          });
        }
      }),

    // Get periods with filters
    list: publicProcedure
      .input(z.object({
        filters: periodFiltersSchema.optional(),
        pagination: paginationSchema.optional(),
      }))
      .query(async ({ input }) => {
        try {
          return await budgetService.getBudgetPeriods(
            input.filters || {},
            input.pagination
          );
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to fetch budget periods",
          });
        }
      }),

    // Delete budget period
    delete: rateLimitedProcedure
      .input(z.object({
        id: z.number().positive(),
      }))
      .mutation(async ({ input }) => {
        try {
          await budgetService.deleteBudgetPeriod(input.id);
          return { success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to delete budget period",
          });
        }
      }),
  }),

  // Allocation management routes
  allocations: t.router({
    // Create allocation
    create: rateLimitedProcedure
      .input(createAllocationSchema)
      .mutation(async ({ input }) => {
        try {
          await budgetService.createAllocation(input as CreateBudgetAllocationData);
          return { success: true };
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
          } else if (error.statusCode === 409) {
            throw new TRPCError({
              code: "CONFLICT",
              message: error.message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to create allocation",
          });
        }
      }),

    // Update allocation
    update: rateLimitedProcedure
      .input(z.object({
        id: z.number().positive(),
        data: updateAllocationSchema,
      }))
      .mutation(async ({ input }) => {
        try {
          await budgetService.updateAllocation(input.id, input.data as UpdateBudgetAllocationData);
          return { success: true };
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
            message: error.message || "Failed to update allocation",
          });
        }
      }),

    // Get allocations by transaction
    byTransaction: publicProcedure
      .input(z.object({
        transactionId: z.number().positive(),
      }))
      .query(async ({ input }) => {
        try {
          return await budgetService.getAllocationsByTransaction(input.transactionId);
        } catch (error: any) {
          throw new TRPCError({
            code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to fetch allocations by transaction",
          });
        }
      }),

    // Get allocations by budget
    byBudget: publicProcedure
      .input(z.object({
        budgetId: z.number().positive(),
        filters: allocationFiltersSchema.optional(),
      }))
      .query(async ({ input }) => {
        try {
          return await budgetService.getAllocationsByBudget(
            input.budgetId,
            input.filters || {}
          );
        } catch (error: any) {
          throw new TRPCError({
            code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to fetch allocations by budget",
          });
        }
      }),

    // Delete allocation
    delete: rateLimitedProcedure
      .input(z.object({
        id: z.number().positive(),
      }))
      .mutation(async ({ input }) => {
        try {
          await budgetService.deleteAllocation(input.id);
          return { success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to delete allocation",
          });
        }
      }),

    // Check if transaction is fully allocated
    isTransactionFullyAllocated: publicProcedure
      .input(z.object({
        transactionId: z.number().positive(),
      }))
      .query(async ({ input }) => {
        try {
          return await budgetService.isTransactionFullyAllocated(input.transactionId);
        } catch (error: any) {
          throw new TRPCError({
            code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to check allocation status",
          });
        }
      }),
  }),
});