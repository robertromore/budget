import {defineQuery, defineMutation, createQueryKeys} from "./_factory";
import {queryPresets, queryClient} from "./_client";
import {trpc} from "$lib/trpc/client";
import type {Payee} from "$lib/schema/payees";

export const payeeKeys = createQueryKeys("payees", {
  lists: () => ["payees", "list"] as const,
  list: () => ["payees", "list"] as const,
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

export const getPayeeDetail = (id: number) =>
  defineQuery<Payee>({
    queryKey: payeeKeys.detail(id),
    queryFn: async () => {
      const result = await trpc().payeeRoutes.load.query({id});
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
      const result = await trpc().payeeRoutes.search.query({query});
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
}) =>
  defineQuery<Payee[]>({
    queryKey: ["payees", "search-advanced", params],
    queryFn: async () => {
      const result = await trpc().payeeRoutes.searchAdvanced.query(params);
      return result as Payee[];
    },
    options: {
      enabled: params.query.length >= 2,
      staleTime: 30 * 1000,
    },
  });

// Analytics and intelligence queries
export const getPayeeAnalytics = () =>
  defineQuery<any>({
    queryKey: payeeKeys.analytics(),
    queryFn: () => trpc().payeeRoutes.analytics.query(),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

export const getPayeeIntelligence = (id: number) =>
  defineQuery<any>({
    queryKey: payeeKeys.intelligence(id),
    queryFn: () => trpc().payeeRoutes.intelligence.query({id}),
    options: {
      staleTime: 2 * 60 * 1000, // 2 minutes
    },
  });

export const getPayeeSuggestions = (id: number) =>
  defineQuery<any>({
    queryKey: payeeKeys.suggestions(id),
    queryFn: () => trpc().payeeRoutes.suggestions.query({id}),
    options: {
      staleTime: 2 * 60 * 1000, // 2 minutes
    },
  });

export const getPayeeStats = (id: number) =>
  defineQuery<any>({
    queryKey: payeeKeys.stats(id),
    queryFn: () => trpc().payeeRoutes.stats.query({id}),
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
  defineQuery<any>({
    queryKey: ["payees", "unified-ml", payeeId, context],
    queryFn: () => trpc().payeeRoutes.unifiedMLRecommendations.query({
      payeeId,
      context
    }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

export const getCrossSystemLearning = (id: number) =>
  defineQuery<any>({
    queryKey: ["payees", "cross-system-learning", id],
    queryFn: () => trpc().payeeRoutes.crossSystemLearning.query({id}),
    options: {
      staleTime: 10 * 60 * 1000, // 10 minutes
    },
  });

export const getMLInsightsDashboard = (filters?: any) =>
  defineQuery<any>({
    queryKey: [...payeeKeys.mlInsights(), filters],
    queryFn: () => trpc().payeeRoutes.mlInsightsDashboard.query({filters}),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

export const getLearningMetrics = (timeframeMonths?: number) =>
  defineQuery<any>({
    queryKey: ["payees", "learning-metrics", timeframeMonths],
    queryFn: () => trpc().payeeRoutes.getLearningMetrics.query({timeframeMonths}),
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
  defineQuery<any>({
    queryKey: [...payeeKeys.contactValidation(payeeId), contactOverrides],
    queryFn: () => trpc().payeeRoutes.validateAndEnrichContact.query({
      payeeId,
      contactOverrides
    }),
    options: {
      staleTime: 30 * 60 * 1000, // 30 minutes
    },
  });

export const detectContactDuplicates = (
  includeInactive = false,
  minimumSimilarity = 0.7
) =>
  defineQuery<any>({
    queryKey: ["payees", "contact-duplicates", includeInactive, minimumSimilarity],
    queryFn: () => trpc().payeeRoutes.detectContactDuplicates.query({
      includeInactive,
      minimumSimilarity
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
  defineQuery<any>({
    queryKey: ["payees", "detect-subscriptions", payeeIds, includeInactive, minConfidence],
    queryFn: () => trpc().payeeRoutes.detectSubscriptions.query({
      payeeIds,
      includeInactive,
      minConfidence
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
  defineQuery<any>({
    queryKey: [...payeeKeys.subscriptionDetection(payeeId), transactionData],
    queryFn: () => trpc().payeeRoutes.classifySubscription.query({
      payeeId,
      transactionData
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
  defineQuery<any>({
    queryKey: ["payees", "subscription-analysis", payeeIds, analysisOptions],
    queryFn: () => trpc().payeeRoutes.bulkSubscriptionAnalysis.query({
      payeeIds,
      analysisOptions
    }),
    options: {
      staleTime: 10 * 60 * 1000, // 10 minutes
    },
  });

// Budget optimization
export const getBudgetOptimizationAnalysis = (id: number) =>
  defineQuery<any>({
    queryKey: ["payees", "budget-optimization", id],
    queryFn: () => trpc().payeeRoutes.budgetOptimizationAnalysis.query({id}),
    options: {
      staleTime: 15 * 60 * 1000, // 15 minutes
    },
  });

export const getBudgetAllocationSuggestions = (
  accountId?: number,
  options?: {
    strategy?: 'conservative' | 'aggressive' | 'balanced';
    riskTolerance?: number;
    timeHorizon?: number;
  }
) =>
  defineQuery<any>({
    queryKey: ["payees", "budget-allocation", accountId, options],
    queryFn: () => trpc().payeeRoutes.budgetAllocationSuggestions.query({
      accountId,
      ...options
    }),
    options: {
      staleTime: 15 * 60 * 1000, // 15 minutes
    },
  });

// Mutations
export const createPayee = () =>
  defineMutation({
    mutationFn: (data: any) => trpc().payeeRoutes.create.mutate(data),
    onSuccess: () => {
      // Invalidate and refetch payee lists
      return Promise.all([
        queryClient.invalidateQueries({queryKey: payeeKeys.lists()}),
        queryClient.invalidateQueries({queryKey: payeeKeys.analytics()}),
      ]);
    },
  });

export const updatePayee = () =>
  defineMutation({
    mutationFn: ({id, ...data}: {id: number} & any) =>
      trpc().payeeRoutes.update.mutate({id, ...data}),
    onSuccess: (data, variables) => {
      // Invalidate specific payee and lists
      return Promise.all([
        queryClient.invalidateQueries({queryKey: payeeKeys.detail(variables.id)}),
        queryClient.invalidateQueries({queryKey: payeeKeys.lists()}),
        queryClient.invalidateQueries({queryKey: payeeKeys.intelligence(variables.id)}),
        queryClient.invalidateQueries({queryKey: payeeKeys.suggestions(variables.id)}),
        queryClient.invalidateQueries({queryKey: payeeKeys.stats(variables.id)}),
      ]);
    },
  });

export const deletePayee = () =>
  defineMutation({
    mutationFn: (id: number) => trpc().payeeRoutes.remove.mutate({id}),
    onSuccess: () => {
      // Invalidate payee lists and analytics
      return Promise.all([
        queryClient.invalidateQueries({queryKey: payeeKeys.lists()}),
        queryClient.invalidateQueries({queryKey: payeeKeys.analytics()}),
      ]);
    },
  });

export const applyIntelligentDefaults = () =>
  defineMutation({
    mutationFn: ({id, applyCategory = true, applyBudget = true}: {
      id: number;
      applyCategory?: boolean;
      applyBudget?: boolean;
    }) => trpc().payeeRoutes.applyIntelligentDefaults.mutate({
      id,
      applyCategory,
      applyBudget
    }),
    onSuccess: (data, variables) => {
      // Invalidate intelligence-related queries
      return Promise.all([
        queryClient.invalidateQueries({queryKey: payeeKeys.detail(variables.id)}),
        queryClient.invalidateQueries({queryKey: payeeKeys.intelligence(variables.id)}),
        queryClient.invalidateQueries({queryKey: payeeKeys.suggestions(variables.id)}),
      ]);
    },
  });

export const executeAdaptiveOptimization = () =>
  defineMutation({
    mutationFn: ({payeeId, options}: {
      payeeId: number;
      options?: {
        applyCategorizationUpdates?: boolean;
        applyBudgetUpdates?: boolean;
        applyAutomationRules?: boolean;
        confidenceThreshold?: number;
        dryRun?: boolean;
      };
    }) => trpc().payeeRoutes.executeAdaptiveOptimization.mutate({
      payeeId,
      options
    }),
    onSuccess: (data, variables) => {
      // Invalidate payee data after optimization
      return Promise.all([
        queryClient.invalidateQueries({queryKey: payeeKeys.detail(variables.payeeId)}),
        queryClient.invalidateQueries({queryKey: payeeKeys.intelligence(variables.payeeId)}),
        queryClient.invalidateQueries({queryKey: payeeKeys.suggestions(variables.payeeId)}),
        queryClient.invalidateQueries({queryKey: payeeKeys.stats(variables.payeeId)}),
        queryClient.invalidateQueries({queryKey: payeeKeys.analytics()}),
      ]);
    },
  });

export const bulkContactValidation = () =>
  defineMutation({
    mutationFn: ({payeeIds, options}: {
      payeeIds: number[];
      options?: {
        autoFix?: boolean;
        includeInactive?: boolean;
        skipRecentlyValidated?: boolean;
        minConfidence?: number;
      };
    }) => trpc().payeeRoutes.bulkContactValidation.mutate({
      payeeIds,
      options
    }),
    onSuccess: () => {
      // Invalidate contact validation queries
      return queryClient.invalidateQueries({
        queryKey: ["payees", "contact-validation"]
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
      correctionTrigger: string;
      correctionContext?: any;
      transactionAmount?: number;
      transactionDate?: string;
      userConfidence?: number;
      notes?: string;
      isOverride?: boolean;
    }) => trpc().payeeRoutes.recordCategoryCorrection.mutate(data),
    onSuccess: (data, variables) => {
      // Invalidate learning and intelligence queries
      return Promise.all([
        queryClient.invalidateQueries({queryKey: payeeKeys.intelligence(variables.payeeId)}),
        queryClient.invalidateQueries({queryKey: payeeKeys.suggestions(variables.payeeId)}),
        queryClient.invalidateQueries({queryKey: payeeKeys.mlInsights()}),
      ]);
    },
  });