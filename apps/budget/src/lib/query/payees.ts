import type { Payee, PayeeType, PaymentFrequency } from "$lib/schema/payees";
import { trpc } from "$lib/trpc/client";
import { cachePatterns, queryClient, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";
import type {
  DuplicateDetectionResult,
  DuplicateGroup,
  PayeeAnalytics,
  PayeeIntelligence,
  PayeeStats,
  PayeeSuggestions
} from "./payees-types";

// Re-export types for consumers
export type { DuplicateDetectionResult, DuplicateGroup, PayeeSuggestions } from "./payees-types";

export const payeeKeys = createQueryKeys("payees", {
  lists: () => ["payees", "list"] as const,
  list: () => ["payees", "list"] as const,
  listWithStats: () => ["payees", "list", "stats"] as const,
  details: () => ["payees", "detail"] as const,
  detail: (id: number) => ["payees", "detail", id] as const,
  analytics: () => ["payees", "analytics"] as const,
  intelligence: (id: number) => ["payees", "intelligence", id] as const,
  suggestions: (id: number) => ["payees", "suggestions", id] as const,
  stats: (id: number) => ["payees", "stats", id] as const,
  search: (query: string) => ["payees", "search", query] as const,
  mlInsights: () => ["payees", "ml-insights"] as const,
  contactValidation: (id: number) => ["payees", "contact-validation", id] as const,
  subscriptionDetection: (id: number) => ["payees", "subscription-detection", id] as const,
});

// Basic CRUD operations
export const listPayees = () =>
  defineQuery<Payee[]>({
    queryKey: payeeKeys.list(),
    queryFn: async () => {
      const result = await trpc().payeeRoutes.all.query();
      return result as Payee[];
    },
    options: {
      ...queryPresets.static,
    },
  });

export const listPayeesWithStats = () =>
  defineQuery<any[]>({
    queryKey: payeeKeys.listWithStats(),
    queryFn: async () => {
      const result = await trpc().payeeRoutes.allWithStats.query();
      return result as any[];
    },
    options: {
      ...queryPresets.static,
    },
  });

export const getPayeeDetail = (id: number) =>
  defineQuery<Payee>({
    queryKey: payeeKeys.detail(id),
    queryFn: async () => {
      const result = await trpc().payeeRoutes.load.query({ id });
      return result as Payee;
    },
    options: {
      staleTime: 60 * 1000,
    },
  });

export const searchPayees = (query: string) =>
  defineQuery<Payee[]>({
    queryKey: payeeKeys.search(query),
    queryFn: async () => {
      const result = await trpc().payeeRoutes.search.query({ query });
      return result as Payee[];
    },
    options: {
      enabled: query.length >= 2,
      staleTime: 30 * 1000,
    },
  });

export const searchPayeesAdvanced = (params: {
  query: string;
  filters?: any;
  limit?: number;
  payeeType?: PayeeType | undefined;
  isActive?: boolean | undefined;
  taxRelevant?: boolean | undefined;
  hasDefaultCategory?: boolean | undefined;
  hasDefaultBudget?: boolean | undefined;
  paymentFrequency?: PaymentFrequency | undefined;
  minAvgAmount?: number | undefined;
  maxAvgAmount?: number | undefined;
  lastTransactionBefore?: string | undefined;
  lastTransactionAfter?: string | undefined;
  sortBy?: string | undefined;
  sortOrder?: string | undefined;
}) =>
  defineQuery<Payee[]>({
    queryKey: ["payees", "search-advanced", params],
    queryFn: async () => {
      const result = await trpc().payeeRoutes.searchAdvanced.query(params);
      return result as Payee[];
    },
    options: {
      enabled:
        (params.query && params.query.length >= 2) ||
        Boolean(
          params.payeeType ||
            params.isActive !== undefined ||
            params.taxRelevant !== undefined ||
            params.hasDefaultCategory !== undefined ||
            params.hasDefaultBudget !== undefined ||
            params.paymentFrequency ||
            params.minAvgAmount !== undefined ||
            params.maxAvgAmount !== undefined ||
            params.lastTransactionBefore ||
            params.lastTransactionAfter
        ),
      staleTime: 30 * 1000,
    },
  });

// Analytics and intelligence queries
export const getPayeeAnalytics = () =>
  defineQuery<PayeeAnalytics>({
    queryKey: payeeKeys.analytics(),
    queryFn: () => trpc().payeeRoutes.analytics.query(),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

export const getPayeeIntelligence = (id: number) =>
  defineQuery<PayeeIntelligence>({
    queryKey: payeeKeys.intelligence(id),
    queryFn: () => trpc().payeeRoutes.intelligence.query({ id }),
    options: {
      staleTime: 2 * 60 * 1000, // 2 minutes
    },
  });

export const getPayeeSuggestions = (id: number) =>
  defineQuery<PayeeSuggestions>({
    queryKey: payeeKeys.suggestions(id),
    queryFn: () => trpc().payeeRoutes.suggestions.query({ id }),
    options: {
      staleTime: 2 * 60 * 1000, // 2 minutes
    },
  });

export const getPayeeStats = (id: number) =>
  defineQuery<PayeeStats>({
    queryKey: payeeKeys.stats(id),
    queryFn: () => trpc().payeeRoutes.stats.query({ id }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });

// ML and advanced features
export const getUnifiedMLRecommendations = (
  payeeId: number,
  context?: {
    transactionAmount?: number;
    transactionDate?: string;
    userPreferences?: Record<string, any>;
    riskTolerance?: number;
  }
) =>
  defineQuery<Record<string, any>>({
    queryKey: ["payees", "unified-ml", payeeId, context],
    queryFn: () =>
      trpc().payeeRoutes.unifiedMLRecommendations.query({
        payeeId,
        context,
      }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

export const getCrossSystemLearning = (id: number) =>
  defineQuery<Record<string, any>>({
    queryKey: ["payees", "cross-system-learning", id],
    queryFn: () => trpc().payeeRoutes.crossSystemLearning.query({ id }),
    options: {
      staleTime: 10 * 60 * 1000, // 10 minutes
    },
  });

export const getMLInsightsDashboard = (filters?: any) =>
  defineQuery<Record<string, any>>({
    queryKey: [...payeeKeys.mlInsights(), filters],
    queryFn: () => trpc().payeeRoutes.mlInsightsDashboard.query({ filters }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

export const getLearningMetrics = (timeframeMonths?: number) =>
  defineQuery<Record<string, any>>({
    queryKey: ["payees", "learning-metrics", timeframeMonths],
    queryFn: () => trpc().payeeRoutes.getLearningMetrics.query({ timeframeMonths }),
    options: {
      staleTime: 10 * 60 * 1000, // 10 minutes
    },
  });

// Contact management
export const validatePayeeContact = (
  payeeId: number,
  contactOverrides?: {
    phone?: string;
    email?: string;
    website?: string;
    address?: any;
  }
) =>
  defineQuery<Record<string, any>>({
    queryKey: [...payeeKeys.contactValidation(payeeId), contactOverrides],
    queryFn: () =>
      trpc().payeeRoutes.validateAndEnrichContact.query({
        payeeId,
        contactOverrides,
      }),
    options: {
      staleTime: 30 * 60 * 1000, // 30 minutes
    },
  });

export const detectContactDuplicates = (includeInactive = false, minimumSimilarity = 0.7) =>
  defineQuery<Record<string, any>[]>({
    queryKey: ["payees", "contact-duplicates", includeInactive, minimumSimilarity],
    queryFn: () =>
      trpc().payeeRoutes.detectContactDuplicates.query({
        includeInactive,
        minimumSimilarity,
      }),
    options: {
      staleTime: 15 * 60 * 1000, // 15 minutes
    },
  });

// Subscription management
export const detectSubscriptions = (
  payeeIds?: number[],
  includeInactive = false,
  minConfidence = 0.3
) =>
  defineQuery<Record<string, any>[]>({
    queryKey: ["payees", "detect-subscriptions", payeeIds, includeInactive, minConfidence],
    queryFn: () =>
      trpc().payeeRoutes.detectSubscriptions.query({
        payeeIds,
        includeInactive,
        minConfidence,
      }),
    options: {
      staleTime: 10 * 60 * 1000, // 10 minutes
    },
  });

export const classifySubscription = (
  payeeId: number,
  transactionData?: Array<{
    amount: number;
    date: string;
    description: string;
  }>
) =>
  defineQuery<Record<string, any>>({
    queryKey: [...payeeKeys.subscriptionDetection(payeeId), transactionData],
    queryFn: () =>
      trpc().payeeRoutes.classifySubscription.query({
        payeeId,
        transactionData,
      }),
    options: {
      staleTime: 15 * 60 * 1000, // 15 minutes
    },
  });

export const getSubscriptionAnalysis = (
  payeeIds?: number[],
  analysisOptions?: {
    includeCostBreakdown?: boolean;
    includeUsageMetrics?: boolean;
    includeOptimizationSuggestions?: boolean;
    timeframeDays?: number;
  }
) =>
  defineQuery<Record<string, any>>({
    queryKey: ["payees", "subscription-analysis", payeeIds, analysisOptions],
    queryFn: () =>
      trpc().payeeRoutes.bulkSubscriptionAnalysis.query({
        payeeIds,
        analysisOptions,
      }),
    options: {
      staleTime: 10 * 60 * 1000, // 10 minutes
    },
  });

// Budget optimization
export const getBudgetOptimizationAnalysis = (id: number) =>
  defineQuery<Record<string, any>>({
    queryKey: ["payees", "budget-optimization", id],
    queryFn: () => trpc().payeeRoutes.budgetOptimizationAnalysis.query({ id }),
    options: {
      staleTime: 15 * 60 * 1000, // 15 minutes
    },
  });

export const getBudgetAllocationSuggestions = (
  accountId?: number,
  options?: {
    strategy?: "conservative" | "aggressive" | "balanced";
    riskTolerance?: number;
    timeHorizon?: number;
  }
) =>
  defineQuery<Record<string, any>>({
    queryKey: ["payees", "budget-allocation", accountId, options],
    queryFn: () =>
      trpc().payeeRoutes.budgetAllocationSuggestions.query({
        accountId,
        ...options,
      }),
    options: {
      staleTime: 15 * 60 * 1000, // 15 minutes
    },
  });

// Mutations
export const createPayee = () =>
  defineMutation({
    mutationFn: (data: any) => trpc().payeeRoutes.create.mutate(data),
    onSuccess: async () => {
      // Invalidate and refetch payee lists
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.analytics() }),
      ]);
    },
  });

export const updatePayee = () =>
  defineMutation({
    mutationFn: ({ id, ...data }: { id: number } & any) =>
      trpc().payeeRoutes.update.mutate({ id, ...data }),
    onSuccess: async (_data, variables) => {
      // Invalidate specific payee and lists
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payeeKeys.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.intelligence(variables.id) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.suggestions(variables.id) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.stats(variables.id) }),
      ]);
    },
  });

export const deletePayee = () =>
  defineMutation({
    mutationFn: (id: number) => trpc().payeeRoutes.remove.mutate({ id }),
    onSuccess: async () => {
      // Invalidate payee lists and analytics
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.analytics() }),
      ]);
    },
  });

