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
import { PayeeMatcher } from "../matchers/payee-matcher";
import { calculateStringSimilarity, normalizePayeeName } from "../utils";
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
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.payeeMatcher = new PayeeMatcher();
  }

  /**
   * Analyze and group similar payees from import data
   */
  async analyzePayees(
    inputs: PayeeGroupInput[],
    existingPayees: Payee[]
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

    // Step 4: Calculate statistics
    const stats = this.calculateStats(groupsWithMatches);

    return {
      groups: groupsWithMatches,
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
   * Select the best canonical name for a group
   */
  private selectCanonicalName(members: PayeeGroupMember[]): string {
    // Count occurrences of each normalized name
    const nameCounts = new Map<string, number>();
    for (const member of members) {
      const name = member.normalizedPayee;
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }

    // Find the most frequent name
    let bestName = members[0].normalizedPayee;
    let maxCount = 0;

    for (const [name, count] of nameCounts) {
      // Prefer more frequent names, but also prefer shorter names (less noise)
      const score = count * 10 - name.length;
      if (count > maxCount || (count === maxCount && score > maxCount * 10 - bestName.length)) {
        maxCount = count;
        bestName = name;
      }
    }

    // Capitalize the result
    return this.capitalizePayeeName(bestName);
  }

  /**
   * Capitalize payee name properly
   */
  private capitalizePayeeName(name: string): string {
    return name
      .split(" ")
      .map((word) => {
        if (word.length === 0) return word;
        // Keep common abbreviations uppercase
        if (["llc", "inc", "ltd", "corp", "co"].includes(word.toLowerCase())) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
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

        return {
          ...group,
          existingMatch,
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
}

/**
 * Create a default payee grouper instance
 */
export function createPayeeGrouper(config?: Partial<PayeeGrouperConfig>): PayeeGrouper {
  return new PayeeGrouper(config);
}
