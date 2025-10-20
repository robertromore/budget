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
  private matchPayee(normalizedInput: string, payee: Payee): PayeeMatch {
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
      if (match.score >= minScore) {
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
    const result = this.normalizePayeeName(rawName);
    return result.name;
  }

  /**
   * Normalize payee name and extract details for notes field
   * Uses general pattern recognition without hardcoding specific merchants
   */
  normalizePayeeName(rawName: string): { name: string; details: string | null } {
    if (!rawName || !rawName.trim()) {
      return { name: '', details: null };
    }

    let text = rawName.trim();
    const extractedDetails: string[] = [];

    // Step 1: Remove common transaction prefixes
    const prefixPattern = /^(DEBIT|CREDIT|POS|ATM|CHECK|SQ \*|TST\*|PYMT|PMT|ACH)\s+/i;
    text = text.replace(prefixPattern, '');

    // Step 2: Handle marketplace transaction IDs (e.g., AMAZON MKTPL*ABC123, PAYPAL *MERCHANT)
    // For PAYPAL *, preserve the merchant name as part of the payee
    // Pattern: WORD [MKTPL|MKTP]* followed by alphanumeric code
    const paypalMerchantMatch = text.match(/^(PAYPAL)\s*\*\s*(.+)$/i);
    if (paypalMerchantMatch) {
      // Keep "Paypal - MerchantName" format to distinguish different merchants
      text = `${paypalMerchantMatch[1]} - ${paypalMerchantMatch[2]}`;
    } else {
      const marketplaceMatch = text.match(/^([A-Z]+(?:\s+[A-Z]+)?)\s*(?:MKTPL?|MARKETPLACE)?\s*[\*]([A-Z0-9*]+)$/i);
      if (marketplaceMatch) {
        text = marketplaceMatch[1]; // Base name (e.g., AMAZON)
        extractedDetails.push(marketplaceMatch[2]); // Transaction ID
      }
    }

    if (!paypalMerchantMatch && !text.match(/^([A-Z]+(?:\s+[A-Z]+)?)\s*(?:MKTPL?|MARKETPLACE)?\s*[\*]([A-Z0-9*]+)$/i)) {
      // Step 3: Extract trailing transaction IDs, order numbers, etc.
      // Pattern: Long alphanumeric strings (8+ chars) at the end
      const trailingIdMatch = text.match(/^(.+?)\s+([A-Z0-9*]{8,})$/);
      if (trailingIdMatch) {
        const potentialName = trailingIdMatch[1];
        const potentialId = trailingIdMatch[2];

        // Only extract if it looks like an ID (mixed case/numbers or special chars)
        if (/[0-9]/.test(potentialId) || /\*/.test(potentialId)) {
          text = potentialName;
          extractedDetails.push(potentialId);
        }
      }

      // Step 4: Extract store numbers and locations
      // Pattern: NAME LOCATION #NUMBER or NAME #NUMBER or NAME STORE NUMBER
      const parts = text.split(/\s+/);
      const nameEndIndex = this.findNameEndIndex(parts);

      if (nameEndIndex < parts.length - 1) {
        const nameParts = parts.slice(0, nameEndIndex + 1);
        const detailParts = parts.slice(nameEndIndex + 1);
        text = nameParts.join(' ');
        extractedDetails.push(detailParts.join(' '));
      }
    }

    // Step 5: Remove remaining noise
    // Remove long number sequences (10+ digits - likely transaction IDs)
    text = text.replace(/\s*\d{10,}\s*/g, ' ');

    // Remove card numbers: ****1234
    text = text.replace(/\s*\*{4}\d{4}\s*/g, ' ');

    // Remove dates
    text = text.replace(/\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*/g, ' ');
    text = text.replace(/\s*\d{2,4}-\d{2}-\d{2}\s*/g, ' ');

    // Step 6: Remove common corporate suffixes
    text = text.replace(/\s+(INC|LLC|LTD|CORP|CO|COMPANY)\.?$/i, '');

    // Step 7: Clean up whitespace and punctuation
    text = text.replace(/\s+/g, ' ').trim();
    text = text.replace(/^[*\s]+|[*\s]+$/g, '');
    text = text.replace(/^[-\s]+|[-\s]+$/g, '');

    // Step 8: Convert to Title Case if all caps or all lowercase
    if (text === text.toUpperCase() || text === text.toLowerCase()) {
      text = this.toTitleCase(text);
    }

    return {
      name: text,
      details: extractedDetails.length > 0 ? extractedDetails.join(' ') : null,
    };
  }

  /**
   * Find where the actual payee name ends and location/store numbers begin
   * Returns the index of the last part that's part of the name
   */
  private findNameEndIndex(parts: string[]): number {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];

      // If this part is a store number pattern (#123, STORE, etc.)
      if (/^#\d+$/.test(part)) {
        return i - 1;
      }

      // If this is STORE/STORES followed by a number
      if (/^STORES?$/i.test(part) && nextPart && /^\d+$/.test(nextPart)) {
        return i - 1;
      }

      // If this is a number at the end (likely store number)
      if (/^\d+$/.test(part) && i === parts.length - 1 && i > 0) {
        // Check if previous part looks like a location name (2+ letters, all caps)
        if (parts[i - 1] && /^[A-Z]{2,}$/i.test(parts[i - 1])) {
          return i - 2 >= 0 ? i - 2 : 0;
        }
        return i - 1;
      }

      // If this part and next part are both short all-caps words followed by number
      // (e.g., "HY VEE GRIMES 1234" - "GRIMES 1234" is location)
      if (
        i >= 1 &&
        nextPart &&
        /^[A-Z]{2,}$/i.test(part) &&
        /^\d+$/.test(nextPart)
      ) {
        return i - 1;
      }
    }

    return parts.length - 1;
  }

  /**
   * Convert string to Title Case with smart handling
   */
  private toTitleCase(str: string): string {
    const lowercaseWords = new Set([
      'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'
    ]);

    return str
      .toLowerCase()
      .split(/\s+/)
      .map((word, index) => {
        // Always capitalize first word
        if (index === 0) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }

        // Keep small words lowercase (unless first word)
        if (lowercaseWords.has(word)) {
          return word;
        }

        // Handle words with apostrophes (e.g., "mcdonald's" -> "McDonald's")
        if (word.includes("'")) {
          return word.split("'").map(part =>
            part.charAt(0).toUpperCase() + part.slice(1)
          ).join("'");
        }

        // Handle hyphenated words (e.g., "hy-vee" -> "Hy-Vee")
        if (word.includes('-')) {
          return word.split('-').map(part =>
            part.charAt(0).toUpperCase() + part.slice(1)
          ).join('-');
        }

        // Default: capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }
}