export const bulkDeletePayees = defineMutation<number[], { deletedCount: number; errors: any[] }>({
  mutationFn: (entities) => trpc().payeeRoutes.delete.mutate({ entities }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(payeeKeys.all());
  },
  successMessage: "Payees deleted",
  errorMessage: "Failed to delete payees",
});

export const applyIntelligentDefaults = () =>
  defineMutation({
    mutationFn: ({
      id,
      applyCategory = true,
      applyBudget = true,
    }: {
      id: number;
      applyCategory?: boolean;
      applyBudget?: boolean;
    }) =>
      trpc().payeeRoutes.applyIntelligentDefaults.mutate({
        id,
        applyCategory,
        applyBudget,
      }),
    onSuccess: async (_data, variables) => {
      // Invalidate intelligence-related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payeeKeys.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.intelligence(variables.id) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.suggestions(variables.id) }),
      ]);
    },
  });

export const executeAdaptiveOptimization = () =>
  defineMutation({
    mutationFn: ({
      payeeId,
      options,
    }: {
      payeeId: number;
      options?: {
        applyCategorizationUpdates?: boolean;
        applyBudgetUpdates?: boolean;
        applyAutomationRules?: boolean;
        confidenceThreshold?: number;
        dryRun?: boolean;
      };
    }) =>
      trpc().payeeRoutes.executeAdaptiveOptimization.mutate({
        payeeId,
        options,
      }),
    onSuccess: async (_data, variables) => {
      // Invalidate payee data after optimization
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payeeKeys.detail(variables.payeeId) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.intelligence(variables.payeeId) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.suggestions(variables.payeeId) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.stats(variables.payeeId) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.analytics() }),
      ]);
    },
  });

