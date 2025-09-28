import {formInsertPayeeSchema, removePayeeSchema, removePayeesSchema, recordCorrectionSchema, analyzeCorrectionsSchema, learningMetricsSchema} from "$lib/schema";
import {z} from "zod";
import {publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t} from "$lib/trpc";
import {TRPCError} from "@trpc/server";
import {
  PayeeService,
  payeeIdSchema,
  searchPayeesSchema,
  advancedSearchPayeesSchema,
  getPayeesByTypeSchema,
  mergePayeesSchema,
  applyIntelligentDefaultsSchema,
  updateCalculatedFieldsSchema,
  createPayeeSchema,
  updatePayeeSchema,
} from "$lib/server/domains/payees";
import {ValidationError, NotFoundError, ConflictError} from "$lib/server/shared/types/errors";

const payeeService = new PayeeService();

export const payeeRoutes = t.router({
  all: publicProcedure.query(async () => {
    try {
      return await payeeService.getAllPayees();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch payees",
      });
    }
  }),

  load: publicProcedure.input(payeeIdSchema).query(async ({input}) => {
    try {
      return await payeeService.getPayeeById(input.id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error.message,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to load payee",
      });
    }
  }),

  search: publicProcedure.input(searchPayeesSchema).query(async ({input}) => {
    try {
      return await payeeService.searchPayees(input.query);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to search payees",
      });
    }
  }),

  remove: rateLimitedProcedure.input(removePayeeSchema).mutation(async ({input}) => {
    try {
      return await payeeService.deletePayee(input.id, {force: false});
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error.message,
        });
      }
      if (error instanceof ConflictError) {
        throw new TRPCError({
          code: "CONFLICT",
          message: error.message,
        });
      }
      if (error instanceof ValidationError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to delete payee",
      });
    }
  }),

  delete: bulkOperationProcedure
    .input(removePayeesSchema)
    .mutation(async ({input: {entities}}) => {
      try {
        const result = await payeeService.bulkDeletePayees(entities, {force: false});
        return {
          deletedCount: result.deletedCount,
          errors: result.errors,
        };
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to bulk delete payees",
        });
      }
    }),

  create: rateLimitedProcedure
    .input(createPayeeSchema)
    .mutation(async ({input}) => {
      try {
        return await payeeService.createPayee(input);
      } catch (error) {
        if (error instanceof ConflictError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create payee",
        });
      }
    }),

  update: rateLimitedProcedure
    .input(updatePayeeSchema.extend({id: z.number().int().positive()}))
    .mutation(async ({input}) => {
      try {
        const {id, ...updateData} = input;
        return await payeeService.updatePayee(id, updateData);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        if (error instanceof ConflictError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update payee",
        });
      }
    }),

  save: rateLimitedProcedure
    .input(formInsertPayeeSchema)
    .mutation(async ({input}) => {
      try {
        const {id, name, notes} = input;
        if (id) {
          // Update existing payee
          return await payeeService.updatePayee(id, {name: name!, notes});
        } else {
          // Create new payee
          return await payeeService.createPayee({name: name!, notes});
        }
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        if (error instanceof ConflictError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to save payee",
        });
      }
    }),

  // Enhanced search and filtering endpoints
  searchAdvanced: publicProcedure
    .input(advancedSearchPayeesSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.searchPayeesAdvanced(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to search payees",
        });
      }
    }),

  byType: publicProcedure
    .input(getPayeesByTypeSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.getPayeesByType(input.payeeType);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payees by type",
        });
      }
    }),

  withRelations: publicProcedure
    .query(async () => {
      try {
        return await payeeService.getPayeesWithRelations();
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payees with relations",
        });
      }
    }),

  needingAttention: publicProcedure
    .query(async () => {
      try {
        return await payeeService.getPayeesNeedingAttention();
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payees needing attention",
        });
      }
    }),

  // Intelligence and analytics endpoints
  stats: publicProcedure
    .input(payeeIdSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.getPayeeStats(input.id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payee stats",
        });
      }
    }),

  suggestions: publicProcedure
    .input(payeeIdSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.generatePayeeSuggestions(input.id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate payee suggestions",
        });
      }
    }),

  intelligence: publicProcedure
    .input(payeeIdSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.getPayeeIntelligence(input.id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payee intelligence",
        });
      }
    }),

  analytics: publicProcedure
    .query(async () => {
      try {
        return await payeeService.getPayeeAnalytics();
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payee analytics",
        });
      }
    }),

  // Management and automation endpoints
  merge: rateLimitedProcedure
    .input(mergePayeesSchema)
    .mutation(async ({input}) => {
      try {
        await payeeService.mergePayees(input.sourceId, input.targetId);
        return {success: true};
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to merge payees",
        });
      }
    }),

  applyIntelligentDefaults: rateLimitedProcedure
    .input(applyIntelligentDefaultsSchema)
    .mutation(async ({input}) => {
      try {
        return await payeeService.applyIntelligentDefaults(
          input.id,
          input.applyCategory ?? true,
          input.applyBudget ?? true
        );
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to apply intelligent defaults",
        });
      }
    }),

  updateCalculatedFields: rateLimitedProcedure
    .input(updateCalculatedFieldsSchema)
    .mutation(async ({input}) => {
      try {
        return await payeeService.updateCalculatedFields(input.payeeId);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update calculated fields",
        });
      }
    }),

  // =====================================
  // Category Learning Routes
  // =====================================

  recordCategoryCorrection: rateLimitedProcedure
    .input(recordCorrectionSchema)
    .mutation(async ({input}) => {
      try {
        return await payeeService.recordCategoryCorrection({
          payeeId: input.payeeId,
          transactionId: input.transactionId,
          fromCategoryId: input.fromCategoryId,
          toCategoryId: input.toCategoryId,
          correctionTrigger: input.correctionTrigger,
          correctionContext: input.correctionContext,
          transactionAmount: input.transactionAmount,
          transactionDate: input.transactionDate,
          userConfidence: input.userConfidence,
          notes: input.notes,
          isOverride: input.isOverride,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to record category correction",
        });
      }
    }),

  getCategoryRecommendation: publicProcedure
    .input(z.object({
      payeeId: z.number().positive(),
      transactionAmount: z.number().optional(),
      transactionDate: z.string().optional(),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getCategoryRecommendation(input.payeeId, {
          transactionAmount: input.transactionAmount,
          transactionDate: input.transactionDate,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get category recommendation",
        });
      }
    }),

  getEnhancedCategoryRecommendation: publicProcedure
    .input(z.object({
      payeeId: z.number().positive(),
      transactionAmount: z.number().optional(),
      transactionDate: z.string().optional(),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getEnhancedCategoryRecommendation(input.payeeId, {
          transactionAmount: input.transactionAmount,
          transactionDate: input.transactionDate,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get enhanced category recommendation",
        });
      }
    }),

  calculateCategoryConfidence: publicProcedure
    .input(z.object({
      payeeId: z.number().positive(),
      categoryId: z.number().positive(),
      transactionAmount: z.number().optional(),
      transactionDate: z.string().optional(),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.calculateCategoryConfidence(
          input.payeeId,
          input.categoryId,
          {
            transactionAmount: input.transactionAmount,
            transactionDate: input.transactionDate,
          }
        );
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to calculate category confidence",
        });
      }
    }),

  analyzeCorrectionPatterns: publicProcedure
    .input(analyzeCorrectionsSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.analyzeCorrectionPatterns(input.payeeId, {
          timeframeMonths: input.timeframeMonths,
          minConfidence: input.minConfidence,
          includeProcessed: input.includeProcessed,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to analyze correction patterns",
        });
      }
    }),

  detectCategoryDrift: publicProcedure
    .input(payeeIdSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.detectCategoryDrift(input.id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to detect category drift",
        });
      }
    }),

  getDefaultCategoryUpdateSuggestions: publicProcedure
    .query(async () => {
      try {
        return await payeeService.getDefaultCategoryUpdateSuggestions();
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get default category update suggestions",
        });
      }
    }),

  getLearningMetrics: publicProcedure
    .input(learningMetricsSchema.optional())
    .query(async ({input}) => {
      try {
        return await payeeService.getLearningMetrics(input?.timeframeMonths);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get learning metrics",
        });
      }
    }),

  applyLearningBasedUpdates: rateLimitedProcedure
    .input(z.object({
      minConfidence: z.number().min(0).max(1).default(0.7),
      minCorrectionCount: z.number().positive().default(5),
      dryRun: z.boolean().default(false),
    }))
    .mutation(async ({input}) => {
      try {
        return await payeeService.applyLearningBasedUpdates({
          minConfidence: input.minConfidence,
          minCorrectionCount: input.minCorrectionCount,
          dryRun: input.dryRun,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to apply learning-based updates",
        });
      }
    }),

  // =====================================
  // Budget Allocation Intelligence Routes
  // =====================================

  budgetOptimizationAnalysis: publicProcedure
    .input(payeeIdSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.getBudgetOptimizationAnalysis(input.id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get budget optimization analysis",
        });
      }
    }),

  budgetAllocationSuggestions: publicProcedure
    .input(z.object({
      accountId: z.number().positive().optional(),
      strategy: z.enum(['conservative', 'aggressive', 'balanced']).default('balanced'),
      riskTolerance: z.number().min(0).max(1).default(0.5),
      timeHorizon: z.number().positive().default(12),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getBudgetAllocationSuggestions(
          input.accountId,
          {
            strategy: input.strategy,
            riskTolerance: input.riskTolerance,
            timeHorizon: input.timeHorizon,
          }
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get budget allocation suggestions",
        });
      }
    }),

  budgetForecast: publicProcedure
    .input(z.object({
      payeeId: z.number().positive(),
      forecastPeriod: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
      periodsAhead: z.number().positive().default(12),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getBudgetForecast(
          input.payeeId,
          input.forecastPeriod,
          input.periodsAhead
        );
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get budget forecast",
        });
      }
    }),

  budgetHealthMetrics: publicProcedure
    .input(payeeIdSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.getBudgetHealthMetrics(input.id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get budget health metrics",
        });
      }
    }),

  budgetRebalancingPlan: publicProcedure
    .input(z.object({
      accountId: z.number().positive().optional(),
      strategy: z.enum(['conservative', 'aggressive', 'balanced']).default('balanced'),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getBudgetRebalancingPlan(
          input.accountId,
          input.strategy
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get budget rebalancing plan",
        });
      }
    }),

  budgetEfficiencyAnalysis: publicProcedure
    .input(z.object({
      payeeId: z.number().positive(),
      currentBudget: z.number().positive().optional(),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getBudgetEfficiencyAnalysis(
          input.payeeId,
          input.currentBudget
        );
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get budget efficiency analysis",
        });
      }
    }),

  multiPayeeBudgetOptimization: publicProcedure
    .input(z.object({
      payeeIds: z.array(z.number().positive()),
      totalBudgetConstraint: z.number().positive().optional(),
      objectives: z.object({
        minimizeRisk: z.boolean().default(true),
        maximizeUtilization: z.boolean().default(true),
        balanceAllocations: z.boolean().default(false),
      }).default({}),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getMultiPayeeBudgetOptimization(
          input.payeeIds,
          input.totalBudgetConstraint,
          input.objectives
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get multi-payee budget optimization",
        });
      }
    }),

  budgetScenarioAnalysis: publicProcedure
    .input(z.object({
      payeeIds: z.array(z.number().positive()),
      scenarios: z.array(z.object({
        name: z.string(),
        description: z.string(),
        type: z.enum(['conservative', 'optimistic', 'realistic', 'stress_test']),
        assumptions: z.record(z.any()),
      })),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getBudgetScenarioAnalysis(
          input.payeeIds,
          input.scenarios
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get budget scenario analysis",
        });
      }
    }),

  bulkBudgetOptimization: publicProcedure
    .input(z.object({
      accountId: z.number().positive().optional(),
      filters: z.object({
        minTransactionCount: z.number().positive().default(5),
        minSpendingAmount: z.number().positive().default(100),
        includeInactive: z.boolean().default(false),
      }).default({}),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getBulkBudgetOptimization(
          input.accountId,
          input.filters
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get bulk budget optimization",
        });
      }
    }),

  // =====================================
  // ML Coordinator Routes (Phase 2.4)
  // =====================================

  unifiedMLRecommendations: publicProcedure
    .input(z.object({
      payeeId: z.number().positive(),
      context: z.object({
        transactionAmount: z.number().optional(),
        transactionDate: z.string().optional(),
        userPreferences: z.record(z.any()).optional(),
        riskTolerance: z.number().min(0).max(1).optional(),
      }).optional(),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getUnifiedMLRecommendations(input.payeeId, input.context);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get unified ML recommendations",
        });
      }
    }),

  crossSystemLearning: publicProcedure
    .input(payeeIdSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.getCrossSystemLearning(input.id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get cross-system learning analysis",
        });
      }
    }),

  executeAdaptiveOptimization: rateLimitedProcedure
    .input(z.object({
      payeeId: z.number().positive(),
      options: z.object({
        applyCategorizationUpdates: z.boolean().default(true),
        applyBudgetUpdates: z.boolean().default(true),
        applyAutomationRules: z.boolean().default(false),
        confidenceThreshold: z.number().min(0).max(1).default(0.8),
        dryRun: z.boolean().default(false),
      }).default({}),
    }))
    .mutation(async ({input}) => {
      try {
        return await payeeService.executeAdaptiveOptimization(input.payeeId, input.options);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to execute adaptive optimization",
        });
      }
    }),

  systemConfidence: publicProcedure
    .input(payeeIdSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.getSystemConfidence(input.id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to assess system confidence",
        });
      }
    }),

  detectBehaviorChanges: publicProcedure
    .input(z.object({
      payeeId: z.number().positive(),
      lookbackMonths: z.number().positive().default(6),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.detectBehaviorChanges(input.payeeId, input.lookbackMonths);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to detect behavior changes",
        });
      }
    }),

  actionableInsights: publicProcedure
    .input(z.object({
      payeeId: z.number().positive(),
      insightTypes: z.array(z.enum(['optimization', 'correction', 'prediction', 'automation', 'alert'])).optional(),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getActionableInsights(input.payeeId, input.insightTypes);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get actionable insights",
        });
      }
    }),

  bulkUnifiedRecommendations: publicProcedure
    .input(z.object({
      payeeIds: z.array(z.number().positive()),
      options: z.object({
        priorityFilter: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        confidenceThreshold: z.number().min(0).max(1).default(0.5),
        maxResults: z.number().positive().default(50),
      }).default({}),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getBulkUnifiedRecommendations(input.payeeIds, input.options);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get bulk unified recommendations",
        });
      }
    }),

  mlPerformanceMetrics: publicProcedure
    .input(z.object({
      payeeId: z.number().positive().optional(),
      period: z.object({
        startDate: z.string(),
        endDate: z.string(),
        periodType: z.enum(['daily', 'weekly', 'monthly']),
      }).optional(),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getMLPerformanceMetrics(input.payeeId, input.period);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get ML performance metrics",
        });
      }
    }),

  applyBulkMLAutomation: rateLimitedProcedure
    .input(z.object({
      payeeIds: z.array(z.number().positive()),
      options: z.object({
        confidenceThreshold: z.number().min(0).max(1).default(0.8),
        maxAutomations: z.number().positive().default(20),
        dryRun: z.boolean().default(false),
        automationTypes: z.array(z.enum(['category', 'budget', 'rules'])).default(['category', 'budget']),
      }).default({}),
    }))
    .mutation(async ({input}) => {
      try {
        return await payeeService.applyBulkMLAutomation(input.payeeIds, input.options);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to apply bulk ML automation",
        });
      }
    }),

  mlInsightsDashboard: publicProcedure
    .input(z.object({
      filters: z.object({
        payeeIds: z.array(z.number().positive()).optional(),
        insightTypes: z.array(z.enum(['optimization', 'correction', 'prediction', 'automation', 'alert'])).optional(),
        priorityFilter: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        timeRange: z.object({
          startDate: z.string(),
          endDate: z.string(),
        }).optional(),
      }).default({}),
    }))
    .query(async ({input}) => {
      try {
        return await payeeService.getMLInsightsDashboard(input.filters);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get ML insights dashboard",
        });
      }
    }),
});
