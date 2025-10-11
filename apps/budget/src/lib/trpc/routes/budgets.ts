import {
  budgetEnforcementLevels,
  budgetScopes,
  budgetStatuses,
  budgetTypes,
  periodTemplateTypes,
} from "$lib/schema/budgets";
import {
  BudgetService,
  BudgetPeriodService,
  BudgetTransactionService,
  BudgetForecastService,
  BudgetTemplateService,
} from "$lib/server/domains/budgets";
import {BudgetIntelligenceService} from "$lib/server/domains/budgets/intelligence-service";
import {PeriodManager} from "$lib/server/domains/budgets/period-manager";
import {publicProcedure, t} from "$lib/trpc";
import {TRPCError} from "@trpc/server";
import {z} from "zod";
import {translateDomainError} from "$lib/trpc/shared/errors";

const budgetIdSchema = z.object({
  id: z.number().int().positive(),
});

const budgetSlugSchema = z.object({
  slug: z.string(),
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

const createBudgetGroupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
  spendingLimit: z.number().optional().nullable(),
});

const updateBudgetGroupSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    parentId: z.number().int().positive().optional().nullable(),
    spendingLimit: z.number().optional().nullable(),
  })
  .refine((value) => {
    const {name, description, parentId, spendingLimit} = value;
    return (
      name !== undefined ||
      description !== undefined ||
      parentId !== undefined ||
      spendingLimit !== undefined
    );
  }, "At least one field must be provided when updating a budget group");

const budgetGroupIdSchema = z.object({
  id: z.number().int().positive(),
});

const listBudgetGroupsSchema = z
  .object({
    parentId: z.number().int().positive().optional().nullable(),
  })
  .optional();

const createPeriodTemplateSchema = z.object({
  budgetId: z.number().int().positive(),
  type: z.enum(periodTemplateTypes),
  intervalCount: z.number().int().min(1).max(52).optional(),
  startDayOfWeek: z.number().int().min(1).max(7).optional(),
  startDayOfMonth: z.number().int().min(1).max(31).optional(),
  startMonth: z.number().int().min(1).max(12).optional(),
  timezone: z.string().optional(),
});

const updatePeriodTemplateSchema = z
  .object({
    id: z.number().int().positive(),
    type: z.enum(periodTemplateTypes).optional(),
    intervalCount: z.number().int().min(1).max(52).optional(),
    startDayOfWeek: z.number().int().min(1).max(7).optional(),
    startDayOfMonth: z.number().int().min(1).max(31).optional(),
    startMonth: z.number().int().min(1).max(12).optional(),
    timezone: z.string().optional(),
  })
  .refine((value) => {
    const {type, intervalCount, startDayOfWeek, startDayOfMonth, startMonth, timezone} = value;
    return (
      type !== undefined ||
      intervalCount !== undefined ||
      startDayOfWeek !== undefined ||
      startDayOfMonth !== undefined ||
      startMonth !== undefined ||
      timezone !== undefined
    );
  }, "At least one field must be provided when updating a period template");

const periodTemplateIdSchema = z.object({
  id: z.number().int().positive(),
});

const listPeriodTemplatesSchema = z.object({
  budgetId: z.number().int().positive(),
});