export const bulkContactValidation = () =>
  defineMutation({
    mutationFn: ({
      payeeIds,
      options,
    }: {
      payeeIds: number[];
      options?: {
        autoFix?: boolean;
        includeInactive?: boolean;
        skipRecentlyValidated?: boolean;
        minConfidence?: number;
      };
    }) =>
      trpc().payeeRoutes.bulkContactValidation.mutate({
        payeeIds,
        options,
      }),
    onSuccess: () => {
      // Invalidate contact validation queries
      return queryClient.invalidateQueries({
        queryKey: ["payees", "contact-validation"],
      });
    },
  });

export const recordCategoryCorrection = () =>
  defineMutation({
    mutationFn: (data: {
      payeeId: number;
      transactionId: number;
      fromCategoryId: number;
      toCategoryId: number;
      correctionTrigger:
        | "manual_user_correction"
        | "transaction_creation"
        | "bulk_categorization"
        | "import_correction"
        | "scheduled_transaction";
      correctionContext?: any;
      transactionAmount?: number;
      transactionDate?: string;
      userConfidence?: number;
      notes?: string;
      isOverride?: boolean;
    }) => trpc().payeeRoutes.recordCategoryCorrection.mutate(data),
    onSuccess: async (_data, variables) => {
      // Invalidate learning and intelligence queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payeeKeys.intelligence(variables.payeeId) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.suggestions(variables.payeeId) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.mlInsights() }),
      ]);
    },
  });

