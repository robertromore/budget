import type { ScheduleSubscriptionType } from "$lib/schema/schedules";
import {
  BILL_PATTERNS,
  INCOME_PATTERNS,
  SUBSCRIPTION_PATTERNS,
  TRANSFER_KEYWORDS,
  TRANSFER_PATTERNS,
  classifyPatternType,
} from "../patterns/database";
import type { PatternMatchResult, PatternType } from "../types";

/**
 * Performs comprehensive pattern matching on a payee name
 */
export function analyzePattern(
  payeeName: string,
  amount: number,
  merchantCode?: string
): PatternMatchResult {
  const normalizedName = payeeName.toLowerCase().trim();
  const isExpense = amount < 0;

  const matchedKeywords: string[] = [];
  const matchedPatterns: string[] = [];

  // Step 1: Check for transfers
  const transferResult = checkTransferPattern(normalizedName);
  if (transferResult.matched) {
    return {
      matched: true,
      patternType: "transfer",
      confidence: transferResult.confidence,
      matchedKeywords: transferResult.keywords,
      matchedPatterns: [],
    };
  }

  // Step 2: Check for income (positive amounts)
  if (!isExpense) {
    const incomeResult = checkIncomePattern(normalizedName);
    if (incomeResult.matched) {
      return {
        matched: true,
        patternType: "income",
        confidence: incomeResult.confidence,
        matchedKeywords: incomeResult.keywords,
        matchedPatterns: incomeResult.patterns,
      };
    }
    // Default positive amounts to income with low confidence
    return {
      matched: true,
      patternType: "income",
      confidence: 0.3,
      matchedKeywords: [],
      matchedPatterns: [],
    };
  }

  // Step 3: Check subscription patterns (most specific)
  const subscriptionResult = checkSubscriptionPattern(normalizedName, Math.abs(amount), merchantCode);
  if (subscriptionResult.matched && subscriptionResult.confidence >= 0.5) {
    return {
      matched: true,
      patternType: "subscription",
      subscriptionType: subscriptionResult.subscriptionType,
      confidence: subscriptionResult.confidence,
      matchedKeywords: subscriptionResult.keywords,
      matchedPatterns: subscriptionResult.patterns,
    };
  }

  // Step 4: Check bill patterns
  const billResult = checkBillPattern(normalizedName);
  if (billResult.matched && billResult.confidence >= 0.5) {
    return {
      matched: true,
      patternType: "bill",
      confidence: billResult.confidence,
      matchedKeywords: billResult.keywords,
      matchedPatterns: billResult.patterns,
    };
  }

  // Step 5: Return subscription result if it had any match (even low confidence)
  if (subscriptionResult.matched) {
    return {
      matched: true,
      patternType: "subscription",
      subscriptionType: subscriptionResult.subscriptionType,
      confidence: subscriptionResult.confidence,
      matchedKeywords: subscriptionResult.keywords,
      matchedPatterns: subscriptionResult.patterns,
    };
  }

  // Step 6: Default to "other" with low confidence
  return {
    matched: false,
    patternType: "other",
    confidence: 0.1,
    matchedKeywords: [],
    matchedPatterns: [],
  };
}

interface PatternCheckResult {
  matched: boolean;
  confidence: number;
  keywords: string[];
  patterns: string[];
  subscriptionType?: ScheduleSubscriptionType;
}

/**
 * Checks if a payee name matches transfer patterns
 */
function checkTransferPattern(normalizedName: string): PatternCheckResult {
  const keywords: string[] = [];

  for (const keyword of TRANSFER_KEYWORDS) {
    if (normalizedName.includes(keyword.toLowerCase())) {
      keywords.push(keyword);
    }
  }

  if (keywords.length > 0) {
    return {
      matched: true,
      confidence: 0.7 + Math.min(0.2, keywords.length * 0.1),
      keywords,
      patterns: [],
    };
  }

  const patterns: string[] = [];
  for (const pattern of TRANSFER_PATTERNS) {
    if (pattern.test(normalizedName)) {
      patterns.push(pattern.source);
    }
  }

  if (patterns.length > 0) {
    return {
      matched: true,
      confidence: 0.6,
      keywords: [],
      patterns,
    };
  }

  return { matched: false, confidence: 0, keywords: [], patterns: [] };
}

/**
 * Checks if a payee name matches income patterns
 */
