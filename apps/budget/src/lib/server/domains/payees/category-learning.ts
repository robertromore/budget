import {
  categories,
  payeeCategoryCorrections,
  payees,
  transactions,
  type CategoryCorrection,
  type CategoryDrift,
  type CategoryRecommendation,
  type CorrectionContext,
  type CorrectionPattern,
  type CorrectionTrigger,
  type LearningMetrics,
} from "$lib/schema";
import { db } from "$lib/server/db";
import { currentDate, toISOString } from "$lib/utils/dates";
import { and, count, desc, eq, gte, inArray, isNull, lte, max, sql } from "drizzle-orm";

/**
 * Category Learning Service
 *
 * Sophisticated machine learning engine that analyzes user category corrections
 * to improve categorization suggestions over time. Uses advanced algorithms for
 * pattern recognition, confidence scoring, and adaptive learning.
 *
 * Integration with Category Alias System:
 * - Category aliases handle raw string → category mappings from imports
 * - This service handles payee → category learning based on corrections
 * - recordImportCategoryAssignment() bridges both systems for import flows
 */
export class CategoryLearningService {
  /**
   * Record a user category correction and extract learning context
   */
  async learnFromCorrection(
    correction: {
      payeeId: number;
      transactionId?: number;
      fromCategoryId?: number;
      toCategoryId: number;
      correctionTrigger: CorrectionTrigger;
      correctionContext?: CorrectionContext;
      transactionAmount?: number;
      transactionDate?: string;
      userConfidence?: number;
      notes?: string;
      isOverride?: boolean;
    },
    workspaceId: number
  ): Promise<CategoryCorrection> {
    // Gather contextual information for learning
    const enrichedCorrection = await this.enrichCorrectionWithContext(correction);

    // Record the correction in the database
    const [insertedCorrection] = await db
      .insert(payeeCategoryCorrections)
      .values({
        workspaceId,
        payeeId: correction.payeeId,
        transactionId: correction.transactionId || null,
        fromCategoryId: correction.fromCategoryId || null,
        toCategoryId: correction.toCategoryId,
        correctionTrigger: correction.correctionTrigger,
        correctionContext: correction.correctionContext || null,
        transactionAmount: correction.transactionAmount || null,
        transactionDate: correction.transactionDate || null,
        userConfidence: correction.userConfidence || null,
        systemConfidence: enrichedCorrection.systemConfidence,
        correctionWeight: enrichedCorrection.correctionWeight,
        amountRange: enrichedCorrection.amountRange,
        temporalContext: enrichedCorrection.temporalContext,
        payeePatternContext: enrichedCorrection.payeePatternContext,
        isProcessed: false,
        learningEpoch: await this.getCurrentLearningEpoch(),
        notes: correction.notes || null,
        isOverride: correction.isOverride || false,
      })
      .returning();

    if (!insertedCorrection) {
      throw new Error("Failed to insert category correction");
    }

    // Trigger immediate pattern analysis for high-confidence corrections
    if (correction.userConfidence && correction.userConfidence >= 8) {
      await this.processCorrection(insertedCorrection.id);
    }

    // Check for category drift
    await this.detectCategoryDrift(correction.payeeId);

    return {
      ...insertedCorrection,
      amountRange: insertedCorrection.amountRange as { min: number; max: number } | null,
      temporalContext: insertedCorrection.temporalContext as CategoryCorrection["temporalContext"],
      payeePatternContext:
        insertedCorrection.payeePatternContext as CategoryCorrection["payeePatternContext"],
    };
  }

  /**
   * Record a category assignment from import flow.
   * This bridges the category alias system with payee→category learning.
   *
   * When wasAiSuggested is true and the user accepted, this boosts confidence.
   * When wasAiSuggested is true but user changed it, this records a correction.
   * When wasAiSuggested is false, this is a user's explicit assignment.
   *
   * @param assignment - The category assignment details
   * @param workspaceId - The workspace ID
   */
  async recordImportCategoryAssignment(
    assignment: {
      payeeId: number;
      categoryId: number;
      transactionAmount?: number;
      transactionDate?: string;
      wasAiSuggested: boolean;
      aiSuggestedCategoryId?: number; // The original AI suggestion, if different
      aiConfidence?: number;
    },
    workspaceId: number
  ): Promise<void> {
    const { payeeId, categoryId, wasAiSuggested, aiSuggestedCategoryId, aiConfidence } = assignment;

    // If AI suggested a different category and user changed it, record as correction
    if (wasAiSuggested && aiSuggestedCategoryId && aiSuggestedCategoryId !== categoryId) {
      await this.learnFromCorrection(
        {
          payeeId,
          fromCategoryId: aiSuggestedCategoryId,
          toCategoryId: categoryId,
          correctionTrigger: "import_category_override",
          transactionAmount: assignment.transactionAmount,
          transactionDate: assignment.transactionDate,
          userConfidence: 8, // High confidence - explicit user override
          notes: "User overrode AI suggestion during import",
          isOverride: true,
        },
        workspaceId
      );
    } else if (wasAiSuggested && aiSuggestedCategoryId === categoryId) {
      // AI was correct and user accepted - record positive reinforcement
      await this.recordPositiveReinforcement(
        payeeId,
        categoryId,
        aiConfidence ?? 0.7,
        workspaceId
      );
    }
    // If not AI suggested, it's just a user assignment - no learning needed here
    // as the category alias system handles this via raw string → category mapping
  }