// =====================================
// Bulk Operations Mutations
// NOTE: These tRPC routes are not yet implemented in PayeeService
// TODO: Implement these methods in PayeeService before uncommenting
// =====================================

export const bulkStatusChange = () =>
  defineMutation<
    { payeeIds: number[]; status: "active" | "inactive" },
    { updatedCount: number; errors: string[] }
  >({
    mutationFn: ({ payeeIds, status }) =>
      trpc().payeeRoutes.bulkStatusChange.mutate({ payeeIds, status }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.analytics() }),
      ]);
    },
  });

export const bulkCategoryAssignment = () =>
  defineMutation<
    {
      payeeIds: number[];
      categoryId: number;
      overwriteExisting?: boolean;
    },
    { updatedCount: number; skippedCount: number; errors: string[] }
  >({
    mutationFn: ({ payeeIds, categoryId, overwriteExisting = false }) =>
      trpc().payeeRoutes.bulkCategoryAssignment.mutate({
        payeeIds,
        categoryId,
        overwriteExisting,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.analytics() }),
      ]);
    },
  });

export const bulkTagManagement = () =>
  defineMutation<
    {
      payeeIds: number[];
      tags: string[];
      operation: "add" | "remove" | "replace";
    },
    { updatedCount: number; errors: string[] }
  >({
    mutationFn: ({ payeeIds, tags, operation }) =>
      trpc().payeeRoutes.bulkTagManagement.mutate({
        payeeIds,
        tags,
        operation,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.analytics() }),
      ]);
    },
  });

export const bulkIntelligenceApplication = () =>
  defineMutation<
    {
      payeeIds: number[];
      options?: {
        applyCategory?: boolean;
        applyBudget?: boolean;
        confidenceThreshold?: number;
        overwriteExisting?: boolean;
      };
    },
    { updatedCount: number; skippedCount: number; errors: string[] }
  >({
    mutationFn: ({ payeeIds, options }) =>
      trpc().payeeRoutes.bulkIntelligenceApplication.mutate({
        payeeIds,
        options,
      }),
    onSuccess: async (_data, variables) => {
      // Invalidate intelligence data for affected payees
      const invalidations = variables.payeeIds.flatMap((id) => [
        queryClient.invalidateQueries({ queryKey: payeeKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.intelligence(id) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.suggestions(id) }),
      ]);

      await Promise.all([
        ...invalidations,
        queryClient.invalidateQueries({ queryKey: payeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.analytics() }),
      ]);
    },
  });

