/**
 * Budget Group Analysis Service
 *
 * Analyzes budgets to detect logical grouping patterns and generate
 * intelligent budget group recommendations. Uses multiple signals:
 * - Category hierarchy matching
 * - Account clustering
 * - Spending pattern similarity
 * - Name keyword similarity
 */

import { budgets } from "$lib/schema/budgets";
import type {
  RecommendationMetadata,
  RecommendationPriority,
} from "$lib/schema/recommendations";
import { db } from "$lib/server/db";
import { logger } from "$lib/server/shared/logging";
import { eq } from "drizzle-orm";
import type { BudgetWithRelations } from "./repository";

export interface AnalysisParams {
  accountIds?: number[];
  minSimilarityScore?: number; // Minimum similarity to consider a match (default 70)
  minGroupSize?: number; // Minimum budgets to suggest a group (default 2)
}

export interface GroupingPattern {
  budgetIds: number[];
  budgets: BudgetWithRelations[];
  commonCategories: string[];
  commonAccounts: number[];
  averageSimilarity: number; // 0-100
  suggestedName: string;
  reason: "category_hierarchy" | "account_clustering" | "spending_pattern" | "name_similarity";
  confidenceFactors: {
    categoryMatch: number;
    accountMatch: number;
    amountSimilarity: number;
    nameSimilarity: number;
  };
}

export interface SimilarityScore {
  overall: number; // 0-100
  categoryScore: number; // 0-40
  accountScore: number; // 0-30
  amountScore: number; // 0-20
  nameScore: number; // 0-10
}

export interface BudgetRecommendationDraft {
  type: "create_budget_group" | "add_to_budget_group" | "merge_budget_groups" | "adjust_group_limit";
  priority: RecommendationPriority;
  title: string;
  description: string;
  confidence: number;
  metadata: RecommendationMetadata;
  budgetId?: number;
  accountId?: number;
  categoryId?: number;
  expiresAt?: string;
}

