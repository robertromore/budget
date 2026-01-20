import {
  analyzeCorrectionsSchema,
  getEnhancementStatsSchema,
  getPayeeEnhancementsSchema,
  learningMetricsSchema,
  recordCorrectionSchema,
  recordEnhancementSchema,
  removePayeeSchema,
  removePayeesSchema,
  updateEnhancementFeedbackSchema,
} from "$lib/schema";
import { superformInsertPayeeSchema } from "$lib/schema/superforms";
import { normalize } from "$lib/utils/string-utilities";
import {
  advancedSearchPayeesSchema,
  applyIntelligentDefaultsSchema,
  createEnhancementTrackingService,
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
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.detectSubscriptions(ctx.workspaceId, input.payeeIds, input.includeInactive, input.minConfidence)
      )
    ),

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
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.classifySubscription(input.payeeId, ctx.workspaceId, input.transactionData)
      )
    ),

  subscriptionLifecycleAnalysis: publicProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getSubscriptionLifecycleAnalysis(input.payeeId, ctx.workspaceId)
      )
    ),

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
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getBulkSubscriptionAnalysis(ctx.workspaceId, input.payeeIds, input.analysisOptions)
      )
    ),

  getSubscriptionsForAccount: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
        minConfidence: z.number().min(0).max(1).default(0.5),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.getSubscriptionsForAccount(input.accountId, ctx.workspaceId, input.minConfidence)
      )
    ),

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

  bulkStatusChange: rateLimitedProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        status: z.enum(["active", "inactive"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(async () => {
        const isActivating = input.status === "active";
        return await payeeService.bulkUpdatePayeeStatus(
          input.payeeIds,
          isActivating,
          ctx.workspaceId
        );
      });
    }),

  bulkCategoryAssignment: rateLimitedProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        categoryId: z.number().positive(),
        overwriteExisting: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.bulkAssignCategory(
          input.payeeIds,
          input.categoryId,
          input.overwriteExisting,
          ctx.workspaceId
        )
      );
    }),

  bulkTagManagement: rateLimitedProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        tags: z.array(z.string()),
        operation: z.enum(["add", "remove", "replace"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.bulkManageTags(
          input.payeeIds,
          input.tags,
          input.operation,
          ctx.workspaceId
        )
      );
    }),

  bulkIntelligenceApplication: rateLimitedProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        options: z
          .object({
            applyCategory: z.boolean().default(true),
            applyBudget: z.boolean().default(true),
            confidenceThreshold: z.number().min(0).max(1).default(0.7),
            overwriteExisting: z.boolean().default(false),
          })
          .default({
            applyCategory: true,
            applyBudget: true,
            confidenceThreshold: 0.7,
            overwriteExisting: false,
          }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.bulkApplyIntelligentDefaults(
          input.payeeIds,
          input.options,
          ctx.workspaceId
        )
      );
    }),

  bulkExport: publicProcedure
    .input(
      z.object({
        payeeIds: z.array(z.number().positive()),
        format: z.enum(["csv", "json"]),
        includeTransactionStats: z.boolean().default(true),
        includeContactInfo: z.boolean().default(true),
        includeIntelligenceData: z.boolean().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      return withErrorHandler(async () =>
        payeeService.exportPayees(input.payeeIds, input.format, {
          includeTransactionStats: input.includeTransactionStats,
          includeContactInfo: input.includeContactInfo,
          includeIntelligenceData: input.includeIntelligenceData,
        }, ctx.workspaceId)
      );
    }),

  bulkImport: publicProcedure
    .input(
      z.object({
        data: z.string(), // CSV or JSON string
        format: z.enum(["csv", "json"]),
        options: z
          .object({
            skipDuplicates: z.boolean().default(true),
            updateExisting: z.boolean().default(false),
            applyIntelligentDefaults: z.boolean().default(true),
            validateContactInfo: z.boolean().default(true),
          })
          .default({
            skipDuplicates: true,
            updateExisting: false,
            applyIntelligentDefaults: true,
            validateContactInfo: true,
          }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(async () =>
        payeeService.importPayees(input.data, input.format, input.options, ctx.workspaceId)
      );
    }),

  bulkCleanup: rateLimitedProcedure
    .input(
      z.object({
        operations: z.array(
          z.enum(["remove_inactive", "merge_duplicates", "fix_data", "archive_unused"])
        ),
        dryRun: z.boolean().default(true),
        confirmDestructive: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.bulkCleanupPayees(
          input.operations,
          input.dryRun,
          input.confirmDestructive,
          ctx.workspaceId
        )
      );
    }),

  getDuplicates: publicProcedure
    .input(
      z.object({
        similarityThreshold: z.number().min(0).max(1).default(0.8),
        includeInactive: z.boolean().default(false),
        groupingStrategy: z
          .enum(["name", "contact", "transaction_pattern", "comprehensive"])
          .default("comprehensive"),
        detectionMethod: z.enum(["simple", "ml", "llm", "llm_direct"]).default("ml"),
      })
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        payeeService.findDuplicatePayees(
          input.similarityThreshold,
          input.includeInactive,
          input.groupingStrategy,
          ctx.workspaceId,
          input.detectionMethod
        )
      )
    ),

  mergeDuplicates: publicProcedure
    .input(
      z.object({
        primaryPayeeId: z.number().positive(),
        duplicatePayeeIds: z.array(z.number().positive()),
        mergeStrategy: z
          .object({
            preserveTransactionHistory: z.boolean().default(true),
            conflictResolution: z
              .enum(["primary", "latest", "best_quality", "manual"])
              .default("best_quality"),
            mergeContactInfo: z.boolean().default(true),
            mergeIntelligenceData: z.boolean().default(true),
          })
          .default({
            preserveTransactionHistory: true,
            conflictResolution: "best_quality",
            mergeContactInfo: true,
            mergeIntelligenceData: true,
          }),
        confirmMerge: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(async () =>
        payeeService.mergeDuplicatePayees(
          input.primaryPayeeId,
          input.duplicatePayeeIds,
          input.mergeStrategy,
          input.confirmMerge,
          ctx.workspaceId
        )
      );
    }),

  undoOperation: rateLimitedProcedure
    .input(
      z.object({
        operationId: z.string(),
        operationType: z.enum([
          "bulk_delete",
          "bulk_status_change",
          "bulk_category_assignment",
          "bulk_tag_management",
          "bulk_intelligence_application",
          "bulk_cleanup",
          "merge_duplicates",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return withErrorHandler(() =>
        payeeService.undoBulkOperation(input.operationId, input.operationType, ctx.workspaceId)
      );
    }),

  // =====================================
  // LLM Enhancement Routes
  // =====================================

  /**
   * Enhance a payee name using LLM.
   * Takes raw/messy name and returns a clean, canonical version.
   */
  enhanceName: rateLimitedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        rawDescription: z.string().optional(), // Original transaction description if available
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const { createIntelligenceCoordinator } = await import("$lib/server/ai");
        const { workspaces } = await import("$lib/schema/workspaces");
        const { db } = await import("$lib/server/db");
        const { eq } = await import("drizzle-orm");
        const { generateText } = await import("ai");

        // Get workspace preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const prefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const coordinator = createIntelligenceCoordinator(prefs);
        const strategy = coordinator.getStrategy("payeeMatching");

        if (!strategy.useLLM || !strategy.llmProvider) {
          return {
            success: false,
            enhanced: null,
            original: input.name,
            message: `LLM is not enabled for payee matching. Debug: useLLM=${strategy.useLLM}, hasProvider=${!!strategy.llmProvider}, featureMode=${strategy.featureMode}, llmEnabled=${strategy.llmEnabled}`,
          };
        }

        // Build the prompt
        const prompt = `You are a financial data cleaner. Given a payee name from a bank transaction, return a clean, canonical version of the merchant/payee name.

Rules:
- Remove transaction codes, reference numbers, and location identifiers
- Remove prefixes like "SQ *", "TST*", "PAYPAL *", etc.
- Capitalize properly (Title Case for most names)
- Keep it concise but recognizable
- If it's a well-known brand, use their official name
- Return ONLY the cleaned name, nothing else

Examples:
"SQ *BLUE BOTTLE COFFEE" → "Blue Bottle Coffee"
"AMZN MKTP US*ABC123" → "Amazon"
"PAYPAL *SPOTIFY" → "Spotify"
"TST* SWEETGREEN #123" → "Sweetgreen"
"WHOLEFDS MKT 10234" → "Whole Foods Market"

Input: "${input.name}"${input.rawDescription ? `\nOriginal description: "${input.rawDescription}"` : ""}

Cleaned name:`;

        try {
          // All providers (including Ollama) use OpenAI-compatible API via generateText
          const result = await generateText({
            model: strategy.llmProvider.provider(strategy.llmProvider.model),
            prompt,
            maxOutputTokens: 50,
            temperature: 0.1,
          });
          const text = result.text;

          const enhanced = text.trim().replace(/^["']|["']$/g, ""); // Remove quotes if present

          return {
            success: true,
            enhanced,
            original: input.name,
            provider: strategy.llmProviderType,
          };
        } catch (error) {
          console.error("LLM enhancement failed:", error);
          return {
            success: false,
            enhanced: null,
            original: input.name,
            message: "Failed to enhance name. Please try again.",
          };
        }
      })
    ),

  /**
   * Infer all payee details using LLM.
   * Takes raw name and returns suggested values for all payee fields.
   */
  inferPayeeDetails: rateLimitedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        rawDescription: z.string().optional(),
        currentCategoryId: z.number().optional(), // For context
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const { createIntelligenceCoordinator } = await import("$lib/server/ai");
        const { workspaces } = await import("$lib/schema/workspaces");
        const { categories } = await import("$lib/schema/categories");
        const { db } = await import("$lib/server/db");
        const { eq } = await import("drizzle-orm");
        const { generateText } = await import("ai");

        // Get workspace preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const prefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const coordinator = createIntelligenceCoordinator(prefs);
        const strategy = coordinator.getStrategy("payeeMatching");

        if (!strategy.useLLM || !strategy.llmProvider) {
          return {
            success: false,
            original: input.name,
            message: "LLM is not enabled for payee matching",
          };
        }

        // Get available categories for context
        const availableCategories = await db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(eq(categories.workspaceId, ctx.workspaceId));

        const categoryList = availableCategories.map((c) => `${c.id}: ${c.name}`).join("\n");

        // Build the prompt for comprehensive payee analysis
        const prompt = `You are a financial data analyst. Given a payee name from a bank transaction, analyze it and return structured information about the payee.

Input payee name: "${input.name}"${input.rawDescription ? `\nOriginal transaction description: "${input.rawDescription}"` : ""}

Available budget categories:
${categoryList || "No categories available"}

Analyze this payee and return a JSON object with the following fields:

1. "enhancedName": A clean, canonical version of the merchant name (remove transaction codes, proper capitalization)
2. "payeeType": One of: "merchant", "utility", "employer", "financial_institution", "government", "individual", "other"
3. "paymentFrequency": One of: "one_time", "weekly", "bi_weekly", "monthly", "quarterly", "annual", "irregular"
4. "suggestedCategoryId": The ID number of the most appropriate category from the list above (or null if unsure)
5. "suggestedCategoryName": The name of the suggested category (for display)
6. "taxRelevant": true if this payee's expenses are likely tax-deductible or reportable (e.g., business expenses, medical, charitable donations)
7. "isSeasonal": true if payments typically only occur during certain times of year (e.g., landscaping, heating, holiday services)
8. "confidence": A number 0-1 indicating overall confidence in these suggestions
9. "suggestedMCC": 4-digit Merchant Category Code string (e.g., "5812" for restaurants, "5411" for groceries)
10. "suggestedTags": Array of relevant descriptive tags (e.g., ["subscription", "essential", "entertainment"])
11. "suggestedPaymentMethods": Array of typical payment methods for this payee (e.g., ["credit_card", "debit_card", "bank_transfer"])
12. "suggestedWebsite": The most likely official website URL for this business (e.g., "netflix.com", "starbucks.com"). Return null for individuals or if unsure.

Common MCC codes for reference:
- 5411: Grocery Stores, Supermarkets
- 5812: Eating Places, Restaurants
- 5814: Fast Food Restaurants
- 5541: Service Stations (Gas)
- 4900: Utilities (Electric, Gas, Water)
- 4814: Telecommunication Services
- 5311: Department Stores
- 5912: Drug Stores, Pharmacies
- 7299: Miscellaneous Recreation Services
- 8011: Doctors, Physicians
- 8062: Hospitals
- 5942: Book Stores
- 5732: Electronics Stores
- 7832: Motion Picture Theaters

Valid payment methods: "credit_card", "debit_card", "bank_transfer", "cash", "check", "paypal", "venmo", "apple_pay", "google_pay", "crypto", "other"

Guidelines:
- For enhancedName: Remove prefixes like "SQ *", "TST*", "PAYPAL *", location codes, and transaction references
- For payeeType: "utility" for power/water/gas/internet, "merchant" for stores/restaurants, "employer" for income sources
- For paymentFrequency: "monthly" for subscriptions/bills, "irregular" for stores, consider the typical payment pattern
- For suggestedCategoryId: Match to the most specific category, prefer null if unsure rather than guessing wrong
- For taxRelevant: Usually false unless clearly business, medical, or charitable
- For isSeasonal: Usually false unless clearly season-dependent

Return ONLY valid JSON, no explanation:`;

        try {
          // All providers (including Ollama) use OpenAI-compatible API via generateText
          const result = await generateText({
            model: strategy.llmProvider.provider(strategy.llmProvider.model),
            prompt,
            maxOutputTokens: 500,
            temperature: 0.1,
          });
          const text = result.text;

          // Parse the JSON response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error("No valid JSON in response");
          }

          const parsed = JSON.parse(jsonMatch[0]);

          // Validate and sanitize the response
          const validPayeeTypes = ["merchant", "utility", "employer", "financial_institution", "government", "individual", "other"];
          const validFrequencies = ["one_time", "weekly", "bi_weekly", "monthly", "quarterly", "annual", "irregular"];
          const validPaymentMethods = ["credit_card", "debit_card", "bank_transfer", "cash", "check", "paypal", "venmo", "apple_pay", "google_pay", "crypto", "other"];

          // Validate MCC (should be 4-digit string)
          const suggestedMCC = typeof parsed.suggestedMCC === "string" && /^\d{4}$/.test(parsed.suggestedMCC)
            ? parsed.suggestedMCC
            : null;

          // Validate tags (array of strings)
          const suggestedTags = Array.isArray(parsed.suggestedTags)
            ? parsed.suggestedTags.filter((t: unknown) => typeof t === "string" && t.trim().length > 0).map((t: string) => normalize(t))
            : null;

          // Validate payment methods (array of valid payment method strings)
          const suggestedPaymentMethods = Array.isArray(parsed.suggestedPaymentMethods)
            ? parsed.suggestedPaymentMethods.filter((m: unknown) => typeof m === "string" && validPaymentMethods.includes(m))
            : null;

          return {
            success: true,
            original: input.name,
            provider: strategy.llmProviderType,
            suggestions: {
              enhancedName: typeof parsed.enhancedName === "string" ? parsed.enhancedName.trim() : null,
              payeeType: validPayeeTypes.includes(parsed.payeeType) ? parsed.payeeType : null,
              paymentFrequency: validFrequencies.includes(parsed.paymentFrequency) ? parsed.paymentFrequency : null,
              suggestedCategoryId: typeof parsed.suggestedCategoryId === "number" ? parsed.suggestedCategoryId : null,
              suggestedCategoryName: typeof parsed.suggestedCategoryName === "string" ? parsed.suggestedCategoryName : null,
              taxRelevant: typeof parsed.taxRelevant === "boolean" ? parsed.taxRelevant : null,
              isSeasonal: typeof parsed.isSeasonal === "boolean" ? parsed.isSeasonal : null,
              confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null,
              suggestedMCC,
              suggestedTags: suggestedTags && suggestedTags.length > 0 ? suggestedTags : null,
              suggestedPaymentMethods: suggestedPaymentMethods && suggestedPaymentMethods.length > 0 ? suggestedPaymentMethods : null,
              suggestedWebsite: typeof parsed.suggestedWebsite === "string" && parsed.suggestedWebsite.trim().length > 0
                ? (parsed.suggestedWebsite.startsWith("http") ? parsed.suggestedWebsite : `https://${parsed.suggestedWebsite}`)
                : null,
            },
          };
        } catch (error) {
          console.error("LLM inference failed:", error);
          return {
            success: false,
            original: input.name,
            message: "Failed to infer payee details. Please try again.",
          };
        }
      })
    ),

  // Explain ML insights using LLM
  explainInsights: rateLimitedProcedure
    .input(payeeIdSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const { createIntelligenceCoordinator } = await import("$lib/server/ai");
        const { workspaces } = await import("$lib/schema/workspaces");
        const { db } = await import("$lib/server/db");
        const { eq } = await import("drizzle-orm");
        const { generateText } = await import("ai");

        // Get workspace preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const prefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const coordinator = createIntelligenceCoordinator(prefs);
        const strategy = coordinator.getStrategy("payeeMatching");

        if (!strategy.useLLM || !strategy.llmProvider) {
          return {
            success: false,
            message: "LLM features are not enabled. Please configure a provider in Settings > Intelligence > LLM.",
          };
        }

        // Fetch existing ML insights
        const intelligence = await payeeService.getPayeeIntelligence(input.id, ctx.workspaceId);

        // Build prompt with ML data
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const prompt = `You are a helpful financial advisor analyzing spending patterns. Given the following machine learning analysis for a payee, provide a brief, friendly explanation in plain language.

Payee: "${intelligence.payeeName}"

Transaction Statistics:
- Total transactions: ${intelligence.stats.transactionCount}
- Total spent: $${intelligence.stats.totalAmount.toFixed(2)}
- Average transaction: $${intelligence.stats.avgAmount.toFixed(2)}
- Range: $${intelligence.stats.minAmount.toFixed(2)} - $${intelligence.stats.maxAmount.toFixed(2)}
- Monthly average: $${intelligence.stats.monthlyAverage.toFixed(2)}
${intelligence.stats.firstTransactionDate ? `- First transaction: ${intelligence.stats.firstTransactionDate}` : ""}
${intelligence.stats.lastTransactionDate ? `- Last transaction: ${intelligence.stats.lastTransactionDate}` : ""}

ML Suggestions:
- Recommended category: ${intelligence.suggestions.suggestedCategoryName || "None"} (${Math.round(intelligence.suggestions.confidence * 100)}% confidence)
- Suggested payment frequency: ${intelligence.suggestions.suggestedFrequency?.replace("_", " ") || "Unknown"}
${intelligence.suggestions.suggestedAmount ? `- Typical amount: $${intelligence.suggestions.suggestedAmount.toFixed(2)}` : ""}

Payment Patterns:
- Regular/recurring: ${intelligence.patterns.isRegular ? "Yes" : "No"}
${intelligence.patterns.averageDaysBetween ? `- Average days between payments: ${intelligence.patterns.averageDaysBetween.toFixed(1)}` : ""}
${intelligence.patterns.mostCommonDay !== null ? `- Most common payment day: ${dayNames[intelligence.patterns.mostCommonDay]}` : ""}
${intelligence.patterns.seasonalTrends.length > 0 ? `- Seasonal patterns: ${intelligence.patterns.seasonalTrends.map((t) => `${monthNames[t.month - 1]}: $${t.avgAmount.toFixed(0)}`).join(", ")}` : ""}

${intelligence.stats.categoryDistribution.length > 0 ? `Category breakdown: ${intelligence.stats.categoryDistribution.map((c) => `${c.categoryName}: ${c.count} transactions ($${c.totalAmount.toFixed(0)})`).join(", ")}` : ""}

Provide a concise explanation (3-5 sentences) covering:
1. What the spending pattern tells us about this payee
2. Why the ML suggested this category (if applicable)
3. One actionable insight or tip

Keep the tone friendly and helpful. Use plain language, avoid technical jargon.`;

        try {
          // All providers (including Ollama) use OpenAI-compatible API via generateText
          const result = await generateText({
            model: strategy.llmProvider.provider(strategy.llmProvider.model),
            prompt,
            maxOutputTokens: 400,
            temperature: 0.7,
          });
          const text = result.text;

          return {
            success: true,
            payeeId: input.id,
            payeeName: intelligence.payeeName,
            provider: strategy.llmProviderType,
            explanation: text.trim(),
          };
        } catch (error) {
          console.error("LLM explanation failed:", error);
          return {
            success: false,
            message: "Failed to generate explanation. Please try again.",
          };
        }
      })
    ),

  // Enrich contact information using web search + LLM
  enrichContact: rateLimitedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const { createSearchAdapter, WebSearchService } = await import(
          "$lib/server/domains/web-search"
        );
        const { createIntelligenceCoordinator } = await import("$lib/server/ai");
        const { workspaces } = await import("$lib/schema/workspaces");
        const { db } = await import("$lib/server/db");
        const { eq } = await import("drizzle-orm");
        const { generateText } = await import("ai");
        const { decryptApiKey } = await import("$lib/server/shared/security/encryption");

        // Get workspace preferences
        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, ctx.workspaceId),
        });

        if (!workspace) {
          return { success: false, message: "Workspace not found" };
        }

        const prefs = workspace.preferences
          ? (JSON.parse(workspace.preferences) as import("$lib/schema/workspaces").WorkspacePreferences)
          : {};

        const webSearchPrefs = prefs.webSearch || { enabled: true, provider: "duckduckgo" as const };
        const llmPrefs = prefs.llm;

        // Check if LLM is enabled (required for extraction)
        if (!llmPrefs?.enabled || !llmPrefs?.defaultProvider) {
          return {
            success: false,
            message: "LLM is required for contact enrichment. Please configure an LLM provider in Settings → Intelligence.",
          };
        }

        try {
          // Create search adapter based on user preference
          const searchProvider = webSearchPrefs.provider || "duckduckgo";
          let adapterConfig: import("$lib/server/domains/web-search").SearchAdapterConfig = {};

          if (searchProvider === "brave" && webSearchPrefs.encryptedBraveApiKey) {
            adapterConfig.braveApiKey = decryptApiKey(webSearchPrefs.encryptedBraveApiKey);
          } else if (searchProvider === "ollama" && webSearchPrefs.encryptedOllamaCloudApiKey) {
            adapterConfig.ollamaApiKey = decryptApiKey(webSearchPrefs.encryptedOllamaCloudApiKey);
          }

          let adapter;
          try {
            adapter = createSearchAdapter(searchProvider, adapterConfig);
          } catch (adapterError) {
            console.error("Failed to create search adapter:", adapterError);
            return {
              success: false,
              message: `Failed to create ${searchProvider} search adapter: ${adapterError instanceof Error ? adapterError.message : "Unknown error"}`,
            };
          }

          const searchService = new WebSearchService(adapter);

          // Get LLM provider for extraction
          const coordinator = createIntelligenceCoordinator(prefs);
          const strategy = coordinator.getStrategy("categorySuggestion"); // Reuse category suggestion strategy

          if (!strategy.llmProvider) {
            return {
              success: false,
              message: "No LLM provider configured. Please set up an LLM provider in Settings → LLM Providers.",
            };
          }

          // Create a text generation function using the user's LLM
          // All providers (including Ollama) use OpenAI-compatible API via generateText
          const generateTextFn = async (prompt: string): Promise<string> => {
            try {
              if (strategy.llmProvider) {
                const result = await generateText({
                  model: strategy.llmProvider.provider(strategy.llmProvider.model),
                  prompt,
                  maxOutputTokens: 500,
                  temperature: 0.3,
                });
                return result.text;
              }
              throw new Error("No LLM provider available");
            } catch (llmError) {
              console.error("LLM generation failed:", llmError);
              throw new Error(`LLM extraction failed: ${llmError instanceof Error ? llmError.message : "Unknown error"}`);
            }
          };

          // Perform search and extraction
          let result;
          try {
            result = await searchService.enrichBusinessContact(input.name, generateTextFn);
          } catch (searchError) {
            console.error("Web search or extraction failed:", searchError);
            return {
              success: false,
              message: `Search failed: ${searchError instanceof Error ? searchError.message : "Unknown error"}`,
            };
          }

          return {
            success: true,
            original: input.name,
            searchProvider,
            suggestions: result,
          };
        } catch (error) {
          console.error("Contact enrichment failed:", error);
          const message = error instanceof Error ? error.message : "Failed to enrich contact";
          return {
            success: false,
            message,
          };
        }
      })
    ),

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

  // ========================================
  // Enhancement Tracking Routes
  // ========================================

  /**
   * Record a new AI/ML enhancement for a payee field
   */
  recordEnhancement: rateLimitedProcedure
    .input(recordEnhancementSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const trackingService = createEnhancementTrackingService(ctx.workspaceId);
        const enhancement = await trackingService.recordEnhancement({
          ...input,
          workspaceId: ctx.workspaceId,
        });
        return { success: true, enhancement };
      })
    ),

  /**
   * Update feedback for an enhancement (accepted/modified)
   */
  updateEnhancementFeedback: publicProcedure
    .input(updateEnhancementFeedbackSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const trackingService = createEnhancementTrackingService(ctx.workspaceId);
        const enhancement = await trackingService.updateFeedback(input);
        return { success: true, enhancement };
      })
    ),

  /**
   * Get enhancement history for a payee
   */
  getPayeeEnhancements: publicProcedure
    .input(getPayeeEnhancementsSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) => {
        const trackingService = createEnhancementTrackingService(ctx.workspaceId);
        const enhancements = await trackingService.getPayeeEnhancements(
          input.payeeId,
          input.fieldName,
          input.limit
        );
        return enhancements;
      })
    ),

  /**
   * Get enhancement summary for all fields of a payee
   */
  getFieldEnhancementSummary: publicProcedure
    .input(z.object({ payeeId: z.number().positive() }))
    .query(
      withErrorHandler(async ({ input, ctx }) => {
        const trackingService = createEnhancementTrackingService(ctx.workspaceId);
        const summary = await trackingService.getFieldEnhancementSummary(input.payeeId);
        return summary;
      })
    ),

  /**
   * Get AI preferences for a payee (field modes and enhanced fields)
   */
  getPayeeAiPreferences: publicProcedure
    .input(z.object({ payeeId: z.number().positive() }))
    .query(
      withErrorHandler(async ({ input, ctx }) => {
        const trackingService = createEnhancementTrackingService(ctx.workspaceId);
        const preferences = await trackingService.getPayeeAiPreferences(input.payeeId);
        return preferences;
      })
    ),

  /**
   * Get enhancement statistics
   */
  getEnhancementStats: publicProcedure
    .input(getEnhancementStatsSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) => {
        const trackingService = createEnhancementTrackingService(ctx.workspaceId);
        const stats = await trackingService.getEnhancementStats(input.payeeId);
        return stats;
      })
    ),
});
