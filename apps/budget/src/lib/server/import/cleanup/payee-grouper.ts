/**
 * Payee Grouper Service
 *
 * Groups similar payees from import data and matches them to existing payees.
 * Uses multiple similarity algorithms for robust matching.
 */

import type { Payee } from "$lib/schema/payees";
import type { PayeeAlias } from "$lib/schema/payee-aliases";
import type { TransferMappingWithAccount } from "$lib/schema/transfer-mappings";
import type { PayeeGroup, PayeeGroupMember, ExistingPayeeMatch } from "$lib/types/import";
import { getPayeeAliasService } from "$lib/server/domains/payees/alias-service";
import { getTransferMappingService } from "$lib/server/domains/transfers";
import { distance as fastLevenshtein } from "fastest-levenshtein";
import { PayeeMatcher } from "../matchers/payee-matcher";
import { normalizePayeeName } from "../utils";
import { cleanStringForFuzzyMatching, normalize } from "$lib/utils/string-utilities";
import { createId } from "@paralleldrive/cuid2";

/**
 * Configuration for payee grouping thresholds
 */
export interface PayeeGrouperConfig {
  /** Minimum similarity score to group payees together (0-1) */
  groupingThreshold: number;
  /** Minimum similarity score to match existing payee (0-1) */
  existingMatchThreshold: number;
  /** Score above which to auto-accept grouping */
  autoAcceptThreshold: number;
  /** Maximum number of existing payee matches to return */
  maxExistingMatches: number;
}

const DEFAULT_CONFIG: PayeeGrouperConfig = {
  groupingThreshold: 0.8,
  existingMatchThreshold: 0.7,
  autoAcceptThreshold: 0.95,
  maxExistingMatches: 5,
};

/**
 * Input row for payee grouping
 */
export interface PayeeGroupInput {
  rowIndex: number;
  payeeName: string;
  /** Raw CSV payee string for alias tracking. Falls back to payeeName if not provided. */
  originalPayee?: string;
}

/**
 * Result of payee grouping analysis
 */
export interface PayeeGrouperResult {
  groups: PayeeGroup[];
  stats: {
    totalPayees: number;
    uniqueGroups: number;
    existingMatches: number;
    autoAccepted: number;
  };
}

export class PayeeGrouper {
  private config: PayeeGrouperConfig;
  private payeeMatcher: PayeeMatcher;

