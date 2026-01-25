import type { ScheduleSubscriptionType } from "$lib/schema/schedules";
import type { Frequency, PatternType } from "../types";

// ==================== SUBSCRIPTION PATTERNS ====================

export interface SubscriptionPattern {
  keywords: string[];
  regexPatterns: RegExp[];
  merchantCodes: string[];
  typicalBillingCycles: Frequency[];
  typicalCostRange: { min: number; max: number };
}

export const SUBSCRIPTION_PATTERNS: Record<ScheduleSubscriptionType, SubscriptionPattern> = {
  entertainment: {
    keywords: [
      "netflix",
      "spotify",
      "hulu",
      "disney",
      "hbo",
      "amazon prime",
      "apple tv",
      "peacock",
      "paramount",
      "youtube premium",
      "youtube music",
      "apple music",
      "tidal",
      "pandora",
      "deezer",
      "audible",
      "kindle unlimited",
      "xbox game pass",
      "playstation plus",
      "nintendo online",
      "crunchyroll",
      "funimation",
      "showtime",
      "starz",
      "discovery+",
      "espn+",
      "dazn",
      "fubo",
      "sling",
      "twitch",
    ],
    regexPatterns: [/streaming/i, /subscription/i, /premium/i, /plus$/i, /music\s*(?:service|app)/i],
    merchantCodes: ["5815", "5735", "7841", "7832"], // Digital goods, music stores, video tape rental, theaters
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 5, max: 25 },
  },
  utilities: {
    keywords: [
      "electric",
      "gas",
      "water",
      "sewer",
      "utility",
      "power",
      "energy",
      "internet",
      "broadband",
      "cable",
      "fiber",
      "comcast",
      "xfinity",
      "at&t",
      "verizon",
      "spectrum",
      "cox",
      "centurylink",
      "frontier",
      "pge",
      "pg&e",
      "sce",
      "duke energy",
      "dominion",
      "national grid",
      "con edison",
    ],
    regexPatterns: [/utilit(?:y|ies)/i, /electric(?:ity)?/i, /power\s*(?:co|company)/i, /energy/i],
    merchantCodes: ["4900", "4814"], // Utilities, telecom
    typicalBillingCycles: ["monthly"],
    typicalCostRange: { min: 30, max: 300 },
  },
  software: {
    keywords: [
      "adobe",
      "microsoft 365",
      "office 365",
      "google workspace",
      "dropbox",
      "icloud",
      "google one",
      "onedrive",
      "evernote",
      "notion",
      "slack",
      "zoom",
      "github",
      "gitlab",
      "jetbrains",
      "figma",
      "canva",
      "grammarly",
      "1password",
      "lastpass",
      "dashlane",
      "nordvpn",
      "expressvpn",
      "surfshark",
      "proton",
      "mailchimp",
      "hubspot",
      "salesforce",
      "quickbooks",
      "freshbooks",
      "xero",
      "todoist",
      "asana",
      "monday.com",
      "trello",
      "claude",
      "chatgpt",
      "openai",
      "anthropic",
      "midjourney",
    ],
    regexPatterns: [/software/i, /saas/i, /cloud/i, /\bapp\b/i, /subscription/i],
    merchantCodes: ["5734", "5045", "7372"], // Computer software, computers, computer programming
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 5, max: 100 },
  },
  membership: {
    keywords: [
      "gym",
      "fitness",
      "planet fitness",
      "la fitness",
      "24 hour fitness",
      "anytime fitness",
      "ymca",
      "equinox",
      "orange theory",
      "crossfit",
      "peloton",
      "costco",
      "sam's club",
      "bj's",
      "amazon prime",
      "walmart+",
      "aaa",
      "roadside",
      "club",
      "association",
    ],
    regexPatterns: [/membership/i, /gym/i, /fitness/i, /club/i, /\bprime\b/i],
    merchantCodes: ["7941", "7997", "5300"], // Sports clubs, membership clubs, wholesale clubs
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 10, max: 200 },
  },
  communication: {
    keywords: [
      "phone",
      "mobile",
      "wireless",
      "cellular",
      "cell",
      "t-mobile",
      "verizon",
      "at&t",
      "sprint",
      "mint mobile",
      "cricket",
      "metro pcs",
      "boost mobile",
      "google fi",
      "visible",
    ],
    regexPatterns: [/(?:cell|mobile)\s*phone/i, /wireless/i, /telecom/i, /carrier/i],
    merchantCodes: ["4812", "4814"], // Telecom
    typicalBillingCycles: ["monthly"],
    typicalCostRange: { min: 20, max: 150 },
  },
  finance: {
    keywords: [
      "ynab",
      "mint",
      "personal capital",
      "quicken",
      "acorns",
      "robinhood gold",
      "coinbase",
      "wealthfront",
      "betterment",
      "credit karma",
      "credit monitoring",
      "experian",
      "equifax",
      "transunion",
      "lifelock",
      "identity guard",
      "turbotax",
    ],
    regexPatterns: [/budget/i, /finance/i, /credit\s*monitor/i, /invest(?:ing|ment)/i],
    merchantCodes: ["6012", "6211"], // Financial institutions, securities
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 5, max: 50 },
  },
  shopping: {
    keywords: [
      "amazon prime",
      "walmart+",
      "instacart",
      "shipt",
      "doordash pass",
      "uber one",
      "grubhub+",
      "freshly",
      "hello fresh",
      "blue apron",
      "home chef",
      "stitch fix",
      "rent the runway",
      "fabletics",
      "ipsy",
      "birchbox",
      "fabfitfun",
      "barkbox",
    ],
    regexPatterns: [/delivery/i, /subscription\s*box/i, /\bpass\b/i],
    merchantCodes: ["5411", "5812", "5814"], // Grocery, restaurants, fast food
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 10, max: 150 },
  },
  health: {
    keywords: [
      "gym",
      "peloton",
      "apple fitness",
      "fitbit premium",
      "myfitnesspal",
      "headspace",
      "calm",
      "noom",
      "weight watchers",
      "ww",
      "beachbody",
      "talkspace",
      "betterhelp",
      "cerebral",
      "hims",
      "hers",
      "ro",
      "nurx",
    ],
    regexPatterns: [/fitness/i, /health/i, /wellness/i, /meditation/i, /therapy/i],
    merchantCodes: ["8011", "8099", "7941"], // Doctors, health services, sports clubs
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 10, max: 100 },
  },
  education: {
    keywords: [
      "coursera",
      "udemy",
      "skillshare",
      "linkedin learning",
      "masterclass",
      "brilliant",
      "duolingo",
      "babbel",
      "rosetta stone",
      "codecademy",
      "pluralsight",
      "udacity",
      "datacamp",
      "treehouse",
      "khan academy",
      "curiosity stream",
      "great courses",
      "blinkist",
    ],
    regexPatterns: [/learn(?:ing)?/i, /education/i, /course/i, /training/i, /tutorial/i],
    merchantCodes: ["8211", "8220", "8241", "8299"], // Schools, colleges, correspondence schools
    typicalBillingCycles: ["monthly", "annual"],
    typicalCostRange: { min: 10, max: 50 },
  },
  other: {
    keywords: [],
    regexPatterns: [/subscription/i, /recurring/i, /monthly/i, /annual/i],
    merchantCodes: [],
    typicalBillingCycles: ["monthly"],
    typicalCostRange: { min: 5, max: 500 },
  },
};

