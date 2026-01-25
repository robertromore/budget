import { accounts } from "$lib/schema/accounts";
import { categories } from "$lib/schema/categories";
import type { Payee } from "$lib/schema/payees";
import { payees } from "$lib/schema/payees";
import type { BillingCycle, SubscriptionType } from "$lib/schema/subscriptions";
import { transactions } from "$lib/schema/transactions";
import { db } from "$lib/server/db";
import {
  getRecurringDetectionService,
  type RecurringPattern,
} from "$lib/server/domains/shared/recurring-detection";
import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import type {
  DetectionMethod,
  DetectionOptions,
  DetectionResult,
  TransactionBasedDetectionOptions,
  TransactionBasedDetectionResult,
} from "./types";

// ==================== SUBSCRIPTION PATTERN DATABASE ====================

interface SubscriptionPattern {
  keywords: string[];
  regexPatterns: RegExp[];
  merchantCodes: string[];
  typicalBillingCycles: BillingCycle[];
  typicalCostRange: { min: number; max: number };
}

const SUBSCRIPTION_PATTERNS: Record<SubscriptionType, SubscriptionPattern> = {
  entertainment: {
    keywords: [
      "netflix", "spotify", "hulu", "disney+", "disney plus", "amazon prime", "youtube premium",
      "youtube music", "apple music", "apple tv", "hbo", "hbo max", "peacock", "paramount+",
      "showtime", "starz", "crunchyroll", "audible", "kindle unlimited", "twitch", "funimation",
      "dazn", "espn+", "sling", "fubo", "philo", "discovery+", "tidal", "deezer", "pandora",
      "iheartradio", "sirius", "siriusxm"
    ],
    regexPatterns: [
      /streaming/i, /music subscription/i, /video on demand/i,
      /\b(tv|television)\s*(plus|premium|subscription)/i
    ],
    merchantCodes: ["5815", "5735", "5968", "7922"],
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 5, max: 200 },
  },
  utilities: {
    keywords: [
      "electric", "electricity", "gas", "water", "sewer", "trash", "garbage", "internet",
      "broadband", "cable", "comcast", "xfinity", "spectrum", "verizon fios", "at&t",
      "centurylink", "cox", "frontier", "optimum", "windstream", "pge", "sce", "sdge",
      "con edison", "duke energy", "dominion", "national grid"
    ],
    regexPatterns: [
      /\b(electric|gas|water)\s*(company|utility|service)/i,
      /utility\s*bill/i, /\bpower\b/i, /\benergy\b/i
    ],
    merchantCodes: ["4814", "4899", "4900", "4816"],
    typicalBillingCycles: ["monthly"],
    typicalCostRange: { min: 20, max: 500 },
  },
  software: {
    keywords: [
      "adobe", "microsoft 365", "microsoft office", "google workspace", "dropbox", "zoom",
      "slack", "notion", "figma", "canva", "grammarly", "lastpass", "1password", "dashlane",
      "nordvpn", "expressvpn", "surfshark", "github", "gitlab", "jetbrains", "intellij",
      "webstorm", "sketch", "invision", "asana", "monday.com", "trello", "evernote",
      "todoist", "mailchimp", "hubspot", "salesforce", "quickbooks", "freshbooks",
      "xero", "wave", "squarespace", "wix", "shopify", "webflow", "wordpress"
    ],
    regexPatterns: [
      /\bsaas\b/i, /software\s*subscription/i, /\bcloud\s*service/i,
      /\bapp\s*subscription/i, /\blicense\b/i
    ],
    merchantCodes: ["5734", "5045", "7372", "7379"],
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 5, max: 1000 },
  },
  membership: {
    keywords: [
      "gym", "fitness", "planet fitness", "la fitness", "equinox", "orangetheory",
      "crossfit", "24 hour fitness", "gold's gym", "anytime fitness", "ymca", "costco",
      "sam's club", "bj's", "amazon prime", "aaa", "roadside assistance", "museum",
      "zoo", "country club", "golf club", "tennis club", "wine club", "book club"
    ],
    regexPatterns: [
      /\bmembership\b/i, /\bclub\b/i, /\bfitness\b/i, /\bgym\b/i,
      /\bwholesale\b/i
    ],
    merchantCodes: ["7991", "7996", "7941", "7997", "5300"],
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 10, max: 500 },
  },
  communication: {
    keywords: [
      "verizon", "at&t", "att", "t-mobile", "tmobile", "sprint", "us cellular",
      "mint mobile", "cricket", "metro pcs", "metropcs", "boost mobile", "visible",
      "google fi", "republic wireless", "ting", "straight talk"
    ],
    regexPatterns: [
      /\b(cellular|mobile|wireless)\s*service/i, /\bphone\s*plan\b/i,
      /\bcarrier\b/i
    ],
    merchantCodes: ["4814", "4812"],
    typicalBillingCycles: ["monthly"],
    typicalCostRange: { min: 15, max: 200 },
  },
  finance: {
    keywords: [
      "credit karma", "credit sesame", "mint", "personal capital", "ynab",
      "you need a budget", "acorns", "robinhood gold", "wealthfront", "betterment",
      "sofi", "nerdwallet", "truebill", "trim", "rocket money"
    ],
    regexPatterns: [
      /\bfinance\s*app\b/i, /\binvestment\s*service\b/i, /\bbudget\s*app\b/i
    ],
    merchantCodes: ["6012", "6211", "6051"],
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 5, max: 100 },
  },
  shopping: {
    keywords: [
      "amazon prime", "walmart+", "walmart plus", "instacart", "shipt", "doordash pass",
      "uber one", "uber eats pass", "grubhub+", "postmates", "rent the runway",
      "stitch fix", "trunk club", "thredup", "poshmark"
    ],
    regexPatterns: [
      /\bdelivery\s*subscription\b/i, /\bshopping\s*pass\b/i,
      /\bpremium\s*membership\b/i
    ],
    merchantCodes: ["5411", "5912", "5311", "5999"],
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 5, max: 200 },
  },
  health: {
    keywords: [
      "headspace", "calm", "noom", "weight watchers", "ww", "myfitnesspal", "strava",
      "peloton", "beachbody", "fitbit premium", "apple fitness+", "nike training",
      "teladoc", "betterhelp", "talkspace", "cerebral", "hims", "hers", "ro",
      "nurx", "care/of", "ritual", "athletic greens"
    ],
    regexPatterns: [
      /\bhealth\s*app\b/i, /\bwellness\b/i, /\btherapy\b/i, /\bmeditation\b/i,
      /\bmental\s*health\b/i, /\btelehealth\b/i
    ],
    merchantCodes: ["8011", "8021", "8031", "8041", "8099"],
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 5, max: 300 },
  },
  education: {
    keywords: [
      "coursera", "udemy", "skillshare", "masterclass", "linkedin learning", "pluralsight",
      "codecademy", "treehouse", "datacamp", "brilliant", "duolingo", "babbel", "rosetta stone",
      "blinkist", "scribd", "medium", "substack", "patreon", "curiosity stream"
    ],
    regexPatterns: [
      /\beducation\b/i, /\blearning\s*platform\b/i, /\bcourse\b/i,
      /\btraining\b/i, /\btutorial\b/i
    ],
    merchantCodes: ["8220", "8241", "8244", "8249", "8299"],
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 5, max: 500 },
  },
  other: {
    keywords: [],
    regexPatterns: [/subscription/i, /recurring/i, /monthly\s*fee/i, /annual\s*fee/i],
    merchantCodes: [],
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 1, max: 1000 },
  },
};