export const bulkExport = () =>
  defineMutation<
    {
      payeeIds: number[];
      format: "csv" | "json";
      includeTransactionStats?: boolean;
      includeContactInfo?: boolean;
      includeIntelligenceData?: boolean;
    },
    string
  >({
    mutationFn: ({ payeeIds, format, ...options }) =>
      trpc().payeeRoutes.bulkExport.query({
        payeeIds,
        format,
        ...options,
      }),
  });

export const bulkImport = () =>
  defineMutation<
    {
      data: string;
      format: "csv" | "json";
      options?: {
        skipDuplicates?: boolean;
        updateExisting?: boolean;
        applyIntelligentDefaults?: boolean;
        validateContactInfo?: boolean;
      };
    },
    {
      imported: number;
      updated: number;
      skipped: number;
      errors: Array<{ row: number; error: string }>;
    }
  >({
    mutationFn: ({ data, format, options }) =>
      trpc().payeeRoutes.bulkImport.mutate({
        data,
        format,
        options: options || {},
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.analytics() }),
      ]);
    },
  });

export const bulkCleanup = () =>
  defineMutation<
    {
      operations: Array<"remove_inactive" | "merge_duplicates" | "fix_data" | "archive_unused">;
      dryRun?: boolean;
      confirmDestructive?: boolean;
    },
    {
      affectedPayees: number[];
      operationResults: Array<{
        operation: string;
        affectedCount: number;
        details: string[];
      }>;
      canUndo: boolean;
    }
  >({
    mutationFn: ({ operations, dryRun = true, confirmDestructive = false }) =>
      trpc().payeeRoutes.bulkCleanup.mutate({
        operations,
        dryRun,
        confirmDestructive,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.analytics() }),
      ]);
    },
  });

export const getDuplicates = (
  similarityThreshold = 0.8,
  includeInactive = false,
  groupingStrategy: "name" | "contact" | "transaction_pattern" | "comprehensive" = "comprehensive",
  detectionMethod: "simple" | "ml" | "llm" | "llm_direct" = "ml"
) =>
  defineQuery<DuplicateDetectionResult>({
    queryKey: ["payees", "duplicates", similarityThreshold, includeInactive, groupingStrategy, detectionMethod],
    queryFn: () =>
      trpc().payeeRoutes.getDuplicates.query({
        similarityThreshold,
        includeInactive,
        groupingStrategy,
        detectionMethod,
      }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

export const mergeDuplicates = () =>
  defineMutation<
    {
      primaryPayeeId: number;
      duplicatePayeeIds: number[];
      mergeStrategy?: {
        preserveTransactionHistory?: boolean;
        conflictResolution?: "primary" | "latest" | "best_quality" | "manual";
        mergeContactInfo?: boolean;
        mergeIntelligenceData?: boolean;
      };
      confirmMerge?: boolean;
    },
    {
      success: boolean;
      mergedPayeeId: number;
      deletedPayeeIds: number[];
      transactionsUpdated: number;
      warnings: string[];
    }
  >({
    mutationFn: ({ primaryPayeeId, duplicatePayeeIds, mergeStrategy, confirmMerge = false }) =>
      trpc().payeeRoutes.mergeDuplicates.mutate({
        primaryPayeeId,
        duplicatePayeeIds,
        mergeStrategy: mergeStrategy || {},
        confirmMerge,
      }),
    onSuccess: async (_data, variables) => {
      // Invalidate data for all affected payees
      const allPayeeIds = [variables.primaryPayeeId, ...variables.duplicatePayeeIds];
      const invalidations = allPayeeIds.flatMap((id) => [
        queryClient.invalidateQueries({ queryKey: payeeKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.intelligence(id) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.suggestions(id) }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.stats(id) }),
      ]);

      await Promise.all([
        ...invalidations,
        queryClient.invalidateQueries({ queryKey: payeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.analytics() }),
        queryClient.invalidateQueries({ queryKey: ["payees", "duplicates"] }),
      ]);
    },
  });

export const undoOperation = () =>
  defineMutation<
    {
      operationId: string;
      operationType:
        | "bulk_delete"
        | "bulk_status_change"
        | "bulk_category_assignment"
        | "bulk_tag_management"
        | "bulk_intelligence_application"
        | "bulk_cleanup"
        | "merge_duplicates";
    },
    { success: boolean; message: string; restoredCount: number }
  >({
    mutationFn: ({ operationId, operationType }) =>
      trpc().payeeRoutes.undoOperation.mutate({
        operationId,
        operationType,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: payeeKeys.analytics() }),
        queryClient.invalidateQueries({ queryKey: ["payees", "operation-history"] }),
      ]);
    },
  });