  /**
   * Record positive reinforcement when AI suggestion is accepted.
   * This boosts confidence in the payee→category relationship.
   */
  private async recordPositiveReinforcement(
    payeeId: number,
    categoryId: number,
    aiConfidence: number,
    workspaceId: number
  ): Promise<void> {
    // Record as a "correction" with same from/to category
    // This creates a positive data point for the payee→category relationship
    const [record] = await db
      .insert(payeeCategoryCorrections)
      .values({
        workspaceId,
        payeeId,
        fromCategoryId: categoryId, // Same as "to" - indicates confirmation
        toCategoryId: categoryId,
        correctionTrigger: "ai_suggestion_accepted",
        correctionContext: "import",
        systemConfidence: aiConfidence,
        correctionWeight: 0.5, // Lower weight than corrections
        userConfidence: 7, // Default confidence for acceptance
        isProcessed: true, // Mark as processed immediately
        processedAt: toISOString(currentDate),
        learningEpoch: await this.getCurrentLearningEpoch(),
        notes: "AI suggestion accepted during import",
      })
      .returning();

    // Log for debugging
    if (record) {
      console.log(
        `[CategoryLearning] Positive reinforcement recorded: payee ${payeeId} → category ${categoryId}`
      );
    }
  }

  /**
   * Analyze correction patterns for a specific payee
   */
  async analyzeCorrectionPatterns(
    payeeId: number,
    options: {
      timeframeMonths?: number;
      minConfidence?: number;
      includeProcessed?: boolean;
    } = {}
  ): Promise<CorrectionPattern[]> {
    const { timeframeMonths = 12, minConfidence = 0.1, includeProcessed = true } = options;

    const cutoffDate = currentDate.subtract({ months: timeframeMonths });

    // Get all corrections for the payee within timeframe
    const corrections = await db
      .select()
      .from(payeeCategoryCorrections)
      .where(
        and(
          eq(payeeCategoryCorrections.payeeId, payeeId),
          gte(payeeCategoryCorrections.createdAt, toISOString(cutoffDate)),
          isNull(payeeCategoryCorrections.deletedAt),
          includeProcessed ? undefined : eq(payeeCategoryCorrections.isProcessed, false)
        )
      )
      .orderBy(desc(payeeCategoryCorrections.createdAt));

    if (corrections.length === 0) {
      return [];
    }

    // Group corrections by category change patterns
    const patternGroups = this.groupCorrectionsByPattern(corrections);

    // Analyze each pattern group
    const patterns: CorrectionPattern[] = [];

    for (const group of patternGroups) {
      const pattern = await this.analyzeCorrectionGroup(group, corrections.length);
      if (pattern.confidence >= minConfidence) {
        patterns.push(pattern);
      }
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate smart category recommendations based on learning patterns
   */
  async getCategoryRecommendations(
    payeeId: number,
    context?: {
      transactionAmount?: number;
      transactionDate?: string;
      temporalContext?: any;
    }
  ): Promise<CategoryRecommendation> {
    // Get historical patterns for this payee
    const patterns = await this.analyzeCorrectionPatterns(payeeId, {
      timeframeMonths: 18,
      minConfidence: 0.2,
    });

    if (patterns.length === 0) {
      return this.createDefaultRecommendation(payeeId);
    }

    // Apply context-aware filtering
    const contextualPatterns = this.filterPatternsByContext(patterns, context);

    // Calculate recommendation with confidence weighting
    const recommendation = await this.calculateWeightedRecommendation(payeeId, contextualPatterns);

    return recommendation;
  }

  /**
   * Calculate confidence score for a category suggestion
   */
  async calculateCategoryConfidence(
    payeeId: number,
    categoryId: number,
    context?: {
      transactionAmount?: number;
      transactionDate?: string;
    }
  ): Promise<number> {
    // Get correction patterns for this payee-category combination
    const corrections = await db
      .select()
      .from(payeeCategoryCorrections)
      .where(
        and(
          eq(payeeCategoryCorrections.payeeId, payeeId),
          eq(payeeCategoryCorrections.toCategoryId, categoryId),
          isNull(payeeCategoryCorrections.deletedAt)
        )
      )
      .orderBy(desc(payeeCategoryCorrections.createdAt));

    if (corrections.length === 0) {
      return 0;
    }

    // Base confidence from correction frequency
    const totalCorrections = await db
      .select({ count: count() })
      .from(payeeCategoryCorrections)
      .where(
        and(
          eq(payeeCategoryCorrections.payeeId, payeeId),
          isNull(payeeCategoryCorrections.deletedAt)
        )
      );

    const frequencyConfidence = corrections.length / (totalCorrections[0]?.count || 1);

    // User confidence weighting
    const userConfidenceAvg =
      corrections
        .filter((c) => c.userConfidence !== null)
        .reduce((sum, c) => sum + (c.userConfidence || 0), 0) /
      Math.max(1, corrections.filter((c) => c.userConfidence !== null).length);

    const userConfidenceScore = userConfidenceAvg / 10; // Normalize to 0-1

    // Recency weighting (more recent corrections have higher weight)
    const recencyScore = this.calculateRecencyScore(corrections);

    // Context matching score
    const contextScore = context ? this.calculateContextMatchScore(corrections, context) : 0.5;

    // Combined confidence with weighted factors
    const confidence =
      frequencyConfidence * 0.3 +
      userConfidenceScore * 0.25 +
      recencyScore * 0.25 +
      contextScore * 0.2;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Detect when payee categorization patterns have changed
   */
  async detectCategoryDrift(payeeId: number): Promise<CategoryDrift | null> {
    // Get recent corrections (last 3 months)
    const recentDate = currentDate.subtract({ months: 3 });

    const recentCorrections = await db
      .select()
      .from(payeeCategoryCorrections)
      .where(
        and(
          eq(payeeCategoryCorrections.payeeId, payeeId),
          gte(payeeCategoryCorrections.createdAt, toISOString(recentDate)),
          isNull(payeeCategoryCorrections.deletedAt)
        )
      )
      .orderBy(desc(payeeCategoryCorrections.createdAt));

    // Get historical baseline (6-18 months ago)
    const baselineStartDate = currentDate.subtract({ months: 18 });
    const baselineEndDate = currentDate.subtract({ months: 6 });

    const baselineCorrections = await db
      .select()
      .from(payeeCategoryCorrections)
      .where(
        and(
          eq(payeeCategoryCorrections.payeeId, payeeId),
          gte(payeeCategoryCorrections.createdAt, toISOString(baselineStartDate)),
          lte(payeeCategoryCorrections.createdAt, toISOString(baselineEndDate)),
          isNull(payeeCategoryCorrections.deletedAt)
        )
      );

    if (recentCorrections.length < 3 || baselineCorrections.length < 3) {
      return null; // Insufficient data for drift detection
    }

    // Analyze category distribution changes
    const driftAnalysis = this.analyzeCategoryDistributionShift(
      baselineCorrections,
      recentCorrections
    );

    if (driftAnalysis.isDriftDetected) {
      // Get payee name for the drift record
      const payee = await db
        .select({ name: payees.name })
        .from(payees)
        .where(eq(payees.id, payeeId))
        .limit(1);

      const categoryNames = await this.getCategoryNames([
        driftAnalysis.previousCategoryId,
        driftAnalysis.newCategoryId,
      ]);

      return {
        payeeId,
        payeeName: payee[0]?.name || "Unknown",
        previousCategoryId: driftAnalysis.previousCategoryId,
        previousCategoryName:
          driftAnalysis.previousCategoryId !== null
            ? categoryNames[driftAnalysis.previousCategoryId] || null
            : null,
        newCategoryId: driftAnalysis.newCategoryId,
        newCategoryName: categoryNames[driftAnalysis.newCategoryId] || "Unknown",
        driftConfidence: driftAnalysis.confidence,
        driftReason: driftAnalysis.reason,
        detectedAt: toISOString(currentDate),
        confirmedAt: null,
        correctionCount: recentCorrections.length,
        timespan: `${recentCorrections.length} corrections in last 3 months`,
        suggestedAction: this.determineSuggestedAction(driftAnalysis),
      };
    }

    return null;
  }

  /**
   * Suggest when payee default categories should be updated
   */
  async suggestDefaultCategoryUpdates(): Promise<
    Array<{
      payeeId: number;
      payeeName: string;
      currentDefaultCategoryId: number | null;
      currentDefaultCategoryName: string | null;
      suggestedCategoryId: number;
      suggestedCategoryName: string;
      confidence: number;
      reasoning: string;
      correctionCount: number;
      lastCorrectionDate: string;
    }>
  > {
    // Find payees with significant correction patterns
    const candidatePayees = await db
      .select({
        payeeId: payeeCategoryCorrections.payeeId,
        correctionCount: count(),
        lastCorrectionDate: max(payeeCategoryCorrections.createdAt),
      })
      .from(payeeCategoryCorrections)
      .where(
        and(
          gte(
            payeeCategoryCorrections.createdAt,
            new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString() // Last 6 months
          ),
          isNull(payeeCategoryCorrections.deletedAt)
        )
      )
      .groupBy(payeeCategoryCorrections.payeeId)
      .having(gte(count(), 3)); // At least 3 corrections

    const suggestions = [];

    for (const candidate of candidatePayees) {
      const recommendation = await this.getCategoryRecommendations(candidate.payeeId);

      if (recommendation.confidence >= 0.7) {
        // Get current payee info
        const payee = await db
          .select({
            name: payees.name,
            defaultCategoryId: payees.defaultCategoryId,
          })
          .from(payees)
          .where(eq(payees.id, candidate.payeeId))
          .limit(1);

        if (payee[0] && payee[0].defaultCategoryId !== recommendation.recommendedCategoryId) {
          const categoryNames = await this.getCategoryNames([
            payee[0].defaultCategoryId,
            recommendation.recommendedCategoryId,
          ]);

          suggestions.push({
            payeeId: candidate.payeeId,
            payeeName: payee[0].name || "Unknown",
            currentDefaultCategoryId: payee[0].defaultCategoryId,
            currentDefaultCategoryName: categoryNames[payee[0].defaultCategoryId || 0] || null,
            suggestedCategoryId: recommendation.recommendedCategoryId,
            suggestedCategoryName: recommendation.recommendedCategoryName,
            confidence: recommendation.confidence,
            reasoning: recommendation.reasoning,
            correctionCount: candidate.correctionCount,
            lastCorrectionDate: candidate.lastCorrectionDate || "",
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get comprehensive learning metrics
   */
  async getLearningMetrics(timeframeMonths: number = 6): Promise<LearningMetrics> {
    const cutoffDate = currentDate.subtract({ months: timeframeMonths });

    // Basic correction statistics
    const correctionStats = await db
      .select({
        totalCorrections: count(),
        uniquePayees: sql<number>`COUNT(DISTINCT ${payeeCategoryCorrections.payeeId})`,
      })
      .from(payeeCategoryCorrections)
      .where(
        and(
          gte(payeeCategoryCorrections.createdAt, toISOString(cutoffDate)),
          isNull(payeeCategoryCorrections.deletedAt)
        )
      );

    const stats = correctionStats[0] || { totalCorrections: 0, uniquePayees: 0 };

    // Calculate accuracy and improvement metrics
    const accuracyMetrics = await this.calculateAccuracyMetrics();
    const learningVelocity = await this.calculateLearningVelocity();
    const confidenceDistribution = await this.calculateConfidenceDistribution(timeframeMonths);

    // Get category drift detections
    const driftDetections = await this.getAllCategoryDrifts();

    return {
      totalCorrections: stats.totalCorrections,
      uniquePayees: stats.uniquePayees,
      averageCorrectionsPerPayee:
        stats.uniquePayees > 0 ? stats.totalCorrections / stats.uniquePayees : 0,
      correctionAccuracy: accuracyMetrics.accuracy,
      systemImprovement: accuracyMetrics.improvement,
      categoryDriftDetection: driftDetections,
      learningVelocity,
      confidenceDistribution,
    };
  }

  // Private helper methods

  private async enrichCorrectionWithContext(correction: any): Promise<{
    systemConfidence: number;
    correctionWeight: number;
    amountRange: string | null;
    temporalContext: string | null;
    payeePatternContext: string | null;
  }> {
    // Calculate system confidence if we had a previous prediction
    const systemConfidence = correction.fromCategoryId
      ? await this.calculateCategoryConfidence(correction.payeeId, correction.fromCategoryId)
      : 0;

    // Calculate correction weight based on context
    const correctionWeight = this.calculateCorrectionWeight(correction);

    // Extract amount range context
    const amountRange = correction.transactionAmount
      ? await this.calculateAmountRangeContext(correction.payeeId, correction.transactionAmount)
      : null;

    // Extract temporal context
    const temporalContext = correction.transactionDate
      ? this.extractTemporalContext(correction.transactionDate)
      : null;

    // Extract payee pattern context
    const payeePatternContext = await this.extractPayeePatternContext(correction.payeeId);

    return {
      systemConfidence,
      correctionWeight,
      amountRange: amountRange ? JSON.stringify(amountRange) : null,
      temporalContext: temporalContext ? JSON.stringify(temporalContext) : null,
      payeePatternContext: payeePatternContext ? JSON.stringify(payeePatternContext) : null,
    };
  }

  private calculateCorrectionWeight(correction: any): number {
    let weight = 1.0;

    // Higher weight for user-confident corrections
    if (correction.userConfidence) {
      weight *= correction.userConfidence / 10;
    }

    // Higher weight for manual corrections vs automatic
    if (correction.correctionTrigger === "manual_user_correction") {
      weight *= 1.5;
    }

    // Lower weight for bulk operations
    if (correction.correctionTrigger === "bulk_categorization") {
      weight *= 0.7;
    }

    // Higher weight for override corrections
    if (correction.isOverride) {
      weight *= 2.0;
    }

    return Math.min(10, Math.max(0.1, weight));
  }

  private async calculateAmountRangeContext(
    payeeId: number,
    amount: number
  ): Promise<{ min: number; max: number } | null> {
    // Get recent transaction amounts for this payee
    const recentAmounts = await db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(and(eq(transactions.payeeId, payeeId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.date))
      .limit(20);

    if (recentAmounts.length < 3) {
      return null;
    }

    const amounts = recentAmounts.map((t) => t.amount || 0).filter((a) => a > 0);
    if (amounts.length === 0) return null;

    // Determine if this amount is low, medium, or high for this payee
    amounts.sort((a, b) => a - b);
    const q1 = amounts[Math.floor(amounts.length * 0.25)];
    const q3 = amounts[Math.floor(amounts.length * 0.75)];

    // Handle potential undefined values from array access
    if (q1 === undefined || q3 === undefined) {
      return null;
    }

    if (amount <= q1) {
      return { min: 0, max: q1 };
    } else if (amount >= q3) {
      return { min: q3, max: Math.max(...amounts) * 1.5 };
    } else {
      return { min: q1, max: q3 };
    }
  }

  private extractTemporalContext(dateString: string): any {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Determine season
    let season = "winter";
    if (month >= 3 && month <= 5) season = "spring";
    else if (month >= 6 && month <= 8) season = "summer";
    else if (month >= 9 && month <= 11) season = "fall";

    return {
      month,
      dayOfWeek,
      isWeekend,
      season,
    };
  }

  private async extractPayeePatternContext(payeeId: number): Promise<any> {
    // Get recent transaction pattern for this payee
    const recentTransactions = await db
      .select({
        date: transactions.date,
        amount: transactions.amount,
      })
      .from(transactions)
      .where(and(eq(transactions.payeeId, payeeId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.date))
      .limit(10);

    if (recentTransactions.length < 2) {
      return null;
    }

    // Calculate frequency pattern
    const dates = recentTransactions.map((t) => new Date(t.date));
    const intervals = [];
    for (let i = 1; i < dates.length; i++) {
      const prevDate = dates[i - 1];
      const currentDate = dates[i];
      if (prevDate && currentDate) {
        const daysDiff = Math.round(
          (prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        intervals.push(daysDiff);
      }
    }

    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const amounts = recentTransactions.map((t) => t.amount || 0).filter((a) => a > 0);
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;

    // Determine frequency description
    let frequency = "irregular";
    if (avgInterval <= 7) frequency = "weekly";
    else if (avgInterval <= 14) frequency = "bi_weekly";
    else if (avgInterval <= 31) frequency = "monthly";
    else if (avgInterval <= 93) frequency = "quarterly";

    // Calculate regularity (inverse of coefficient of variation)
    const stdDev = Math.sqrt(
      intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length
    );
    const regularity = avgInterval > 0 ? Math.max(0, 1 - stdDev / avgInterval) : 0;

    return {
      frequency,
      regularity,
      averageAmount: avgAmount,
    };
  }

  private async getCurrentLearningEpoch(): Promise<number> {
    // Simple epoch management - could be enhanced with actual model versioning
    return 1;
  }

  private async processCorrection(correctionId: number): Promise<void> {
    // Mark correction as processed and trigger any immediate learning updates
    await db
      .update(payeeCategoryCorrections)
      .set({
        isProcessed: true,
        processedAt: toISOString(currentDate),
      })
      .where(eq(payeeCategoryCorrections.id, correctionId));
  }

  private groupCorrectionsByPattern(corrections: any[]): any[][] {
    // Group corrections by from/to category pairs
    const groups = new Map<string, any[]>();

    for (const correction of corrections) {
      const key = `${correction.fromCategoryId || "null"}-${correction.toCategoryId}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(correction);
    }

    return Array.from(groups.values()).filter((group) => group.length >= 2);
  }

  private async analyzeCorrectionGroup(
    group: any[],
    totalCorrections: number
  ): Promise<CorrectionPattern> {
    const firstCorrection = group[0];
    const frequency = group.length;
    const confidence = Math.min(1, frequency / Math.max(5, totalCorrections * 0.3));

    // Calculate average user confidence
    const userConfidences = group
      .filter((c) => c.userConfidence !== null)
      .map((c) => c.userConfidence);
    const averageUserConfidence =
      userConfidences.length > 0
        ? userConfidences.reduce((sum, c) => sum + c, 0) / userConfidences.length
        : 0;

    // Calculate decay factor based on recency
    const now = currentDate.toDate("UTC");
    const decayFactor =
      group.reduce((sum, correction) => {
        const correctionDate = new Date(correction.createdAt);
        const ageMonths = (now.getTime() - correctionDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return sum + Math.exp(-ageMonths / 6); // 6-month half-life
      }, 0) / group.length;

    // Analyze triggers
    const triggerCounts = new Map<string, number>();
    group.forEach((c) => {
      const trigger = c.correctionTrigger;
      triggerCounts.set(trigger, (triggerCounts.get(trigger) || 0) + 1);
    });

    const correctionTriggers = Array.from(triggerCounts.entries()).map(([trigger, count]) => ({
      trigger: trigger as CorrectionTrigger,
      count,
      percentage: (count / group.length) * 100,
    }));

    // Analyze amount patterns
    const amountPatterns = this.analyzeAmountPatterns(group);

    // Analyze temporal patterns
    const temporalPatterns = this.analyzeTemporalPatterns(group);

    return {
      payeeId: firstCorrection.payeeId,
      fromCategoryId: firstCorrection.fromCategoryId,
      toCategoryId: firstCorrection.toCategoryId,
      frequency,
      confidence,
      averageUserConfidence,
      latestCorrectionDate: group[0].createdAt,
      correctionTriggers,
      amountPatterns,
      temporalPatterns,
      decayFactor,
    };
  }

  private analyzeAmountPatterns(
    corrections: any[]
  ): Array<{ range: { min: number; max: number }; count: number; confidence: number }> {
    const amounts = corrections
      .filter((c) => c.transactionAmount !== null)
      .map((c) => c.transactionAmount)
      .sort((a, b) => a - b);

    if (amounts.length === 0) return [];

    // Simple clustering by quartiles
    const q1 = amounts[Math.floor(amounts.length * 0.25)] || amounts[0];
    const q3 = amounts[Math.floor(amounts.length * 0.75)] || amounts[amounts.length - 1];

    const patterns = [];

    // Low range
    const lowRange = amounts.filter((a) => a <= q1);
    if (lowRange.length > 0) {
      patterns.push({
        range: { min: Math.min(...amounts), max: q1 },
        count: lowRange.length,
        confidence: lowRange.length / amounts.length,
      });
    }

    // High range
    const highRange = amounts.filter((a) => a >= q3);
    if (highRange.length > 0) {
      patterns.push({
        range: { min: q3, max: Math.max(...amounts) },
        count: highRange.length,
        confidence: highRange.length / amounts.length,
      });
    }

    return patterns;
  }

  private analyzeTemporalPatterns(
    corrections: any[]
  ): Array<{ context: string; count: number; confidence: number }> {
    const patterns = new Map<string, number>();

    corrections.forEach((correction) => {
      if (correction.temporalContext) {
        try {
          const context = JSON.parse(correction.temporalContext);
          if (context.season) {
            const key = `season_${context.season}`;
            patterns.set(key, (patterns.get(key) || 0) + 1);
          }
          if (context.isWeekend !== undefined) {
            const key = context.isWeekend ? "weekend" : "weekday";
            patterns.set(key, (patterns.get(key) || 0) + 1);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    });

    return Array.from(patterns.entries())
      .map(([context, count]) => ({
        context,
        count,
        confidence: count / corrections.length,
      }))
      .filter((p) => p.confidence >= 0.3); // Only patterns with >30% frequency
  }

  private filterPatternsByContext(
    patterns: CorrectionPattern[],
    context?: any
  ): CorrectionPattern[] {
    if (!context) return patterns;

    return patterns.filter((pattern) => {
      // Filter by amount if provided
      if (context.transactionAmount) {
        const matchingAmountPattern = pattern.amountPatterns.find(
          (ap) =>
            context.transactionAmount >= ap.range.min && context.transactionAmount <= ap.range.max
        );
        if (!matchingAmountPattern) return false;
      }

      // Additional context filtering could be added here

      return true;
    });
  }

  private async calculateWeightedRecommendation(
    payeeId: number,
    patterns: CorrectionPattern[]
  ): Promise<CategoryRecommendation> {
    if (patterns.length === 0) {
      return this.createDefaultRecommendation(payeeId);
    }

    // Weight patterns by confidence and recency
    const weightedPatterns = patterns.map((pattern) => ({
      ...pattern,
      weight: pattern.confidence * pattern.decayFactor * pattern.frequency,
    }));

    // Find the highest weighted recommendation
    const topPattern = weightedPatterns.reduce((best, current) =>
      current.weight > best.weight ? current : best
    );

    // Get category name
    const category = await db
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.id, topPattern.toCategoryId))
      .limit(1);

    const categoryName = category[0]?.name || "Unknown";

    // Generate alternative recommendations
    const alternatives = weightedPatterns
      .slice(0, 3)
      .filter((p) => p.toCategoryId !== topPattern.toCategoryId)
      .map((p) => ({
        categoryId: p.toCategoryId,
        categoryName: "Category", // Would need to fetch actual names
        confidence: p.confidence,
        reasoning: `${p.frequency} corrections with ${Math.round(p.confidence * 100)}% confidence`,
      }));

    return {
      payeeId,
      recommendedCategoryId: topPattern.toCategoryId,
      recommendedCategoryName: categoryName,
      confidence: topPattern.confidence,
      reasoning: `Based on ${topPattern.frequency} corrections with ${Math.round(topPattern.averageUserConfidence * 10)}/10 user confidence`,
      supportingFactors: [
        {
          factor: "correction_frequency",
          weight: topPattern.frequency / 10,
          description: `${topPattern.frequency} user corrections`,
        },
        {
          factor: "user_confidence",
          weight: topPattern.averageUserConfidence / 10,
          description: `Average user confidence: ${Math.round(topPattern.averageUserConfidence * 10)}/10`,
        },
        {
          factor: "recency",
          weight: topPattern.decayFactor,
          description: "Recent correction patterns",
        },
      ],
      alternativeCategories: alternatives,
      contextualRecommendations: [],
    };
  }

  private async createDefaultRecommendation(payeeId: number): Promise<CategoryRecommendation> {
    // Get payee's current default category if any
    const payee = await db
      .select({
        defaultCategoryId: payees.defaultCategoryId,
      })
      .from(payees)
      .where(eq(payees.id, payeeId))
      .limit(1);

    const defaultCategoryId = payee[0]?.defaultCategoryId;

    if (!defaultCategoryId) {
      return {
        payeeId,
        recommendedCategoryId: 0,
        recommendedCategoryName: "Uncategorized",
        confidence: 0,
        reasoning: "No correction history or default category available",
        supportingFactors: [],
        alternativeCategories: [],
        contextualRecommendations: [],
      };
    }

    const category = await db
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.id, defaultCategoryId))
      .limit(1);

    return {
      payeeId,
      recommendedCategoryId: defaultCategoryId,
      recommendedCategoryName: category[0]?.name || "Unknown",
      confidence: 0.3, // Low confidence as it's just the default
      reasoning: "Using payee default category (no correction history available)",
      supportingFactors: [
        {
          factor: "default_category",
          weight: 0.3,
          description: "Payee default category",
        },
      ],
      alternativeCategories: [],
      contextualRecommendations: [],
    };
  }

  private calculateRecencyScore(corrections: any[]): number {
    if (corrections.length === 0) return 0;

    const now = currentDate.toDate("UTC");
    const scores = corrections.map((correction) => {
      const correctionDate = new Date(correction.createdAt);
      const ageMonths = (now.getTime() - correctionDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return Math.exp(-ageMonths / 6); // 6-month half-life
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateContextMatchScore(corrections: any[], context: any): number {
    let matches = 0;
    let total = 0;

    corrections.forEach((correction) => {
      total++;

      // Check amount context match
      if (context.transactionAmount && correction.transactionAmount) {
        const amountDiff = Math.abs(context.transactionAmount - correction.transactionAmount);
        const relativeDiff =
          amountDiff / Math.max(context.transactionAmount, correction.transactionAmount);
        if (relativeDiff <= 0.3) {
          // Within 30%
          matches += 0.5;
        }
      }

      // Check temporal context match
      if (context.transactionDate && correction.transactionDate) {
        const contextDate = new Date(context.transactionDate);
        const correctionDate = new Date(correction.transactionDate);
        if (contextDate.getMonth() === correctionDate.getMonth()) {
          matches += 0.3;
        }
        if (contextDate.getDay() === correctionDate.getDay()) {
          matches += 0.2;
        }
      }
    });

    return total > 0 ? matches / total : 0;
  }

  private analyzeCategoryDistributionShift(
    baseline: any[],
    recent: any[]
  ): {
    isDriftDetected: boolean;
    previousCategoryId: number | null;
    newCategoryId: number;
    confidence: number;
    reason: string;
  } {
    // Calculate category distributions
    const baselineDistribution = this.calculateCategoryDistribution(baseline);
    const recentDistribution = this.calculateCategoryDistribution(recent);

    // Find the most common categories in each period
    const baselineTop = this.getTopCategory(baselineDistribution);
    const recentTop = this.getTopCategory(recentDistribution);

    // Check for significant shift
    const isDriftDetected =
      baselineTop.categoryId !== recentTop.categoryId &&
      recentTop.percentage >= 0.6 && // New category is dominant
      baselineTop.percentage - recentTop.percentage >= 0.3; // Significant shift

    if (isDriftDetected) {
      const confidence = Math.min(0.95, recentTop.percentage);
      const reason = `Category preference shifted from ${baselineTop.percentage * 100}% to ${recentTop.percentage * 100}%`;

      return {
        isDriftDetected: true,
        previousCategoryId: baselineTop.categoryId,
        newCategoryId: recentTop.categoryId,
        confidence,
        reason,
      };
    }

    return {
      isDriftDetected: false,
      previousCategoryId: null,
      newCategoryId: recentTop.categoryId,
      confidence: 0,
      reason: "No significant category drift detected",
    };
  }

  private calculateCategoryDistribution(corrections: any[]): Map<number, number> {
    const distribution = new Map<number, number>();
    corrections.forEach((correction) => {
      const categoryId = correction.toCategoryId;
      distribution.set(categoryId, (distribution.get(categoryId) || 0) + 1);
    });
    return distribution;
  }

  private getTopCategory(distribution: Map<number, number>): {
    categoryId: number;
    count: number;
    percentage: number;
  } {
    let topCategory = { categoryId: 0, count: 0 };
    const total = Array.from(distribution.values()).reduce((sum, count) => sum + count, 0);

    for (const [categoryId, count] of Array.from(distribution.entries())) {
      if (count > topCategory.count) {
        topCategory = { categoryId, count };
      }
    }

    return {
      ...topCategory,
      percentage: total > 0 ? topCategory.count / total : 0,
    };
  }

  private determineSuggestedAction(driftAnalysis: any): CategoryDrift["suggestedAction"] {
    if (driftAnalysis.confidence >= 0.8) {
      return "update_default";
    } else if (driftAnalysis.confidence >= 0.6) {
      return "create_rule";
    } else if (driftAnalysis.confidence >= 0.4) {
      return "manual_review";
    } else {
      return "ignore";
    }
  }

  private async getCategoryNames(categoryIds: (number | null)[]): Promise<Record<number, string>> {
    const validIds = categoryIds.filter((id): id is number => id !== null);
    if (validIds.length === 0) return {};

    const categoryResults = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(inArray(categories.id, validIds));

    const nameMap: Record<number, string> = {};
    categoryResults.forEach((category) => {
      nameMap[category.id] = category.name ?? "Unknown Category";
    });

    return nameMap;
  }

  private async calculateAccuracyMetrics(): Promise<{ accuracy: number; improvement: number }> {
    // This would require tracking prediction accuracy over time
    // For now, return placeholder values
    return {
      accuracy: 0.75, // 75% accuracy placeholder
      improvement: 0.1, // 10% improvement placeholder
    };
  }

  private async calculateLearningVelocity(): Promise<LearningMetrics["learningVelocity"]> {
    // Calculate learning velocity metrics
    // This would require more sophisticated tracking
    return {
      correctionsPerWeek: 5,
      newPatternsPerWeek: 2,
      accuracyImprovement: 0.05,
    };
  }

  private async calculateConfidenceDistribution(
    timeframeMonths: number
  ): Promise<LearningMetrics["confidenceDistribution"]> {
    const cutoffDate = currentDate.subtract({ months: timeframeMonths });

    const corrections = await db
      .select({ userConfidence: payeeCategoryCorrections.userConfidence })
      .from(payeeCategoryCorrections)
      .where(
        and(
          gte(payeeCategoryCorrections.createdAt, toISOString(cutoffDate)),
          isNull(payeeCategoryCorrections.deletedAt),
          isNull(payeeCategoryCorrections.userConfidence)
        )
      );

    const total = corrections.length;
    if (total === 0) {
      return { high: 0, medium: 0, low: 0 };
    }

    let high = 0,
      medium = 0,
      low = 0;

    corrections.forEach((c) => {
      const confidence = (c.userConfidence || 0) / 10; // Normalize to 0-1
      if (confidence > 0.8) high++;
      else if (confidence >= 0.4) medium++;
      else low++;
    });

    return {
      high: high / total,
      medium: medium / total,
      low: low / total,
    };
  }

  private async getAllCategoryDrifts(): Promise<LearningMetrics["categoryDriftDetection"]> {
    // This would require running drift detection across all payees
    // For now, return empty array as placeholder
    return [];
  }
}

// Re-export types for external use
export type {
  CategoryCorrection, CategoryDrift, CategoryRecommendation, CorrectionPattern, LearningMetrics
} from "$lib/schema";
