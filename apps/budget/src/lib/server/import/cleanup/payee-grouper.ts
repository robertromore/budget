/**
 * Payee Grouper Service
 *
 * Groups similar payees from import data and matches them to existing payees.
 * Uses multiple similarity algorithms for robust matching.
 */

import type { Payee } from "$lib/schema/payees";
import type {
  PayeeGroup,
  PayeeGroupMember,
  ExistingPayeeMatch,
} from "$lib/types/import";
import { accounts as accountsTable } from "$lib/schema/accounts";
import { db } from "$lib/server/db";
import { getPayeeAliasService } from "$lib/server/domains/payees/alias-service";
import { getTransferMappingService } from "$lib/server/domains/transfers";
import { PayeeMatcher } from "../matchers/payee-matcher";
import { calculateStringSimilarity, normalizePayeeName } from "../utils";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";

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
    this.config = { ...DEFAULT_CONFIG, ...config };
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

    // Compare all pairs and union similar ones
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const similarity = this.calculatePayeeSimilarity(
          inputs[i].normalizedPayee,
          inputs[j].normalizedPayee
        );
        if (similarity >= this.config.groupingThreshold) {
          union(i, j);
        }
      }
    }

    // Build groups from Union-Find result
    const groupMap = new Map<number, PayeeGroupMember[]>();

    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!groupMap.has(root)) {
        groupMap.set(root, []);
      }
      groupMap.get(root)!.push({
        rowIndex: inputs[i].rowIndex,
        originalPayee: inputs[i].originalPayee,
        normalizedPayee: inputs[i].normalizedPayee,
      });
    }

    // Convert to PayeeGroup array
    const groups: PayeeGroup[] = [];

    for (const [, members] of groupMap) {
      const canonicalName = this.selectCanonicalName(members);
      const confidence = this.calculateGroupConfidence(members);

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

    // Use Levenshtein-based similarity
    const levenshteinSim = calculateStringSimilarity(name1, name2);

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
    const finalScore = Math.min(1, levenshteinSim * 0.6 + wordOverlap * 0.3 + substringBonus);

    return finalScore;
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
      .filter(word => word.length > 0)
      .map((word) => {
        // Check if word is an acronym (all uppercase, 2-5 chars)
        if (word.length >= 2 && word.length <= 5 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
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
  private calculateGroupConfidence(members: PayeeGroupMember[]): number {
    if (members.length === 1) return 1;

    // Calculate average pairwise similarity within the group
    let totalSimilarity = 0;
    let pairs = 0;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        totalSimilarity += this.calculatePayeeSimilarity(
          members[i].normalizedPayee,
          members[j].normalizedPayee
        );
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
   * Apply saved choices from previous imports.
   * Checks payee aliases and transfer mappings to pre-populate user decisions.
   */
  private async applySavedChoices(
    groups: PayeeGroup[],
    existingPayees: Payee[],
    workspaceId: number
  ): Promise<PayeeGroup[]> {
    const aliasService = getPayeeAliasService();
    const transferService = getTransferMappingService();

    console.log("[PayeeGrouper.applySavedChoices] Checking saved choices for", groups.length, "groups, workspaceId:", workspaceId);

    return Promise.all(
      groups.map(async (group) => {
        // Skip groups that are already auto-accepted with high confidence existing match
        if (group.userDecision === "accept" && group.existingMatch && group.existingMatch.confidence >= 0.95) {
          console.log("[PayeeGrouper.applySavedChoices] Skipping already accepted group:", group.canonicalName);
          // Ensure canonical name uses the existing payee's clean name
          return {
            ...group,
            canonicalName: group.existingMatch.name,
          };
        }

        // Check each member's original payee string for saved choices
        for (const member of group.members) {
          console.log("[PayeeGrouper.applySavedChoices] Checking member:", member.originalPayee, "for group:", group.canonicalName);

          // Check for transfer mapping first (higher priority - user explicitly marked as transfer)
          const transferMatch = await transferService.findTransferMapping(
            member.originalPayee,
            workspaceId
          );

          if (transferMatch) {
            // Look up the account name
            const account = await db
              .select({ name: accountsTable.name })
              .from(accountsTable)
              .where(eq(accountsTable.id, transferMatch.targetAccountId))
              .get();

            console.log("[PayeeGrouper.applySavedChoices] Found transfer mapping!", {
              originalPayee: member.originalPayee,
              targetAccountId: transferMatch.targetAccountId,
              accountName: account?.name,
            });

            return {
              ...group,
              userDecision: "accept" as const,
              transferAccountId: transferMatch.targetAccountId,
              transferAccountName: account?.name ?? "Unknown Account",
            };
          }

          // Check for payee alias (user confirmed a payee mapping)
          const aliasMatch = await aliasService.findPayeeByAlias(
            member.originalPayee,
            workspaceId
          );
          if (aliasMatch && aliasMatch.confidence >= 0.8) {
            // Find matching existing payee
            const matchedPayee = existingPayees.find((p) => p.id === aliasMatch.payeeId);
            if (matchedPayee) {
              console.log("[PayeeGrouper.applySavedChoices] Found alias match!", {
                originalPayee: member.originalPayee,
                payeeId: aliasMatch.payeeId,
                payeeName: matchedPayee.name,
                confidence: aliasMatch.confidence,
              });

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
      })
    );
  }
}

/**
 * Create a default payee grouper instance
 */
export function createPayeeGrouper(config?: Partial<PayeeGrouperConfig>): PayeeGrouper {
  return new PayeeGrouper(config);
}
