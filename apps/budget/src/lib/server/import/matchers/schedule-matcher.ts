/**
 * Schedule Matcher Service
 *
 * Provides intelligent matching of imported transactions to existing schedules
 * using payee, amount, date, and account matching with confidence scoring.
 */

import type { Payee } from "$lib/schema/payees";
import type { Schedule } from "$lib/schema/schedules";
import { PayeeMatcher } from "./payee-matcher";

export type ScheduleMatchConfidence = "exact" | "high" | "medium" | "low" | "none";

export interface ScheduleMatch {
  schedule: Schedule | null;
  confidence: ScheduleMatchConfidence;
  score: number;
  matchedOn: string[];
  reasons: string[];
}

export interface ScheduleMatchCriteria {
  date: string; // ISO date string
  amount: number;
  payeeId?: number | null;
  payeeName?: string;
  categoryId?: number | null;
  accountId: number;
}

export interface ScheduleMatcherOptions {
  exactAmountTolerance?: number; // Percentage (e.g., 0.02 for 2%)
  approximateAmountTolerance?: number; // Percentage (e.g., 0.10 for 10%)
  dateTolerance?: number; // Days (e.g., 7 for ±7 days)
  exactThreshold?: number; // Score threshold for exact confidence
  highThreshold?: number; // Score threshold for high confidence
  mediumThreshold?: number; // Score threshold for medium confidence
}

const DEFAULT_OPTIONS: Required<ScheduleMatcherOptions> = {
  exactAmountTolerance: 0.02, // 2%
  approximateAmountTolerance: 0.1, // 10%
  dateTolerance: 7, // ±7 days
  exactThreshold: 1.0,
  highThreshold: 0.85,
  mediumThreshold: 0.75, // Increased from 0.65 to 0.75 for better quality matches
};

export class ScheduleMatcher {
  private options: Required<ScheduleMatcherOptions>;
  private payeeMatcher: PayeeMatcher;

  constructor(options: ScheduleMatcherOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.payeeMatcher = new PayeeMatcher();
  }

  /**
   * Find the best matching schedule for a transaction
   */
  findBestMatch(
    criteria: ScheduleMatchCriteria,
    existingSchedules: Schedule[],
    existingPayees: Payee[]
  ): ScheduleMatch {
    if (!existingSchedules || existingSchedules.length === 0) {
      return {
        schedule: null,
        confidence: "none",
        score: 0,
        matchedOn: [],
        reasons: ["No schedules available"],
      };
    }

    // Filter to only active schedules for the same account
    const candidateSchedules = existingSchedules.filter(
      (s) => s.status === "active" && s.accountId === criteria.accountId
    );

    if (candidateSchedules.length === 0) {
      return {
        schedule: null,
        confidence: "none",
        score: 0,
        matchedOn: [],
        reasons: ["No active schedules for this account"],
      };
    }

    // Score each schedule
    const matches = candidateSchedules.map((schedule) =>
      this.scoreScheduleMatch(criteria, schedule, existingPayees)
    );

    // Find the best match
    matches.sort((a, b) => b.score - a.score);
    const bestMatch = matches[0];

    if (!bestMatch || bestMatch.score === 0) {
      return {
        schedule: null,
        confidence: "none",
        score: 0,
        matchedOn: [],
        reasons: ["No schedules matched criteria"],
      };
    }

    // Determine confidence level
    let confidence: ScheduleMatchConfidence;
    if (bestMatch.score >= this.options.exactThreshold) {
      confidence = "exact";
    } else if (bestMatch.score >= this.options.highThreshold) {
      confidence = "high";
    } else if (bestMatch.score >= this.options.mediumThreshold) {
      confidence = "medium";
    } else {
      confidence = "low";
    }

    return {
      schedule: bestMatch.schedule,
      confidence,
      score: bestMatch.score,
      matchedOn: bestMatch.matchedOn,
      reasons: bestMatch.reasons,
    };
  }

  /**
   * Score a schedule against transaction criteria
   */
  private scoreScheduleMatch(
    criteria: ScheduleMatchCriteria,
    schedule: Schedule,
    existingPayees: Payee[]
  ): { schedule: Schedule; score: number; matchedOn: string[]; reasons: string[] } {
    let score = 0;
    const matchedOn: string[] = [];
    const reasons: string[] = [];

    // Amount matching (50% weight) - primary matching criterion
    const amountScore = this.scoreAmountMatch(criteria.amount, schedule);
    if (amountScore > 0) {
      score += amountScore * 0.5;
      matchedOn.push("amount");
      reasons.push(`Amount match (${Math.round(amountScore * 100)}%)`);
    }

    // Date matching (30% weight) - secondary matching criterion
    const dateScore = this.scoreDateMatch(criteria.date, schedule);
    if (dateScore > 0) {
      score += dateScore * 0.3;
      matchedOn.push("date");
      reasons.push(`Date proximity (${Math.round(dateScore * 100)}%)`);
    }

    // Payee matching (15% weight) - bonus for matching payee names
    const payeeScore = this.scorePayeeMatch(criteria, schedule, existingPayees);
    if (payeeScore > 0) {
      score += payeeScore * 0.15;
      matchedOn.push("payee");
      reasons.push(`Payee match (${Math.round(payeeScore * 100)}%)`);
    }

    // Category matching (5% weight) - small bonus if categories match
    if (criteria.categoryId && schedule.categoryId === criteria.categoryId) {
      score += 0.05;
      matchedOn.push("category");
      reasons.push("Category match (exact)");
    }

    // Only log matches above 60% to reduce noise
    if (score >= 0.6) {
      console.log(
        `[ScheduleMatcher] Match: "${schedule.name}" | Score: ${(score * 100).toFixed(0)}% | Payee: "${criteria.payeeName}" | Amt: $${criteria.amount.toFixed(2)}`
      );
    }

    return { schedule, score, matchedOn, reasons };
  }