// ==================== BILLING CYCLE DETECTION ====================

interface BillingPattern {
  frequency: number; // days
  tolerance: number; // days
  cycle: BillingCycle;
}

const BILLING_PATTERNS: BillingPattern[] = [
  { frequency: 7, tolerance: 1, cycle: "weekly" },
  { frequency: 14, tolerance: 2, cycle: "weekly" },
  { frequency: 30, tolerance: 5, cycle: "monthly" },
  { frequency: 90, tolerance: 10, cycle: "quarterly" },
  { frequency: 180, tolerance: 14, cycle: "semi_annual" },
  { frequency: 365, tolerance: 30, cycle: "annual" },
];

// ==================== SUBSCRIPTION DETECTION SERVICE ====================

export class SubscriptionDetectionService {
  /**
   * Detect potential subscriptions from a list of payees
   */
  async detectSubscriptions(
    payees: Payee[],
    existingSubscriptionPayeeIds: number[],
    options: DetectionOptions = {}
  ): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];
    const minConfidence = options.minConfidence ?? 0.3;

    for (const payee of payees) {
      // Skip if already tracked (unless explicitly included)
      const isAlreadyTracked = existingSubscriptionPayeeIds.includes(payee.id);
      if (isAlreadyTracked && !options.includeAlreadyTracked) {
        continue;
      }

      // Skip if filter doesn't match
      if (options.payeeIds && !options.payeeIds.includes(payee.id)) {
        continue;
      }

      const detection = this.analyzePayee(payee, isAlreadyTracked);

      if (detection.detectionConfidence >= minConfidence) {
        results.push(detection);
      }
    }

    // Sort by confidence descending
    return results.sort((a, b) => b.detectionConfidence - a.detectionConfidence);
  }

  /**
   * Analyze a single payee for subscription characteristics
   */
  analyzePayee(payee: Payee, isAlreadyTracked: boolean): DetectionResult {
    const detectionMethods: DetectionMethod[] = [];
    let totalConfidence = 0;
    let bestType: SubscriptionType = "other";
    let highestTypeConfidence = 0;

    // 1. Pattern matching (40% weight)
    const patternResult = this.analyzePatterns(payee.name ?? "");
    if (patternResult.confidence > 0) {
      detectionMethods.push({
        method: "pattern_matching",
        confidence: patternResult.confidence,
        evidence: patternResult.evidence,
      });
      totalConfidence += patternResult.confidence * 0.4;
      if (patternResult.confidence > highestTypeConfidence) {
        highestTypeConfidence = patternResult.confidence;
        bestType = patternResult.type;
      }
    }

    // 2. Merchant category code (30% weight)
    if (payee.merchantCategoryCode) {
      const mccResult = this.analyzeMerchantCode(payee.merchantCategoryCode);
      if (mccResult.confidence > 0) {
        detectionMethods.push({
          method: "merchant_database",
          confidence: mccResult.confidence,
          evidence: mccResult.evidence,
        });
        totalConfidence += mccResult.confidence * 0.3;
        if (mccResult.confidence > highestTypeConfidence && mccResult.type !== "other") {
          highestTypeConfidence = mccResult.confidence;
          bestType = mccResult.type;
        }
      }
    }

    // 3. Payment frequency analysis (20% weight)
    if (payee.paymentFrequency) {
      const frequencyResult = this.analyzeFrequency(payee.paymentFrequency);
      if (frequencyResult.confidence > 0) {
        detectionMethods.push({
          method: "frequency_analysis",
          confidence: frequencyResult.confidence,
          evidence: frequencyResult.evidence,
        });
        totalConfidence += frequencyResult.confidence * 0.2;
      }
    }

    // 4. Amount consistency (10% weight) - if we have average amount data
    if (payee.avgAmount && payee.avgAmount > 0) {
      const amountResult = this.analyzeAmount(payee.avgAmount, bestType);
      if (amountResult.confidence > 0) {
        detectionMethods.push({
          method: "amount_analysis",
          confidence: amountResult.confidence,
          evidence: amountResult.evidence,
        });
        totalConfidence += amountResult.confidence * 0.1;
      }
    }

    // Determine billing cycle
    const billingCycle = this.determineBillingCycle(payee.paymentFrequency);

    return {
      payeeId: payee.id,
      payeeName: payee.name ?? "Unknown",
      detectionConfidence: Math.min(totalConfidence, 1.0),
      subscriptionType: bestType,
      billingCycle,
      estimatedAmount: payee.avgAmount ?? 0,
      detectionMethods,
      suggestedName: this.generateSuggestedName(payee.name ?? "", bestType),
      accountId: undefined,
      existingSubscriptionId: undefined,
      isAlreadyTracked,
    };
  }

  /**
   * Analyze payee name against subscription patterns
   */
  private analyzePatterns(name: string): {
    confidence: number;
    type: SubscriptionType;
    evidence: string[];
  } {
    const lowercaseName = name.toLowerCase();
    const evidence: string[] = [];
    let bestMatch = { type: "other" as SubscriptionType, confidence: 0 };

    for (const [type, pattern] of Object.entries(SUBSCRIPTION_PATTERNS)) {
      let typeConfidence = 0;
      const typeEvidence: string[] = [];

      // Check keywords
      for (const keyword of pattern.keywords) {
        if (lowercaseName.includes(keyword.toLowerCase())) {
          typeConfidence = Math.max(typeConfidence, 0.9);
          typeEvidence.push(`Matches known subscription: ${keyword}`);
          break;
        }
      }

      // Check regex patterns
      for (const regex of pattern.regexPatterns) {
        if (regex.test(name)) {
          typeConfidence = Math.max(typeConfidence, 0.6);
          typeEvidence.push(`Matches subscription pattern: ${regex.source}`);
        }
      }

      if (typeConfidence > bestMatch.confidence) {
        bestMatch = { type: type as SubscriptionType, confidence: typeConfidence };
        evidence.length = 0;
        evidence.push(...typeEvidence);
      }
    }

    return { ...bestMatch, evidence };
  }

  /**
   * Analyze merchant category code
   */
  private analyzeMerchantCode(mcc: string): {
    confidence: number;
    type: SubscriptionType;
    evidence: string[];
  } {
    for (const [type, pattern] of Object.entries(SUBSCRIPTION_PATTERNS)) {
      if (pattern.merchantCodes.includes(mcc)) {
        return {
          confidence: 0.8,
          type: type as SubscriptionType,
          evidence: [`Merchant category code ${mcc} indicates ${type} subscription`],
        };
      }
    }

    return { confidence: 0, type: "other", evidence: [] };
  }

  /**
   * Analyze payment frequency
   */
  private analyzeFrequency(frequency: string): {
    confidence: number;
    evidence: string[];
  } {
    const subscriptionFrequencies = ["monthly", "quarterly", "annual", "weekly", "yearly"];
    const normalizedFrequency = frequency.toLowerCase();

    if (subscriptionFrequencies.some(f => normalizedFrequency.includes(f))) {
      return {
        confidence: 0.8,
        evidence: [`${frequency} frequency is typical for subscriptions`],
      };
    }

    return { confidence: 0.2, evidence: [`${frequency} frequency is less common for subscriptions`] };
  }

  /**
   * Analyze if amount is within typical range for subscription type
   */
  private analyzeAmount(amount: number, type: SubscriptionType): {
    confidence: number;
    evidence: string[];
  } {
    const pattern = SUBSCRIPTION_PATTERNS[type];
    const { min, max } = pattern.typicalCostRange;

    if (amount >= min && amount <= max) {
      return {
        confidence: 0.7,
        evidence: [`Amount $${amount.toFixed(2)} is within typical range for ${type} subscriptions`],
      };
    }

    // Still could be a subscription, just atypical
    return {
      confidence: 0.3,
      evidence: [`Amount $${amount.toFixed(2)} is outside typical range for ${type}`],
    };
  }

  /**
   * Determine billing cycle from payment frequency
   */
  private determineBillingCycle(frequency?: string | null): BillingCycle {
    if (!frequency) return "monthly";

    const normalized = frequency.toLowerCase();

    if (normalized.includes("week")) return "weekly";
    if (normalized.includes("month")) return "monthly";
    if (normalized.includes("quarter")) return "quarterly";
    if (normalized.includes("semi") || normalized.includes("6 month")) return "semi_annual";
    if (normalized.includes("year") || normalized.includes("annual")) return "annual";

    return "monthly";
  }

  /**
   * Generate a clean suggested name for the subscription
   */
  private generateSuggestedName(payeeName: string, type: SubscriptionType): string {
    // Remove common payment processor prefixes
    let name = payeeName
      .replace(/^(paypal|stripe|square|bill\.com|zelle)\s*/i, "")
      .replace(/\s*(payment|charge|bill|subscription|recurring)\s*/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Capitalize first letter of each word
    name = name.replace(/\b\w/g, (c) => c.toUpperCase());

    return name || `${type.charAt(0).toUpperCase() + type.slice(1)} Subscription`;
  }

  /**
   * Detect price changes from transaction history
   */
  detectPriceChanges(
    currentAmount: number,
    recentTransactions: Array<{ amount: number; date: string }>
  ): {
    hasChanged: boolean;
    previousAmount?: number;
    changePercentage?: number;
    changeDate?: string;
  } {
    if (recentTransactions.length < 2) {
      return { hasChanged: false };
    }

    // Sort by date descending
    const sorted = [...recentTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Compare amounts with small tolerance for cents variations
    const tolerance = 0.05; // 5 cents
    let previousAmount: number | undefined;
    let changeDate: string | undefined;

    for (let i = 1; i < sorted.length; i++) {
      const diff = Math.abs(sorted[0]!.amount - sorted[i]!.amount);
      if (diff > tolerance) {
        previousAmount = sorted[i]!.amount;
        changeDate = sorted[0]!.date;
        break;
      }
    }

    if (previousAmount !== undefined) {
      const changePercentage = ((currentAmount - previousAmount) / previousAmount) * 100;
      return {
        hasChanged: true,
        previousAmount,
        changePercentage,
        changeDate,
      };
    }

    return { hasChanged: false };
  }

  /**
   * Calculate next renewal date based on billing cycle and start/last date
   */
  calculateNextRenewalDate(billingCycle: BillingCycle, lastDate: string | Date): string {
    const date = new Date(lastDate);

    switch (billingCycle) {
      case "daily":
        date.setDate(date.getDate() + 1);
        break;
      case "weekly":
        date.setDate(date.getDate() + 7);
        break;
      case "monthly":
        date.setMonth(date.getMonth() + 1);
        break;
      case "quarterly":
        date.setMonth(date.getMonth() + 3);
        break;
      case "semi_annual":
        date.setMonth(date.getMonth() + 6);
        break;
      case "annual":
        date.setFullYear(date.getFullYear() + 1);
        break;
      case "irregular":
        // Default to monthly for irregular
        date.setMonth(date.getMonth() + 1);
        break;
    }

    return date.toISOString().split("T")[0]!;
  }

  // ==================== TRANSACTION-BASED DETECTION ====================

  /**
   * Detect potential subscriptions by analyzing transaction patterns directly
   * Uses the unified RecurringDetectionService for pattern analysis
   */
  async detectFromTransactions(
    workspaceId: number,
    existingSubscriptionPayeeIds: number[],
    options: TransactionBasedDetectionOptions = {}
  ): Promise<TransactionBasedDetectionResult[]> {
    const {
      accountIds,
      months = 6,
      minTransactions = 3,
      minConfidence = 50,
      minPredictability = 60,
    } = options;

    // Use unified detection service
    const detectionService = getRecurringDetectionService();
    const patterns = await detectionService.detectPatterns(workspaceId, {
      accountIds,
      months,
      minTransactions,
      minConfidence,
      minPredictability,
      patternTypes: ["subscription", "bill", "other"], // Exclude income and transfers
    });

    // Map RecurringPattern to TransactionBasedDetectionResult
    return patterns.map((pattern): TransactionBasedDetectionResult => {
      const isAlreadyTracked = existingSubscriptionPayeeIds.includes(pattern.payeeId);

      // Map unified frequency to BillingCycle
      const billingCycle = this.mapFrequencyToBillingCycle(pattern.frequency);

      // Calculate interval variance from consistency
      const intervalVariance = 1 - pattern.intervalConsistency;

      // Calculate amount variance coefficient
      const amountVariance =
        Math.abs(pattern.amount.mean) > 0
          ? (pattern.amount.max - pattern.amount.min) / Math.abs(pattern.amount.mean) / 4
          : 0;

      // Build detection methods from confidence breakdown
      const detectionMethods: DetectionMethod[] = [
        {
          method: "frequency_analysis",
          confidence: pattern.confidenceBreakdown.intervalScore,
          evidence: [
            `${pattern.transactionCount} transactions analyzed`,
            `Average interval: ${pattern.intervalDays.toFixed(1)} days (${billingCycle})`,
            `Interval consistency: ${(pattern.intervalConsistency * 100).toFixed(0)}%`,
          ],
        },
        {
          method: "amount_analysis",
          confidence: pattern.confidenceBreakdown.amountScore,
          evidence: [
            `Amount predictability: ${pattern.amount.predictability.toFixed(0)}%`,
            `Average amount: $${Math.abs(pattern.amount.median).toFixed(2)}`,
          ],
        },
      ];

      if (pattern.confidenceBreakdown.patternScore > 0) {
        detectionMethods.push({
          method: "pattern_matching",
          confidence: pattern.confidenceBreakdown.patternScore,
          evidence: pattern.subscriptionType
            ? [`Matched subscription type: ${pattern.subscriptionType}`]
            : [`Pattern type: ${pattern.patternType}`],
        });
      }

      return {
        payeeId: pattern.payeeId,
        payeeName: pattern.payeeName,
        accountId: pattern.accountId,
        accountName: pattern.accountName,
        detectionConfidence: pattern.overallConfidence / 100,
        subscriptionType: pattern.subscriptionType ?? this.inferSubscriptionType(pattern.patternType),
        billingCycle,
        estimatedAmount: Math.abs(pattern.amount.median),
        amountVariance,
        transactionCount: pattern.transactionCount,
        transactionIds: pattern.transactionIds,
        intervalDays: pattern.intervalDays,
        intervalVariance,
        predictability: pattern.amount.predictability,
        firstTransactionDate: pattern.firstDate,
        lastTransactionDate: pattern.lastDate,
        suggestedStartDate: pattern.firstDate,
        suggestedRenewalDate: pattern.suggestedNextDate,
        isAlreadyTracked,
        existingSubscriptionId: pattern.existingScheduleId,
        categoryId: pattern.categoryId ?? undefined,
        categoryName: pattern.categoryName ?? undefined,
        detectionMethods,
      };
    });
  }

  /**
   * Map unified Frequency to BillingCycle
   */
  private mapFrequencyToBillingCycle(frequency: RecurringPattern["frequency"]): BillingCycle {
    switch (frequency) {
      case "daily":
        return "daily";
      case "weekly":
      case "biweekly":
        return "weekly";
      case "monthly":
        return "monthly";
      case "quarterly":
        return "quarterly";
      case "semi_annual":
        return "semi_annual";
      case "annual":
        return "annual";
      default:
        return "irregular";
    }
  }

  /**
   * Infer subscription type from pattern type
   */
  private inferSubscriptionType(patternType: RecurringPattern["patternType"]): SubscriptionType {
    switch (patternType) {
      case "subscription":
        return "other";
      case "bill":
        return "utilities";
      default:
        return "other";
    }
  }

  /**
   * Determine billing cycle from average interval in days
   */
  private determineBillingCycleFromInterval(avgInterval: number): BillingCycle {
    if (avgInterval <= 3) return "daily";
    if (avgInterval <= 10) return "weekly";
    if (avgInterval <= 35) return "monthly";
    if (avgInterval <= 100) return "quarterly";
    if (avgInterval <= 200) return "semi_annual";
    if (avgInterval <= 400) return "annual";
    return "irregular";
  }

  /**
   * Calculate mean of an array of numbers
   */
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate median of a sorted array of numbers
   */
  private median(sorted: number[]): number {
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  }

  /**
   * Calculate standard deviation of an array of numbers
   */
  private standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.mean(values);
    const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squaredDiffs));
  }
}
