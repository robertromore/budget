import {
  budgetEnforcementLevels,
  budgetScopes,
  budgetStatuses,
  budgetTypes,
} from "$lib/schema/budgets";
import {
  BudgetService,
  BudgetPeriodService,
  BudgetTransactionService,
} from "$lib/server/domains/budgets";
import {publicProcedure, t} from "$lib/trpc";
import {TRPCError} from "@trpc/server";
import {z} from "zod";
import {
  ConflictError,
  DatabaseError,
  DomainError,
  NotFoundError,
  ValidationError,
} from "$lib/server/shared/types/errors";

const budgetIdSchema = z.object({
  id: z.number().int().positive(),
});

const metadataSchema = z.record(z.string(), z.unknown());

const createBudgetSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  type: z.enum(budgetTypes),
  scope: z.enum(budgetScopes),
  status: z.enum(budgetStatuses).optional(),
  enforcementLevel: z.enum(budgetEnforcementLevels).optional(),
  metadata: metadataSchema.optional(),
  accountIds: z.array(z.number().int().positive()).optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  groupIds: z.array(z.number().int().positive()).optional(),
});

const updateBudgetSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    status: z.enum(budgetStatuses).optional(),
    enforcementLevel: z.enum(budgetEnforcementLevels).optional(),
    metadata: metadataSchema.optional(),
    accountIds: z.array(z.number().int().positive()).optional(),
    categoryIds: z.array(z.number().int().positive()).optional(),
    groupIds: z.array(z.number().int().positive()).optional(),
  })
  .refine((value) => {
    const {name, description, status, enforcementLevel, metadata, accountIds, categoryIds, groupIds} =
      value;
    return (
      name !== undefined ||
      description !== undefined ||
      status !== undefined ||
      enforcementLevel !== undefined ||
      metadata !== undefined ||
      accountIds !== undefined ||
      categoryIds !== undefined ||
      groupIds !== undefined
    );
  }, "At least one field must be provided when updating a budget");

const listBudgetSchema = z
  .object({
    status: z.enum(budgetStatuses).optional(),
  })
  .optional();

const ensurePeriodSchema = z.object({
  templateId: z.number().int().positive(),
  referenceDate: z
    .object({
      year: z.number().int(),
      month: z.number().int(),
      day: z.number().int(),
    })
    .optional(),
  allocatedAmount: z.number().optional(),
  rolloverAmount: z.number().optional(),
  actualAmount: z.number().optional(),
});

const periodListSchema = z.object({
  templateId: z.number().int().positive(),
});

const allocationCreateSchema = z.object({
  transactionId: z.number().int().positive(),
  budgetId: z.number().int().positive(),
  allocatedAmount: z.number(),
  autoAssigned: z.boolean().optional(),
  assignedBy: z.string().optional(),
});

const allocationUpdateSchema = z.object({
  id: z.number().int().positive(),
  allocatedAmount: z.number(),
  autoAssigned: z.boolean().optional(),
  assignedBy: z.string().optional(),
});

const allocationValidateSchema = z.object({
  transactionId: z.number().int().positive(),
  amount: z.number(),
  excludeAllocationId: z.number().int().positive().optional(),
});

const allocationIdSchema = z.object({
  id: z.number().int().positive(),
});

const budgetService = new BudgetService();
const periodService = new BudgetPeriodService();
const transactionService = new BudgetTransactionService();

