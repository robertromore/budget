import {db} from "$lib/server/db";
import {transactions, schedules} from "$lib/schema";
import {and, eq, isNull, gte} from "drizzle-orm";
import {PatternRepository} from "./repository";
import type {
  DetectionCriteria,
  DetectedPatternData,
  TransactionForDetection,
  TransactionGroup,
  IntervalData,
  PatternCandidate,
} from "./types";
import {DEFAULT_DETECTION_CRITERIA} from "./types";
import type {DetectedPattern} from "$lib/schema/detected-patterns";
import type {SuggestedScheduleConfig} from "$lib/schema/detected-patterns";

export class PatternDetectionService {
  constructor(private repository = new PatternRepository()) {}

  /**
   * Detect patterns for a specific account
   */
  async detectPatternsForAccount(
    accountId: number,
    userId?: string,
    criteria?: Partial<DetectionCriteria>
  ): Promise<DetectedPatternData[]> {
    const fullCriteria: DetectionCriteria = {...DEFAULT_DETECTION_CRITERIA, ...criteria};

    // Calculate lookback date
    const lookbackDate = new Date();
    lookbackDate.setMonth(lookbackDate.getMonth() - fullCriteria.lookbackMonths);

    // Fetch transactions for the account
    const accountTransactions = await db.query.transactions.findMany({
      where: and(
        eq(transactions.accountId, accountId),
        gte(transactions.date, lookbackDate.toISOString())
      ),
      orderBy: (transactions, {asc}) => [asc(transactions.date)],
    });

    return this.analyzeTransactionsForPatterns(
      accountTransactions as TransactionForDetection[],
      fullCriteria
    );
  }

  /**
   * Detect patterns across all user accounts
   * NOTE: Single-user mode - analyzes all accounts
   */
  async detectPatternsForUserAccounts(
    userId?: string,
    criteria?: Partial<DetectionCriteria>
  ): Promise<DetectedPatternData[]> {
    const fullCriteria: DetectionCriteria = {...DEFAULT_DETECTION_CRITERIA, ...criteria};

    // Get all account IDs (in single-user mode, gets all accounts)
    const accountIds = await this.repository.findUserAccountIds(userId);

    // Detect patterns for each account
    const allPatterns: DetectedPatternData[] = [];
    for (const accountId of accountIds) {
      const patterns = await this.detectPatternsForAccount(accountId, userId, criteria);
      allPatterns.push(...patterns);
    }

    return allPatterns;
  }

