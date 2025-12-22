/**
 * Merchant Canonicalizer
 *
 * Groups similar merchant names into canonical forms and manages
 * merchant variants for better categorization and reporting.
 */

import { payees } from "$lib/schema";
import { db } from "$lib/server/db";
import { eq } from "drizzle-orm";
import type { MerchantCanonical, PayeeSimilarityMatch } from "../types";
import {
  computeCompositeSimilarity,
  createTFIDFVectorizer,
  extractMerchantName,
  merchantSimilarity,
  normalizeMerchantName,
  normalizeText,
  type TFIDFVectorizer,
} from "./text-similarity";

// =============================================================================
// Types
// =============================================================================

export interface CanonicalGroup {
  canonicalId: string;
  canonicalName: string;
  members: Array<{
    payeeId: number;
    payeeName: string;
    normalizedName: string;
    transactionCount: number;
    confidence: number;
  }>;
  suggestedCategory?: {
    categoryId: number;
    categoryName: string;
    confidence: number;
  };
}

export interface CanonicalizerConfig {
  similarityThreshold: number; // Minimum similarity to group (0-1)
  minGroupSize: number; // Minimum members to form a canonical group
  maxCandidates: number; // Max candidates to check per payee
}

const DEFAULT_CONFIG: CanonicalizerConfig = {
  similarityThreshold: 0.7,
  minGroupSize: 1,
  maxCandidates: 100,
};

// =============================================================================
// Merchant Canonicalizer
// =============================================================================

export interface MerchantCanonicalizer {
  /**
   * Find similar payees to a given payee name
   */
  findSimilarPayees(
    workspaceId: number,
    payeeName: string,
    limit?: number
  ): Promise<PayeeSimilarityMatch[]>;

  /**
   * Build canonical groups for all payees in a workspace
   */
  buildCanonicalGroups(workspaceId: number): Promise<CanonicalGroup[]>;

  /**
   * Get or create canonical form for a merchant name
   */
  getCanonical(workspaceId: number, merchantName: string): Promise<MerchantCanonical | null>;

  /**
   * Suggest canonical name for a new payee
   */
  suggestCanonical(
    workspaceId: number,
    payeeName: string
  ): Promise<{
    suggested: string;
    confidence: number;
    matchedPayees: PayeeSimilarityMatch[];
  }>;

  /**
   * Find the best matching existing payee for a transaction description
   */
  matchPayee(
    workspaceId: number,
    transactionDescription: string
  ): Promise<PayeeSimilarityMatch | null>;

  /**
   * Refresh the TF-IDF vectorizer for a workspace
   */
  refreshVectorizer(workspaceId: number): Promise<void>;
}

/**
 * Create a merchant canonicalizer service
 */