export const budgetRoutes = t.router({
  count: publicProcedure.query(async () => {
    try {
      const budgets = await budgetService.listBudgets();
      return { count: budgets.length };
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
  list: publicProcedure.input(listBudgetSchema).query(async ({input}) => {
    try {
      const status = input?.status;
      return await budgetService.listBudgets(status);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
  get: publicProcedure.input(budgetIdSchema).query(async ({input}) => {
    try {
      return await budgetService.getBudget(input.id);
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw translateDomainError(error);
    }
  }),
  create: publicProcedure.input(createBudgetSchema).mutation(async ({input}) => {
    try {
      return await budgetService.createBudget(input);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
  update: publicProcedure.input(updateBudgetSchema).mutation(async ({input}) => {
    try {
      const {id, ...updates} = input;
      return await budgetService.updateBudget(id, updates);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
  delete: publicProcedure.input(budgetIdSchema).mutation(async ({input}) => {
    try {
      await budgetService.deleteBudget(input.id);
      return {success: true};
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
  ensurePeriodInstance: publicProcedure.input(ensurePeriodSchema).mutation(async ({input}) => {
    try {
      return await periodService.ensureInstanceForDate(input.templateId, {
        referenceDate: input.referenceDate,
        allocatedAmount: input.allocatedAmount,
        rolloverAmount: input.rolloverAmount,
        actualAmount: input.actualAmount,
      });
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
  listPeriodInstances: publicProcedure.input(periodListSchema).query(async ({input}) => {
    try {
      return await periodService.listInstances(input.templateId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
  validateAllocation: publicProcedure.input(allocationValidateSchema).query(async ({input}) => {
    try {
      return await transactionService.validateProposedAllocation(
        input.transactionId,
        input.amount,
        input.excludeAllocationId
      );
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
  createAllocation: publicProcedure.input(allocationCreateSchema).mutation(async ({input}) => {
    try {
      return await transactionService.createAllocation({
        transactionId: input.transactionId,
        budgetId: input.budgetId,
        allocatedAmount: input.allocatedAmount,
        autoAssigned: input.autoAssigned ?? true,
        assignedBy: input.assignedBy,
      });
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
  updateAllocation: publicProcedure.input(allocationUpdateSchema).mutation(async ({input}) => {
    try {
      return await transactionService.updateAllocation(input.id, input.allocatedAmount, {
        autoAssigned: input.autoAssigned,
        assignedBy: input.assignedBy,
      });
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
  clearAllocation: publicProcedure.input(allocationIdSchema).mutation(async ({input}) => {
    try {
      return await transactionService.clearAllocation(input.id);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
  deleteAllocation: publicProcedure.input(allocationIdSchema).mutation(async ({input}) => {
    try {
      await transactionService.deleteAllocation(input.id);
      return {success: true};
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Envelope operations
  getEnvelopeAllocations: publicProcedure
    .input(z.object({budgetId: z.number().int().positive()}))
    .query(async ({input}) => {
      try {
        return await budgetService.getEnvelopeAllocations(input.budgetId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  createEnvelopeAllocation: publicProcedure
    .input(z.object({
      budgetId: z.number().int().positive(),
      categoryId: z.number().int().positive(),
      periodInstanceId: z.number().int().positive(),
      allocatedAmount: z.number(),
      rolloverMode: z.enum(["unlimited", "reset", "limited"]).optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({input}) => {
      try {
        return await budgetService.createEnvelopeAllocation(input);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  transferEnvelopeFunds: publicProcedure
    .input(z.object({
      fromEnvelopeId: z.number().int().positive(),
      toEnvelopeId: z.number().int().positive(),
      amount: z.number(),
      reason: z.string().optional(),
      transferredBy: z.string().default("user"),
    }))
    .mutation(async ({input}) => {
      try {
        return await budgetService.transferEnvelopeFunds(
          input.fromEnvelopeId,
          input.toEnvelopeId,
          input.amount,
          input.reason,
          input.transferredBy
        );
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  processEnvelopeRollover: publicProcedure
    .input(z.object({
      fromPeriodId: z.number().int().positive(),
      toPeriodId: z.number().int().positive(),
    }))
    .mutation(async ({input}) => {
      try {
        return await budgetService.processEnvelopeRollover(input.fromPeriodId, input.toPeriodId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  previewEnvelopeRollover: publicProcedure
    .input(z.object({
      fromPeriodId: z.number().int().positive(),
      toPeriodId: z.number().int().positive(),
    }))
    .query(async ({input}) => {
      try {
        return await budgetService.previewEnvelopeRollover(input.fromPeriodId, input.toPeriodId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getDeficitEnvelopes: publicProcedure
    .input(z.object({budgetId: z.number().int().positive()}))
    .query(async ({input}) => {
      try {
        return await budgetService.getDeficitEnvelopes(input.budgetId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getSurplusEnvelopes: publicProcedure
    .input(z.object({
      budgetId: z.number().int().positive(),
      minimumSurplus: z.number().optional(),
    }))
    .query(async ({input}) => {
      try {
        return await budgetService.getSurplusEnvelopes(input.budgetId, input.minimumSurplus);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});

function translateDomainError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    return error;
  }

  if (error instanceof ValidationError) {
    return new TRPCError({code: "BAD_REQUEST", message: error.message});
  }

  if (error instanceof NotFoundError) {
    return new TRPCError({code: "NOT_FOUND", message: error.message});
  }

  if (error instanceof ConflictError) {
    return new TRPCError({code: "CONFLICT", message: error.message});
  }

  if (error instanceof DomainError && !(error instanceof DatabaseError)) {
    return new TRPCError({code: "BAD_REQUEST", message: error.message});
  }

  if (error instanceof DatabaseError) {
    return new TRPCError({code: "INTERNAL_SERVER_ERROR", message: error.message});
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: (error as Error)?.message ?? "Unknown error",
  });
}
