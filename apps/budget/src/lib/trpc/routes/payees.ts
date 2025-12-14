import {
  analyzeCorrectionsSchema,
  learningMetricsSchema,
  recordCorrectionSchema,
  removePayeeSchema,
  removePayeesSchema,
} from "$lib/schema";
import { superformInsertPayeeSchema } from "$lib/schema/superforms";
import {
  advancedSearchPayeesSchema,
  applyIntelligentDefaultsSchema,
  createPayeeSchema,
  getPayeesByTypeSchema,
  mergePayeesSchema,
  payeeIdSchema,
  searchPayeesSchema,
  updateCalculatedFieldsSchema,
  updatePayeeSchema
} from "$lib/server/domains/payees";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { bulkOperationProcedure, publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { withErrorHandler } from "$lib/trpc/shared/errors";
import { z } from "zod";

const payeeService = serviceFactory.getPayeeService();

export const payeeRoutes = t.router({
  all: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => payeeService.getAllPayees(ctx.workspaceId))
  ),

  allWithStats: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => payeeService.getAllPayeesWithStats(ctx.workspaceId))
  ),

  load: publicProcedure
    .input(payeeIdSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getPayeeById(input.id, ctx.workspaceId)
      )
    ),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getPayeeBySlug(input.slug, ctx.workspaceId)
      )
    ),

  search: publicProcedure
    .input(searchPayeesSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.searchPayees(input.query, ctx.workspaceId)
      )
    ),

  remove: rateLimitedProcedure
    .input(removePayeeSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.deletePayee(input.id, ctx.workspaceId, { force: false })
      )
    ),

  delete: bulkOperationProcedure.input(removePayeesSchema).mutation(
    withErrorHandler(async ({ input: { entities }, ctx }) => {
      const result = await payeeService.bulkDeletePayees(entities, ctx.workspaceId, {
        force: false,
      });
      return {
        deletedCount: result.deletedCount,
        errors: result.errors,
      };
    })
  ),

  create: rateLimitedProcedure
    .input(createPayeeSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) => payeeService.createPayee(input, ctx.workspaceId))
    ),

  update: rateLimitedProcedure
    .input(updatePayeeSchema.safeExtend({ id: z.number().int().positive() }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const { id, ...updateData } = input;
        return await payeeService.updatePayee(id, updateData, ctx.workspaceId);
      })
    ),

  save: rateLimitedProcedure.input(superformInsertPayeeSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      const { id, address, subscriptionInfo, tags, preferredPaymentMethods, ...payeeData } = input;

      // Ensure name is properly typed and required
      const name = payeeData.name || "";

      // Helper to parse JSON string fields
      const parseJson = <T>(value: unknown): T | null => {
        if (!value) return null;
        if (typeof value !== "string") return value as T;
        if (value.trim() === "") return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      };

      // Parse JSON fields
      const parsedAddress = parseJson<any>(address);
      const parsedSubscriptionInfo = parseJson<any>(subscriptionInfo);
      const parsedPaymentMethods = parseJson<number[]>(preferredPaymentMethods);

      // Transform tags from string to array if provided
      let parsedTags: string[] | null = null;
      if (tags) {
        if (Array.isArray(tags)) {
          parsedTags = tags;
        } else if (typeof tags === "string" && tags.trim() !== "") {
          try {
            parsedTags = JSON.parse(tags);
          } catch {
            parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
          }
        }
      }

      const data = {
        ...payeeData,
        name: name.trim(),
        address: parsedAddress,
        subscriptionInfo: parsedSubscriptionInfo,
        tags: parsedTags,
        preferredPaymentMethods: parsedPaymentMethods,
      };

      if (id) {
        return await payeeService.updatePayee(id, data, ctx.workspaceId);
      } else {
        return await payeeService.createPayee(data, ctx.workspaceId);
      }
    })
  ),

  // Enhanced search and filtering endpoints
  searchAdvanced: publicProcedure.input(advancedSearchPayeesSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      console.log("tRPC searchAdvanced called with input:", JSON.stringify(input, null, 2));
      const result = await payeeService.searchPayeesAdvanced(input, ctx.workspaceId);
      console.log("tRPC searchAdvanced result count:", result.length);
      return result;
    })
  ),

  byType: publicProcedure
    .input(getPayeesByTypeSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getPayeesByType(input.payeeType, ctx.workspaceId)
      )
    ),

  withRelations: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => payeeService.getPayeesWithRelations(ctx.workspaceId))
  ),

  needingAttention: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => payeeService.getPayeesNeedingAttention(ctx.workspaceId))
  ),

  // Intelligence and analytics endpoints
  stats: publicProcedure
    .input(payeeIdSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getPayeeStats(input.id, ctx.workspaceId)
      )
    ),

  suggestions: publicProcedure
    .input(payeeIdSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.generatePayeeSuggestions(input.id, ctx.workspaceId)
      )
    ),

  intelligence: publicProcedure
    .input(payeeIdSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getPayeeIntelligence(input.id, ctx.workspaceId)
      )
    ),

  analytics: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => payeeService.getPayeeAnalytics(ctx.workspaceId))
  ),

  // Management and automation endpoints
  merge: rateLimitedProcedure.input(mergePayeesSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      await payeeService.mergePayees(input.sourceId, input.targetId, ctx.workspaceId);
      return { success: true };
    })
  ),

  applyIntelligentDefaults: rateLimitedProcedure
    .input(applyIntelligentDefaultsSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.applyIntelligentDefaults(
          input.id,
          ctx.workspaceId,
          input.applyCategory ?? true,
          input.applyBudget ?? true
        )
      )
    ),

  updateCalculatedFields: rateLimitedProcedure
    .input(updateCalculatedFieldsSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.updateCalculatedFields(input.payeeId, ctx.workspaceId)
      )
    ),

  // =====================================
  // Category Learning Routes
  // =====================================

  recordCategoryCorrection: rateLimitedProcedure.input(recordCorrectionSchema).mutation(
    withErrorHandler(async ({ input, ctx }) =>
      payeeService.recordCategoryCorrection(
        {
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
        },
        ctx.workspaceId
      )
    )
  ),

  getCategoryRecommendation: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        transactionAmount: z.number().optional(),
        transactionDate: z.string().optional(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getCategoryRecommendation(input.payeeId, ctx.workspaceId, {
          transactionAmount: input.transactionAmount,
          transactionDate: input.transactionDate,
        })
      )
    ),

  getEnhancedCategoryRecommendation: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        transactionAmount: z.number().optional(),
        transactionDate: z.string().optional(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getEnhancedCategoryRecommendation(input.payeeId, ctx.workspaceId, {
          transactionAmount: input.transactionAmount,
          transactionDate: input.transactionDate,
        })
      )
    ),

  calculateCategoryConfidence: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        categoryId: z.number().positive(),
        transactionAmount: z.number().optional(),
        transactionDate: z.string().optional(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.calculateCategoryConfidence(input.payeeId, input.categoryId, ctx.workspaceId, {
          transactionAmount: input.transactionAmount,
          transactionDate: input.transactionDate,
        })
      )
    ),

  analyzeCorrectionPatterns: publicProcedure.input(analyzeCorrectionsSchema).query(
    withErrorHandler(async ({ input, ctx }) =>
      payeeService.analyzeCorrectionPatterns(input.payeeId, ctx.workspaceId, {
        timeframeMonths: input.timeframeMonths,
        minConfidence: input.minConfidence,
        includeProcessed: input.includeProcessed,
      })
    )
  ),

  detectCategoryDrift: publicProcedure
    .input(payeeIdSchema)
    .query(withErrorHandler(async ({ input, ctx }) => payeeService.detectCategoryDrift(input.id, ctx.workspaceId))),

  getDefaultCategoryUpdateSuggestions: publicProcedure.query(
    withErrorHandler(async () => payeeService.getDefaultCategoryUpdateSuggestions())
  ),

  getLearningMetrics: publicProcedure
    .input(learningMetricsSchema.optional())
    .query(
      withErrorHandler(async ({ input }) => payeeService.getLearningMetrics(input?.timeframeMonths))
    ),

  applyLearningBasedUpdates: rateLimitedProcedure
    .input(
      z.object({
        minConfidence: z.number().min(0).max(1).default(0.7),
        minCorrectionCount: z.number().positive().default(5),
        dryRun: z.boolean().default(false),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.applyLearningBasedUpdates(ctx.workspaceId, {
          minConfidence: input.minConfidence,
          minCorrectionCount: input.minCorrectionCount,
          dryRun: input.dryRun,
        })
      )
    ),

  // =====================================
  // Budget Allocation Intelligence Routes
  // =====================================

  budgetOptimizationAnalysis: publicProcedure
    .input(payeeIdSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) => payeeService.getBudgetOptimizationAnalysis(input.id, ctx.workspaceId))
    ),

  budgetAllocationSuggestions: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive().optional(),
        strategy: z.enum(["conservative", "aggressive", "balanced"]).default("balanced"),
        riskTolerance: z.number().min(0).max(1).default(0.5),
        timeHorizon: z.number().positive().default(12),
      })
    )
    .query(
      withErrorHandler(async ({ input }) =>
        payeeService.getBudgetAllocationSuggestions(input.accountId, {
          strategy: input.strategy,
          riskTolerance: input.riskTolerance,
          timeHorizon: input.timeHorizon,
        })
      )
    ),

  budgetForecast: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        forecastPeriod: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
        periodsAhead: z.number().positive().default(12),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getBudgetForecast(input.payeeId, ctx.workspaceId, input.forecastPeriod, input.periodsAhead)
      )
    ),

  budgetHealthMetrics: publicProcedure
    .input(payeeIdSchema)
    .query(withErrorHandler(async ({ input, ctx }) => payeeService.getBudgetHealthMetrics(input.id, ctx.workspaceId))),

  budgetRebalancingPlan: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive().optional(),
        strategy: z.enum(["conservative", "aggressive", "balanced"]).default("balanced"),
      })
    )
    .query(
      withErrorHandler(async ({ input }) =>
        payeeService.getBudgetRebalancingPlan(input.accountId, input.strategy)
      )
    ),

  budgetEfficiencyAnalysis: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        currentBudget: z.number().positive().optional(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getBudgetEfficiencyAnalysis(input.payeeId, ctx.workspaceId, input.currentBudget)
      )
    ),

  multiPayeeBudgetOptimization: publicProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        totalBudgetConstraint: z.number().positive().optional(),
        objectives: z
          .object({
            minimizeRisk: z.boolean().default(true),
            maximizeUtilization: z.boolean().default(true),
            balanceAllocations: z.boolean().default(false),
          })
          .default({
            minimizeRisk: true,
            maximizeUtilization: true,
            balanceAllocations: false,
          }),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getMultiPayeeBudgetOptimization(
          input.payeeIds,
          ctx.workspaceId,
          input.totalBudgetConstraint,
          input.objectives
        )
      )
    ),

  budgetScenarioAnalysis: publicProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        scenarios: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            type: z.enum(["conservative", "optimistic", "realistic", "stress_test"]),
            assumptions: z.record(z.string(), z.any()),
          })
        ),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getBudgetScenarioAnalysis(input.payeeIds, ctx.workspaceId, input.scenarios)
      )
    ),

  bulkBudgetOptimization: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive().optional(),
        filters: z
          .object({
            minTransactionCount: z.number().positive().default(5),
            minSpendingAmount: z.number().positive().default(100),
            includeInactive: z.boolean().default(false),
          })
          .default({
            minTransactionCount: 5,
            minSpendingAmount: 100,
            includeInactive: false,
          }),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getBulkBudgetOptimization(ctx.workspaceId, input.accountId, input.filters)
      )
    ),

  // =====================================
  // ML Coordinator Routes (Phase 2.4)
  // =====================================

  unifiedMLRecommendations: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        context: z
          .object({
            transactionAmount: z.number().optional(),
            transactionDate: z.string().optional(),
            userPreferences: z.record(z.string(), z.any()).optional(),
            riskTolerance: z.number().min(0).max(1).optional(),
          })
          .optional(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getUnifiedMLRecommendations(input.payeeId, ctx.workspaceId, input.context)
      )
    ),

  crossSystemLearning: publicProcedure
    .input(payeeIdSchema)
    .query(withErrorHandler(async ({ input, ctx }) => payeeService.getCrossSystemLearning(input.id, ctx.workspaceId))),

  executeAdaptiveOptimization: rateLimitedProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        options: z
          .object({
            applyCategorizationUpdates: z.boolean().default(true),
            applyBudgetUpdates: z.boolean().default(true),
            applyAutomationRules: z.boolean().default(false),
            confidenceThreshold: z.number().min(0).max(1).default(0.8),
            dryRun: z.boolean().default(false),
          })
          .default({
            applyCategorizationUpdates: true,
            applyBudgetUpdates: true,
            applyAutomationRules: false,
            confidenceThreshold: 0.8,
            dryRun: false,
          }),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.executeAdaptiveOptimization(input.payeeId, ctx.workspaceId, input.options)
      )
    ),

  systemConfidence: publicProcedure
    .input(payeeIdSchema)
    .query(withErrorHandler(async ({ input, ctx }) => payeeService.getSystemConfidence(input.id, ctx.workspaceId))),

  detectBehaviorChanges: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        lookbackMonths: z.number().positive().default(6),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.detectBehaviorChanges(input.payeeId, ctx.workspaceId, input.lookbackMonths)
      )
    ),

  actionableInsights: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        insightTypes: z
          .array(z.enum(["optimization", "correction", "prediction", "automation", "alert"]))
          .optional(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getActionableInsights(input.payeeId, ctx.workspaceId, input.insightTypes)
      )
    ),

  bulkUnifiedRecommendations: publicProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        options: z
          .object({
            priorityFilter: z.enum(["critical", "high", "medium", "low"]).optional(),
            confidenceThreshold: z.number().min(0).max(1).default(0.5),
            maxResults: z.number().positive().default(50),
          })
          .default({
            confidenceThreshold: 0.5,
            maxResults: 50,
          }),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getBulkUnifiedRecommendations(input.payeeIds, ctx.workspaceId, input.options)
      )
    ),

  mlPerformanceMetrics: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive().optional(),
        period: z
          .object({
            startDate: z.string(),
            endDate: z.string(),
            periodType: z.enum(["daily", "weekly", "monthly"]),
          })
          .optional(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getMLPerformanceMetrics(ctx.workspaceId, input.payeeId, input.period)
      )
    ),

  applyBulkMLAutomation: rateLimitedProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        options: z
          .object({
            confidenceThreshold: z.number().min(0).max(1).default(0.8),
            maxAutomations: z.number().positive().default(20),
            dryRun: z.boolean().default(false),
            automationTypes: z
              .array(z.enum(["category", "budget", "rules"]))
              .default(["category", "budget"]),
          })
          .default({
            confidenceThreshold: 0.8,
            maxAutomations: 20,
            dryRun: false,
            automationTypes: ["category", "budget"],
          }),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.applyBulkMLAutomation(input.payeeIds, ctx.workspaceId, input.options)
      )
    ),

  mlInsightsDashboard: publicProcedure
    .input(
      z.object({
        filters: z
          .object({
            payeeIds: z.array(z.number().positive()).optional(),
            insightTypes: z
              .array(z.enum(["optimization", "correction", "prediction", "automation", "alert"]))
              .optional(),
            priorityFilter: z.enum(["critical", "high", "medium", "low"]).optional(),
            timeRange: z
              .object({
                startDate: z.string(),
                endDate: z.string(),
              })
              .optional(),
          })
          .default({}),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) => payeeService.getMLInsightsDashboard(ctx.workspaceId, input.filters))
    ),

  // =====================================
  // Contact Management Routes (Phase 3.1)
  // =====================================

  validateAndEnrichContact: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        contactOverrides: z
          .object({
            phone: z.string().optional(),
            email: z.string().optional(),
            website: z.string().optional(),
            address: z.any().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.validateAndEnrichPayeeContact(input.payeeId, ctx.workspaceId, input.contactOverrides)
      );
    }),

  standardizePhoneNumber: rateLimitedProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.standardizePayeePhoneNumber(input.payeeId, ctx.workspaceId, input.phone)
      );
    }),

  validateEmailDomain: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        email: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.validatePayeeEmailDomain(input.payeeId, ctx.workspaceId, input.email)
      );
    }),

  enrichAddressData: rateLimitedProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        address: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.enrichPayeeAddressData(input.payeeId, ctx.workspaceId, input.address)
      );
    }),

  detectContactDuplicates: publicProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(false),
        minimumSimilarity: z.number().min(0).max(1).default(0.7),
      })
    )
    .query(async ({ input }) => {
      return withErrorHandler(() =>
        payeeService.detectContactDuplicates(input.includeInactive, input.minimumSimilarity)
      );
    }),

  generateContactSuggestions: publicProcedure.input(payeeIdSchema).query(async ({ input, ctx }) => {
    return withErrorHandler(() => payeeService.generatePayeeContactSuggestions(input.id, ctx.workspaceId));
  }),

  validateWebsiteAccessibility: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        website: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.validatePayeeWebsiteAccessibility(input.payeeId, ctx.workspaceId, input.website)
      );
    }),

  extractContactFromTransactions: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        transactionLimit: z.number().positive().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.extractContactFromPayeeTransactions(input.payeeId, ctx.workspaceId, input.transactionLimit)
      );
    }),

  getContactAnalytics: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        contactOverrides: z
          .object({
            phone: z.string().optional(),
            email: z.string().optional(),
            website: z.string().optional(),
            address: z.any().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.getContactAnalytics(input.payeeId, ctx.workspaceId, input.contactOverrides)
      );
    }),

  bulkContactValidation: rateLimitedProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        options: z
          .object({
            autoFix: z.boolean().default(false),
            includeInactive: z.boolean().default(false),
            skipRecentlyValidated: z.boolean().default(false),
            minConfidence: z.number().min(0).max(1).default(0.8),
          })
          .default({
            autoFix: false,
            includeInactive: false,
            skipRecentlyValidated: false,
            minConfidence: 0.8,
          }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.bulkContactValidation(input.payeeIds, ctx.workspaceId, input.options)
      );
    }),

  smartMergeContactDuplicates: rateLimitedProcedure
    .input(
      z.object({
        primaryPayeeId: z.number().positive(),
        duplicatePayeeId: z.number().positive(),
        similarityScore: z.number().min(0).max(1),
        similarities: z.array(
          z.object({
            field: z.enum(["name", "phone", "email", "website", "address"]),
            primaryValue: z.string(),
            duplicateValue: z.string(),
            matchType: z.enum(["exact", "fuzzy", "normalized", "semantic"]),
            confidence: z.number().min(0).max(1),
          })
        ),
        recommendedAction: z.enum(["merge", "review", "ignore"]),
        riskLevel: z.enum(["low", "medium", "high"]),
        options: z
          .object({
            dryRun: z.boolean().default(false),
            preserveHistory: z.boolean().default(true),
            conflictResolution: z.enum(["primary", "duplicate", "best", "manual"]).default("best"),
          })
          .default({
            dryRun: false,
            preserveHistory: true,
            conflictResolution: "best",
          }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(async () => {
        const duplicateDetection = {
          primaryPayeeId: input.primaryPayeeId,
          duplicatePayeeId: input.duplicatePayeeId,
          similarityScore: input.similarityScore,
          similarities: input.similarities,
          recommendedAction: input.recommendedAction,
          riskLevel: input.riskLevel,
        };

        return await payeeService.smartMergeContactDuplicates(duplicateDetection, ctx.workspaceId, input.options);
      });
    }),

  // =====================================
  // Subscription Management Routes (Phase 3.2)
  // =====================================

  detectSubscriptions: publicProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()).optional(),
        includeInactive: z.boolean().default(false),
        minConfidence: z.number().min(0).max(1).default(0.3),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.detectSubscriptions(ctx.workspaceId, input.payeeIds, input.includeInactive, input.minConfidence)
      );
    }),

  classifySubscription: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        transactionData: z
          .array(
            z.object({
              amount: z.number(),
              date: z.string(),
              description: z.string(),
            })
          )
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.classifySubscription(input.payeeId, ctx.workspaceId, input.transactionData)
      );
    }),

  subscriptionLifecycleAnalysis: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() => payeeService.getSubscriptionLifecycleAnalysis(input.payeeId, ctx.workspaceId));
    }),

  subscriptionCostAnalysis: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        timeframeDays: z.number().positive().default(365),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.getSubscriptionCostAnalysis(input.payeeId, ctx.workspaceId, input.timeframeDays)
      );
    }),

  subscriptionRenewalPredictions: publicProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        forecastMonths: z.number().positive().default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.getSubscriptionRenewalPredictions(input.payeeIds, ctx.workspaceId, input.forecastMonths)
      );
    }),

  subscriptionUsageAnalysis: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() => payeeService.getSubscriptionUsageAnalysis(input.payeeId, ctx.workspaceId));
    }),

  subscriptionCancellationAssistance: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.getSubscriptionCancellationAssistance(input.payeeId, ctx.workspaceId)
      );
    }),

  subscriptionOptimizationRecommendations: publicProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        optimizationGoals: z
          .object({
            maximizeSavings: z.boolean().default(true),
            maintainValueThreshold: z.number().min(0).max(1).default(0.7),
            riskTolerance: z.enum(["low", "medium", "high"]).default("medium"),
          })
          .default({
            maximizeSavings: true,
            maintainValueThreshold: 0.7,
            riskTolerance: "medium",
          }),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.getSubscriptionOptimizationRecommendations(
          input.payeeIds,
          ctx.workspaceId,
          input.optimizationGoals
        )
      );
    }),

  bulkSubscriptionAnalysis: publicProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()).optional(),
        analysisOptions: z
          .object({
            includeCostBreakdown: z.boolean().default(true),
            includeUsageMetrics: z.boolean().default(true),
            includeOptimizationSuggestions: z.boolean().default(true),
            timeframeDays: z.number().positive().default(365),
          })
          .default({
            includeCostBreakdown: true,
            includeUsageMetrics: true,
            includeOptimizationSuggestions: true,
            timeframeDays: 365,
          }),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.getBulkSubscriptionAnalysis(ctx.workspaceId, input.payeeIds, input.analysisOptions)
      );
    }),

  updateSubscriptionMetadata: rateLimitedProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        subscriptionMetadata: z.object({
          isSubscription: z.boolean(),
          subscriptionType: z.enum([
            "entertainment",
            "utilities",
            "software",
            "membership",
            "communication",
            "finance",
            "shopping",
            "health",
            "education",
            "other",
          ]),
          billingCycle: z.enum([
            "daily",
            "weekly",
            "monthly",
            "quarterly",
            "semi_annual",
            "annual",
            "irregular",
          ]),
          baseCost: z.number().positive(),
          currency: z.string().default("USD"),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          trialPeriod: z
            .object({
              duration: z.number().positive(),
              unit: z.enum(["days", "weeks", "months"]),
              endDate: z.string(),
            })
            .optional(),
          renewalDate: z.string().optional(),
          autoRenewal: z.boolean(),
          cancellationPolicy: z
            .object({
              noticePeriod: z.number().positive(),
              unit: z.enum(["days", "weeks", "months"]),
              penalties: z.array(z.string()),
              refundPolicy: z.string(),
            })
            .optional(),
          usageMetrics: z
            .object({
              trackingEnabled: z.boolean(),
              lastUsed: z.string().optional(),
              usageFrequency: z.enum(["daily", "weekly", "monthly", "rarely", "never"]),
              valueScore: z.number().min(0).max(1),
            })
            .optional(),
          alerts: z
            .object({
              renewalReminder: z.boolean(),
              priceChangeAlert: z.boolean(),
              usageAlert: z.boolean(),
              unusedAlert: z.boolean(),
            })
            .optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.updateSubscriptionMetadata(input.payeeId, ctx.workspaceId, input.subscriptionMetadata)
      );
    }),

  markSubscriptionCancelled: rateLimitedProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        cancellationDate: z.string(),
        reason: z.string().optional(),
        refundAmount: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.markSubscriptionCancelled(input.payeeId, ctx.workspaceId, input.cancellationDate, {
          reason: input.reason,
          refundAmount: input.refundAmount,
          notes: input.notes,
        })
      );
    }),

  subscriptionValueOptimization: publicProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        optimizationStrategy: z
          .enum(["cost_reduction", "value_maximization", "usage_optimization", "risk_minimization"])
          .default("value_maximization"),
        constraints: z
          .object({
            maxCostIncrease: z.number().default(0),
            minValueScore: z.number().min(0).max(1).default(0.6),
            preserveEssentialServices: z.boolean().default(true),
          })
          .default({
            maxCostIncrease: 0,
            minValueScore: 0.6,
            preserveEssentialServices: true,
          }),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.getSubscriptionValueOptimization(input.payeeIds, ctx.workspaceId)
      );
    }),

  subscriptionCompetitorAnalysis: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        includeFeatureComparison: z.boolean().default(true),
        includePricingTiers: z.boolean().default(true),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.getSubscriptionCompetitorAnalysis(input.payeeId, ctx.workspaceId)
      );
    }),

  subscriptionAutomationRules: rateLimitedProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        rules: z.object({
          autoDetectPriceChanges: z.boolean().default(true),
          autoGenerateUsageReports: z.boolean().default(false),
          autoSuggestOptimizations: z.boolean().default(true),
          autoMarkUnused: z
            .object({
              enabled: z.boolean().default(false),
              thresholdDays: z.number().positive().default(60),
            })
            .default({
              enabled: false,
              thresholdDays: 60,
            }),
          autoRenewalReminders: z
            .object({
              enabled: z.boolean().default(true),
              daysBefore: z.number().positive().default(7),
            })
            .default({
              enabled: true,
              daysBefore: 7,
            }),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.setSubscriptionAutomationRules(input.payeeId, ctx.workspaceId, input.rules)
      );
    }),

  // =====================================
  // Bulk Operations Routes (Phase 4)
  // NOTE: These methods are not yet implemented in PayeeService
  // TODO: Implement these methods in PayeeService before uncommenting
  // =====================================

  // bulkStatusChange: rateLimitedProcedure
  //   .input(
  //     z.object({
  //       payeeIds: z.array(z.number().positive()),
  //       status: z.enum(["active", "inactive"]),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     return withErrorHandler(async () => {
  //       const isActivating = input.status === "active";
  //       return await payeeService.bulkUpdatePayeeStatus(input.payeeIds, isActivating);
  //     });
  //   }),

  // bulkCategoryAssignment: rateLimitedProcedure
  //   .input(
  //     z.object({
  //       payeeIds: z.array(z.number().positive()),
  //       categoryId: z.number().positive(),
  //       overwriteExisting: z.boolean().default(false),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     return withErrorHandler(() =>
  //       payeeService.bulkAssignCategory(input.payeeIds, input.categoryId, input.overwriteExisting)
  //     );
  //   }),

  // bulkTagManagement: rateLimitedProcedure
  //   .input(
  //     z.object({
  //       payeeIds: z.array(z.number().positive()),
  //       tags: z.array(z.string()),
  //       operation: z.enum(["add", "remove", "replace"]),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     return withErrorHandler(() =>
  //       payeeService.bulkManageTags(input.payeeIds, input.tags, input.operation)
  //     );
  //   }),

  // bulkIntelligenceApplication: rateLimitedProcedure
  //   .input(
  //     z.object({
  //       payeeIds: z.array(z.number().positive()),
  //       options: z.object({
  //         applyCategory: z.boolean().default(true),
  //         applyBudget: z.boolean().default(true),
  //         confidenceThreshold: z.number().min(0).max(1).default(0.7),
  //         overwriteExisting: z.boolean().default(false),
  //       }),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     return withErrorHandler(() =>
  //       payeeService.bulkApplyIntelligentDefaults(input.payeeIds, input.options)
  //     );
  //   }),

  // bulkExport: publicProcedure
  //   .input(
  //     z.object({
  //       payeeIds: z.array(z.number().positive()),
  //       format: z.enum(["csv", "json"]),
  //       includeTransactionStats: z.boolean().default(true),
  //       includeContactInfo: z.boolean().default(true),
  //       includeIntelligenceData: z.boolean().default(false),
  //     })
  //   )
  //   .query(async ({ input }) => {
  //     return withErrorHandler(() =>
  //       payeeService.exportPayees(input.payeeIds, input.format, {
  //         includeTransactionStats: input.includeTransactionStats,
  //         includeContactInfo: input.includeContactInfo,
  //         includeIntelligenceData: input.includeIntelligenceData,
  //       })
  //     );
  //   }),

  // bulkImport: rateLimitedProcedure
  //   .input(
  //     z.object({
  //       data: z.string(), // CSV or JSON string
  //       format: z.enum(["csv", "json"]),
  //       options: z
  //         .object({
  //           skipDuplicates: z.boolean().default(true),
  //           updateExisting: z.boolean().default(false),
  //           applyIntelligentDefaults: z.boolean().default(true),
  //           validateContactInfo: z.boolean().default(true),
  //         })
  //         .default({
  //           skipDuplicates: true,
  //           updateExisting: false,
  //           applyIntelligentDefaults: true,
  //           validateContactInfo: true,
  //         }),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     return withErrorHandler(() =>
  //       payeeService.importPayees(input.data, input.format, input.options)
  //     );
  //   }),

  // bulkCleanup: rateLimitedProcedure
  //   .input(
  //     z.object({
  //       operations: z.array(
  //         z.enum([
  //           "remove_inactive",
  //           "remove_empty_payees",
  //           "normalize_names",
  //           "standardize_contact_info",
  //           "merge_duplicates",
  //           "update_calculated_fields",
  //         ])
  //       ),
  //       dryRun: z.boolean().default(true),
  //       confirmDestructive: z.boolean().default(false),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     return withErrorHandler(() =>
  //       payeeService.bulkCleanupPayees(input.operations, input.dryRun, input.confirmDestructive)
  //     );
  //   }),

  // getDuplicates: publicProcedure
  //   .input(
  //     z.object({
  //       similarityThreshold: z.number().min(0).max(1).default(0.8),
  //       includeInactive: z.boolean().default(false),
  //       groupingStrategy: z
  //         .enum(["name", "contact", "transaction_pattern", "comprehensive"])
  //         .default("comprehensive"),
  //     })
  //   )
  //   .query(async ({ input }) => {
  //     return withErrorHandler(() =>
  //       payeeService.findDuplicatePayees(
  //         input.similarityThreshold,
  //         input.includeInactive,
  //         input.groupingStrategy
  //       )
  //     );
  //   }),

  // mergeDuplicates: rateLimitedProcedure
  //   .input(
  //     z.object({
  //       primaryPayeeId: z.number().positive(),
  //       duplicatePayeeIds: z.array(z.number().positive()),
  //       mergeStrategy: z
  //         .object({
  //           preserveTransactionHistory: z.boolean().default(true),
  //           conflictResolution: z
  //             .enum(["primary", "latest", "best_quality", "manual"])
  //             .default("best_quality"),
  //           mergeContactInfo: z.boolean().default(true),
  //           mergeIntelligenceData: z.boolean().default(true),
  //         })
  //         .default({}),
  //       confirmMerge: z.boolean().default(false),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     return withErrorHandler(() =>
  //       payeeService.mergeDuplicatePayees(
  //         input.primaryPayeeId,
  //         input.duplicatePayeeIds,
  //         input.mergeStrategy,
  //         input.confirmMerge
  //       )
  //     );
  //   }),

  // undoOperation: rateLimitedProcedure
  //   .input(
  //     z.object({
  //       operationId: z.string(),
  //       operationType: z.enum([
  //         "bulk_delete",
  //         "bulk_status_change",
  //         "bulk_category_assignment",
  //         "bulk_tag_management",
  //         "bulk_intelligence_application",
  //         "bulk_cleanup",
  //         "merge_duplicates",
  //       ]),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     return withErrorHandler(() =>
  //       payeeService.undoBulkOperation(input.operationId, input.operationType)
  //     );
  //   }),

  // getOperationHistory: publicProcedure
  //   .input(
  //     z.object({
  //       limit: z.number().positive().default(20),
  //       offset: z.number().min(0).default(0),
  //       operationType: z
  //         .enum([
  //           "bulk_delete",
  //           "bulk_status_change",
  //           "bulk_category_assignment",
  //           "bulk_tag_management",
  //           "bulk_intelligence_application",
  //           "bulk_cleanup",
  //           "merge_duplicates",
  //         ])
  //         .optional(),
  //       startDate: z.string().optional(),
  //       endDate: z.string().optional(),
  //     })
  //   )
  //   .query(async ({ input }) => {
  //     return withErrorHandler(() =>
  //       payeeService.getBulkOperationHistory(
  //         input.limit,
  //         input.offset,
  //         input.operationType,
  //         input.startDate,
  //         input.endDate
  //       )
  //     );
  //   }),
});
