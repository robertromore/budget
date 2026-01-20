import type { Payee, PayeeCategory } from "$lib/schema";
import { categories, payeeCategories, payees, transactions } from "$lib/schema";
import { db } from "$lib/server/db";
import { logger } from "$lib/server/shared/logging";
import { formatPercentRaw } from "$lib/utils/formatters";
import { and, count, desc, eq, isNotNull, isNull } from "drizzle-orm";

// ================================================================================
// Types
// ================================================================================

export interface PayeeCategoryRecommendation {
  payeeId: number;
  payeeName: string;
  recommendedCategoryId: number | null;
  categoryName: string | null;
  confidence: number; // 0-1
  reasoning: string;
  supportingFactors: string[];
  alternativeCategories: Array<{
    id: number;
    name: string;
    confidence: number;
  }>;
}

interface CategoryScore {
  categoryId: number;
  categoryName: string;
  score: number;
  factors: string[];
}

// ================================================================================
// PayeeCategoryRecommendationService
// ================================================================================

/**
 * Service for recommending payee categories based on intelligent analysis
 *
 * Analyzes payee transaction patterns, names, and characteristics to recommend
 * which organizational payee category they should belong to.
 */
export class PayeeCategoryRecommendationService {
  /**
   * Get payee category recommendation for a single payee
   */
  async getRecommendation(
    payeeId: number,
    workspaceId: number
  ): Promise<PayeeCategoryRecommendation> {
    try {
      // Get payee details
      const [payee] = await db
        .select()
        .from(payees)
        .where(
          and(eq(payees.id, payeeId), eq(payees.workspaceId, workspaceId), isNull(payees.deletedAt))
        );

      if (!payee) {
        logger.warn(`Payee not found: ${payeeId}`);
        throw new Error(`Payee not found: ${payeeId}`);
      }

      // Get all available payee categories
      const allCategories = await db
        .select()
        .from(payeeCategories)
        .where(
          and(eq(payeeCategories.workspaceId, workspaceId), isNull(payeeCategories.deletedAt))
        );

      if (allCategories.length === 0) {
        return {
          payeeId,
          payeeName: payee.name || "Unknown",
          recommendedCategoryId: null,
          categoryName: null,
          confidence: 0,
          reasoning: "No payee categories available in workspace",
          supportingFactors: [],
          alternativeCategories: [],
        };
      }

      // Analyze and score each category
      const scores = await this.scoreCategories(payee, allCategories, workspaceId);

      // Sort by score descending
      scores.sort((a, b) => b.score - a.score);

      if (scores.length === 0) {
        return {
          payeeId,
          payeeName: payee.name || "Unknown",
          recommendedCategoryId: null,
          categoryName: null,
          confidence: 0,
          reasoning: "Unable to determine appropriate category",
          supportingFactors: [],
          alternativeCategories: [],
        };
      }

      const topScore = scores[0]!;
      if (topScore.score === 0) {
        return {
          payeeId,
          payeeName: payee.name || "Unknown",
          recommendedCategoryId: null,
          categoryName: null,
          confidence: 0,
          reasoning: "Unable to determine appropriate category",
          supportingFactors: [],
          alternativeCategories: [],
        };
      }
      const alternatives = scores.slice(1, 4).map((s) => ({
        id: s.categoryId,
        name: s.categoryName,
        confidence: this.normalizeConfidence(s.score),
      }));

      return {
        payeeId,
        payeeName: payee.name || "Unknown",
        recommendedCategoryId: topScore.categoryId,
        categoryName: topScore.categoryName,
        confidence: this.normalizeConfidence(topScore.score),
        reasoning: this.generateReasoning(topScore.factors),
        supportingFactors: topScore.factors,
        alternativeCategories: alternatives,
      };
    } catch (error) {
      logger.error(`Error getting recommendation for payee ${payeeId}:`, error);
      throw error;
    }
  }

