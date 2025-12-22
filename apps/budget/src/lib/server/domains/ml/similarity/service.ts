/**
 * Similarity & Embeddings Service
 *
 * Main service for semantic matching, payee similarity, and merchant canonicalization.
 * Combines TF-IDF vectorization, n-gram similarity, and LSH for fast approximate matching.
 */

import { categories, payees } from "$lib/schema";
import { db } from "$lib/server/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { MLModelStore } from "../model-store";
import type {
  MerchantCanonical,
  PayeeSimilarityMatch
} from "../types";
import { createLSHIndex, type LSHIndex } from "./lsh-index";
import { createMerchantCanonicalizer, type MerchantCanonicalizer } from "./merchant-canonicalizer";
import {
  computeCompositeSimilarity,
  createTFIDFVectorizer,
  normalizeText,
  type TFIDFVectorizer
} from "./text-similarity";

// =============================================================================
// Types
// =============================================================================

export interface SimilarityServiceConfig {
  similarityThreshold: number;
  maxCandidates: number;
  enableLSH: boolean;
  lshNumHashFunctions: number;
  lshNumBands: number;
}

export interface PayeeSimilarityResult {
  payeeId: number;
  payeeName: string;
  similarityScore: number;
  matchType: "exact" | "fuzzy" | "semantic" | "lsh";
  category?: {
    id: number;
    name: string;
  };
  transactionCount: number;
}

export interface CategorySimilarityResult {
  categoryId: number;
  categoryName: string;
  similarityScore: number;
  parentCategory?: string;
  typicalPayees: string[];
}

const DEFAULT_CONFIG: SimilarityServiceConfig = {
  similarityThreshold: 0.6,
  maxCandidates: 50,
  enableLSH: true,
  lshNumHashFunctions: 100,
  lshNumBands: 20,
};

// =============================================================================
// Similarity Service
// =============================================================================

export interface SimilarityService {
  /**
   * Find similar payees to a given name or description
   */
  findSimilarPayees(
    workspaceId: number,
    query: string,
    options?: { limit?: number; minScore?: number }
  ): Promise<PayeeSimilarityResult[]>;

  /**
   * Find best matching payee for import/transaction
   */
  matchPayee(
    workspaceId: number,
    transactionDescription: string
  ): Promise<PayeeSimilarityMatch | null>;

  /**
   * Get canonical form for a merchant name
   */
  getCanonical(workspaceId: number, merchantName: string): Promise<MerchantCanonical | null>;

  /**
   * Build or get canonical groups for workspace
   */
  getCanonicalGroups(
    workspaceId: number
  ): Promise<Array<{ canonicalName: string; variants: string[]; payeeIds: number[] }>>;

  /**
   * Find similar categories
   */
  findSimilarCategories(
    workspaceId: number,
    query: string,
    options?: { limit?: number }
  ): Promise<CategorySimilarityResult[]>;

  /**
   * Suggest category based on payee similarity
   */
  suggestCategoryByPayee(
    workspaceId: number,
    payeeName: string
  ): Promise<{ categoryId: number; categoryName: string; confidence: number } | null>;

  /**
   * Initialize/refresh LSH index for a workspace
   */
  initializeLSHIndex(workspaceId: number): Promise<void>;

  /**
   * Get service statistics
   */
  getStats(workspaceId: number): Promise<{
    payeesIndexed: number;
    categoriesIndexed: number;
    canonicalGroups: number;
    lshIndexSize: number;
  }>;
}

/**
 * Create the similarity service
 */