function checkIncomePattern(normalizedName: string): PatternCheckResult {
  const keywords: string[] = [];
  const patterns: string[] = [];

  for (const incomePattern of INCOME_PATTERNS) {
    for (const keyword of incomePattern.keywords) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
      }
    }
    for (const pattern of incomePattern.regexPatterns) {
      if (pattern.test(normalizedName)) {
        patterns.push(pattern.source);
      }
    }
  }

  if (keywords.length > 0) {
    return {
      matched: true,
      confidence: 0.8,
      keywords,
      patterns,
    };
  }

  if (patterns.length > 0) {
    return {
      matched: true,
      confidence: 0.6,
      keywords: [],
      patterns,
    };
  }

  return { matched: false, confidence: 0, keywords: [], patterns: [] };
}

/**
 * Checks if a payee name matches subscription patterns
 */
function checkSubscriptionPattern(
  normalizedName: string,
  amount: number,
  merchantCode?: string
): PatternCheckResult {
  const keywords: string[] = [];
  const patterns: string[] = [];
  let bestMatch: {
    type: ScheduleSubscriptionType;
    confidence: number;
  } | null = null;

  for (const [subType, subPattern] of Object.entries(SUBSCRIPTION_PATTERNS)) {
    let typeConfidence = 0;
    const typeKeywords: string[] = [];
    const typePatterns: string[] = [];

    // Check keywords
    for (const keyword of subPattern.keywords) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        typeKeywords.push(keyword);
        typeConfidence = Math.max(typeConfidence, 0.85);
      }
    }

    // Check regex patterns
    for (const pattern of subPattern.regexPatterns) {
      if (pattern.test(normalizedName)) {
        typePatterns.push(pattern.source);
        typeConfidence = Math.max(typeConfidence, 0.55);
      }
    }

    // Check merchant codes
    if (merchantCode && subPattern.merchantCodes.includes(merchantCode)) {
      typeConfidence = Math.max(typeConfidence, 0.65);
    }

    // Boost confidence if amount is in typical range
    if (typeConfidence > 0) {
      const inRange =
        amount >= subPattern.typicalCostRange.min && amount <= subPattern.typicalCostRange.max;
      if (inRange) {
        typeConfidence = Math.min(1, typeConfidence + 0.1);
      } else {
        typeConfidence = Math.max(0.3, typeConfidence - 0.15);
      }
    }

    if (typeConfidence > (bestMatch?.confidence ?? 0)) {
      bestMatch = {
        type: subType as ScheduleSubscriptionType,
        confidence: typeConfidence,
      };
      keywords.push(...typeKeywords);
      patterns.push(...typePatterns);
    }
  }

  if (bestMatch && bestMatch.confidence > 0.3) {
    return {
      matched: true,
      confidence: bestMatch.confidence,
      keywords,
      patterns,
      subscriptionType: bestMatch.type,
    };
  }

  return { matched: false, confidence: 0, keywords: [], patterns: [] };
}

/**
 * Checks if a payee name matches bill patterns
 */
function checkBillPattern(normalizedName: string): PatternCheckResult {
  const keywords: string[] = [];
  const patterns: string[] = [];
  let maxConfidence = 0;

  for (const billPattern of BILL_PATTERNS) {
    for (const keyword of billPattern.keywords) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
        maxConfidence = Math.max(maxConfidence, 0.75);
      }
    }
    for (const pattern of billPattern.regexPatterns) {
      if (pattern.test(normalizedName)) {
        patterns.push(pattern.source);
        maxConfidence = Math.max(maxConfidence, 0.6);
      }
    }
  }

  if (maxConfidence > 0) {
    return {
      matched: true,
      confidence: maxConfidence,
      keywords,
      patterns,
    };
  }

  return { matched: false, confidence: 0, keywords: [], patterns: [] };
}

/**
 * Calculates an aggregate pattern confidence score for the overall detection
 */
export function calculatePatternScore(result: PatternMatchResult): number {
  if (!result.matched) return 0;

  let score = result.confidence;

  // Boost for multiple matches
  if (result.matchedKeywords.length > 1) {
    score = Math.min(1, score + 0.1);
  }

  // Reduce score for "other" type
  if (result.patternType === "other") {
    score *= 0.5;
  }

  return score;
}

/**
 * Suggests a display name based on matched patterns
 */
export function suggestDisplayName(
  originalPayeeName: string,
  result: PatternMatchResult
): string {
  if (result.matchedKeywords.length > 0) {
    // Use the matched keyword as a base
    const keyword = result.matchedKeywords[0];
    return keyword.charAt(0).toUpperCase() + keyword.slice(1);
  }
  return originalPayeeName;
}