const budgetService = new BudgetService();
const periodService = new BudgetPeriodService();
const transactionService = new BudgetTransactionService();
const periodManager = new PeriodManager();
const templateService = new BudgetTemplateService();
const intelligenceService = new BudgetIntelligenceService();

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
  suggestBudgets: publicProcedure
    .input(
      z.object({
        accountId: z.number().int().positive(),
        categoryId: z.number().int().positive().optional().nullable(),
        payeeId: z.number().int().positive().optional().nullable(),
        amount: z.number(),
        date: z.string(),
      })
    )
    .query(async ({input}) => {
      try {
        return await intelligenceService.detectBudgetsForTransaction({
          accountId: input.accountId,
          categoryId: input.categoryId ?? null,
          payeeId: input.payeeId ?? null,
          amount: input.amount,
          date: input.date,
        });
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
  suggestBudgetsBulk: publicProcedure
    .input(
      z.object({
        transactions: z.array(
          z.object({
            id: z.number().int().positive().optional(),
            accountId: z.number().int().positive(),
            categoryId: z.number().int().positive().optional().nullable(),
            payeeId: z.number().int().positive().optional().nullable(),
            amount: z.number(),
            date: z.string(),
          })
        ),
      })
    )
    .query(async ({input}) => {
      try {
        return await intelligenceService.detectBudgetsForTransactions(input.transactions);
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
  getBySlug: publicProcedure.input(budgetSlugSchema).query(async ({input}) => {
    try {
      return await budgetService.getBudgetBySlug(input.slug);
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
  duplicate: publicProcedure
    .input(z.object({
      id: z.number().int().positive(),
      newName: z.string().trim().min(2).max(80).optional(),
    }))
    .mutation(async ({input}) => {
      try {
        return await budgetService.duplicateBudget(input.id, input.newName);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
  bulkArchive: publicProcedure
    .input(z.object({
      ids: z.array(z.number().int().positive()).min(1),
    }))
    .mutation(async ({input}) => {
      try {
        return await budgetService.bulkArchive(input.ids);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
  bulkDelete: publicProcedure
    .input(z.object({
      ids: z.array(z.number().int().positive()).min(1),
    }))
    .mutation(async ({input}) => {
      try {
        return await budgetService.bulkDelete(input.ids);
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

  updateEnvelopeAllocation: publicProcedure
    .input(z.object({
      envelopeId: z.number().int().positive(),
      allocatedAmount: z.number(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({input}) => {
      try {
        return await budgetService.updateEnvelopeAllocation(
          input.envelopeId,
          input.allocatedAmount,
          input.metadata
        );
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

  analyzeEnvelopeDeficit: publicProcedure
    .input(z.object({
      envelopeId: z.number().int().positive(),
    }))
    .query(async ({input}) => {
      try {
        return await budgetService.analyzeEnvelopeDeficit(input.envelopeId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  createDeficitRecoveryPlan: publicProcedure
    .input(z.object({
      envelopeId: z.number().int().positive(),
    }))
    .query(async ({input}) => {
      try {
        return await budgetService.createEnvelopeDeficitRecoveryPlan(input.envelopeId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  executeDeficitRecovery: publicProcedure
    .input(z.object({
      plan: z.any(),
      executedBy: z.string().optional(),
    }))
    .mutation(async ({input}) => {
      try {
        return await budgetService.executeEnvelopeDeficitRecovery(input.plan, input.executedBy);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  generateBulkDeficitRecovery: publicProcedure
    .input(z.object({
      budgetId: z.number().int().positive(),
    }))
    .mutation(async ({input}) => {
      try {
        return await budgetService.generateBulkDeficitRecovery(input.budgetId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getRolloverSummary: publicProcedure
    .input(z.object({
      periodId: z.number().int().positive(),
    }))
    .query(async ({input}) => {
      try {
        return await budgetService.getEnvelopeRolloverSummary(input.periodId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getRolloverHistory: publicProcedure
    .input(z.object({
      envelopeId: z.number().int().positive(),
      limit: z.number().int().positive().optional(),
    }))
    .query(async ({input}) => {
      try {
        return await budgetService.getEnvelopeRolloverHistory(input.envelopeId, input.limit);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getBudgetRolloverHistory: publicProcedure
    .input(z.object({
      budgetId: z.number().int().positive(),
      limit: z.number().int().positive().optional(),
    }))
    .query(async ({input}) => {
      try {
        return await budgetService.getBudgetRolloverHistory(input.budgetId, input.limit);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  estimateRolloverImpact: publicProcedure
    .input(z.object({
      fromPeriodId: z.number().int().positive(),
      toPeriodId: z.number().int().positive(),
      policy: z.object({
        maxRolloverMonths: z.number().int().positive().optional(),
        resetOnLimitExceeded: z.boolean().optional(),
        preserveDeficits: z.boolean().optional(),
        rolloverDeficits: z.boolean().optional(),
        emergencyFundPriority: z.boolean().optional(),
        autoRefillAmount: z.number().optional(),
      }).optional(),
    }))
    .query(async ({input}) => {
      try {
        return await budgetService.estimateEnvelopeRolloverImpact(
          input.fromPeriodId,
          input.toPeriodId
        );
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  previewRollover: publicProcedure
    .input(z.object({
      fromPeriodId: z.number().int().positive(),
      toPeriodId: z.number().int().positive(),
    }))
    .query(async ({input}) => {
      try {
        return await budgetService.previewEnvelopeRollover(
          input.fromPeriodId,
          input.toPeriodId
        );
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  updateRolloverSettings: publicProcedure
    .input(z.object({
      budgetId: z.number().int().positive(),
      settings: z.object({
        enabled: z.boolean().optional(),
        maxRolloverPercentage: z.number().int().min(0).max(100).optional(),
        rolloverLimitMonths: z.number().int().positive().optional(),
        deficitRecoveryMode: z.enum(['immediate', 'gradual', 'manual']).optional(),
        autoTransition: z.boolean().optional(),
        notificationEnabled: z.boolean().optional(),
      }),
    }))
    .mutation(async ({input}) => {
      try {
        const budget = await budgetService.getById(input.budgetId);
        if (!budget) {
          throw new NotFoundError("Budget", input.budgetId);
        }

        const updatedMetadata = {
          ...budget.metadata,
          rolloverSettings: {
            ...(budget.metadata?.rolloverSettings ?? {}),
            ...input.settings,
          },
        };

        return await budgetService.update(input.budgetId, {
          metadata: updatedMetadata,
        });
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Get applicable budgets for a transaction based on account and category
  getApplicableBudgets: publicProcedure
    .input(z.object({
      accountId: z.number().int().positive().optional(),
      categoryId: z.number().int().positive().optional(),
    }))
    .query(async ({input}) => {
      try {
        return await budgetService.getApplicableBudgets(input.accountId, input.categoryId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Validate transaction against strict budget enforcement
  validateTransactionStrict: publicProcedure
    .input(z.object({
      amount: z.number(),
      accountId: z.number().int().positive().optional(),
      categoryId: z.number().int().positive().optional(),
      transactionId: z.number().int().positive().optional(),
    }))
    .query(async ({input}) => {
      try {
        return await budgetService.validateTransactionAgainstStrictBudgets(
          input.amount,
          input.accountId,
          input.categoryId,
          input.transactionId
        );
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Budget group operations
  createGroup: publicProcedure.input(createBudgetGroupSchema).mutation(async ({input}) => {
    try {
      return await budgetService.createBudgetGroup(input);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  getGroup: publicProcedure.input(budgetGroupIdSchema).query(async ({input}) => {
    try {
      return await budgetService.getBudgetGroup(input.id);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  listGroups: publicProcedure.input(listBudgetGroupsSchema).query(async ({input}) => {
    try {
      const parentId = input?.parentId;
      return await budgetService.listBudgetGroups(parentId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  getRootGroups: publicProcedure.query(async () => {
    try {
      return await budgetService.getRootBudgetGroups();
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  updateGroup: publicProcedure.input(updateBudgetGroupSchema).mutation(async ({input}) => {
    try {
      const {id, ...updates} = input;
      return await budgetService.updateBudgetGroup(id, updates);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  deleteGroup: publicProcedure.input(budgetGroupIdSchema).mutation(async ({input}) => {
    try {
      await budgetService.deleteBudgetGroup(input.id);
      return {success: true};
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Analytics Endpoints

  getSpendingTrends: publicProcedure
    .input(z.object({budgetId: z.number().positive(), limit: z.number().positive().optional()}))
    .query(async ({input}) => {
      try {
        return await budgetService.getSpendingTrends(input.budgetId, input.limit);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getCategoryBreakdown: publicProcedure
    .input(z.object({budgetId: z.number().positive()}))
    .query(async ({input}) => {
      try {
        return await budgetService.getCategoryBreakdown(input.budgetId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getDailySpending: publicProcedure
    .input(
      z.object({
        budgetId: z.number().positive(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({input}) => {
      try {
        return await budgetService.getDailySpending(input.budgetId, input.startDate, input.endDate);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getSummaryStats: publicProcedure
    .input(z.object({budgetId: z.number().positive()}))
    .query(async ({input}) => {
      try {
        return await budgetService.getBudgetSummaryStats(input.budgetId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Forecast & Schedule Integration Endpoints

  getBudgetForecast: publicProcedure
    .input(
      z.object({
        budgetId: z.number().positive(),
        daysAhead: z.number().positive().optional().default(30),
      })
    )
    .query(async ({input}) => {
      try {
        const forecastService = new BudgetForecastService();
        return await forecastService.forecastBudgetImpact(input.budgetId, input.daysAhead);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  autoAllocateBudget: publicProcedure
    .input(z.object({budgetId: z.number().positive()}))
    .mutation(async ({input}) => {
      try {
        const forecastService = new BudgetForecastService();
        return await forecastService.autoAllocateScheduledExpenses(input.budgetId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Period Template Endpoints

  createPeriodTemplate: publicProcedure
    .input(createPeriodTemplateSchema)
    .mutation(async ({input}) => {
      try {
        return await budgetService.createPeriodTemplate(input);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  updatePeriodTemplate: publicProcedure
    .input(updatePeriodTemplateSchema)
    .mutation(async ({input}) => {
      try {
        const {id, ...updates} = input;
        return await budgetService.updatePeriodTemplate(id, updates);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getPeriodTemplate: publicProcedure
    .input(periodTemplateIdSchema)
    .query(async ({input}) => {
      try {
        return await budgetService.getPeriodTemplate(input.id);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  listPeriodTemplates: publicProcedure
    .input(listPeriodTemplatesSchema)
    .query(async ({input}) => {
      try {
        return await budgetService.listPeriodTemplates(input.budgetId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  deletePeriodTemplate: publicProcedure
    .input(periodTemplateIdSchema)
    .mutation(async ({input}) => {
      try {
        await budgetService.deletePeriodTemplate(input.id);
        return {success: true};
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Period Maintenance Endpoint
  schedulePeriodMaintenance: publicProcedure
    .input(z.object({budgetId: z.number().int().positive()}))
    .mutation(async ({input}) => {
      try {
        return await periodManager.schedulePeriodMaintenance(input.budgetId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Goal Tracking Endpoints
  getGoalProgress: publicProcedure
    .input(z.object({budgetId: z.number().int().positive()}))
    .query(async ({input}) => {
      try {
        return await budgetService.getGoalProgress(input.budgetId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  createGoalContributionPlan: publicProcedure
    .input(z.object({
      budgetId: z.number().int().positive(),
      frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
      customAmount: z.number().optional(),
    }))
    .query(async ({input}) => {
      try {
        return await budgetService.createGoalContributionPlan(
          input.budgetId,
          input.frequency,
          input.customAmount
        );
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  linkScheduleToGoal: publicProcedure
    .input(z.object({
      budgetId: z.number().int().positive(),
      scheduleId: z.number().int().positive(),
    }))
    .mutation(async ({input}) => {
      try {
        return await budgetService.linkScheduleToGoal(input.budgetId, input.scheduleId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Budget Template Endpoints
  listBudgetTemplates: publicProcedure
    .input(z.object({includeSystem: z.boolean().optional()}).optional())
    .query(async ({input}) => {
      try {
        return await templateService.listTemplates(input?.includeSystem);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getBudgetTemplate: publicProcedure
    .input(z.object({id: z.number().int().positive()}))
    .query(async ({input}) => {
      try {
        return await templateService.getTemplate(input.id);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  createBudgetTemplate: publicProcedure
    .input(z.object({
      name: z.string().min(2).max(80),
      description: z.string().max(500).nullable().optional(),
      type: z.enum(budgetTypes),
      scope: z.enum(budgetScopes),
      icon: z.string().optional(),
      suggestedAmount: z.number().optional(),
      enforcementLevel: z.enum(budgetEnforcementLevels).optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({input}) => {
      try {
        return await templateService.createTemplate({
          ...input,
          description: input.description ?? undefined,
        });
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  updateBudgetTemplate: publicProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().min(2).max(80).optional(),
      description: z.string().max(500).nullable().optional(),
      icon: z.string().optional(),
      suggestedAmount: z.number().optional(),
      enforcementLevel: z.enum(budgetEnforcementLevels).optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({input}) => {
      try {
        const {id, name, description, icon, suggestedAmount, enforcementLevel, metadata} = input;
        const updates: Record<string, unknown> = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description ?? undefined;
        if (icon !== undefined) updates.icon = icon;
        if (suggestedAmount !== undefined) updates.suggestedAmount = suggestedAmount;
        if (enforcementLevel !== undefined) updates.enforcementLevel = enforcementLevel;
        if (metadata !== undefined) updates.metadata = metadata;
        return await templateService.updateTemplate(id, updates as any);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  deleteBudgetTemplate: publicProcedure
    .input(z.object({id: z.number().int().positive()}))
    .mutation(async ({input}) => {
      try {
        await templateService.deleteTemplate(input.id);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  duplicateBudgetTemplate: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        newName: z.string().min(2).max(80).optional(),
      })
    )
    .mutation(async ({input}) => {
      try {
        return await templateService.duplicateTemplate(input.id, input.newName);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  seedSystemBudgetTemplates: publicProcedure.mutation(async () => {
    try {
      await templateService.seedSystemTemplates();
      return {success: true, message: "System budget templates seeded successfully"};
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Period Analytics Routes
  getPeriodAnalytics: publicProcedure
    .input(z.object({periodId: z.number().int().positive()}))
    .query(async ({input}) => {
      try {
        const periodManager = new PeriodManager();
        return await periodManager.getPeriodAnalytics(input.periodId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  comparePeriods: publicProcedure
    .input(
      z.object({
        currentPeriodId: z.number().int().positive(),
        previousPeriodId: z.number().int().positive(),
      })
    )
    .query(async ({input}) => {
      try {
        const periodManager = new PeriodManager();
        return await periodManager.comparePeriods(input.currentPeriodId, input.previousPeriodId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getPeriodHistory: publicProcedure
    .input(
      z.object({
        budgetId: z.number().int().positive(),
        limit: z.number().int().positive().max(50).optional().default(10),
      })
    )
    .query(async ({input}) => {
      try {
        const periodManager = new PeriodManager();
        return await periodManager.getPeriodHistory(input.budgetId, input.limit);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  generateNextPeriod: publicProcedure
    .input(z.object({templateId: z.number().int().positive()}))
    .mutation(async ({input}) => {
      try {
        const periodManager = new PeriodManager();
        const periods = await periodManager.createPeriodsAutomatically(input.templateId, {
          lookAheadMonths: 1,
          autoCreateEnvelopes: true,
        });
        return periods[0] || null;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  updatePeriodInstance: publicProcedure
    .input(
      z.object({
        instanceId: z.number().int().positive(),
        allocatedAmount: z.number().nonnegative(),
      })
    )
    .mutation(async ({input}) => {
      try {
        const updated = await db
          .update(budgetPeriodInstances)
          .set({
            allocatedAmount: input.allocatedAmount,
          })
          .where(eq(budgetPeriodInstances.id, input.instanceId))
          .returning();

        if (!updated || updated.length === 0) {
          throw new NotFoundError('Period instance not found');
        }

        return updated[0];
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});