  /**
   * Score payee match
   */
  private scorePayeeMatch(
    criteria: ScheduleMatchCriteria,
    schedule: Schedule,
    existingPayees: Payee[]
  ): number {
    // Direct payee ID match
    if (criteria.payeeId && schedule.payeeId === criteria.payeeId) {
      return 1.0;
    }

    // Fuzzy payee name match if we have a name
    if (criteria.payeeName && schedule.payeeId) {
      const schedulePayee = existingPayees.find((p) => p.id === schedule.payeeId);
      if (schedulePayee) {
        const match = this.payeeMatcher.findBestMatch(criteria.payeeName, [schedulePayee]);
        if (match.confidence === "exact") return 1.0;
        if (match.confidence === "high") return 0.9;
        if (match.confidence === "medium") return 0.7;
        return 0;
      }
    }

    return 0;
  }

  /**
   * Score amount match based on schedule amount type
   */
  private scoreAmountMatch(amount: number, schedule: Schedule): number {
    const absAmount = Math.abs(amount);
    const scheduleAmount = Math.abs(schedule.amount || 0);

    if (scheduleAmount === 0) return 0;

    switch (schedule.amount_type) {
      case "exact": {
        // Allow small tolerance for exact amounts (e.g., $100.00 vs $100.01)
        const tolerance = scheduleAmount * this.options.exactAmountTolerance;
        const diff = Math.abs(absAmount - scheduleAmount);
        if (diff === 0) return 1.0;
        if (diff <= tolerance) return 0.95;
        return 0;
      }

      case "approximate": {
        // Wider tolerance for approximate amounts
        const tolerance = scheduleAmount * this.options.approximateAmountTolerance;
        const diff = Math.abs(absAmount - scheduleAmount);
        if (diff <= tolerance) {
          // Score decreases as difference increases
          return 1.0 - diff / tolerance;
        }
        return 0;
      }

      case "range": {
        // Amount should fall within the range
        const minAmount = Math.min(scheduleAmount, schedule.amount_2 || 0);
        const maxAmount = Math.max(scheduleAmount, schedule.amount_2 || 0);
        if (absAmount >= minAmount && absAmount <= maxAmount) {
          return 1.0;
        }
        // Check if it's close to the range
        const distanceToRange = Math.min(
          Math.abs(absAmount - minAmount),
          Math.abs(absAmount - maxAmount)
        );
        const rangeTolerance = (maxAmount - minAmount) * 0.1;
        if (distanceToRange <= rangeTolerance) {
          return 0.8;
        }
        return 0;
      }

      default:
        return 0;
    }
  }

  /**
   * Score date match - check if transaction date is close to expected schedule occurrence
   * This is a simplified version - in a full implementation, you'd calculate the actual
   * next occurrence date based on the schedule's recurring pattern
   */
  private scoreDateMatch(transactionDate: string, schedule: Schedule): number {
    // For now, we'll do a simple check if recurring is enabled
    // A full implementation would use the schedule's dateId to get recurring pattern
    // and calculate expected occurrence dates
    if (!schedule.recurring) {
      // For one-time schedules, we can't predict the date
      return 0.5; // Neutral score
    }

    // This is a placeholder - in a real implementation, you would:
    // 1. Get the schedule's recurring pattern from scheduleDate
    // 2. Calculate the next expected occurrence date
    // 3. Check if transaction date is within tolerance of that date
    // For now, we'll just return a neutral score
    return 0.5;
  }

  /**
   * Find all potential matches for a transaction (not just the best one)
   * Useful for showing the user multiple options
   */
  findAllMatches(
    criteria: ScheduleMatchCriteria,
    existingSchedules: Schedule[],
    existingPayees: Payee[],
    minConfidence: ScheduleMatchConfidence = "medium"
  ): ScheduleMatch[] {
    const candidateSchedules = existingSchedules.filter(
      (s) => s.status === "active" && s.accountId === criteria.accountId
    );

    const matches = candidateSchedules
      .map((schedule) => {
        const scoreResult = this.scoreScheduleMatch(criteria, schedule, existingPayees);

        let confidence: ScheduleMatchConfidence;
        if (scoreResult.score >= this.options.exactThreshold) {
          confidence = "exact";
        } else if (scoreResult.score >= this.options.highThreshold) {
          confidence = "high";
        } else if (scoreResult.score >= this.options.mediumThreshold) {
          confidence = "medium";
        } else if (scoreResult.score > 0) {
          confidence = "low";
        } else {
          confidence = "none";
        }

        return {
          schedule: scoreResult.schedule,
          confidence,
          score: scoreResult.score,
          matchedOn: scoreResult.matchedOn,
          reasons: scoreResult.reasons,
        };
      })
      .filter((match) => {
        // Filter by minimum confidence
        const confidenceLevels: ScheduleMatchConfidence[] = [
          "exact",
          "high",
          "medium",
          "low",
          "none",
        ];
        const minIndex = confidenceLevels.indexOf(minConfidence);
        const matchIndex = confidenceLevels.indexOf(match.confidence);
        return matchIndex <= minIndex && matchIndex < confidenceLevels.length - 1; // exclude 'none'
      })
      .sort((a, b) => b.score - a.score);

    return matches;
  }
}