  /**
   * Get recommendations for multiple uncategorized payees
   */
  async getBulkRecommendations(
    workspaceId: number,
    limit?: number
  ): Promise<PayeeCategoryRecommendation[]> {
    try {
      // Get uncategorized payees
      const uncategorizedPayees = await db
        .select()
        .from(payees)
        .where(
          and(
            eq(payees.workspaceId, workspaceId),
            isNull(payees.payeeCategoryId),
            isNull(payees.deletedAt)
          )
        )
        .limit(limit || 100)
        .orderBy(desc(payees.lastTransactionDate));

      if (uncategorizedPayees.length === 0) {
        return [];
      }

      // Get all available payee categories once (for efficiency)
      const allCategories = await db
        .select()
        .from(payeeCategories)
        .where(
          and(eq(payeeCategories.workspaceId, workspaceId), isNull(payeeCategories.deletedAt))
        );

      if (allCategories.length === 0) {
        logger.warn(
          `No payee categories available in workspace ${workspaceId} - cannot generate recommendations`
        );
        return [];
      }

      // Get recommendations one by one to catch individual errors
      const recommendations: PayeeCategoryRecommendation[] = [];
      for (const payee of uncategorizedPayees) {
        try {
          const recommendation = await this.getRecommendation(payee.id, workspaceId);
          recommendations.push(recommendation);
        } catch (error) {
          logger.error(
            `Error getting recommendation for payee ${payee.id} (${payee.name}):`,
            error
          );
          // Continue with other payees
        }
      }

      return recommendations;
    } catch (error) {
      logger.error("Error in getBulkRecommendations:", error);
      throw error;
    }
  }

  /**
   * Score each category for a given payee
   */
  private async scoreCategories(
    payee: Payee,
    allCategories: PayeeCategory[],
    workspaceId: number
  ): Promise<CategoryScore[]> {
    const scores: CategoryScore[] = [];

    for (const category of allCategories) {
      const factors: string[] = [];
      let score = 0;

      // Factor 1: Name pattern matching (up to 40 points)
      const nameScore = this.scoreNameMatch(payee.name || "", category.name);
      if (nameScore > 0) {
        score += nameScore;
        factors.push(`Name matches "${category.name}" pattern`);
      }

      // Factor 2: Transaction category patterns (up to 30 points)
      const transactionCategoryScore = await this.scoreTransactionCategories(
        payee.id,
        category,
        workspaceId
      );
      if (transactionCategoryScore.score > 0) {
        score += transactionCategoryScore.score;
        factors.push(...transactionCategoryScore.factors);
      }

      // Factor 3: Payee type matching (up to 15 points)
      if (payee.payeeType) {
        const typeScore = this.scorePayeeType(payee.payeeType, category.name);
        if (typeScore > 0) {
          score += typeScore;
          factors.push(`Payee type matches category`);
        }
      }

      // Factor 4: Merchant category code (up to 15 points)
      if (payee.merchantCategoryCode) {
        const mccScore = this.scoreMerchantCode(payee.merchantCategoryCode, category.name);
        if (mccScore > 0) {
          score += mccScore;
          factors.push(`Merchant code indicates ${category.name}`);
        }
      }

      // Factor 5: Similarity to already-categorized payees (up to 20 points)
      const similarityScore = await this.scoreSimilarPayees(payee, category.id, workspaceId);
      if (similarityScore.score > 0) {
        score += similarityScore.score;
        factors.push(...similarityScore.factors);
      }

      if (score > 0) {
        scores.push({
          categoryId: category.id,
          categoryName: category.name,
          score,
          factors,
        });
      }
    }

    return scores;
  }