  constructor(config: Partial<PayeeGrouperConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...Object.fromEntries(Object.entries(config ?? {}).filter(([, v]) => v !== undefined)) };
    this.payeeMatcher = new PayeeMatcher();
  }

  /**
   * Analyze and group similar payees from import data
   * @param inputs - Raw payee data from import
   * @param existingPayees - Existing payees in the workspace
   * @param workspaceId - Optional workspace ID for checking saved aliases/mappings
   */
  async analyzePayees(
    inputs: PayeeGroupInput[],
    existingPayees: Payee[],
    workspaceId?: number
  ): Promise<PayeeGrouperResult> {
    // Step 1: Normalize all payee names
    // Use input.originalPayee (raw CSV string) if provided, otherwise fall back to payeeName
    const normalizedInputs = inputs.map((input) => ({
      ...input,
      originalPayee: input.originalPayee || input.payeeName,
      normalizedPayee: this.normalizeForGrouping(input.payeeName),
      cleanedPayee: this.payeeMatcher.cleanPayeeName(input.payeeName),
    }));

    // Step 2: Group similar payees using Union-Find algorithm
    const groups = this.groupSimilarPayees(normalizedInputs);

    // Step 3: Match groups to existing payees
    const groupsWithMatches = await this.matchToExistingPayees(groups, existingPayees);

    // Step 4: Apply saved choices from previous imports (aliases and transfer mappings)
    const groupsWithSavedChoices = workspaceId
      ? await this.applySavedChoices(groupsWithMatches, existingPayees, workspaceId)
      : groupsWithMatches;

    // Step 5: Calculate statistics
    const stats = this.calculateStats(groupsWithSavedChoices);

    return {
      groups: groupsWithSavedChoices,
      stats,
    };
  }

  /**
   * Normalize payee name for grouping purposes
   */
  private normalizeForGrouping(name: string): string {
    if (!name) return "";

    // Use the standard normalization
    let normalized = normalizePayeeName(name);

    // Additional cleaning for grouping
    normalized = normalized
      // Remove common transaction prefixes
      .replace(/^(debit|credit|pos|atm|check|sq\s*\*|tst\*|pymt|pmt|ach)\s*/i, "")
      // Remove store numbers
      .replace(/\s*#\d+\s*$/g, "")
      // Remove dollar amounts ($50.00, $1,234.56)
      .replace(/\s*\$[\d,]+(?:\.\d{2})?\s*/g, " ")
      // Remove location suffixes
      .replace(/\s+\d+\s*$/g, "")
      // Remove trailing transaction IDs
      .replace(/\s+[a-z0-9]{8,}$/i, "")
      .trim();

    return normalized;
  }

  /**
   * Group similar payees using Union-Find algorithm
   */
  private groupSimilarPayees(
    inputs: Array<{
      rowIndex: number;
      originalPayee: string;
      normalizedPayee: string;
      cleanedPayee: string;
    }>
  ): PayeeGroup[] {
    const n = inputs.length;
    if (n === 0) return [];

    // Union-Find data structure
    const parent = new Array(n).fill(0).map((_, i) => i);
    const rank = new Array(n).fill(0);

    const find = (x: number): number => {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]);
      }
      return parent[x];
    };

    const union = (x: number, y: number): void => {
      const rootX = find(x);
      const rootY = find(y);
      if (rootX !== rootY) {
        if (rank[rootX] < rank[rootY]) {
          parent[rootX] = rootY;
        } else if (rank[rootX] > rank[rootY]) {
          parent[rootY] = rootX;
        } else {
          parent[rootY] = rootX;
          rank[rootX]++;
        }
      }
    };

    // Cache for similarity scores (reused during confidence computation)
    const similarityCache = new Map<string, number>();
    const cacheKey = (i: number, j: number) => i < j ? `${i}:${j}` : `${j}:${i}`;

    // The maximum Levenshtein distance that could still yield a score >= threshold.
    // Since levenshteinSim contributes at most 0.6 weight, and word overlap at most 0.3,
    // and substring bonus at most 0.1, we need levenshteinSim to be at least
    // (threshold - 0.3 - 0.1) / 0.6 in the best case. But for a quick pre-filter,
    // we use a length-ratio check: if lengths differ too much, Levenshtein similarity
    // can't reach the threshold.
    const threshold = this.config.groupingThreshold;

    // Compare all pairs and union similar ones (with early-exit optimizations)
    for (let i = 0; i < n; i++) {
      const nameI = inputs[i].normalizedPayee;
      const lenI = nameI.length;
      if (!nameI) continue;

      for (let j = i + 1; j < n; j++) {
        // Skip pairs already in the same group
        if (find(i) === find(j)) continue;

        const nameJ = inputs[j].normalizedPayee;
        const lenJ = nameJ.length;
        if (!nameJ) continue;

        // Length ratio pre-filter: if lengths differ too much, Levenshtein similarity
        // will be too low. max edit distance for threshold T with weight 0.6 is
        // maxLen * (1 - (T - 0.4) / 0.6) — but a simpler check: if the shorter
        // string is less than 50% of the longer, skip (similarity can't reach 0.8)
        const maxLen = Math.max(lenI, lenJ);
        const minLen = Math.min(lenI, lenJ);
        if (minLen < maxLen * 0.5) continue;

        const similarity = this.calculatePayeeSimilarity(nameI, nameJ);
        similarityCache.set(cacheKey(i, j), similarity);

        if (similarity >= threshold) {
          union(i, j);
        }
      }
    }

    // Build groups from Union-Find result, tracking input indices for cache lookups
    const groupMap = new Map<number, { members: PayeeGroupMember[]; indices: number[] }>();

    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!groupMap.has(root)) {
        groupMap.set(root, { members: [], indices: [] });
      }
      const group = groupMap.get(root)!;
      group.members.push({
        rowIndex: inputs[i].rowIndex,
        originalPayee: inputs[i].originalPayee,
        normalizedPayee: inputs[i].normalizedPayee,
      });
      group.indices.push(i);
    }

    // Convert to PayeeGroup array
    const groups: PayeeGroup[] = [];

    for (const [, { members, indices }] of groupMap) {
      const canonicalName = this.selectCanonicalName(members);
      const confidence = this.calculateGroupConfidence(members, indices, similarityCache, cacheKey);

      groups.push({
        groupId: createId(),
        canonicalName,
        confidence,
        members,
        userDecision: confidence >= this.config.autoAcceptThreshold ? "accept" : "pending",
      });
    }

    // Sort by number of members (largest groups first)
    groups.sort((a, b) => b.members.length - a.members.length);

    return groups;
  }

  /**
   * Calculate similarity between two payee names using multiple algorithms
   */
  private calculatePayeeSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;
    if (name1 === name2) return 1;

    // Levenshtein similarity using optimized WASM-backed implementation
    const maxLen = Math.max(name1.length, name2.length);
    const editDist = fastLevenshtein(name1, name2);
    const levenshteinSim = (maxLen - editDist) / maxLen;

    // Check for substring match
    let substringBonus = 0;
    if (name1.includes(name2) || name2.includes(name1)) {
      substringBonus = 0.1;
    }

    // Check for common word overlap
    const words1 = new Set(name1.split(/\s+/));
    const words2 = new Set(name2.split(/\s+/));
    const intersection = [...words1].filter((w) => words2.has(w));
    const wordOverlap = intersection.length / Math.max(words1.size, words2.size);

    // Weighted combination
    return Math.min(1, levenshteinSim * 0.6 + wordOverlap * 0.3 + substringBonus);
  }

  /**
   * Select the best canonical name for a group.
   * Uses original payee strings to preserve casing (like "IBMC", "MidAmerican").
   */
  private selectCanonicalName(members: PayeeGroupMember[]): string {
    // Count occurrences of each original payee (preserves casing)
    const nameCounts = new Map<string, { count: number; original: string }>();
    for (const member of members) {
      // Use normalized version as key for grouping, but store original for casing
      const key = member.normalizedPayee;
      const existing = nameCounts.get(key);
      if (existing) {
        existing.count++;
        // Prefer shorter original names (less noise like transaction IDs)
        if (member.originalPayee.length < existing.original.length) {
          existing.original = member.originalPayee;
        }
      } else {
        nameCounts.set(key, { count: 1, original: member.originalPayee });
      }
    }

    // Find the most frequent name
    let bestEntry = { count: 0, original: members[0].originalPayee };
    let bestNormalized = members[0].normalizedPayee;

    for (const [normalized, entry] of nameCounts) {
      // Prefer more frequent names, but also prefer shorter names (less noise)
      const score = entry.count * 10 - normalized.length;
      const bestScore = bestEntry.count * 10 - bestNormalized.length;
      if (entry.count > bestEntry.count || (entry.count === bestEntry.count && score > bestScore)) {
        bestEntry = entry;
        bestNormalized = normalized;
      }
    }

    // Apply smart capitalization to the original string
    return this.smartCapitalize(bestEntry.original);
  }

  /**
   * Apply smart capitalization that preserves acronyms and camelCase patterns.
   * Examples:
   * - "IBMC" stays "IBMC" (all caps acronym)
   * - "MidAmerican" stays "MidAmerican" (camelCase preserved)
   * - "walmart" becomes "Walmart" (needs capitalization)
   * - "WALMART #1234 DALLAS TX" becomes "Walmart" (cleaned and capitalized)
   */
  private smartCapitalize(name: string): string {
    // First, clean the name (remove store numbers, transaction IDs, amounts, etc.)
    let cleaned = name
      .replace(/\s*#\d+\s*/g, " ") // Remove store numbers
      .replace(/\s+\d{4,}\s*/g, " ") // Remove long number sequences
      .replace(/\s*\$[\d,]+(?:\.\d{2})?\s*/g, " ") // Remove dollar amounts ($50.00, $1,234.56)
      .replace(/\s+[A-Z]{2}\s*$/i, "") // Remove state codes at end
      .replace(/\s{2,}/g, " ") // Collapse multiple spaces
      .trim();

    // If cleaned result is empty, use original
    if (!cleaned) cleaned = name.trim();

    // Split into words and process each
    return cleaned
      .split(" ")
      .filter((word) => word.length > 0)
      .map((word) => {
        // Check if word is an acronym (all uppercase, 2-5 chars)
        if (
          word.length >= 2 &&
          word.length <= 5 &&
          word === word.toUpperCase() &&
          /^[A-Z]+$/.test(word)
        ) {
          return word; // Keep acronyms as-is
        }

        // Check if word has intentional mixed case (like "MidAmerican", "iPhone")
        // Has uppercase in middle or end = intentional casing
        if (/[a-z][A-Z]/.test(word) || /[A-Z][a-z]+[A-Z]/.test(word)) {
          return word; // Preserve intentional mixed case
        }

        // Common abbreviations should be uppercase
        if (["llc", "inc", "ltd", "corp", "co", "usa", "atm", "pos"].includes(word.toLowerCase())) {
          return word.toUpperCase();
        }

        // If all uppercase and longer than acronym length, apply title case
        if (word === word.toUpperCase() && word.length > 5) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }

        // If all lowercase, apply title case
        if (word === word.toLowerCase()) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }

        // Otherwise preserve existing casing
        return word;
      })
      .join(" ");
  }

  /**
   * Calculate confidence score for a group
   */
  private calculateGroupConfidence(
    members: PayeeGroupMember[],
    indices?: number[],
    cache?: Map<string, number>,
    cacheKeyFn?: (i: number, j: number) => string
  ): number {
    if (members.length === 1) return 1;

    let totalSimilarity = 0;
    let pairs = 0;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        // Use cached score when available (avoids recomputing Levenshtein)
        let similarity: number | undefined;
        if (cache && cacheKeyFn && indices) {
          similarity = cache.get(cacheKeyFn(indices[i], indices[j]));
        }
        if (similarity === undefined) {
          similarity = this.calculatePayeeSimilarity(
            members[i].normalizedPayee,
            members[j].normalizedPayee
          );
        }
        totalSimilarity += similarity;
        pairs++;
      }
    }

    return pairs > 0 ? totalSimilarity / pairs : 1;
  }

  /**
   * Match groups to existing payees in the database
   */
  private async matchToExistingPayees(
    groups: PayeeGroup[],
    existingPayees: Payee[]
  ): Promise<PayeeGroup[]> {
    if (existingPayees.length === 0) return groups;

    return groups.map((group) => {
      const matches = this.payeeMatcher.findPotentialMatches(
        group.canonicalName,
        existingPayees,
        this.config.existingMatchThreshold,
        this.config.maxExistingMatches
      );

      const bestMatch = matches[0];
      if (bestMatch && bestMatch.payee) {
        const matchedPayee = bestMatch.payee;
        const existingMatch: ExistingPayeeMatch = {
          id: matchedPayee.id,
          name: matchedPayee.name ?? group.canonicalName,
          confidence: bestMatch.score,
        };

        // Use the existing payee's name as canonical for high-confidence matches
        const shouldUseExistingName =
          bestMatch.score >= this.config.autoAcceptThreshold && matchedPayee.name;

        return {
          ...group,
          existingMatch,
          // Update canonical name to the clean existing payee name
          canonicalName: shouldUseExistingName ? matchedPayee.name! : group.canonicalName,
          // Auto-accept if high confidence match to existing payee
          userDecision:
            bestMatch.score >= this.config.autoAcceptThreshold ? "accept" : group.userDecision,
        };
      }

      return group;
    });
  }

  /**
   * Calculate statistics for the grouping result
   */
  private calculateStats(groups: PayeeGroup[]): PayeeGrouperResult["stats"] {
    return {
      totalPayees: groups.reduce((sum, g) => sum + g.members.length, 0),
      uniqueGroups: groups.length,
      existingMatches: groups.filter((g) => g.existingMatch).length,
      autoAccepted: groups.filter((g) => g.userDecision === "accept").length,
    };
  }

  /**
   * Find a transfer mapping match for a raw payee string using in-memory data.
   * Replicates the 3-tier matching logic: exact -> normalized -> cleaned.
   */
  private findTransferMappingInMemory(
    rawPayeeString: string,
    allMappings: TransferMappingWithAccount[]
  ): TransferMappingWithAccount | null {
    // Tier 1: Exact raw string match
    const exactMatch = allMappings.find((m) => m.rawPayeeString === rawPayeeString);
    if (exactMatch) return exactMatch;

    // Tier 2: Normalized string match
    const normalizedInput = normalize(rawPayeeString);
    const normalizedMatch = allMappings.find((m) => m.normalizedString === normalizedInput);
    if (normalizedMatch) return normalizedMatch;

    // Tier 3: Cleaned string match (strips amounts, IDs, etc.)
    const cleanedInput = cleanStringForFuzzyMatching(rawPayeeString);
    if (cleanedInput.length >= 3) {
      const cleanedMatches = allMappings.filter((m) => {
        const cleanedMapping = cleanStringForFuzzyMatching(m.rawPayeeString);
        return cleanedMapping === cleanedInput;
      });

      if (cleanedMatches.length > 0) {
        // Return the most used mapping
        return cleanedMatches.sort((a, b) => b.matchCount - a.matchCount)[0];
      }
    }

    return null;
  }

  /**
   * Find a payee alias match for a raw string using in-memory data.
   * Replicates the 3-tier matching logic: exact -> normalized -> cleaned.
   * Returns the alias match info (payeeId, confidence) or null.
   */
  private findAliasInMemory(
    rawString: string,
    allAliases: PayeeAlias[]
  ): { payeeId: number; confidence: number } | null {
    // Tier 1: Exact raw string match
    const exactMatch = allAliases.find((a) => a.rawString === rawString);
    if (exactMatch) {
      return { payeeId: exactMatch.payeeId, confidence: exactMatch.confidence };
    }

    // Tier 2: Normalized string match
    const normalizedInput = normalize(rawString);
    const normalizedMatches = allAliases.filter((a) => a.normalizedString === normalizedInput);
    if (normalizedMatches.length > 0) {
      // Return the most used alias for this normalized string (already sorted by matchCount desc)
      const bestMatch = normalizedMatches[0];
      return { payeeId: bestMatch.payeeId, confidence: bestMatch.confidence * 0.9 };
    }

    // Tier 3: Cleaned string match
    const cleanedInput = cleanStringForFuzzyMatching(rawString);
    if (cleanedInput.length >= 3) {
      const cleanedMatches = allAliases.filter((a) => {
        const cleanedAlias = cleanStringForFuzzyMatching(a.rawString);
        return cleanedAlias === cleanedInput;
      });

      if (cleanedMatches.length > 0) {
        // Return the most used alias with matching cleaned string
        const bestMatch = cleanedMatches.sort((a, b) => b.matchCount - a.matchCount)[0];
        return { payeeId: bestMatch.payeeId, confidence: bestMatch.confidence * 0.8 };
      }
    }

    return null;
  }

  /**
   * Apply saved choices from previous imports.
   * Checks payee aliases and transfer mappings to pre-populate user decisions.
   * Prefetches all data in bulk to avoid N+1 query patterns.
   */
  private async applySavedChoices(
    groups: PayeeGroup[],
    existingPayees: Payee[],
    workspaceId: number
  ): Promise<PayeeGroup[]> {
    const aliasService = getPayeeAliasService();
    const transferService = getTransferMappingService();

    // Prefetch all transfer mappings and aliases in parallel (2 queries total)
    const [allTransferMappings, allAliases] = await Promise.all([
      transferService.getAllMappingsWithAccounts(workspaceId),
      aliasService.getAllAliases(workspaceId),
    ]);

    return groups.map((group) => {
      // Skip groups that are already auto-accepted with high confidence existing match
      if (
        group.userDecision === "accept" &&
        group.existingMatch &&
        group.existingMatch.confidence >= 0.95
      ) {
        // Ensure canonical name uses the existing payee's clean name
        return {
          ...group,
          canonicalName: group.existingMatch.name,
        };
      }

      // Check each member's original payee string for saved choices
      for (const member of group.members) {
        // Check for transfer mapping first (higher priority - user explicitly marked as transfer)
        const transferMatch = this.findTransferMappingInMemory(
          member.originalPayee,
          allTransferMappings
        );

        if (transferMatch) {
          return {
            ...group,
            userDecision: "accept" as const,
            transferAccountId: transferMatch.targetAccountId,
            transferAccountName: transferMatch.targetAccount.name ?? "Unknown Account",
          };
        }

        // Check for payee alias (user confirmed a payee mapping)
        const aliasMatch = this.findAliasInMemory(member.originalPayee, allAliases);
        if (aliasMatch && aliasMatch.confidence >= 0.8) {
          // Find matching existing payee
          const matchedPayee = existingPayees.find((p) => p.id === aliasMatch.payeeId);
          if (matchedPayee) {
            return {
              ...group,
              userDecision: "accept" as const,
              existingMatch: {
                id: matchedPayee.id,
                name: matchedPayee.name ?? group.canonicalName,
                confidence: aliasMatch.confidence,
              },
              canonicalName: matchedPayee.name ?? group.canonicalName,
            };
          }
        }
      }
      return group;
    });
  }
}

/**
 * Create a default payee grouper instance
 */
export function createPayeeGrouper(config?: Partial<PayeeGrouperConfig>): PayeeGrouper {
  return new PayeeGrouper(config);
}