// ==================== BILL PATTERNS ====================

export interface BillPattern {
  keywords: string[];
  regexPatterns: RegExp[];
  typicalFrequency: Frequency;
}

export const BILL_PATTERNS: BillPattern[] = [
  {
    keywords: ["rent", "mortgage", "lease", "apartment", "housing"],
    regexPatterns: [/rent/i, /mortgage/i, /lease\s*payment/i, /property\s*management/i],
    typicalFrequency: "monthly",
  },
  {
    keywords: ["insurance", "geico", "state farm", "allstate", "progressive", "liberty mutual"],
    regexPatterns: [/insurance/i, /ins\s*(?:co|company)/i, /premium/i],
    typicalFrequency: "monthly",
  },
  {
    keywords: ["loan", "payment", "finance", "credit", "lending"],
    regexPatterns: [/loan\s*(?:payment|pmt)/i, /auto\s*loan/i, /student\s*loan/i],
    typicalFrequency: "monthly",
  },
  {
    keywords: ["tax", "property tax", "hoa", "homeowner", "association"],
    regexPatterns: [/(?:property|real estate)\s*tax/i, /hoa/i, /homeowner/i],
    typicalFrequency: "monthly",
  },
];

// ==================== INCOME PATTERNS ====================

export interface IncomePattern {
  keywords: string[];
  regexPatterns: RegExp[];
  typicalFrequency: Frequency;
}

export const INCOME_PATTERNS: IncomePattern[] = [
  {
    keywords: ["payroll", "salary", "wages", "direct deposit", "paycheck"],
    regexPatterns: [/payroll/i, /salary/i, /wages/i, /direct\s*dep(?:osit)?/i, /pay(?:check|ment)/i],
    typicalFrequency: "biweekly",
  },
  {
    keywords: ["dividend", "interest", "distribution"],
    regexPatterns: [/dividend/i, /interest\s*(?:payment|pmt)/i, /distribution/i],
    typicalFrequency: "quarterly",
  },
  {
    keywords: ["pension", "retirement", "social security", "ssa", "ssi"],
    regexPatterns: [/pension/i, /retirement/i, /soc(?:ial)?\s*sec(?:urity)?/i],
    typicalFrequency: "monthly",
  },
];