  /**
   * Score name pattern matching
   */
  private scoreNameMatch(payeeName: string, categoryName: string): number {
    const name = payeeName.toLowerCase();
    const category = categoryName.toLowerCase();

    // Define keyword mappings
    const keywordMap: Record<string, string[]> = {
      "restaurants & dining": [
        "restaurant",
        "cafe",
        "coffee",
        "pizza",
        "burger",
        "food",
        "diner",
        "grill",
        "kitchen",
        "bistro",
      ],
      restaurants: [
        "restaurant",
        "cafe",
        "coffee",
        "pizza",
        "burger",
        "food",
        "diner",
        "grill",
        "kitchen",
        "bistro",
      ],
      dining: [
        "restaurant",
        "cafe",
        "coffee",
        "pizza",
        "burger",
        "food",
        "diner",
        "grill",
        "kitchen",
        "bistro",
      ],
      groceries: [
        "grocery",
        "market",
        "foods",
        "supermarket",
        "trader joe",
        "whole foods",
        "safeway",
        "kroger",
      ],
      utilities: ["electric", "water", "gas", "power", "utility", "energy", "pge", "waste"],
      subscriptions: [
        "subscription",
        "netflix",
        "spotify",
        "prime",
        "hulu",
        "disney",
        "youtube",
        "premium",
      ],
      healthcare: [
        "health",
        "medical",
        "doctor",
        "hospital",
        "pharmacy",
        "dental",
        "cvs",
        "walgreens",
        "clinic",
      ],
      transportation: [
        "uber",
        "lyft",
        "gas",
        "fuel",
        "parking",
        "transit",
        "metro",
        "taxi",
        "shell",
        "chevron",
      ],
      entertainment: [
        "movie",
        "theater",
        "cinema",
        "game",
        "entertainment",
        "amc",
        "regal",
        "steam",
      ],
      shopping: ["shop", "store", "retail", "amazon", "target", "walmart", "mall", "boutique"],
      insurance: ["insurance", "allstate", "geico", "progressive", "state farm"],
      financial: ["bank", "credit", "loan", "mortgage", "investment", "capital"],
      telecom: [
        "phone",
        "wireless",
        "mobile",
        "internet",
        "cable",
        "verizon",
        "att",
        "tmobile",
        "comcast",
      ],
      travel: ["hotel", "airline", "flight", "airbnb", "booking", "expedia", "marriott", "hilton"],
      home: ["home depot", "lowes", "hardware", "furniture", "ikea", "repair", "maintenance"],
      "personal care": ["salon", "spa", "barber", "beauty", "gym", "fitness", "massage"],
      education: ["school", "university", "college", "tuition", "learning", "course", "education"],
      pets: ["pet", "vet", "veterinary", "petco", "petsmart", "animal"],
      charity: ["charity", "donation", "nonprofit", "foundation", "church", "temple"],
      government: ["dmv", "tax", "irs", "license", "permit", "city of", "county of"],
      business: ["office", "supply", "business", "service", "corp", "inc", "llc"],
    };

    // Check if category has keyword mappings
    const keywords = keywordMap[category] || [];

    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        return 40; // Strong match
      }
    }

    // Partial word matching
    const categoryWords = category.split(/[\s&]+/);
    for (const word of categoryWords) {
      if (word.length > 3 && name.includes(word)) {
        return 20; // Partial match
      }
    }

    return 0;
  }

  /**
   * Score based on transaction categories
   */
  private async scoreTransactionCategories(
    payeeId: number,
    category: PayeeCategory,
    workspaceId: number
  ): Promise<{ score: number; factors: string[] }> {
    // Get the most common transaction category for this payee
    // Note: We don't need to filter by workspaceId because payeeId is already workspace-scoped
    const categoryDistribution = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        count: count(),
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.payeeId, payeeId),
          isNotNull(transactions.categoryId),
          isNull(transactions.deletedAt)
        )
      )
      .groupBy(transactions.categoryId, categories.name);

    // Sort in JavaScript instead of SQL
    categoryDistribution.sort((a, b) => b.count - a.count);

    if (categoryDistribution.length === 0) {
      return { score: 0, factors: [] };
    }

    const topTransactionCategory = categoryDistribution[0]!;
    const totalTransactions = categoryDistribution.reduce((sum, cat) => sum + cat.count, 0);
    const percentage = (topTransactionCategory.count / totalTransactions) * 100;

    // Map transaction categories to payee categories
    const categoryMapping: Record<string, string[]> = {
      restaurants: ["food", "dining", "restaurants", "groceries"],
      groceries: ["food", "groceries", "household"],
      utilities: ["utilities", "bills", "electricity", "water", "gas"],
      subscriptions: ["entertainment", "subscriptions", "streaming", "software"],
      healthcare: ["health", "medical", "healthcare", "pharmacy", "dental"],
      transportation: ["transportation", "auto", "gas", "fuel", "parking"],
      entertainment: ["entertainment", "fun", "recreation", "hobbies"],
      shopping: ["shopping", "clothing", "retail", "personal"],
      insurance: ["insurance", "protection"],
      financial: ["financial", "fees", "interest", "investment"],
      telecom: ["phone", "internet", "cable", "communication"],
      travel: ["travel", "vacation", "lodging", "hotels"],
      home: ["home", "housing", "maintenance", "repairs", "garden"],
      "personal care": ["personal", "beauty", "grooming", "fitness", "wellness"],
      education: ["education", "learning", "tuition", "books"],
      pets: ["pets", "pet care", "vet"],
      charity: ["charity", "donations", "giving"],
      government: ["taxes", "fees", "government"],
      business: ["business", "office", "professional"],
    };

    const payeeCategoryName = category.name.toLowerCase();
    const transactionCategoryName = topTransactionCategory.categoryName?.toLowerCase() || "";

    // Check if transaction category maps to this payee category
    const mappedCategories = categoryMapping[payeeCategoryName] || [];
    const isMatch = mappedCategories.some((mapped) => transactionCategoryName.includes(mapped));

    if (isMatch) {
      const score = percentage >= 50 ? 30 : percentage >= 30 ? 20 : 10;
      return {
        score,
        factors: [
          `${formatPercentRaw(percentage, 0)} of transactions are "${topTransactionCategory.categoryName}"`,
        ],
      };
    }

    return { score: 0, factors: [] };
  }

  /**
   * Score based on payee type
   */
  private scorePayeeType(payeeType: string, categoryName: string): number {
    const typeMapping: Record<string, string[]> = {
      merchant: ["shopping", "retail", "restaurants", "dining", "groceries"],
      utility: ["utilities"],
      employer: ["income", "employment"],
      financial_institution: ["financial", "banking"],
      government: ["government", "taxes"],
      individual: ["personal", "services"],
    };

    const categoryLower = categoryName.toLowerCase();
    const mappedCategories = typeMapping[payeeType] || [];

    if (mappedCategories.some((mapped) => categoryLower.includes(mapped))) {
      return 15;
    }

    return 0;
  }

  /**
   * Score based on merchant category code
   */
  private scoreMerchantCode(mcc: string, categoryName: string): number {
    // Common MCC ranges
    const mccMapping: Record<string, string[]> = {
      restaurants: ["5811", "5812", "5813", "5814"],
      groceries: ["5411", "5422", "5451"],
      utilities: ["4900", "4814"],
      gas: ["5541", "5542"],
      hotels: ["3501", "3502", "7011"],
      airlines: ["3000", "3001", "3002"],
      healthcare: ["8011", "8021", "8031", "8041", "8042", "5912", "5976"],
      insurance: ["6300"],
    };

    const categoryLower = categoryName.toLowerCase();
    for (const [key, codes] of Object.entries(mccMapping)) {
      if (categoryLower.includes(key) && codes.includes(mcc)) {
        return 15;
      }
    }

    return 0;
  }

  /**
   * Score based on similarity to already-categorized payees
   */
  private async scoreSimilarPayees(
    payee: Payee,
    categoryId: number,
    workspaceId: number
  ): Promise<{ score: number; factors: string[] }> {
    // Find payees in this category with similar names or characteristics
    const similarPayees = await db
      .select({
        id: payees.id,
        name: payees.name,
        payeeType: payees.payeeType,
        avgAmount: payees.avgAmount,
      })
      .from(payees)
      .where(
        and(
          eq(payees.workspaceId, workspaceId),
          eq(payees.payeeCategoryId, categoryId),
          isNull(payees.deletedAt)
        )
      );

    if (similarPayees.length === 0) {
      return { score: 0, factors: [] };
    }

    let similarityScore = 0;
    const factors: string[] = [];

    // Check name similarity
    const payeeName = (payee.name || "").toLowerCase();
    for (const similar of similarPayees) {
      const similarName = (similar.name || "").toLowerCase();

      // Check for common words (excluding very short words)
      const payeeWords = payeeName.split(/\s+/).filter((w) => w.length > 3);
      const similarWords = similarName.split(/\s+/).filter((w) => w.length > 3);

      const commonWords = payeeWords.filter((w) => similarWords.includes(w));
      if (commonWords.length > 0) {
        similarityScore += 10;
        factors.push(`Similar to other payees in this category`);
        break;
      }
    }

    // Check payee type similarity
    if (payee.payeeType) {
      const sameTypeCount = similarPayees.filter((s) => s.payeeType === payee.payeeType).length;
      if (sameTypeCount > 0) {
        similarityScore += 10;
        factors.push(`Same payee type as others in category`);
      }
    }

    return { score: similarityScore, factors };
  }

  /**
   * Normalize raw score to 0-1 confidence
   */
  private normalizeConfidence(score: number): number {
    // Max possible score is 120 (40+30+15+15+20)
    // Scale to 0-1 range
    const confidence = score / 120;
    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(factors: string[]): string {
    if (factors.length === 0) {
      return "No clear indicators found";
    }

    if (factors.length === 1) {
      return factors[0]!;
    }

    const main = factors.slice(0, 2).join(". ");
    const additional =
      factors.length > 2
        ? ` Plus ${factors.length - 2} other factor${factors.length > 3 ? "s" : ""}.`
        : "";

    return main + additional;
  }

  /**
   * Get count of uncategorized payees
   */
  async getUncategorizedCount(workspaceId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(payees)
      .where(
        and(
          eq(payees.workspaceId, workspaceId),
          isNull(payees.payeeCategoryId),
          isNull(payees.deletedAt)
        )
      );

    return result[0]?.count || 0;
  }
}
