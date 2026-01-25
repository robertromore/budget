/**
 * Similarity Service Query Layer
 *
 * Provides query and mutation wrappers for ML similarity operations:
 * - Merchant name normalization
 * - Payee similarity matching
 * - Canonical grouping
 */

import { trpc } from "$lib/trpc/client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";
import { queryClient } from "./_client";

// Query keys for similarity operations
export const similarityKeys = createQueryKeys("similarity", {
  normalize: (description: string) => ["similarity", "normalize", description] as const,
  batchNormalize: (descriptions: string[]) =>
    ["similarity", "batchNormalize", descriptions.join(",")] as const,
  previewNormalization: (descriptions: string[]) =>
    ["similarity", "previewNormalization", descriptions.length] as const,
  canonicalGroups: () => ["similarity", "canonicalGroups"] as const,
  findSimilar: (query: string) => ["similarity", "findSimilar", query] as const,
  stats: () => ["similarity", "stats"] as const,
});

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Normalize a single merchant name
 */
export const normalizeMerchant = (description: string) =>
  defineQuery<{
    original: string;
    extracted: string;
    normalized: string;
  }>({
    queryKey: similarityKeys.normalize(description),
    queryFn: () => trpc().similarityRoutes.normalizeMerchant.query({ description }),
    options: {
      staleTime: Infinity, // Normalization is deterministic
      enabled: description.length > 0,
    },
  });

/**
 * Batch normalize merchant names
 */
export const batchNormalizeMerchants = (descriptions: string[]) =>
  defineQuery<{
    results: Array<{
      original: string;
      extracted: string;
      normalized: string;
    }>;
    total: number;
    uniqueNormalized: number;
    consolidationRatio: number;
  }>({
    queryKey: similarityKeys.batchNormalize(descriptions),
    queryFn: () => trpc().similarityRoutes.batchNormalizeMerchants.query({ descriptions }),
    options: {
      staleTime: Infinity,
      enabled: descriptions.length > 0,
    },
  });

/**
 * Preview what normalization changes would occur
 */
export const previewNormalization = (descriptions: string[]) =>
  defineQuery<{
    results: Array<{
      original: string;
      normalized: string;
      wouldChange: boolean;
    }>;
    total: number;
    changesNeeded: number;
    alreadyNormalized: number;
  }>({
    queryKey: similarityKeys.previewNormalization(descriptions),
    queryFn: () => trpc().similarityRoutes.previewNormalization.query({ descriptions }),
    options: {
      staleTime: 60 * 1000,
      enabled: descriptions.length > 0,
    },
  });

/**
 * Get all canonical payee groups for the workspace
 */
export const getCanonicalGroups = () =>
  defineQuery<{
    groups: Array<{
      canonicalName: string;
      variants: string[];
      payeeIds: number[];
    }>;
    total: number;
  }>({
    queryKey: similarityKeys.canonicalGroups(),
    queryFn: () => trpc().similarityRoutes.getCanonicalGroups.query(),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

/**
 * Find similar payees to a query string
 */
export const findSimilarPayees = (query: string, options?: { limit?: number; minScore?: number }) =>
  defineQuery<{
    query: string;
    results: Array<{
      payeeId: number;
      payeeName: string;
      similarityScore: number;
      matchType: "exact" | "fuzzy" | "semantic" | "lsh";
      category?: { id: number; name: string };
      transactionCount: number;
    }>;
    total: number;
  }>({
    queryKey: similarityKeys.findSimilar(query),
    queryFn: () =>
      trpc().similarityRoutes.findSimilarPayees.query({
        query,
        limit: options?.limit ?? 10,
        minScore: options?.minScore ?? 0.5,
      }),
    options: {
      staleTime: 60 * 1000,
      enabled: query.length >= 2,
    },
  });

/**
 * Get similarity service statistics
 */
export const getSimilarityStats = () =>
  defineQuery<{
    payeesIndexed: number;
    categoriesIndexed: number;
    canonicalGroups: number;
    lshIndexSize: number;
  }>({
    queryKey: similarityKeys.stats(),
    queryFn: () => trpc().similarityRoutes.getStats.query(),
    options: {
      staleTime: 30 * 1000,
    },
  });

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Initialize or refresh the LSH index for fast similarity lookups
 */
export const initializeSimilarityIndex = () =>
  defineMutation<
    void,
    {
      success: boolean;
      message: string;
      stats: {
        payeesIndexed: number;
        categoriesIndexed: number;
        canonicalGroups: number;
        lshIndexSize: number;
      };
    }
  >({
    mutationFn: () => trpc().similarityRoutes.initializeIndex.mutate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: similarityKeys.stats() });
    },
  });
