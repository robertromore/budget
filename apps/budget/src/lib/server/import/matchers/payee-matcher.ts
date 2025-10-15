/**
 * Payee Matcher Service
 *
 * Provides intelligent matching of imported payee names to existing payees
 * using fuzzy string matching and confidence scoring.
 */

import type { Payee } from '$lib/schema/payees';
import { calculateStringSimilarity, normalizeText } from '../utils';

export type MatchConfidence = 'exact' | 'high' | 'medium' | 'low' | 'none';

export interface PayeeMatch {
  payee: Payee | null;
  confidence: MatchConfidence;
  score: number;
  matchedOn: string;
}

export interface PayeeMatcherOptions {
  exactThreshold?: number;
  highThreshold?: number;
  mediumThreshold?: number;
  createIfNoMatch?: boolean;
}

const DEFAULT_OPTIONS: Required<PayeeMatcherOptions> = {
  exactThreshold: 1.0,
  highThreshold: 0.9,
  mediumThreshold: 0.7,
  createIfNoMatch: true,
};

export class PayeeMatcher {
  private options: Required<PayeeMatcherOptions>;

  constructor(options: PayeeMatcherOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Find the best matching payee for a given name
   */
  findBestMatch(payeeName: string, existingPayees: Payee[]): PayeeMatch {
    if (!payeeName || !payeeName.trim()) {
      return {
        payee: null,
        confidence: 'none',
        score: 0,
        matchedOn: '',
      };
    }

    const normalizedInput = normalizeText(payeeName);
    let bestMatch: PayeeMatch = {
      payee: null,
      confidence: 'none',
      score: 0,
      matchedOn: '',
    };

    for (const payee of existingPayees) {
      const match = this.matchPayee(normalizedInput, payee);
      if (!match) continue;

      if (match.score > bestMatch.score) {
        bestMatch = match;
      }

      // If we found an exact match, no need to continue
      if (match.confidence === 'exact') {
        break;
      }
    }

    return bestMatch;
  }

  /**
   * Match a single payee against the input
   */
  private matchPayee(normalizedInput: string, payee: Payee): PayeeMatch | null {
    if (!payee.name) return null;

    const normalizedPayeeName = normalizeText(payee.name);

    // Check for exact match
    if (normalizedInput === normalizedPayeeName) {
      return {
        payee,
        confidence: 'exact',
        score: 1.0,
        matchedOn: 'name',
      };
    }

    // Check if one is a substring of the other (common with bank data)
    // e.g., "WALMART #1234" matches "Walmart"
    if (
      normalizedInput.includes(normalizedPayeeName) ||
      normalizedPayeeName.includes(normalizedInput)
    ) {
      const score = Math.max(
        calculateStringSimilarity(normalizedInput, normalizedPayeeName),
        0.85 // Substring matches get at least 0.85 score
      );
      return {
        payee,
        confidence: this.getConfidenceLevel(score),
        score,
        matchedOn: 'name_substring',
      };
    }

    // Fuzzy match using Levenshtein distance
    const similarityScore = calculateStringSimilarity(normalizedInput, normalizedPayeeName);

    return {
      payee,
      confidence: this.getConfidenceLevel(similarityScore),
      score: similarityScore,
      matchedOn: 'name_fuzzy',
    };
  }

  /**
   * Determine confidence level based on similarity score
   */
  private getConfidenceLevel(score: number): MatchConfidence {
    if (score >= this.options.exactThreshold) {
      return 'exact';
    } else if (score >= this.options.highThreshold) {
      return 'high';
    } else if (score >= this.options.mediumThreshold) {
      return 'medium';
    } else if (score > 0.5) {
      return 'low';
    } else {
      return 'none';
    }
  }

  /**
   * Find multiple potential matches (for user review)
   */
  findPotentialMatches(
    payeeName: string,
    existingPayees: Payee[],
    minScore: number = 0.6,
    maxResults: number = 5
  ): PayeeMatch[] {
    if (!payeeName || !payeeName.trim()) {
      return [];
    }

    const normalizedInput = normalizeText(payeeName);
    const matches: PayeeMatch[] = [];

    for (const payee of existingPayees) {
      const match = this.matchPayee(normalizedInput, payee);
      if (match && match.score >= minScore) {
        matches.push(match);
      }
    }

    // Sort by score (highest first) and return top results
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Extract clean payee name from bank/import data
   * Removes common prefixes, suffixes, and transaction IDs
   */
  cleanPayeeName(rawName: string): string {
    let cleaned = rawName.trim();

    // Remove common transaction ID patterns
    cleaned = cleaned.replace(/#\d+/g, ''); // Remove #1234
    cleaned = cleaned.replace(/\d{10,}/g, ''); // Remove long number sequences
    cleaned = cleaned.replace(/\*{4}\d{4}/g, ''); // Remove ****1234

    // Remove common prefixes
    cleaned = cleaned.replace(/^(DEBIT|CREDIT|POS|ATM|CHECK)\s+/i, '');

    // Remove dates in various formats
    cleaned = cleaned.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '');
    cleaned = cleaned.replace(/\d{2,4}-\d{2}-\d{2}/g, '');

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }
}