export class BudgetGroupAnalysisService {
  /**
   * Generate all group recommendations
   */
  async generateAllGroupRecommendations(params: AnalysisParams = {}): Promise<BudgetRecommendationDraft[]> {
    const {
      minSimilarityScore = 70,
      minGroupSize = 2,
    } = params;

    try {
      logger.info("Starting budget group analysis", { params });

      const recommendations: BudgetRecommendationDraft[] = [];

      // 1. Detect grouping patterns among ungrouped budgets
      const patterns = await this.detectGroupingPatterns(params);

      for (const pattern of patterns) {
        if (pattern.averageSimilarity >= minSimilarityScore && pattern.budgets.length >= minGroupSize) {
          const rec = await this.generateGroupCreationRecommendation(pattern);
          recommendations.push(rec);
        }
      }

      // 2. Find budgets that should be added to existing groups
      const assignmentRecs = await this.generateGroupAssignmentRecommendations(params);
      recommendations.push(...assignmentRecs.filter(r => r.confidence >= minSimilarityScore));

      // 3. Find groups that should be merged
      const mergeRecs = await this.generateGroupMergeRecommendations();
      recommendations.push(...mergeRecs);

      // 4. Find groups with spending limits that should be adjusted
      const limitRecs = await this.generateGroupLimitRecommendations();
      recommendations.push(...limitRecs);

      logger.info("Budget group analysis complete", {
        recommendationCount: recommendations.length,
      });

      return recommendations;
    } catch (error) {
      logger.error("Error in budget group analysis", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  }

  /**
   * Detect grouping patterns across budgets
   */
  private async detectGroupingPatterns(params: AnalysisParams): Promise<GroupingPattern[]> {
    // Get all active budgets
    const allBudgets = await db.query.budgets.findMany({
      where: eq(budgets.status, "active"),
      with: {
        categories: {
          with: { category: true }
        },
        accounts: {
          with: { account: true }
        },
        groupMemberships: {
          with: { group: true }
        },
        transactions: {
          with: { transaction: true }
        },
        periodTemplates: {
          with: { periods: true }
        },
      },
    });

    // Filter to budgets without groups or with incomplete grouping
    const ungroupedBudgets = allBudgets.filter(b =>
      !b.groupMemberships || b.groupMemberships.length === 0
    );

    if (ungroupedBudgets.length < 2) {
      return [];
    }

    const patterns: GroupingPattern[] = [];
    const processed = new Set<number>();

    // Find patterns by comparing each budget with others
    for (let i = 0; i < ungroupedBudgets.length; i++) {
      if (processed.has(ungroupedBudgets[i]!.id)) continue;

      const budget1 = ungroupedBudgets[i]!;
      const similarBudgets: BudgetWithRelations[] = [budget1];
      processed.add(budget1.id);

      for (let j = i + 1; j < ungroupedBudgets.length; j++) {
        if (processed.has(ungroupedBudgets[j]!.id)) continue;

        const budget2 = ungroupedBudgets[j]!;
        const similarity = this.calculateBudgetSimilarity(budget1, budget2);

        if (similarity.overall >= 60) { // Lower threshold for pattern detection
          similarBudgets.push(budget2);
          processed.add(budget2.id);
        }
      }

      if (similarBudgets.length >= 2) {
        const pattern = await this.createGroupingPattern(similarBudgets);
        if (pattern) {
          patterns.push(pattern);
        }
      }
    }

    return patterns;
  }

  /**
   * Create a grouping pattern from similar budgets
   */
  private async createGroupingPattern(budgets: BudgetWithRelations[]): Promise<GroupingPattern | null> {
    if (budgets.length < 2) return null;

    // Calculate average similarity
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < budgets.length; i++) {
      for (let j = i + 1; j < budgets.length; j++) {
        const similarity = this.calculateBudgetSimilarity(budgets[i]!, budgets[j]!);
        totalSimilarity += similarity.overall;
        comparisons++;
      }
    }

    const averageSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;

    // Find common categories
    const allCategories = budgets.flatMap(b =>
      b.categories.map(c => c.category?.name).filter(Boolean) as string[]
    );
    const categoryFreq = new Map<string, number>();
    allCategories.forEach(cat => {
      categoryFreq.set(cat, (categoryFreq.get(cat) || 0) + 1);
    });
    const commonCategories = Array.from(categoryFreq.entries())
      .filter(([_, count]) => count >= budgets.length / 2)
      .map(([cat, _]) => cat);

    // Find common accounts
    const allAccounts = budgets.flatMap(b =>
      b.accounts.map(a => a.accountId)
    );
    const accountFreq = new Map<number, number>();
    allAccounts.forEach(accId => {
      accountFreq.set(accId, (accountFreq.get(accId) || 0) + 1);
    });
    const commonAccounts = Array.from(accountFreq.entries())
      .filter(([_, count]) => count >= budgets.length / 2)
      .map(([accId, _]) => accId);

    // Determine grouping reason and suggested name
    const { reason, suggestedName, confidenceFactors } = this.determineGroupingReason(
      budgets,
      commonCategories,
      commonAccounts
    );

    return {
      budgetIds: budgets.map(b => b.id),
      budgets,
      commonCategories,
      commonAccounts,
      averageSimilarity,
      suggestedName,
      reason,
      confidenceFactors,
    };
  }

  /**
   * Determine the primary reason for grouping and suggest a name
   */
  private determineGroupingReason(
    budgets: BudgetWithRelations[],
    commonCategories: string[],
    commonAccounts: number[]
  ): {
    reason: GroupingPattern["reason"];
    suggestedName: string;
    confidenceFactors: GroupingPattern["confidenceFactors"];
  } {
    const names = budgets.map(b => b.name.toLowerCase());

    // Calculate confidence factors
    const categoryMatch = commonCategories.length > 0 ? 80 : 0;
    const accountMatch = commonAccounts.length > 0 ? 70 : 0;
    const amountSimilarity = this.calculateAmountSimilarityForGroup(budgets);
    const nameSimilarity = this.calculateNameSimilarityForGroup(names);

    const confidenceFactors = {
      categoryMatch,
      accountMatch,
      amountSimilarity,
      nameSimilarity,
    };

    // Determine primary reason
    if (categoryMatch >= 70) {
      return {
        reason: "category_hierarchy",
        suggestedName: this.suggestNameFromCategories(commonCategories),
        confidenceFactors,
      };
    }

    if (accountMatch >= 70) {
      return {
        reason: "account_clustering",
        suggestedName: this.suggestNameFromAccounts(commonAccounts, budgets),
        confidenceFactors,
      };
    }

    if (nameSimilarity >= 60) {
      return {
        reason: "name_similarity",
        suggestedName: this.extractCommonTheme(names),
        confidenceFactors,
      };
    }

    return {
      reason: "spending_pattern",
      suggestedName: "Related Budgets",
      confidenceFactors,
    };
  }

  /**
   * Calculate similarity between two budgets
   */
  private calculateBudgetSimilarity(
    budget1: BudgetWithRelations,
    budget2: BudgetWithRelations
  ): SimilarityScore {
    const categoryScore = this.calculateCategorySimilarity(budget1, budget2);
    const accountScore = this.calculateAccountSimilarity(budget1, budget2);
    const amountScore = this.calculateAmountSimilarity(budget1, budget2);
    const nameScore = this.calculateNameSimilarity(budget1.name, budget2.name);

    const overall = categoryScore + accountScore + amountScore + nameScore;

    return {
      overall,
      categoryScore,
      accountScore,
      amountScore,
      nameScore,
    };
  }

  /**
   * Calculate category similarity (0-40 points)
   */
  private calculateCategorySimilarity(budget1: BudgetWithRelations, budget2: BudgetWithRelations): number {
    const cats1 = budget1.categories.map(c => c.category);
    const cats2 = budget2.categories.map(c => c.category);

    if (cats1.length === 0 || cats2.length === 0) return 0;

    // Check for exact category matches
    const ids1 = cats1.map(c => c?.id).filter(Boolean);
    const ids2 = cats2.map(c => c?.id).filter(Boolean);
    const exactMatches = ids1.filter(id => ids2.includes(id));

    if (exactMatches.length > 0) return 40;

    // Check for parent category matches
    const parents1 = cats1.map(c => c?.parentId).filter(Boolean);
    const parents2 = cats2.map(c => c?.parentId).filter(Boolean);
    const parentMatches = parents1.filter(pid => parents2.includes(pid));

    if (parentMatches.length > 0) return 28;

    // Check for keyword matches in category names
    const names1 = cats1.map(c => c?.name?.toLowerCase()).filter(Boolean) as string[];
    const names2 = cats2.map(c => c?.name?.toLowerCase()).filter(Boolean) as string[];
    const keywords1 = names1.flatMap(n => this.extractKeywords(n));
    const keywords2 = names2.flatMap(n => this.extractKeywords(n));
    const keywordMatches = keywords1.filter(k => keywords2.includes(k));

    if (keywordMatches.length > 0) return 15;

    return 0;
  }

  /**
   * Calculate account similarity (0-30 points)
   */
  private calculateAccountSimilarity(budget1: BudgetWithRelations, budget2: BudgetWithRelations): number {
    const accs1 = budget1.accounts.map(a => a.account);
    const accs2 = budget2.accounts.map(a => a.account);

    if (accs1.length === 0 || accs2.length === 0) return 0;

    // Check for exact account matches
    const ids1 = accs1.map(a => a?.id).filter(Boolean);
    const ids2 = accs2.map(a => a?.id).filter(Boolean);
    const exactMatches = ids1.filter(id => ids2.includes(id));

    if (exactMatches.length > 0) return 30;

    // Check for same account type
    const types1 = accs1.map(a => a?.accountType).filter(Boolean);
    const types2 = accs2.map(a => a?.accountType).filter(Boolean);
    const typeMatches = types1.filter(type => types2.includes(type));

    if (typeMatches.length > 0) return 15;

    return 0;
  }

  /**
   * Calculate amount similarity (0-20 points)
   */
  private calculateAmountSimilarity(budget1: BudgetWithRelations, budget2: BudgetWithRelations): number {
    const amount1 = this.getBudgetAmount(budget1);
    const amount2 = this.getBudgetAmount(budget2);

    if (amount1 === 0 || amount2 === 0) return 0;

    const ratio = Math.min(amount1, amount2) / Math.max(amount1, amount2);

    // Within 20%: 20 points
    if (ratio >= 0.8) return 20;
    // Within 50%: 15 points
    if (ratio >= 0.5) return 15;
    // Within 100%: 10 points
    if (ratio >= 0.25) return 10;

    return 0;
  }

  /**
   * Calculate name similarity (0-10 points)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const keywords1 = this.extractKeywords(name1.toLowerCase());
    const keywords2 = this.extractKeywords(name2.toLowerCase());

    // Check for theme matches
    const themes = [
      ["home", "house", "rent", "mortgage", "utilities"],
      ["car", "auto", "vehicle", "gas", "fuel", "insurance"],
      ["health", "medical", "doctor", "dental", "pharmacy"],
      ["food", "grocery", "groceries", "dining", "restaurant"],
      ["entertainment", "fun", "hobby", "recreation", "leisure"],
      ["shopping", "clothes", "clothing", "apparel"],
      ["bills", "utilities", "electric", "water", "internet"],
      ["subscription", "subscriptions", "streaming", "service"],
    ];

    for (const theme of themes) {
      const matches1 = keywords1.filter(k => theme.includes(k));
      const matches2 = keywords2.filter(k => theme.includes(k));
      if (matches1.length > 0 && matches2.length > 0) return 10;
    }

    // Check for direct keyword overlap
    const overlap = keywords1.filter(k => keywords2.includes(k));
    if (overlap.length > 0) return 7;

    return 0;
  }

  /**
   * Get allocated amount for a budget
   */
  private getBudgetAmount(budget: BudgetWithRelations): number {
    const metadata = budget.metadata as Record<string, unknown>;
    return Math.abs((metadata?.["allocatedAmount"] as number) ?? 0);
  }

  /**
   * Calculate amount similarity for a group of budgets
   */
  private calculateAmountSimilarityForGroup(budgets: BudgetWithRelations[]): number {
    if (budgets.length < 2) return 0;

    const amounts = budgets.map(b => this.getBudgetAmount(b)).filter(a => a > 0);
    if (amounts.length < 2) return 0;

    const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Low variance = high similarity
    const coefficientOfVariation = stdDev / avg;

    if (coefficientOfVariation < 0.2) return 80;
    if (coefficientOfVariation < 0.5) return 60;
    if (coefficientOfVariation < 1.0) return 40;

    return 20;
  }

  /**
   * Calculate name similarity for a group
   */
  private calculateNameSimilarityForGroup(names: string[]): number {
    if (names.length < 2) return 0;

    const allKeywords = names.flatMap(n => this.extractKeywords(n));
    const keywordFreq = new Map<string, number>();

    allKeywords.forEach(kw => {
      keywordFreq.set(kw, (keywordFreq.get(kw) || 0) + 1);
    });

    // Find keywords that appear in multiple budget names
    const commonKeywords = Array.from(keywordFreq.entries())
      .filter(([_, count]) => count >= names.length / 2)
      .map(([kw, _]) => kw);

    if (commonKeywords.length >= 2) return 80;
    if (commonKeywords.length >= 1) return 60;

    return 0;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set(["the", "a", "an", "and", "or", "but", "for", "of", "to", "in", "on", "at", "my", "our"]);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Suggest group name from categories
   */
  private suggestNameFromCategories(categories: string[]): string {
    if (categories.length === 0) return "Budget Group";
    if (categories.length === 1) return categories[0]!;

    // Find common parent or theme
    const commonThemes = [
      { keywords: ["home", "house", "rent", "mortgage", "utilities"], name: "Housing" },
      { keywords: ["car", "auto", "vehicle", "gas", "transport"], name: "Transportation" },
      { keywords: ["health", "medical", "dental"], name: "Healthcare" },
      { keywords: ["food", "grocery", "dining"], name: "Food & Dining" },
      { keywords: ["entertainment", "leisure", "hobby"], name: "Entertainment" },
    ];

    for (const theme of commonThemes) {
      const matches = categories.filter(cat =>
        theme.keywords.some(kw => cat.toLowerCase().includes(kw))
      );
      if (matches.length >= categories.length / 2) {
        return theme.name;
      }
    }

    return categories[0]!;
  }

  /**
   * Suggest group name from accounts
   */
  private suggestNameFromAccounts(accountIds: number[], budgets: BudgetWithRelations[]): string {
    if (accountIds.length === 0) return "Budget Group";

    const accountNames = budgets
      .flatMap(b => b.accounts.map(a => a.account?.name))
      .filter(Boolean) as string[];

    if (accountNames.length > 0) {
      return `${accountNames[0]} Budgets`;
    }

    return "Budget Group";
  }

  /**
   * Extract common theme from budget names
   */
  private extractCommonTheme(names: string[]): string {
    const allKeywords = names.flatMap(n => this.extractKeywords(n));
    const keywordFreq = new Map<string, number>();

    allKeywords.forEach(kw => {
      keywordFreq.set(kw, (keywordFreq.get(kw) || 0) + 1);
    });

    const sortedKeywords = Array.from(keywordFreq.entries())
      .sort((a, b) => b[1] - a[1]);

    if (sortedKeywords.length > 0) {
      const topKeyword = sortedKeywords[0]![0];
      return topKeyword.charAt(0).toUpperCase() + topKeyword.slice(1) + " Budgets";
    }

    return "Budget Group";
  }

  /**
   * Generate recommendation to create a new budget group
   */
  private async generateGroupCreationRecommendation(
    pattern: GroupingPattern
  ): Promise<BudgetRecommendationDraft> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Calculate priority based on group size and similarity
    let priority: RecommendationPriority = "medium";
    if (pattern.averageSimilarity >= 85 && pattern.budgets.length >= 3) {
      priority = "high";
    } else if (pattern.averageSimilarity < 70 || pattern.budgets.length < 2) {
      priority = "low";
    }

    // Generate description
    const budgetNames = pattern.budgets.map(b => b.name).join(", ");
    const reasonText = this.getReasonText(pattern.reason);

    return {
      type: "create_budget_group",
      priority,
      title: `Create "${pattern.suggestedName}" group`,
      description: `Group ${pattern.budgets.length} related budgets together.\n${reasonText}\nBudgets: ${budgetNames}`,
      confidence: Math.round(pattern.averageSimilarity),
      metadata: {
        suggestedGroupName: pattern.suggestedName,
        suggestedGroupMembers: pattern.budgetIds,
        groupSimilarityScore: pattern.averageSimilarity,
        categoryPatternMatch: pattern.commonCategories,
        accountPatternMatch: pattern.commonAccounts,
        groupingReason: pattern.reason,
        confidenceFactors: pattern.confidenceFactors,
        budgetIdsToGroup: pattern.budgetIds,
      },
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Get human-readable reason text
   */
  private getReasonText(reason: GroupingPattern["reason"]): string {
    switch (reason) {
      case "category_hierarchy":
        return "These budgets share common categories and spending themes.";
      case "account_clustering":
        return "These budgets are all tied to the same account.";
      case "spending_pattern":
        return "These budgets have similar spending amounts and frequencies.";
      case "name_similarity":
        return "These budgets have related names suggesting a common purpose.";
      default:
        return "These budgets appear to be related.";
    }
  }

  /**
   * Generate recommendations to assign budgets to existing groups
   */
  private async generateGroupAssignmentRecommendations(
    params: AnalysisParams
  ): Promise<BudgetRecommendationDraft[]> {
    // TODO: Implement in next iteration
    return [];
  }

  /**
   * Generate recommendations to merge similar groups
   */
  private async generateGroupMergeRecommendations(): Promise<BudgetRecommendationDraft[]> {
    // TODO: Implement in next iteration
    return [];
  }

  /**
   * Generate recommendations to adjust group spending limits
   */
  private async generateGroupLimitRecommendations(): Promise<BudgetRecommendationDraft[]> {
    // TODO: Implement in next iteration
    return [];
  }
}
