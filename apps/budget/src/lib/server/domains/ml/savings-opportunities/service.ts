/**
 * Savings Opportunities Detection Service
 *
 * Identifies potential savings by analyzing:
 * - Subscriptions with no related transactions (unused services)
 * - Price increases on recurring bills
 * - Duplicate subscriptions (multiple streaming services, etc.)
 * - Merchants where spending increased significantly
 */

import { categories, payees, transactions } from "$lib/schema";
import { db } from "$lib/server/db";
import { and, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { mean } from "simple-statistics";
import type { MLModelStore } from "../model-store";
import { createRecurringTransactionDetectionService } from "../recurring-detection/service";
import type { RecurringPattern } from "../types";
import { getWorkspaceAccountIds } from "../utils";
import { formatPercentRaw } from "$lib/utils/formatters";

// =============================================================================
// Types
// =============================================================================

export type OpportunityType =
  | "unused_subscription"
  | "price_increase"
  | "duplicate_service"
  | "spending_increase"
  | "negotiation_candidate";

export type OpportunityPriority = "low" | "medium" | "high";

export interface SavingsOpportunity {
  id: string;
  type: OpportunityType;
  priority: OpportunityPriority;
  title: string;
  description: string;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  confidence: number;

  // Related entities
  payeeId?: number;
  payeeName?: string;
  categoryId?: number;
  categoryName?: string;

  // Evidence
  evidence: OpportunityEvidence;

  // Actions
  suggestedActions: string[];
  actionUrl?: string;
}

export interface OpportunityEvidence {
  // For unused subscriptions
  lastTransactionDate?: string;
  daysSinceLastTransaction?: number;
  monthlyAmount?: number;

  // For price increases
  previousAmount?: number;
  currentAmount?: number;
  increasePercent?: number;
  increaseDate?: string;

  // For duplicates
  similarServices?: Array<{
    payeeId: number;
    payeeName: string;
    monthlyAmount: number;
  }>;

  // For spending increases
  previousMonthlyAvg?: number;
  currentMonthlyAvg?: number;
  changePercent?: number;

  // General
  transactionCount?: number;
  totalSpent?: number;
}

export interface SavingsOpportunitySummary {
  opportunities: SavingsOpportunity[];
  totalMonthlyPotential: number;
  totalAnnualPotential: number;
  byType: Record<OpportunityType, number>;
  byPriority: Record<OpportunityPriority, number>;
  lastUpdated: string;
}

export interface SavingsOpportunityConfig {
  // Unused subscription thresholds
  unusedDaysThreshold: number; // Days without usage to flag as unused
  minSubscriptionAmount: number; // Minimum amount to consider

  // Price increase thresholds
  priceIncreaseThresholdPercent: number; // % increase to flag

  // Spending increase thresholds
  spendingIncreaseThresholdPercent: number; // % increase to flag
  spendingIncreaseMinAmount: number; // Minimum monthly amount to flag

  // Analysis periods
  lookbackMonths: number;
  recentMonths: number; // Months to consider for "current" spending

  // Duplicate detection
  duplicateCategories: string[]; // Category names to check for duplicates
}

const DEFAULT_CONFIG: SavingsOpportunityConfig = {
  unusedDaysThreshold: 60,
  minSubscriptionAmount: 5,

  priceIncreaseThresholdPercent: 10,

  spendingIncreaseThresholdPercent: 25,
  spendingIncreaseMinAmount: 50,

  lookbackMonths: 12,
  recentMonths: 3,

  duplicateCategories: [
    "Streaming",
    "Subscriptions",
    "Entertainment",
    "Software",
    "Music",
    "Video",
    "Gaming",
    "News",
    "Fitness",
    "Cloud Storage",
  ],
};

// Common streaming/subscription services for duplicate detection
const STREAMING_SERVICES = new Set([
  "netflix",
  "hulu",
  "disney",
  "disney+",
  "hbo",
  "hbo max",
  "max",
  "paramount",
  "paramount+",
  "peacock",
  "apple tv",
  "amazon prime",
  "prime video",
  "youtube premium",
  "youtube tv",
  "spotify",
  "apple music",
  "amazon music",
  "pandora",
  "tidal",
  "deezer",
  "audible",
]);

const CLOUD_STORAGE_SERVICES = new Set([
  "dropbox",
  "google one",
  "google drive",
  "icloud",
  "onedrive",
  "box",
  "mega",
]);

const FITNESS_SERVICES = new Set([
  "peloton",
  "apple fitness",
  "fitbit premium",
  "strava",
  "myfitnesspal",
  "noom",
  "headspace",
  "calm",
]);

// Bills that are commonly negotiable
const NEGOTIABLE_BILL_CATEGORIES = new Set([
  // Utilities
  "electric",
  "electricity",
  "power",
  "gas",
  "water",
  "utilities",
  "utility",
  // Internet & Phone
  "internet",
  "broadband",
  "cable",
  "phone",
  "mobile",
  "cell",
  "wireless",
  "telecom",
  "verizon",
  "at&t",
  "t-mobile",
  "comcast",
  "xfinity",
  "spectrum",
  "cox",
  "centurylink",
  // Insurance
  "insurance",
  "auto insurance",
  "car insurance",
  "home insurance",
  "renters insurance",
  "life insurance",
  "health insurance",
  "geico",
  "state farm",
  "progressive",
  "allstate",
  // Memberships
  "gym",
  "fitness",
  "membership",
  "club",
  // Other negotiable
  "rent",
  "storage",
  "security",
  "alarm",
  "pest control",
  "lawn",
  "landscaping",
  "cleaning",
  "maid",
  "housekeeping",
]);

// Minimum monthly amount to consider for negotiation (in dollars)
const MIN_NEGOTIABLE_AMOUNT = 20;

// Minimum months of history to consider stable enough for negotiation
const MIN_STABLE_MONTHS = 6;

export interface SavingsOpportunityService {
  /**
   * Get all savings opportunities for a workspace
   */
  getOpportunities(
    workspaceId: number,
    options?: Partial<SavingsOpportunityConfig>
  ): Promise<SavingsOpportunitySummary>;

  /**
   * Detect unused subscriptions
   */
  detectUnusedSubscriptions(workspaceId: number): Promise<SavingsOpportunity[]>;

  /**
   * Detect price increases on recurring bills
   */
  detectPriceIncreases(workspaceId: number): Promise<SavingsOpportunity[]>;

  /**
   * Detect duplicate subscriptions
   */
  detectDuplicates(workspaceId: number): Promise<SavingsOpportunity[]>;

  /**
   * Detect significant spending increases
   */
  detectSpendingIncreases(workspaceId: number): Promise<SavingsOpportunity[]>;

  /**
   * Detect bills that could be negotiated for better rates
   */
  detectNegotiationCandidates(workspaceId: number): Promise<SavingsOpportunity[]>;

  /**
   * Get quick summary for dashboard
   */
  getSummary(workspaceId: number): Promise<{
    opportunityCount: number;
    totalMonthlyPotential: number;
    topOpportunity: SavingsOpportunity | null;
  }>;
}

// =============================================================================
// Service Implementation
// =============================================================================

export function createSavingsOpportunityService(
  modelStore: MLModelStore,
  config: Partial<SavingsOpportunityConfig> = {}
): SavingsOpportunityService {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const recurringService = createRecurringTransactionDetectionService(modelStore);

  /**
   * Calculate monthly value from a recurring pattern
   */
  function getMonthlyValue(pattern: RecurringPattern): number {
    const amount = Math.abs(pattern.averageAmount);
    switch (pattern.frequency) {
      case "daily":
        return amount * 30;
      case "weekly":
        return amount * 4.33;
      case "biweekly":
        return amount * 2.17;
      case "monthly":
        return amount;
      case "quarterly":
        return amount / 3;
      case "yearly":
        return amount / 12;
      default:
        return (amount * 30) / pattern.interval;
    }
  }

  /**
   * Calculate priority based on potential savings
   */
  function calculatePriority(monthlySavings: number): OpportunityPriority {
    if (monthlySavings >= 50) return "high";
    if (monthlySavings >= 20) return "medium";
    return "low";
  }

  /**
   * Normalize payee name for comparison
   */
  function normalizePayeeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  /**
   * Check if payee name matches a known service category
   */
  function matchesServiceCategory(
    payeeName: string,
    serviceSet: Set<string>
  ): boolean {
    const normalized = normalizePayeeName(payeeName);
    for (const service of serviceSet) {
      if (normalized.includes(normalizePayeeName(service))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate opportunity ID
   */
  function generateOpportunityId(type: OpportunityType, payeeId?: number): string {
    return `${type}-${payeeId || "general"}-${Date.now()}`;
  }

  /**
   * Get suggested actions based on bill type
   */
  function getSuggestedActions(
    billType: string,
    hasIncreased: boolean,
    monthsOfHistory: number
  ): string[] {
    const actions: string[] = [];

    // Universal suggestions
    if (hasIncreased) {
      actions.push("Call and ask about price matching or promotional rates");
      actions.push("Reference the price increase and ask for a loyalty discount");
    }

    if (monthsOfHistory >= 12) {
      actions.push("Mention you've been a customer for over a year");
    }

    // Bill-type specific suggestions
    if (billType.includes("insurance")) {
      actions.push("Get quotes from competitors to use as leverage");
      actions.push("Ask about bundling discounts (home + auto)");
      actions.push("Review coverage levels - you may be over-insured");
      actions.push("Ask about discounts for safety features or good driving");
    } else if (
      billType.includes("internet") ||
      billType.includes("cable") ||
      billType.includes("comcast") ||
      billType.includes("spectrum")
    ) {
      actions.push("Ask about current promotional rates for new customers");
      actions.push("Threaten to switch to a competitor");
      actions.push("Ask to speak with the retention department");
      actions.push("Consider if you need all the channels/speed tiers");
    } else if (
      billType.includes("phone") ||
      billType.includes("mobile") ||
      billType.includes("verizon") ||
      billType.includes("t-mobile")
    ) {
      actions.push("Compare rates with other carriers");
      actions.push("Check if you're on the best plan for your usage");
      actions.push("Ask about loyalty discounts or promotions");
      actions.push("Consider prepaid options for significant savings");
    } else if (billType.includes("gym") || billType.includes("fitness")) {
      actions.push("Ask about annual payment discounts");
      actions.push("Negotiate during off-peak sign-up periods");
      actions.push("Consider if usage justifies the cost");
    } else if (billType.includes("rent")) {
      actions.push("Research comparable rents in the area");
      actions.push("Offer to sign a longer lease for a discount");
      actions.push("Point out any issues with the property");
      actions.push("Negotiate at renewal time, not mid-lease");
    } else if (
      billType.includes("electric") ||
      billType.includes("gas") ||
      billType.includes("utilities")
    ) {
      actions.push("Ask about budget billing for predictable payments");
      actions.push("Check for low-income assistance programs");
      actions.push("Review time-of-use rate options");
    } else {
      // Generic suggestions
      actions.push("Ask about available discounts or promotions");
      actions.push("Compare with competitors");
      actions.push("Ask about loyalty or long-term customer discounts");
    }

    return actions.slice(0, 4); // Return top 4 most relevant
  }

  return {
    async getOpportunities(workspaceId, options = {}): Promise<SavingsOpportunitySummary> {
      const mergedConfig = { ...cfg, ...options };

      // Gather all opportunities in parallel
      const [unused, priceIncreases, duplicates, spendingIncreases, negotiationCandidates] =
        await Promise.all([
          this.detectUnusedSubscriptions(workspaceId),
          this.detectPriceIncreases(workspaceId),
          this.detectDuplicates(workspaceId),
          this.detectSpendingIncreases(workspaceId),
          this.detectNegotiationCandidates(workspaceId),
        ]);

      const opportunities = [
        ...unused,
        ...priceIncreases,
        ...duplicates,
        ...spendingIncreases,
        ...negotiationCandidates,
      ];

      // Sort by priority and potential savings
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      opportunities.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.estimatedMonthlySavings - a.estimatedMonthlySavings;
      });

      // Calculate totals
      const totalMonthlyPotential = opportunities.reduce(
        (sum, o) => sum + o.estimatedMonthlySavings,
        0
      );

      // Count by type
      const byType: Record<OpportunityType, number> = {
        unused_subscription: 0,
        price_increase: 0,
        duplicate_service: 0,
        spending_increase: 0,
        negotiation_candidate: 0,
      };

      const byPriority: Record<OpportunityPriority, number> = {
        low: 0,
        medium: 0,
        high: 0,
      };

      for (const o of opportunities) {
        byType[o.type]++;
        byPriority[o.priority]++;
      }

      return {
        opportunities,
        totalMonthlyPotential,
        totalAnnualPotential: totalMonthlyPotential * 12,
        byType,
        byPriority,
        lastUpdated: new Date().toISOString(),
      };
    },

    async detectUnusedSubscriptions(workspaceId): Promise<SavingsOpportunity[]> {
      const opportunities: SavingsOpportunity[] = [];

      // Get recurring patterns
      const { patterns } = await recurringService.detectPatterns(workspaceId, {
        lookbackMonths: cfg.lookbackMonths,
        minConfidence: 0.5,
      });

      // Filter for subscription-like patterns (expenses, relatively fixed amounts)
      const subscriptions = patterns.filter((p) => {
        const monthlyValue = getMonthlyValue(p);
        return (
          p.averageAmount < 0 && // Expenses
          monthlyValue >= cfg.minSubscriptionAmount &&
          monthlyValue <= 500 && // Not large bills
          (p.amountType === "exact" || p.amountType === "approximate")
        );
      });

      const today = new Date();

      for (const sub of subscriptions) {
        const lastDate = new Date(sub.lastOccurrence);
        const daysSince = Math.floor(
          (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if subscription seems unused (no recent transactions)
        if (daysSince >= cfg.unusedDaysThreshold && !sub.isActive) {
          const monthlyAmount = getMonthlyValue(sub);

          opportunities.push({
            id: generateOpportunityId("unused_subscription", sub.payeeId),
            type: "unused_subscription",
            priority: calculatePriority(monthlyAmount),
            title: `Possibly unused: ${sub.payeeName}`,
            description: `No transactions in ${daysSince} days. Consider canceling if no longer needed.`,
            estimatedMonthlySavings: monthlyAmount,
            estimatedAnnualSavings: monthlyAmount * 12,
            confidence: Math.min(0.9, 0.5 + daysSince / 180), // Higher confidence with more time
            payeeId: sub.payeeId,
            payeeName: sub.payeeName,
            categoryId: sub.categoryId,
            categoryName: sub.categoryName,
            evidence: {
              lastTransactionDate: sub.lastOccurrence,
              daysSinceLastTransaction: daysSince,
              monthlyAmount,
              transactionCount: sub.occurrenceCount,
            },
            suggestedActions: [
              "Review if you still use this service",
              "Check for any associated login or usage",
              "Cancel subscription if no longer needed",
              "Consider downgrading to a free tier if available",
            ],
          });
        }
      }

      return opportunities;
    },

    async detectPriceIncreases(workspaceId): Promise<SavingsOpportunity[]> {
      const opportunities: SavingsOpportunity[] = [];

      // Get recurring patterns
      const { patterns } = await recurringService.detectPatterns(workspaceId, {
        lookbackMonths: cfg.lookbackMonths,
        minConfidence: 0.6,
      });

      // Filter for bills and subscriptions
      const bills = patterns.filter((p) => p.averageAmount < 0 && p.occurrenceCount >= 4);

      for (const bill of bills) {
        const txns = bill.matchingTransactions.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        if (txns.length < 4) continue;

        // Compare recent vs earlier amounts
        const recentCount = Math.min(3, Math.floor(txns.length / 2));
        const recentTxns = txns.slice(-recentCount);
        const earlierTxns = txns.slice(0, -recentCount);

        const recentAvg = mean(recentTxns.map((t) => Math.abs(t.amount)));
        const earlierAvg = mean(earlierTxns.map((t) => Math.abs(t.amount)));

        if (earlierAvg === 0) continue;

        const increasePercent = ((recentAvg - earlierAvg) / earlierAvg) * 100;

        if (increasePercent >= cfg.priceIncreaseThresholdPercent) {
          const monthlyIncrease = (recentAvg - earlierAvg) * (30 / bill.interval);

          // Find when the increase happened
          let increaseDate = recentTxns[0].date;
          for (let i = 1; i < txns.length; i++) {
            const prevAmount = Math.abs(txns[i - 1].amount);
            const currAmount = Math.abs(txns[i].amount);
            if ((currAmount - prevAmount) / prevAmount > 0.05) {
              increaseDate = txns[i].date;
              break;
            }
          }

          opportunities.push({
            id: generateOpportunityId("price_increase", bill.payeeId),
            type: "price_increase",
            priority: calculatePriority(monthlyIncrease),
            title: `Price increase detected: ${bill.payeeName}`,
            description: `Price increased ${formatPercentRaw(increasePercent, 1)} (from $${earlierAvg.toFixed(2)} to $${recentAvg.toFixed(2)})`,
            estimatedMonthlySavings: monthlyIncrease,
            estimatedAnnualSavings: monthlyIncrease * 12,
            confidence: 0.8,
            payeeId: bill.payeeId,
            payeeName: bill.payeeName,
            categoryId: bill.categoryId,
            categoryName: bill.categoryName,
            evidence: {
              previousAmount: earlierAvg,
              currentAmount: recentAvg,
              increasePercent,
              increaseDate,
              transactionCount: txns.length,
            },
            suggestedActions: [
              "Contact provider to negotiate better rate",
              "Review your plan for downgrade options",
              "Compare with competitor pricing",
              "Look for promotional offers or bundles",
            ],
          });
        }
      }

      return opportunities;
    },

    async detectDuplicates(workspaceId): Promise<SavingsOpportunity[]> {
      const opportunities: SavingsOpportunity[] = [];

      // Get recurring patterns
      const { patterns } = await recurringService.detectPatterns(workspaceId, {
        lookbackMonths: cfg.lookbackMonths,
        minConfidence: 0.5,
      });

      // Group by service category
      const streamingServices: RecurringPattern[] = [];
      const cloudStorage: RecurringPattern[] = [];
      const fitnessServices: RecurringPattern[] = [];

      for (const pattern of patterns) {
        if (pattern.averageAmount >= 0) continue; // Only expenses

        const payeeName = pattern.payeeName.toLowerCase();

        if (matchesServiceCategory(payeeName, STREAMING_SERVICES)) {
          streamingServices.push(pattern);
        }
        if (matchesServiceCategory(payeeName, CLOUD_STORAGE_SERVICES)) {
          cloudStorage.push(pattern);
        }
        if (matchesServiceCategory(payeeName, FITNESS_SERVICES)) {
          fitnessServices.push(pattern);
        }
      }

      // Flag duplicates within each category
      const checkDuplicates = (
        services: RecurringPattern[],
        categoryName: string
      ) => {
        if (services.length <= 1) return;

        // Sort by monthly value descending
        const sorted = services
          .map((s) => ({ pattern: s, monthlyValue: getMonthlyValue(s) }))
          .sort((a, b) => b.monthlyValue - a.monthlyValue);

        // The smaller ones could potentially be eliminated
        const totalMonthly = sorted.reduce((sum, s) => sum + s.monthlyValue, 0);
        const potentialSavings = sorted.slice(1).reduce((sum, s) => sum + s.monthlyValue, 0);

        const similarServices = sorted.map((s) => ({
          payeeId: s.pattern.payeeId,
          payeeName: s.pattern.payeeName,
          monthlyAmount: s.monthlyValue,
        }));

        opportunities.push({
          id: generateOpportunityId("duplicate_service"),
          type: "duplicate_service",
          priority: calculatePriority(potentialSavings),
          title: `Multiple ${categoryName} services detected`,
          description: `You have ${services.length} ${categoryName.toLowerCase()} subscriptions totaling $${totalMonthly.toFixed(2)}/month`,
          estimatedMonthlySavings: potentialSavings,
          estimatedAnnualSavings: potentialSavings * 12,
          confidence: 0.7,
          categoryName,
          evidence: {
            similarServices,
            totalSpent: totalMonthly,
          },
          suggestedActions: [
            `Review which ${categoryName.toLowerCase()} services you actually use`,
            "Consider consolidating to one or two services",
            "Check for bundle deals that include multiple services",
            "Rotate services monthly instead of paying for all simultaneously",
          ],
        });
      };

      checkDuplicates(streamingServices, "Streaming");
      checkDuplicates(cloudStorage, "Cloud Storage");
      checkDuplicates(fitnessServices, "Fitness/Wellness");

      return opportunities;
    },

    async detectSpendingIncreases(workspaceId): Promise<SavingsOpportunity[]> {
      const opportunities: SavingsOpportunity[] = [];

      const accountIds = await getWorkspaceAccountIds(workspaceId);
      if (accountIds.length === 0) return [];

      // Get spending by payee for recent vs earlier period
      const now = new Date();
      const recentStart = new Date();
      recentStart.setMonth(now.getMonth() - cfg.recentMonths);
      const earlierStart = new Date();
      earlierStart.setMonth(now.getMonth() - cfg.lookbackMonths);

      // Get payee spending grouped by period
      const result = await db
        .select({
          payeeId: transactions.payeeId,
          payeeName: payees.name,
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          period: sql<string>`CASE
            WHEN ${transactions.date} >= ${recentStart.toISOString().split("T")[0]} THEN 'recent'
            ELSE 'earlier'
          END`,
          totalAmount: sql<number>`SUM(ABS(${transactions.amount})) / 100.0`,
          txnCount: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .leftJoin(payees, eq(transactions.payeeId, payees.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            inArray(transactions.accountId, accountIds),
            gte(transactions.date, earlierStart.toISOString().split("T")[0]),
            isNull(transactions.deletedAt),
            ne(transactions.status, "scheduled"),
            sql`${transactions.amount} < 0`,
            sql`${transactions.payeeId} IS NOT NULL`
          )
        )
        .groupBy(
          transactions.payeeId,
          payees.name,
          transactions.categoryId,
          categories.name,
          sql`CASE
            WHEN ${transactions.date} >= ${recentStart.toISOString().split("T")[0]} THEN 'recent'
            ELSE 'earlier'
          END`
        );

      // Group by payee
      const payeeSpending = new Map<
        number,
        {
          payeeId: number;
          payeeName: string;
          categoryId: number | null;
          categoryName: string | null;
          recent: { total: number; count: number; months: number };
          earlier: { total: number; count: number; months: number };
        }
      >();

      for (const row of result) {
        if (!row.payeeId || !row.payeeName) continue;

        if (!payeeSpending.has(row.payeeId)) {
          payeeSpending.set(row.payeeId, {
            payeeId: row.payeeId,
            payeeName: row.payeeName,
            categoryId: row.categoryId,
            categoryName: row.categoryName,
            recent: { total: 0, count: 0, months: cfg.recentMonths },
            earlier: { total: 0, count: 0, months: cfg.lookbackMonths - cfg.recentMonths },
          });
        }

        const data = payeeSpending.get(row.payeeId)!;
        if (row.period === "recent") {
          data.recent.total = row.totalAmount ?? 0;
          data.recent.count = row.txnCount ?? 0;
        } else {
          data.earlier.total = row.totalAmount ?? 0;
          data.earlier.count = row.txnCount ?? 0;
        }
      }

      // Analyze spending changes
      for (const data of payeeSpending.values()) {
        // Calculate monthly averages
        const recentMonthlyAvg = data.recent.total / data.recent.months;
        const earlierMonthlyAvg = data.earlier.total / data.earlier.months;

        if (earlierMonthlyAvg < cfg.spendingIncreaseMinAmount) continue;

        const changePercent = ((recentMonthlyAvg - earlierMonthlyAvg) / earlierMonthlyAvg) * 100;

        if (changePercent >= cfg.spendingIncreaseThresholdPercent) {
          const monthlyIncrease = recentMonthlyAvg - earlierMonthlyAvg;

          opportunities.push({
            id: generateOpportunityId("spending_increase", data.payeeId),
            type: "spending_increase",
            priority: calculatePriority(monthlyIncrease),
            title: `Spending increase at ${data.payeeName}`,
            description: `Spending increased ${formatPercentRaw(changePercent, 0)} (from $${earlierMonthlyAvg.toFixed(2)}/mo to $${recentMonthlyAvg.toFixed(2)}/mo)`,
            estimatedMonthlySavings: monthlyIncrease * 0.5, // Assume 50% reduction possible
            estimatedAnnualSavings: monthlyIncrease * 0.5 * 12,
            confidence: 0.6,
            payeeId: data.payeeId,
            payeeName: data.payeeName,
            categoryId: data.categoryId ?? undefined,
            categoryName: data.categoryName ?? undefined,
            evidence: {
              previousMonthlyAvg: earlierMonthlyAvg,
              currentMonthlyAvg: recentMonthlyAvg,
              changePercent,
              transactionCount: data.recent.count + data.earlier.count,
            },
            suggestedActions: [
              "Review recent purchases at this merchant",
              "Set a spending limit or budget for this category",
              "Consider if increased spending is intentional",
              "Look for alternative merchants with better prices",
            ],
          });
        }
      }

      // Sort by potential savings
      opportunities.sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings);

      // Limit to top opportunities
      return opportunities.slice(0, 10);
    },

    async detectNegotiationCandidates(workspaceId): Promise<SavingsOpportunity[]> {
      const opportunities: SavingsOpportunity[] = [];

      // Get recurring patterns
      const { patterns } = await recurringService.detectPatterns(workspaceId, {
        lookbackMonths: cfg.lookbackMonths,
        minConfidence: 0.6,
      });

      // Helper to check if payee/category name matches negotiable categories
      const isNegotiable = (name: string): boolean => {
        const lower = name.toLowerCase();
        for (const category of NEGOTIABLE_BILL_CATEGORIES) {
          if (lower.includes(category)) {
            return true;
          }
        }
        return false;
      };

      // Analyze each recurring pattern
      for (const pattern of patterns) {
        // Only consider expenses
        if (pattern.averageAmount >= 0) continue;

        const monthlyValue = getMonthlyValue(pattern);

        // Skip small bills
        if (monthlyValue < MIN_NEGOTIABLE_AMOUNT) continue;

        // Check if this is a negotiable category
        const payeeName = pattern.payeeName || "";
        const categoryName = pattern.categoryName || "";

        if (!isNegotiable(payeeName) && !isNegotiable(categoryName)) {
          continue;
        }

        // Calculate how long they've been paying this
        const txns = pattern.matchingTransactions;
        if (!txns || txns.length < 3) continue;

        const firstTxnDate = pattern.firstOccurrence;
        const lastTxnDate = pattern.lastOccurrence;

        if (!firstTxnDate || !lastTxnDate) continue;

        const monthsOfHistory = Math.floor(
          (new Date(lastTxnDate).getTime() - new Date(firstTxnDate).getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        );

        // Need at least MIN_STABLE_MONTHS of history
        if (monthsOfHistory < MIN_STABLE_MONTHS) continue;

        // Check for price increases in the bill's history
        const amounts = txns.map((t) => Math.abs(t.amount));
        const recentAmounts = amounts.slice(0, 3);
        const olderAmounts = amounts.slice(-3);

        const recentAvg = recentAmounts.length > 0 ? mean(recentAmounts) : 0;
        const olderAvg = olderAmounts.length > 0 ? mean(olderAmounts) : 0;

        const hasIncreased = olderAvg > 0 && recentAvg > olderAvg * 1.05; // 5% or more increase
        const increasePercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

        // Determine priority based on amount and whether it increased
        let priority: OpportunityPriority = "low";
        if (monthlyValue >= 100 || hasIncreased) {
          priority = "medium";
        }
        if (monthlyValue >= 200 && hasIncreased) {
          priority = "high";
        }

        // Estimate potential savings (typically 10-20% for negotiated bills)
        const savingsPercent = hasIncreased ? 0.15 : 0.1; // 15% if increased, 10% otherwise
        const estimatedMonthlySavings = monthlyValue * savingsPercent;

        // Build description
        let description = `Paying $${monthlyValue.toFixed(2)}/month for ${monthsOfHistory} months`;
        if (hasIncreased) {
          description += `. Price increased ${formatPercentRaw(increasePercent, 0)}`;
        }

        // Determine bill type for better suggestions
        const billType = isNegotiable(payeeName)
          ? payeeName.toLowerCase()
          : categoryName.toLowerCase();

        const suggestedActions = getSuggestedActions(billType, hasIncreased, monthsOfHistory);

        opportunities.push({
          id: generateOpportunityId("negotiation_candidate", pattern.payeeId ?? 0),
          type: "negotiation_candidate",
          priority,
          title: `Negotiate ${pattern.payeeName || categoryName}`,
          description,
          estimatedMonthlySavings,
          estimatedAnnualSavings: estimatedMonthlySavings * 12,
          confidence: hasIncreased ? 0.75 : 0.6,
          payeeId: pattern.payeeId ?? undefined,
          payeeName: pattern.payeeName,
          categoryId: pattern.categoryId ?? undefined,
          categoryName: pattern.categoryName ?? undefined,
          evidence: {
            monthlyAmount: monthlyValue,
            previousAmount: olderAvg / 100, // Convert from cents
            currentAmount: recentAvg / 100, // Convert from cents
            increasePercent: hasIncreased ? increasePercent : undefined,
            transactionCount: pattern.occurrenceCount,
          },
          suggestedActions,
        });
      }

      // Sort by potential savings
      opportunities.sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings);

      // Limit to top 10
      return opportunities.slice(0, 10);
    },

    async getSummary(workspaceId) {
      const full = await this.getOpportunities(workspaceId);

      return {
        opportunityCount: full.opportunities.length,
        totalMonthlyPotential: full.totalMonthlyPotential,
        topOpportunity: full.opportunities[0] || null,
      };
    },
  };
}
