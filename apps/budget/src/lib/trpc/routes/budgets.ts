import { z } from "zod";
import { publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { BudgetService } from "$lib/server/domains/budgets/services";
import type {
  CreateBudgetData,
  UpdateBudgetData,
  CreateBudgetPeriodTemplateData,
  UpdateBudgetPeriodTemplateData,
  CreateBudgetPeriodInstanceData,
  UpdateBudgetPeriodInstanceData,
  CreateBudgetTransactionData,
  UpdateBudgetTransactionData,
  BudgetFilters,
  PeriodFilters,
  TransactionFilters,
  PaginationParams
} from "$lib/server/domains/budgets/types";

const budgetService = new BudgetService();

export const budgetRoutes = t.router({
  // Create a new budget
  create: rateLimitedProcedure
    .input(z.object({
      name: z.string().min(1, "Budget name is required").max(100),
      description: z.string().max(500).optional(),
      type: z.enum(["account-monthly", "category-envelope", "goal-based", "scheduled-expense"]),
      scope: z.enum(["account", "category", "global", "mixed"]).optional(),
      status: z.enum(["active", "inactive", "archived"]).optional(),
      enforcementLevel: z.enum(["none", "warning", "strict"]).optional(),
      metadata: z.object({}).passthrough().optional(),
      accountIds: z.array(z.number().positive()).optional(),
      categoryIds: z.array(z.number().positive()).optional()
    }))
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
      filters: z.object({
        type: z.enum(["account-monthly", "category-envelope", "goal-based", "scheduled-expense"]).optional(),
        scope: z.enum(["account", "category", "global", "mixed"]).optional(),
        status: z.enum(["active", "inactive", "archived"]).optional(),
        enforcementLevel: z.enum(["none", "warning", "strict"]).optional(),
        accountId: z.number().positive().optional(),
        categoryId: z.number().positive().optional(),
        search: z.string().optional()
      }).optional(),
      pagination: z.object({
        page: z.number().positive().default(1),
        limit: z.number().positive().max(100).default(20),
        sortBy: z.string().optional(),
        sortOrder: z.enum(["asc", "desc"]).default("desc")
      }).optional(),
    }))
    .query(async ({ input }) => {
      try {
        return await budgetService.getBudgets(
          input.filters ?? {},
          input.pagination ?? undefined
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
      data: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        type: z.enum(["account-monthly", "category-envelope", "goal-based", "scheduled-expense"]).optional(),
        scope: z.enum(["account", "category", "global", "mixed"]).optional(),
        status: z.enum(["active", "inactive", "archived"]).optional(),
        enforcementLevel: z.enum(["none", "warning", "strict"]).optional(),
        metadata: z.object({}).passthrough().optional()
      }),
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
    .input(z.object({
      transactionId: z.number().positive(),
      proposedAmount: z.number()
    }))
    .query(async ({ input }) => {
      try {
        return await budgetService.validateProposedAllocation(
          input.transactionId,
          input.proposedAmount
        );
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to validate allocation",
        });
      }
    }),

  // Period template management routes
  templates: t.router({
    // Create budget period template
    create: rateLimitedProcedure
      .input(z.object({
        budgetId: z.number().positive(),
        type: z.enum(["weekly", "monthly", "quarterly", "yearly", "custom"]),
        intervalCount: z.number().positive().default(1),
        startDayOfWeek: z.number().min(1).max(7).optional(),
        startDayOfMonth: z.number().min(1).max(31).optional(),
        startMonth: z.number().min(1).max(12).optional(),
        timezone: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        try {
          return await budgetService.createBudgetPeriodTemplate(input as CreateBudgetPeriodTemplateData);
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
            message: error.message || "Failed to create budget period template",
          });
        }
      }),

    // Update budget period template
    update: rateLimitedProcedure
      .input(z.object({
        id: z.number().positive(),
        data: z.object({
          type: z.enum(["weekly", "monthly", "quarterly", "yearly", "custom"]).optional(),
          intervalCount: z.number().positive().optional(),
          startDayOfWeek: z.number().min(1).max(7).optional(),
          startDayOfMonth: z.number().min(1).max(31).optional(),
          startMonth: z.number().min(1).max(12).optional(),
          timezone: z.string().optional()
        }),
      }))
      .mutation(async ({ input }) => {
        try {
          await budgetService.updateBudgetPeriodTemplate(input.id, input.data as UpdateBudgetPeriodTemplateData);
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
            message: error.message || "Failed to update budget period template",
          });
        }
      }),

    // Get templates for budget
    list: publicProcedure
      .input(z.object({
        budgetId: z.number().positive(),
      }))
      .query(async ({ input }) => {
        try {
          return await budgetService.getBudgetPeriodTemplates(input.budgetId);
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to fetch budget period templates",
          });
        }
      }),

    // Delete budget period template
    delete: rateLimitedProcedure
      .input(z.object({
        id: z.number().positive(),
      }))
      .mutation(async ({ input }) => {
        try {
          await budgetService.deleteBudgetPeriodTemplate(input.id);
          return { success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to delete budget period template",
          });
        }
      }),
  }),

  // Period instance management routes
  periods: t.router({
    // Create budget period instance
    create: rateLimitedProcedure
      .input(z.object({
        templateId: z.number().positive(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
        allocatedAmount: z.number().min(0, "Allocated amount must be positive"),
        rolloverAmount: z.number().default(0)
      }))
      .mutation(async ({ input }) => {
        try {
          return await budgetService.createBudgetPeriodInstance(input as CreateBudgetPeriodInstanceData);
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
            message: error.message || "Failed to create budget period instance",
          });
        }
      }),

    // Update budget period instance
    update: rateLimitedProcedure
      .input(z.object({
        id: z.number().positive(),
        data: z.object({
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
          allocatedAmount: z.number().min(0).optional(),
          rolloverAmount: z.number().optional(),
          actualAmount: z.number().optional()
        }),
      }))
      .mutation(async ({ input }) => {
        try {
          await budgetService.updateBudgetPeriodInstance(input.id, input.data as UpdateBudgetPeriodInstanceData);
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
            message: error.message || "Failed to update budget period instance",
          });
        }
      }),

    // Get periods with filters
    list: publicProcedure
      .input(z.object({
        filters: z.object({
          budgetId: z.number().positive().optional(),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional()
        }).optional(),
        pagination: z.object({
          page: z.number().positive().default(1),
          limit: z.number().positive().max(100).default(20),
          sortBy: z.string().optional(),
          sortOrder: z.enum(["asc", "desc"]).default("desc")
        }).optional(),
      }))
      .query(async ({ input }) => {
        try {
          return await budgetService.getBudgetPeriodInstances(
            input.filters ?? undefined,
            input.pagination ?? undefined
          );
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to fetch budget period instances",
          });
        }
      }),

    // Delete budget period instance
    delete: rateLimitedProcedure
      .input(z.object({
        id: z.number().positive(),
      }))
      .mutation(async ({ input }) => {
        try {
          await budgetService.deleteBudgetPeriodInstance(input.id);
          return { success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to delete budget period instance",
          });
        }
      }),
  }),

  // Budget transaction management routes (replaces allocations)
  transactions: t.router({
    // Create budget transaction
    create: rateLimitedProcedure
      .input(z.object({
        budgetId: z.number().positive(),
        transactionId: z.number().positive(),
        allocatedAmount: z.number(),
        autoAssigned: z.boolean().default(true),
        assignedBy: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        try {
          await budgetService.createBudgetTransaction(input as CreateBudgetTransactionData);
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
            message: error.message || "Failed to create budget transaction",
          });
        }
      }),

    // Update budget transaction
    update: rateLimitedProcedure
      .input(z.object({
        id: z.number().positive(),
        data: z.object({
          allocatedAmount: z.number().optional(),
          autoAssigned: z.boolean().optional(),
          assignedBy: z.string().optional()
        }),
      }))
      .mutation(async ({ input }) => {
        try {
          await budgetService.updateBudgetTransaction(input.id, input.data as UpdateBudgetTransactionData);
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
            message: error.message || "Failed to update budget transaction",
          });
        }
      }),

    // Get budget transactions by transaction
    byTransaction: publicProcedure
      .input(z.object({
        transactionId: z.number().positive(),
      }))
      .query(async ({ input }) => {
        try {
          return await budgetService.getBudgetTransactionsByTransaction(input.transactionId);
        } catch (error: any) {
          throw new TRPCError({
            code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to fetch budget transactions by transaction",
          });
        }
      }),

    // Get budget transactions by budget
    byBudget: publicProcedure
      .input(z.object({
        budgetId: z.number().positive(),
        filters: z.object({
          transactionId: z.number().positive().optional(),
          autoAssigned: z.boolean().optional(),
          assignedBy: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional()
        }).optional(),
      }))
      .query(async ({ input }) => {
        try {
          return await budgetService.getBudgetTransactionsByBudget(
            input.budgetId,
            input.filters ?? undefined
          );
        } catch (error: any) {
          throw new TRPCError({
            code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to fetch budget transactions by budget",
          });
        }
      }),

    // Delete budget transaction
    delete: rateLimitedProcedure
      .input(z.object({
        id: z.number().positive(),
      }))
      .mutation(async ({ input }) => {
        try {
          await budgetService.deleteBudgetTransaction(input.id);
          return { success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: error.statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to delete budget transaction",
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