export function createSimilarityService(
  modelStore: MLModelStore,
  config: Partial<SimilarityServiceConfig> = {}
): SimilarityService {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Per-workspace state
  const merchantCanonicalizers = new Map<number, MerchantCanonicalizer>();
  const lshIndexes = new Map<number, LSHIndex>();
  const vectorizers = new Map<number, TFIDFVectorizer>();

  /**
   * Get or create merchant canonicalizer for workspace
   */
  function getCanonicalizer(workspaceId: number): MerchantCanonicalizer {
    if (!merchantCanonicalizers.has(workspaceId)) {
      merchantCanonicalizers.set(
        workspaceId,
        createMerchantCanonicalizer({
          similarityThreshold: cfg.similarityThreshold,
          maxCandidates: cfg.maxCandidates,
        })
      );
    }
    return merchantCanonicalizers.get(workspaceId)!;
  }

  /**
   * Get or create LSH index for workspace
   */
  function getLSHIndex(workspaceId: number): LSHIndex {
    if (!lshIndexes.has(workspaceId)) {
      lshIndexes.set(
        workspaceId,
        createLSHIndex({
          numHashFunctions: cfg.lshNumHashFunctions,
          numBands: cfg.lshNumBands,
        })
      );
    }
    return lshIndexes.get(workspaceId)!;
  }

  /**
   * Load payees and build TF-IDF vectorizer
   */
  async function getVectorizer(workspaceId: number): Promise<TFIDFVectorizer> {
    if (vectorizers.has(workspaceId)) {
      return vectorizers.get(workspaceId)!;
    }

    const workspacePayees = await db
      .select({ name: payees.name })
      .from(payees)
      .where(eq(payees.workspaceId, workspaceId));

    const documents = workspacePayees
      .filter((p) => p.name !== null)
      .map((p) => normalizeText(p.name!));
    const vectorizer = createTFIDFVectorizer(documents);

    vectorizers.set(workspaceId, vectorizer);
    return vectorizer;
  }

  return {
    async findSimilarPayees(
      workspaceId: number,
      query: string,
      options: { limit?: number; minScore?: number } = {}
    ): Promise<PayeeSimilarityResult[]> {
      const { limit = 10, minScore = cfg.similarityThreshold } = options;

      // Try LSH first for fast approximate matching
      if (cfg.enableLSH) {
        const lshIndex = getLSHIndex(workspaceId);
        if (lshIndex.size() > 0) {
          const lshResults = lshIndex.query(query, limit * 2);

          // Filter and enhance results
          const results: PayeeSimilarityResult[] = [];

          for (const lshResult of lshResults) {
            if (lshResult.estimatedSimilarity < minScore) continue;

            const payeeId =
              typeof lshResult.id === "number" ? lshResult.id : parseInt(lshResult.id as string);
            const metadata = lshResult.metadata as
              | { categoryId?: number; categoryName?: string; transactionCount?: number }
              | undefined;

            results.push({
              payeeId,
              payeeName: lshResult.text,
              similarityScore: lshResult.estimatedSimilarity,
              matchType: "lsh",
              category: metadata?.categoryId
                ? {
                    id: metadata.categoryId,
                    name: metadata.categoryName ?? "Unknown",
                  }
                : undefined,
              transactionCount: metadata?.transactionCount ?? 0,
            });
          }

          if (results.length >= limit) {
            return results.slice(0, limit);
          }
        }
      }

      // Fall back to full similarity search
      const canonicalizer = getCanonicalizer(workspaceId);
      const matches = await canonicalizer.findSimilarPayees(workspaceId, query, limit * 2);

      // Enhance with category data
      const payeeIds = matches.map((m) => m.payeeId);
      if (payeeIds.length === 0) {
        return [];
      }

      const payeeData = await db
        .select({
          id: payees.id,
          categoryId: payees.defaultCategoryId,
        })
        .from(payees)
        .where(inArray(payees.id, payeeIds));

      const payeeMap = new Map(payeeData.map((p) => [p.id, { ...p, transactionCount: 0 }]));

      // Get category names
      const categoryIds = payeeData
        .map((p) => p.categoryId)
        .filter((id): id is number => id !== null);

      const categoryData =
        categoryIds.length > 0
          ? await db
              .select({ id: categories.id, name: categories.name })
              .from(categories)
              .where(inArray(categories.id, categoryIds))
          : [];

      const categoryMap = new Map(categoryData.map((c) => [c.id, c.name]));

      const results: PayeeSimilarityResult[] = matches
        .filter((m) => m.similarityScore >= minScore)
        .map((m) => {
          const data = payeeMap.get(m.payeeId);
          return {
            payeeId: m.payeeId,
            payeeName: m.payeeName,
            similarityScore: m.similarityScore,
            matchType: m.matchType === "exact" ? "exact" : m.matchType === "semantic" ? "semantic" : "fuzzy",
            category: data?.categoryId
              ? {
                  id: data.categoryId,
                  name: categoryMap.get(data.categoryId) ?? "Unknown",
                }
              : undefined,
            transactionCount: data?.transactionCount ?? 0,
          };
        });

      return results.slice(0, limit);
    },

    async matchPayee(
      workspaceId: number,
      transactionDescription: string
    ): Promise<PayeeSimilarityMatch | null> {
      const canonicalizer = getCanonicalizer(workspaceId);
      return canonicalizer.matchPayee(workspaceId, transactionDescription);
    },

    async getCanonical(workspaceId: number, merchantName: string): Promise<MerchantCanonical | null> {
      const canonicalizer = getCanonicalizer(workspaceId);
      return canonicalizer.getCanonical(workspaceId, merchantName);
    },

    async getCanonicalGroups(
      workspaceId: number
    ): Promise<Array<{ canonicalName: string; variants: string[]; payeeIds: number[] }>> {
      const canonicalizer = getCanonicalizer(workspaceId);
      const groups = await canonicalizer.buildCanonicalGroups(workspaceId);

      return groups.map((g) => ({
        canonicalName: g.canonicalName,
        variants: g.members.map((m) => m.payeeName),
        payeeIds: g.members.map((m) => m.payeeId),
      }));
    },

    async findSimilarCategories(
      workspaceId: number,
      query: string,
      options: { limit?: number } = {}
    ): Promise<CategorySimilarityResult[]> {
      const { limit = 5 } = options;

      // Get all categories for workspace
      const workspaceCategories = await db
        .select({
          id: categories.id,
          name: categories.name,
          parentId: categories.parentId,
        })
        .from(categories)
        .where(eq(categories.workspaceId, workspaceId));

      // Build vectorizer for categories (filter out null names)
      const validCategories = workspaceCategories.filter((c) => c.name !== null);
      const documents = validCategories.map((c) => normalizeText(c.name!));
      const vectorizer = createTFIDFVectorizer(documents);

      // Compute similarity for each category
      const results: CategorySimilarityResult[] = [];
      const normalizedQuery = normalizeText(query);

      for (const category of validCategories) {
        const similarity = computeCompositeSimilarity(
          normalizedQuery,
          normalizeText(category.name!),
          vectorizer
        );

        if (similarity.composite >= cfg.similarityThreshold * 0.8) {
          // Find parent name if exists
          let parentName: string | undefined;
          if (category.parentId) {
            const parent = validCategories.find((c) => c.id === category.parentId);
            parentName = parent?.name ?? undefined;
          }

          // Get typical payees for this category
          const typicalPayeesResult = await db
            .select({ name: payees.name })
            .from(payees)
            .where(
              and(eq(payees.workspaceId, workspaceId), eq(payees.defaultCategoryId, category.id))
            )
            .orderBy(desc(payees.id)) // Order by id instead of non-existent transactionCount
            .limit(3);

          results.push({
            categoryId: category.id,
            categoryName: category.name!,
            similarityScore: similarity.composite,
            parentCategory: parentName,
            typicalPayees: typicalPayeesResult.filter((p) => p.name !== null).map((p) => p.name!),
          });
        }
      }

      // Sort by similarity
      results.sort((a, b) => b.similarityScore - a.similarityScore);

      return results.slice(0, limit);
    },

    async suggestCategoryByPayee(
      workspaceId: number,
      payeeName: string
    ): Promise<{ categoryId: number; categoryName: string; confidence: number } | null> {
      // Find similar payees
      const similarPayees = await this.findSimilarPayees(workspaceId, payeeName, {
        limit: 10,
        minScore: 0.5,
      });

      if (similarPayees.length === 0) {
        return null;
      }

      // Count category votes weighted by similarity
      const categoryVotes = new Map<number, { name: string; weight: number }>();

      for (const payee of similarPayees) {
        if (payee.category) {
          const existing = categoryVotes.get(payee.category.id);
          if (existing) {
            existing.weight += payee.similarityScore * (payee.transactionCount + 1);
          } else {
            categoryVotes.set(payee.category.id, {
              name: payee.category.name,
              weight: payee.similarityScore * (payee.transactionCount + 1),
            });
          }
        }
      }

      if (categoryVotes.size === 0) {
        return null;
      }

      // Find highest voted category
      let bestCategory: { id: number; name: string; weight: number } | null = null;
      let totalWeight = 0;

      for (const [id, data] of categoryVotes) {
        totalWeight += data.weight;
        if (!bestCategory || data.weight > bestCategory.weight) {
          bestCategory = { id, name: data.name, weight: data.weight };
        }
      }

      if (!bestCategory) {
        return null;
      }

      // Confidence is the proportion of weighted votes for the best category
      const confidence = bestCategory.weight / totalWeight;

      return {
        categoryId: bestCategory.id,
        categoryName: bestCategory.name,
        confidence: Math.min(confidence, 0.95), // Cap at 95%
      };
    },

    async initializeLSHIndex(workspaceId: number): Promise<void> {
      const lshIndex = getLSHIndex(workspaceId);

      // Clear existing index
      lshIndex.clear();

      // Load all payees
      const workspacePayees = await db
        .select({
          id: payees.id,
          name: payees.name,
          defaultCategoryId: payees.defaultCategoryId,
        })
        .from(payees)
        .where(eq(payees.workspaceId, workspaceId));

      // Filter to valid payees (with non-null names)
      const validPayees = workspacePayees.filter((p) => p.name !== null);

      // Get category names
      const categoryIds = validPayees
        .map((p) => p.defaultCategoryId)
        .filter((id): id is number => id !== null);

      const categoryData =
        categoryIds.length > 0
          ? await db
              .select({ id: categories.id, name: categories.name })
              .from(categories)
              .where(inArray(categories.id, categoryIds))
          : [];

      const categoryMap = new Map(categoryData.map((c) => [c.id, c.name]));

      // Add each payee to the index
      for (const payee of validPayees) {
        const textToIndex = normalizeText(payee.name!);

        lshIndex.add(payee.id, textToIndex, {
          categoryId: payee.defaultCategoryId,
          categoryName: payee.defaultCategoryId
            ? categoryMap.get(payee.defaultCategoryId) ?? undefined
            : undefined,
          transactionCount: 0, // Not tracked in schema
        });
      }

      // Also invalidate vectorizer cache
      vectorizers.delete(workspaceId);
    },

    async getStats(workspaceId: number): Promise<{
      payeesIndexed: number;
      categoriesIndexed: number;
      canonicalGroups: number;
      lshIndexSize: number;
    }> {
      const lshIndex = getLSHIndex(workspaceId);

      const [payeeCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(payees)
        .where(eq(payees.workspaceId, workspaceId));

      const [categoryCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(categories)
        .where(eq(categories.workspaceId, workspaceId));

      const canonicalizer = getCanonicalizer(workspaceId);
      const groups = await canonicalizer.buildCanonicalGroups(workspaceId);

      return {
        payeesIndexed: payeeCount?.count ?? 0,
        categoriesIndexed: categoryCount?.count ?? 0,
        canonicalGroups: groups.length,
        lshIndexSize: lshIndex.size(),
      };
    },
  };
}