// ==================== TRANSFER PATTERNS ====================

export const TRANSFER_KEYWORDS = [
  "transfer",
  "xfer",
  "ach",
  "wire",
  "zelle",
  "venmo",
  "paypal",
  "cash app",
  "internal",
  "sweep",
  "move",
];

export const TRANSFER_PATTERNS: RegExp[] = [
  /transfer/i,
  /xfer/i,
  /from\s*(?:checking|savings)/i,
  /to\s*(?:checking|savings)/i,
  /\bacct?\s*to\s*acct?\b/i,
];

// ==================== BILLING CYCLE PATTERNS ====================

export interface BillingCyclePattern {
  frequency: number; // Days
  tolerance: number; // Allowed variance in days
  cycle: Frequency;
}

export const BILLING_CYCLE_PATTERNS: BillingCyclePattern[] = [
  { frequency: 1, tolerance: 0.5, cycle: "daily" },
  { frequency: 7, tolerance: 1, cycle: "weekly" },
  { frequency: 14, tolerance: 2, cycle: "biweekly" },
  { frequency: 30, tolerance: 5, cycle: "monthly" },
  { frequency: 90, tolerance: 10, cycle: "quarterly" },
  { frequency: 180, tolerance: 14, cycle: "semi_annual" },
  { frequency: 365, tolerance: 30, cycle: "annual" },
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Determines the pattern type from payee name and amount
 */
export function classifyPatternType(
  payeeName: string,
  amount: number,
  _merchantCode?: string
): { type: PatternType; subscriptionType?: ScheduleSubscriptionType; confidence: number } {
  const normalizedName = payeeName.toLowerCase();
  const isExpense = amount < 0;

  // Check if it's a transfer
  for (const keyword of TRANSFER_KEYWORDS) {
    if (normalizedName.includes(keyword.toLowerCase())) {
      return { type: "transfer", confidence: 0.8 };
    }
  }
  for (const pattern of TRANSFER_PATTERNS) {
    if (pattern.test(payeeName)) {
      return { type: "transfer", confidence: 0.7 };
    }
  }

  // Check for income (positive amounts)
  if (!isExpense) {
    for (const incomePattern of INCOME_PATTERNS) {
      for (const keyword of incomePattern.keywords) {
        if (normalizedName.includes(keyword.toLowerCase())) {
          return { type: "income", confidence: 0.85 };
        }
      }
      for (const pattern of incomePattern.regexPatterns) {
        if (pattern.test(payeeName)) {
          return { type: "income", confidence: 0.75 };
        }
      }
    }
    // Default positive amounts without matching patterns to income
    return { type: "income", confidence: 0.5 };
  }

  // Check for subscription patterns (highest priority for expenses)
  for (const [subType, subPattern] of Object.entries(SUBSCRIPTION_PATTERNS)) {
    for (const keyword of subPattern.keywords) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        const absAmount = Math.abs(amount);
        // Check if amount is in typical range
        const inRange =
          absAmount >= subPattern.typicalCostRange.min && absAmount <= subPattern.typicalCostRange.max;
        return {
          type: "subscription",
          subscriptionType: subType as ScheduleSubscriptionType,
          confidence: inRange ? 0.9 : 0.75,
        };
      }
    }
    for (const pattern of subPattern.regexPatterns) {
      if (pattern.test(payeeName)) {
        return {
          type: "subscription",
          subscriptionType: subType as ScheduleSubscriptionType,
          confidence: 0.6,
        };
      }
    }
  }

  // Check for bill patterns
  for (const billPattern of BILL_PATTERNS) {
    for (const keyword of billPattern.keywords) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        return { type: "bill", confidence: 0.8 };
      }
    }
    for (const pattern of billPattern.regexPatterns) {
      if (pattern.test(payeeName)) {
        return { type: "bill", confidence: 0.65 };
      }
    }
  }

  // Default to "other" for expenses without matching patterns
  return { type: "other", confidence: 0.3 };
}

/**
 * Gets the expected frequency for a subscription type
 */
export function getTypicalFrequency(
  subscriptionType?: ScheduleSubscriptionType
): Frequency[] {
  if (!subscriptionType) return ["monthly"];
  return SUBSCRIPTION_PATTERNS[subscriptionType]?.typicalBillingCycles ?? ["monthly"];
}

/**
 * Validates if an amount is within typical range for a subscription type
 */
export function isAmountInTypicalRange(
  amount: number,
  subscriptionType: ScheduleSubscriptionType
): boolean {
  const pattern = SUBSCRIPTION_PATTERNS[subscriptionType];
  if (!pattern) return true;
  const absAmount = Math.abs(amount);
  return absAmount >= pattern.typicalCostRange.min && absAmount <= pattern.typicalCostRange.max;
}