// AI-powered name enhancement
export const enhancePayeeName = () =>
  defineMutation<
    { name: string; rawDescription?: string },
    {
      success: boolean;
      enhanced: string | null;
      original: string;
      message?: string;
      provider?: string | null;
    }
  >({
    mutationFn: ({ name, rawDescription }) =>
      trpc().payeeRoutes.enhanceName.mutate({ name, rawDescription }),
  });

// Infer all payee details using AI
export interface PayeeDetailsSuggestions {
  enhancedName: string | null;
  payeeType: PayeeType | null;
  paymentFrequency: PaymentFrequency | null;
  suggestedCategoryId: number | null;
  suggestedCategoryName: string | null;
  taxRelevant: boolean | null;
  isSeasonal: boolean | null;
  confidence: number | null;
  // Business tab fields
  suggestedMCC: string | null;
  suggestedTags: string[] | null;
  suggestedPaymentMethods: string[] | null;
  // Contact tab fields
  suggestedWebsite: string | null;
}

export const inferPayeeDetails = () =>
  defineMutation<
    { name: string; rawDescription?: string; currentCategoryId?: number },
    {
      success: boolean;
      original: string;
      provider?: string | null;
      message?: string;
      suggestions?: PayeeDetailsSuggestions;
    }
  >({
    mutationFn: ({ name, rawDescription, currentCategoryId }) =>
      trpc().payeeRoutes.inferPayeeDetails.mutate({ name, rawDescription, currentCategoryId }),
    successMessage: "AI analysis complete",
    errorMessage: "Failed to analyze payee",
  });

// Explain ML insights using LLM
export const explainInsights = () =>
  defineMutation<
    { id: number },
    {
      success: boolean;
      payeeId?: number;
      payeeName?: string;
      provider?: string | null;
      explanation?: string;
      message?: string;
    }
  >({
    mutationFn: ({ id }) =>
      trpc().payeeRoutes.explainInsights.mutate({ id }),
    successMessage: "AI explanation generated",
    errorMessage: "Failed to generate explanation",
  });

// Contact enrichment using web search + LLM
export interface ContactEnrichmentSuggestions {
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export const enrichPayeeContact = () =>
  defineMutation<
    { name: string },
    {
      success: boolean;
      suggestions?: ContactEnrichmentSuggestions;
      message?: string;
      provider?: string | null;
      searchProvider?: string | null;
    }
  >({
    mutationFn: ({ name }) =>
      trpc().payeeRoutes.enrichContact.mutate({ name }),
    successMessage: "Contact information enriched",
    errorMessage: "Failed to enrich contact",
  });

// export const getOperationHistory = (
//   limit = 20,
//   offset = 0,
//   operationType?:
//     | "bulk_delete"
//     | "bulk_status_change"
//     | "bulk_category_assignment"
//     | "bulk_tag_management"
//     | "bulk_intelligence_application"
//     | "bulk_cleanup"
//     | "merge_duplicates",
//   startDate?: string,
//   endDate?: string
// ) =>
//   defineQuery<OperationHistory>({
//     queryKey: ["payees", "operation-history", limit, offset, operationType, startDate, endDate],
//     queryFn: () =>
//       trpc().payeeRoutes.getOperationHistory.query({
//         limit,
//         offset,
//         operationType,
//         startDate,
//         endDate,
//       }),
//     options: {
//       staleTime: 30 * 1000, // 30 seconds
//     },
//   });