  /**
   * Core pattern analysis logic
   */
  private async analyzeTransactionsForPatterns(
    transactions: TransactionForDetection[],
    criteria: DetectionCriteria
  ): Promise<DetectedPatternData[]> {
    // Step 1: Filter candidate transactions
    const candidates = this.filterCandidateTransactions(transactions);

    if (candidates.length < criteria.minOccurrences) {
      return [];
    }

    // Step 2: Group similar transactions
    const groups = this.groupSimilarTransactions(candidates, criteria.amountVariancePercent);

    // Step 3: Analyze each group for patterns
    const patterns: DetectedPatternData[] = [];

    for (const group of groups) {
      if (group.transactions.length < criteria.minOccurrences) continue;

      // Calculate intervals between transactions
      const intervals = this.calculateIntervals(group.transactions);

      if (intervals.length < criteria.minOccurrences - 1) continue;

      // Detect pattern type and calculate metrics
      const avgInterval = this.calculateAvgInterval(intervals);
      const variance = this.calculateIntervalVariance(intervals, avgInterval);
      const patternType = this.detectPatternType(
        avgInterval,
        variance,
        criteria.intervalToleranceDays
      );

      if (!patternType) continue;

      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(
        group,
        intervals,
        avgInterval,
        variance,
        patternType,
        criteria
      );

      if (confidenceScore < criteria.minConfidenceScore) continue;

      // Build detected pattern data
      const pattern = this.buildDetectedPattern(
        group,
        intervals,
        avgInterval,
        patternType,
        confidenceScore
      );

      patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Filter transactions to exclude soft-deleted, transfers, and schedule-linked
   */
  private filterCandidateTransactions(
    transactions: TransactionForDetection[]
  ): TransactionForDetection[] {
    return transactions.filter(
      (t) => t.deletedAt === null && !t.isTransfer && t.scheduleId === null
    );
  }

  /**
   * Group transactions by similar payee, category, and amount
   */
  private groupSimilarTransactions(
    transactions: TransactionForDetection[],
    amountVariancePercent: number
  ): TransactionGroup[] {
    const groups: Map<string, TransactionForDetection[]> = new Map();

    for (const tx of transactions) {
      // Create a key based on payee and category
      const key = `${tx.payeeId || "null"}_${tx.categoryId || "null"}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tx);
    }

    // Further split groups by amount similarity
    const result: TransactionGroup[] = [];

    for (const [, txList] of groups) {
      // Sort by amount
      const sorted = txList.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));

      let currentGroup: TransactionForDetection[] = [];
      let currentAvg = 0;

      for (const tx of sorted) {
        const amount = Math.abs(tx.amount);

        if (currentGroup.length === 0) {
          currentGroup.push(tx);
          currentAvg = amount;
        } else {
          const variance = Math.abs(amount - currentAvg) / currentAvg;

          if (variance <= amountVariancePercent / 100) {
            currentGroup.push(tx);
            // Recalculate average
            const sum = currentGroup.reduce((s, t) => s + Math.abs(t.amount), 0);
            currentAvg = sum / currentGroup.length;
          } else {
            // Start new group
            if (currentGroup.length >= 2) {
              result.push({
                payeeId: currentGroup[0].payeeId,
                categoryId: currentGroup[0].categoryId,
                avgAmount: currentAvg,
                transactions: currentGroup,
              });
            }
            currentGroup = [tx];
            currentAvg = amount;
          }
        }
      }

      // Add final group
      if (currentGroup.length >= 2) {
        result.push({
          payeeId: currentGroup[0].payeeId,
          categoryId: currentGroup[0].categoryId,
          avgAmount: currentAvg,
          transactions: currentGroup,
        });
      }
    }

    return result;
  }

  /**
   * Calculate intervals between consecutive transactions
   */
  private calculateIntervals(transactions: TransactionForDetection[]): IntervalData[] {
    const sorted = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const intervals: IntervalData[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const from = sorted[i - 1];
      const to = sorted[i];

      const fromDate = new Date(from.date);
      const toDate = new Date(to.date);

      const daysBetween = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

      intervals.push({
        daysBetween,
        fromDate: from.date,
        toDate: to.date,
        fromTransactionId: from.id,
        toTransactionId: to.id,
      });
    }

    return intervals;
  }

  /**
   * Calculate average interval in days
   */
  private calculateAvgInterval(intervals: IntervalData[]): number {
    const sum = intervals.reduce((s, i) => s + i.daysBetween, 0);
    return sum / intervals.length;
  }

  /**
   * Calculate interval variance
   */
  private calculateIntervalVariance(intervals: IntervalData[], avg: number): number {
    const squaredDiffs = intervals.map((i) => Math.pow(i.daysBetween - avg, 2));
    const variance = squaredDiffs.reduce((s, d) => s + d, 0) / intervals.length;
    return Math.sqrt(variance);
  }

  /**
   * Detect pattern type based on average interval and variance
   */
  private detectPatternType(
    avgInterval: number,
    variance: number,
    toleranceDays: DetectionCriteria["intervalToleranceDays"]
  ): "daily" | "weekly" | "monthly" | "yearly" | null {
    // Daily: ~1 day ± tolerance
    if (Math.abs(avgInterval - 1) <= toleranceDays.daily && variance <= toleranceDays.daily) {
      return "daily";
    }

    // Weekly: ~7 days ± tolerance
    if (Math.abs(avgInterval - 7) <= toleranceDays.weekly && variance <= toleranceDays.weekly) {
      return "weekly";
    }

    // Bi-weekly: ~14 days ± tolerance
    if (Math.abs(avgInterval - 14) <= toleranceDays.weekly && variance <= toleranceDays.weekly) {
      return "weekly";
    }

    // Monthly: ~30 days ± tolerance
    if (Math.abs(avgInterval - 30) <= toleranceDays.monthly && variance <= toleranceDays.monthly) {
      return "monthly";
    }

    // Yearly: ~365 days ± tolerance
    if (Math.abs(avgInterval - 365) <= toleranceDays.yearly && variance <= toleranceDays.yearly) {
      return "yearly";
    }

    return null;
  }

  /**
   * Calculate confidence score for a pattern
   */
  private calculateConfidenceScore(
    group: TransactionGroup,
    intervals: IntervalData[],
    avgInterval: number,
    variance: number,
    patternType: "daily" | "weekly" | "monthly" | "yearly",
    criteria: DetectionCriteria
  ): number {
    let score = 0;

    // Factor 1: Number of occurrences (max 40 points)
    const occurrenceScore = Math.min((group.transactions.length / criteria.minOccurrences) * 20, 40);
    score += occurrenceScore;

    // Factor 2: Interval consistency (max 30 points)
    const expectedTolerance = criteria.intervalToleranceDays[patternType];
    const consistencyScore = Math.max(0, 30 - (variance / expectedTolerance) * 10);
    score += consistencyScore;

    // Factor 3: Amount consistency (max 20 points)
    const amounts = group.transactions.map((t) => Math.abs(t.amount));
    const amountAvg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const amountVariance =
      amounts.map((a) => Math.abs(a - amountAvg) / amountAvg).reduce((s, v) => s + v, 0) /
      amounts.length;
    const amountScore = Math.max(0, 20 - amountVariance * 100);
    score += amountScore;

    // Factor 4: Recency (max 10 points)
    const lastTransaction = group.transactions[group.transactions.length - 1];
    const daysSinceLastTransaction = Math.round(
      (Date.now() - new Date(lastTransaction.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyScore = Math.max(0, 10 - daysSinceLastTransaction / 30);
    score += recencyScore;

    return Math.round(score);
  }

  /**
   * Build complete detected pattern data
   */
  private buildDetectedPattern(
    group: TransactionGroup,
    intervals: IntervalData[],
    avgInterval: number,
    patternType: "daily" | "weekly" | "monthly" | "yearly",
    confidenceScore: number
  ): DetectedPatternData {
    const sorted = group.transactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const amounts = group.transactions.map((t) => Math.abs(t.amount));
    const amountMin = Math.min(...amounts);
    const amountMax = Math.max(...amounts);
    const amountAvg = amounts.reduce((s, a) => s + a, 0) / amounts.length;

    const lastOccurrence = sorted[sorted.length - 1].date;
    const nextExpectedDate = new Date(lastOccurrence);
    nextExpectedDate.setDate(nextExpectedDate.getDate() + Math.round(avgInterval));

    // Build suggested schedule config
    const suggestedScheduleConfig = this.buildSuggestedScheduleConfig(
      group,
      patternType,
      Math.round(avgInterval),
      amountMin,
      amountMax,
      amountAvg,
      lastOccurrence
    );

    return {
      accountId: group.transactions[0].accountId,
      patternType,
      confidenceScore,
      sampleTransactionIds: group.transactions.map((t) => t.id),
      payeeId: group.payeeId,
      categoryId: group.categoryId,
      amountMin,
      amountMax,
      amountAvg,
      intervalDays: Math.round(avgInterval),
      lastOccurrence,
      nextExpected: nextExpectedDate.toISOString().split("T")[0],
      suggestedScheduleConfig,
    };
  }

  /**
   * Build suggested schedule configuration from pattern
   */
  private buildSuggestedScheduleConfig(
    group: TransactionGroup,
    patternType: "daily" | "weekly" | "monthly" | "yearly",
    intervalDays: number,
    amountMin: number,
    amountMax: number,
    amountAvg: number,
    lastOccurrence: string
  ): SuggestedScheduleConfig {
    const amountVariance = (amountMax - amountMin) / amountAvg;

    // Determine amount type
    let amountType: "exact" | "approximate" | "range";
    if (amountVariance < 0.05) {
      amountType = "exact";
    } else if (amountVariance < 0.15) {
      amountType = "approximate";
    } else {
      amountType = "range";
    }

    // Determine interval
    let interval = 1;
    if (patternType === "weekly") {
      interval = Math.round(intervalDays / 7);
    } else if (patternType === "monthly") {
      interval = Math.round(intervalDays / 30);
    } else if (patternType === "yearly") {
      interval = Math.round(intervalDays / 365);
    }

    const nextDate = new Date(lastOccurrence);
    nextDate.setDate(nextDate.getDate() + intervalDays);

    return {
      name: `Auto-detected ${patternType} pattern`,
      amountType,
      amount: Math.abs(amountAvg),
      amount2: amountType === "range" ? Math.abs(amountMax) : undefined,
      autoAdd: false,
      recurring: true,
      frequency: patternType,
      interval: Math.max(1, interval),
      startDate: nextDate.toISOString().split("T")[0],
    };
  }

  /**
   * Save detected pattern to database
   */
  async saveDetectedPattern(pattern: DetectedPatternData, userId?: string): Promise<number> {
    return await this.repository.create(pattern, userId);
  }

  /**
   * Save or update detected pattern (with deduplication)
   * If a similar pending pattern exists, update it. Otherwise, create a new one.
   */
  async saveOrUpdatePattern(pattern: DetectedPatternData, userId?: string): Promise<number> {
    // Check if a similar pending pattern already exists
    const existingPattern = await this.repository.findSimilarPattern(
      pattern.accountId,
      pattern.payeeId || null,
      pattern.categoryId || null,
      pattern.patternType,
      userId
    );

    if (existingPattern) {
      // Update the existing pattern with new data
      await this.repository.update(
        existingPattern.id,
        {
          amountMin: pattern.amountMin,
          amountMax: pattern.amountMax,
          amountAvg: pattern.amountAvg,
          intervalDays: pattern.intervalDays,
          confidenceScore: pattern.confidenceScore,
          lastOccurrence: pattern.lastOccurrence,
          nextExpected: pattern.nextExpected,
          sampleTransactionIds: pattern.sampleTransactionIds,
          suggestedScheduleConfig: pattern.suggestedScheduleConfig,
        },
        userId
      );
      return existingPattern.id;
    } else {
      // Create a new pattern
      return await this.repository.create(pattern, userId);
    }
  }

  /**
   * Get all detected patterns with optional filtering
   */
  async getDetectedPatterns(
    userId?: string,
    accountId?: number,
    status?: string
  ): Promise<DetectedPattern[]> {
    return await this.repository.findByAccount(accountId, userId, status);
  }

  /**
   * Delete all detected patterns (optionally filtered by status)
   */
  async deleteAllPatterns(
    userId?: string,
    status?: "pending" | "accepted" | "dismissed" | "converted"
  ): Promise<number> {
    return await this.repository.deleteAll(userId, status);
  }

  /**
   * Update pattern status
   */
  async updatePatternStatus(
    patternId: number,
    userId?: string,
    status: "accepted" | "dismissed" | "converted" = "accepted"
  ): Promise<void> {
    await this.repository.updateStatus(patternId, userId, status);
  }

  /**
   * Generate a descriptive schedule name from pattern
   */
  private async generateScheduleName(pattern: DetectedPattern): Promise<string> {
    const {db} = await import("$lib/server/db");
    const {payees} = await import("$lib/schema");
    const {eq} = await import("drizzle-orm");

    // Fetch payee name
    let payeeName = "Unknown";
    if (pattern.payeeId) {
      const payee = await db.query.payees.findFirst({
        where: eq(payees.id, pattern.payeeId),
      });
      payeeName = payee?.name || "Unknown";
    }

    // Format frequency for display
    const frequencyMap = {
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      yearly: "Yearly",
    };
    const frequencyLabel = frequencyMap[pattern.patternType] || "Recurring";

    // Generate descriptive name
    return `${payeeName} - ${frequencyLabel}`;
  }

  /**
   * Match existing transactions to the newly created schedule
   */
  private async matchTransactionsToSchedule(
    pattern: DetectedPattern,
    scheduleId: number
  ): Promise<number> {
    const {db} = await import("$lib/server/db");
    const {transactions} = await import("$lib/schema");
    const {inArray, eq} = await import("drizzle-orm");

    // Get sample transaction IDs from pattern
    const transactionIds = pattern.sampleTransactionIds || [];

    if (transactionIds.length === 0) {
      return 0;
    }

    // Update transactions to link them to the schedule
    const result = await db
      .update(transactions)
      .set({scheduleId})
      .where(inArray(transactions.id, transactionIds));

    return result.changes || 0;
  }

  /**
   * Convert pattern to schedule
   */
  async convertPatternToSchedule(patternId: number, userId?: string): Promise<number> {
    const pattern = await this.repository.findById(patternId, userId);

    if (!pattern) {
      throw new Error("Pattern not found");
    }

    if (!pattern.suggestedScheduleConfig) {
      throw new Error("Pattern does not have schedule configuration");
    }

    const config = pattern.suggestedScheduleConfig;

    // Import db and schedule tables
    const {db} = await import("$lib/server/db");
    const {schedules, scheduleDates} = await import("$lib/schema");
    const {generateUniqueSlugForDB} = await import("$lib/utils/slug-utils");
    const slugify = (await import("@sindresorhus/slugify")).default;

    // Generate better schedule name
    const scheduleName = await this.generateScheduleName(pattern);

    // Generate slug for the schedule
    const baseSlug = slugify(scheduleName);
    const slug = await generateUniqueSlugForDB(
      db,
      "schedules",
      schedules.slug,
      baseSlug,
      {}
    );

    // If pattern doesn't have a payeeId, we can't create a schedule
    if (!pattern.payeeId) {
      throw new Error("Pattern must have a payee to convert to schedule");
    }

    // Create the schedule first (without schedule_date_id)
    const scheduleResult = await db
      .insert(schedules)
      .values({
        name: scheduleName,
        slug,
        accountId: pattern.accountId,
        payeeId: pattern.payeeId,
        categoryId: pattern.categoryId,
        amount: config.amount,
        amount_2: config.amount2 || 0,
        amount_type: config.amountType,
        auto_add: config.autoAdd,
        status: "active",
      })
      .returning({id: schedules.id});

    const scheduleId = scheduleResult[0]?.id;
    if (!scheduleId) {
      throw new Error("Failed to create schedule");
    }

    // Create the schedule_date if recurring
    if (config.recurring && config.frequency) {
      const dateResult = await db
        .insert(scheduleDates)
        .values({
          scheduleId,
          frequency: config.frequency,
          interval: config.interval || 1,
          start: config.startDate,
          end: null,
        })
        .returning({id: scheduleDates.id});

      const scheduleDateId = dateResult[0]?.id;
      if (scheduleDateId) {
        // Update the schedule with the schedule_date_id
        const {eq} = await import("drizzle-orm");
        await db
          .update(schedules)
          .set({dateId: scheduleDateId})
          .where(eq(schedules.id, scheduleId));
      }
    }

    // Match existing transactions to this schedule
    await this.matchTransactionsToSchedule(pattern, scheduleId);

    // Mark pattern as converted and store the scheduleId
    const {eq} = await import("drizzle-orm");
    await db
      .update((await import("$lib/schema")).detectedPatterns)
      .set({
        status: "converted",
        scheduleId,
      })
      .where(eq((await import("$lib/schema")).detectedPatterns.id, patternId));

    return scheduleId;
  }

  /**
   * Dismiss a pattern and optionally delete associated schedule
   */
  async dismissPattern(patternId: number, userId?: string): Promise<void> {
    // Get the pattern to check if it has an associated schedule
    const pattern = await this.repository.findById(patternId, userId);

    if (!pattern) {
      throw new Error("Pattern not found");
    }

    // If pattern is converted and has a schedule, delete the schedule
    if (pattern.status === "converted" && pattern.scheduleId) {
      const {db} = await import("$lib/server/db");
      const {schedules} = await import("$lib/schema");
      const {eq} = await import("drizzle-orm");

      await db.delete(schedules).where(eq(schedules.id, pattern.scheduleId));
    }

    // Mark pattern as dismissed
    await this.repository.updateStatus(patternId, userId, "dismissed");
  }

  /**
   * Expire stale patterns
   */
  async expireStalePatterns(userId?: string, daysSinceLastMatch = 90): Promise<number> {
    return await this.repository.expireStalePatterns(daysSinceLastMatch, userId);
  }
}