export function createMerchantCanonicalizer(
  config: Partial<CanonicalizerConfig> = {}
): MerchantCanonicalizer {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Cache for TF-IDF vectorizers per workspace
  const vectorizerCache = new Map<number, TFIDFVectorizer>();
  const payeeCache = new Map<
    number,
    Array<{
      id: number;
      name: string;
      normalizedName: string;
      transactionCount: number;
    }>
  >();

  /**
   * Load payees for a workspace
   */
  async function loadWorkspacePayees(workspaceId: number) {
    const cached = payeeCache.get(workspaceId);
    if (cached) {
      return cached;
    }

    const result = await db
      .select({
        id: payees.id,
        name: payees.name,
      })
      .from(payees)
      .where(eq(payees.workspaceId, workspaceId));

    const mapped = result
      .filter((p) => p.name !== null)
      .map((p) => ({
        id: p.id,
        name: p.name!,
        normalizedName: normalizeText(p.name!),
        transactionCount: 0, // We don't track this in the schema, default to 0
      }));

    payeeCache.set(workspaceId, mapped);
    return mapped;
  }

  /**
   * Get or build TF-IDF vectorizer for workspace
   */
  async function getVectorizer(workspaceId: number): Promise<TFIDFVectorizer> {
    const cached = vectorizerCache.get(workspaceId);
    if (cached) {
      return cached;
    }

    const workspacePayees = await loadWorkspacePayees(workspaceId);
    const documents = workspacePayees.map((p) => p.normalizedName);
    const vectorizer = createTFIDFVectorizer(documents);

    vectorizerCache.set(workspaceId, vectorizer);
    return vectorizer;
  }

  return {
    async findSimilarPayees(
      workspaceId: number,
      payeeName: string,
      limit: number = 10
    ): Promise<PayeeSimilarityMatch[]> {
      const workspacePayees = await loadWorkspacePayees(workspaceId);
      const vectorizer = await getVectorizer(workspaceId);
      const cleanedName = extractMerchantName(payeeName);
      const normalizedInput = normalizeText(payeeName);

      const matches: PayeeSimilarityMatch[] = [];

      for (const payee of workspacePayees) {
        // Skip if exact match
        if (payee.normalizedName === normalizedInput) {
          matches.push({
            payeeId: payee.id,
            payeeName: payee.name,
            normalizedName: payee.normalizedName,
            similarityScore: 1,
            matchType: "exact",
          });
          continue;
        }

        // Compute similarity
        const similarity = computeCompositeSimilarity(cleanedName, payee.normalizedName, vectorizer);

        if (similarity.composite >= cfg.similarityThreshold) {
          let matchType: PayeeSimilarityMatch["matchType"] = "fuzzy";

          if (similarity.normalized) {
            matchType = "exact";
          } else if (similarity.tfidf && similarity.tfidf > 0.8) {
            matchType = "semantic";
          }

          matches.push({
            payeeId: payee.id,
            payeeName: payee.name,
            normalizedName: payee.normalizedName,
            similarityScore: similarity.composite,
            matchType,
          });
        }
      }

      // Sort by similarity descending
      matches.sort((a, b) => b.similarityScore - a.similarityScore);

      return matches.slice(0, limit);
    },

    async buildCanonicalGroups(workspaceId: number): Promise<CanonicalGroup[]> {
      const workspacePayees = await loadWorkspacePayees(workspaceId);
      const vectorizer = await getVectorizer(workspaceId);

      // Union-Find for grouping
      const parent = new Map<number, number>();
      const rank = new Map<number, number>();

      function find(x: number): number {
        if (!parent.has(x)) {
          parent.set(x, x);
          rank.set(x, 0);
        }
        if (parent.get(x) !== x) {
          parent.set(x, find(parent.get(x)!));
        }
        return parent.get(x)!;
      }

      function union(x: number, y: number): void {
        const px = find(x);
        const py = find(y);
        if (px === py) return;

        const rx = rank.get(px) ?? 0;
        const ry = rank.get(py) ?? 0;

        if (rx < ry) {
          parent.set(px, py);
        } else if (rx > ry) {
          parent.set(py, px);
        } else {
          parent.set(py, px);
          rank.set(px, rx + 1);
        }
      }

      // Compare all pairs and group similar ones
      for (let i = 0; i < workspacePayees.length; i++) {
        for (let j = i + 1; j < workspacePayees.length; j++) {
          const p1 = workspacePayees[i];
          const p2 = workspacePayees[j];

          const similarity = computeCompositeSimilarity(
            p1.normalizedName,
            p2.normalizedName,
            vectorizer
          );

          if (similarity.composite >= cfg.similarityThreshold) {
            union(p1.id, p2.id);
          }
        }
      }

      // Build groups from union-find
      const groupMap = new Map<number, CanonicalGroup>();

      for (const payee of workspacePayees) {
        const root = find(payee.id);

        if (!groupMap.has(root)) {
          groupMap.set(root, {
            canonicalId: `canonical_${root}`,
            canonicalName: "", // Will be determined later
            members: [],
          });
        }

        groupMap.get(root)!.members.push({
          payeeId: payee.id,
          payeeName: payee.name,
          normalizedName: payee.normalizedName,
          transactionCount: payee.transactionCount,
          confidence: 1,
        });
      }

      // Determine canonical name for each group (most common or shortest clean name)
      const groups: CanonicalGroup[] = [];

      for (const group of groupMap.values()) {
        if (group.members.length < cfg.minGroupSize) {
          continue;
        }

        // Sort members by transaction count (most used first)
        group.members.sort((a, b) => b.transactionCount - a.transactionCount);

        // Use the most used payee's name as canonical, but clean it
        const primaryMember = group.members[0];
        group.canonicalName = normalizeMerchantName(primaryMember.payeeName);

        // Calculate confidence for each member based on similarity to canonical
        for (const member of group.members) {
          const similarity = merchantSimilarity(member.payeeName, group.canonicalName);
          member.confidence = similarity;
        }

        groups.push(group);
      }

      return groups;
    },

    async getCanonical(
      workspaceId: number,
      merchantName: string
    ): Promise<MerchantCanonical | null> {
      const matches = await this.findSimilarPayees(workspaceId, merchantName, 20);

      if (matches.length === 0) {
        return null;
      }

      // Find or create canonical group
      const groups = await this.buildCanonicalGroups(workspaceId);
      const primaryMatch = matches[0];

      // Find which group the primary match belongs to
      for (const group of groups) {
        if (group.members.some((m) => m.payeeId === primaryMatch.payeeId)) {
          return {
            canonicalName: group.canonicalName,
            canonicalId: group.canonicalId,
            variants: group.members.map((m) => ({
              name: m.payeeName,
              frequency: m.transactionCount,
              confidence: m.confidence,
            })),
            category: group.suggestedCategory
              ? {
                  id: group.suggestedCategory.categoryId,
                  name: group.suggestedCategory.categoryName,
                  confidence: group.suggestedCategory.confidence,
                }
              : undefined,
          };
        }
      }

      // No existing group, return as standalone canonical
      return {
        canonicalName: normalizeMerchantName(merchantName),
        canonicalId: `new_${Date.now()}`,
        variants: matches.map((m) => ({
          name: m.payeeName,
          frequency: 0, // Unknown
          confidence: m.similarityScore,
        })),
      };
    },

    async suggestCanonical(
      workspaceId: number,
      payeeName: string
    ): Promise<{
      suggested: string;
      confidence: number;
      matchedPayees: PayeeSimilarityMatch[];
    }> {
      const matches = await this.findSimilarPayees(workspaceId, payeeName, 5);

      if (matches.length === 0) {
        // No matches, suggest cleaned version of input
        return {
          suggested: normalizeMerchantName(payeeName),
          confidence: 0.5,
          matchedPayees: [],
        };
      }

      // If we have strong matches, use the most common one
      const strongMatches = matches.filter((m) => m.similarityScore >= 0.85);

      if (strongMatches.length > 0) {
        // Find the payee with highest transaction count among strong matches
        const workspacePayees = await loadWorkspacePayees(workspaceId);
        const payeeMap = new Map(workspacePayees.map((p) => [p.id, p]));

        let bestMatch = strongMatches[0];
        let bestCount = payeeMap.get(bestMatch.payeeId)?.transactionCount ?? 0;

        for (const match of strongMatches) {
          const count = payeeMap.get(match.payeeId)?.transactionCount ?? 0;
          if (count > bestCount) {
            bestMatch = match;
            bestCount = count;
          }
        }

        return {
          suggested: bestMatch.payeeName,
          confidence: bestMatch.similarityScore,
          matchedPayees: matches,
        };
      }

      // Moderate matches, suggest the top one
      return {
        suggested: matches[0].payeeName,
        confidence: matches[0].similarityScore,
        matchedPayees: matches,
      };
    },

    async matchPayee(
      workspaceId: number,
      transactionDescription: string
    ): Promise<PayeeSimilarityMatch | null> {
      const cleanedDescription = extractMerchantName(transactionDescription);
      const matches = await this.findSimilarPayees(workspaceId, cleanedDescription, 1);

      if (matches.length === 0) {
        return null;
      }

      const bestMatch = matches[0];

      // Only return if confidence is high enough
      if (bestMatch.similarityScore >= cfg.similarityThreshold) {
        return bestMatch;
      }

      return null;
    },

    async refreshVectorizer(workspaceId: number): Promise<void> {
      // Clear caches to force refresh
      vectorizerCache.delete(workspaceId);
      payeeCache.delete(workspaceId);

      // Rebuild
      await getVectorizer(workspaceId);
    },
  };
}

