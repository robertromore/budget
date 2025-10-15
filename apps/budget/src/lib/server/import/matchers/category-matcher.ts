/**
 * Category Matcher Service
 *
 * Provides intelligent matching of imported transaction data to existing categories
 * using keyword patterns, fuzzy string matching, and confidence scoring.
 */

import type { Category } from '$lib/schema/categories';
import { calculateStringSimilarity, normalizeText } from '../utils';

export type MatchConfidence = 'exact' | 'high' | 'medium' | 'low' | 'none';

export interface CategoryMatch {
  category: Category | null;
  confidence: MatchConfidence;
  score: number;
  matchedOn: 'name' | 'keyword' | 'payee' | 'description' | 'none';
}

export interface CategoryMatcherOptions {
  exactThreshold?: number;
  highThreshold?: number;
  mediumThreshold?: number;
  useKeywordPatterns?: boolean;
  usePayeeName?: boolean;
}

const DEFAULT_OPTIONS: Required<CategoryMatcherOptions> = {
  exactThreshold: 1.0,
  highThreshold: 0.9,
  mediumThreshold: 0.7,
  useKeywordPatterns: true,
  usePayeeName: true,
};

/**
 * Default keyword patterns for common categories
 * Allows matching transactions to categories based on common merchant names and keywords
 */
const DEFAULT_KEYWORD_PATTERNS: Record<string, string[]> = {
  Groceries: [
    'walmart',
    'target',
    'kroger',
    'safeway',
    'whole foods',
    'trader joe',
    'costco',
    'aldi',
    'publix',
    'grocery',
    'supermarket',
    'market',
  ],
  'Dining Out': [
    'restaurant',
    'cafe',
    'coffee',
    'starbucks',
    'dunkin',
    'mcdonald',
    'burger',
    'pizza',
    'subway',
    'chipotle',
    'panera',
    'dining',
    'food',
    'bar & grill',
  ],
  Transportation: [
    'gas',
    'fuel',
    'shell',
    'exxon',
    'chevron',
    'bp',
    'mobil',
    'uber',
    'lyft',
    'taxi',
    'parking',
    'transit',
    'subway',
    'metro',
  ],
  Utilities: [
    'electric',
    'power',
    'water',
    'gas company',
    'utility',
    'internet',
    'cable',
    'phone',
    'wireless',
    'verizon',
    'at&t',
    't-mobile',
  ],
  Healthcare: [
    'pharmacy',
    'walgreens',
    'cvs',
    'rite aid',
    'doctor',
    'hospital',
    'clinic',
    'medical',
    'health',
    'dental',
    'vision',
  ],
  Entertainment: [
    'netflix',
    'hulu',
    'spotify',
    'amazon prime',
    'disney',
    'movie',
    'theater',
    'cinema',
    'concert',
    'tickets',
    'gaming',
    'steam',
  ],
  Shopping: [
    'amazon',
    'ebay',
    'etsy',
    'mall',
    'store',
    'shop',
    'retail',
    'clothing',
    'apparel',
  ],
  'Home Improvement': [
    'home depot',
    'lowes',
    'hardware',
    'repair',
    'maintenance',
    'improvement',
  ],
  Insurance: ['insurance', 'policy', 'premium', 'coverage'],
  'Auto & Transport': ['car', 'auto', 'vehicle', 'mechanic', 'repair', 'parts', 'oil change'],
};

export class CategoryMatcher {
  private options: Required<CategoryMatcherOptions>;
  private keywordPatterns: Record<string, string[]>;

  constructor(
    options: CategoryMatcherOptions = {},
    customKeywordPatterns: Record<string, string[]> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.keywordPatterns = { ...DEFAULT_KEYWORD_PATTERNS, ...customKeywordPatterns };
  }

  /**
   * Find the best matching category for a transaction
   */
  findBestMatch(
    transactionData: {
      categoryName?: string;
      payeeName?: string;
      description?: string;
    },
    existingCategories: Category[]
  ): CategoryMatch {
    let bestMatch: CategoryMatch = {
      category: null,
      confidence: 'none',
      score: 0,
      matchedOn: 'none',
    };

    // Try matching by category name if provided
    if (transactionData.categoryName) {
      const categoryNameMatch = this.matchByName(
        transactionData.categoryName,
        existingCategories
      );
      if (categoryNameMatch.score > bestMatch.score) {
        bestMatch = categoryNameMatch;
      }
      if (categoryNameMatch.confidence === 'exact') {
        return bestMatch;
      }
    }

    // Try keyword pattern matching if enabled
    if (this.options.useKeywordPatterns) {
      const keywordMatch = this.matchByKeywords(transactionData, existingCategories);
      if (keywordMatch.score > bestMatch.score) {
        bestMatch = keywordMatch;
      }
      if (keywordMatch.confidence === 'exact' || keywordMatch.confidence === 'high') {
        return bestMatch;
      }
    }

    return bestMatch;
  }

  /**
   * Match category by name comparison
   */
  private matchByName(categoryName: string, existingCategories: Category[]): CategoryMatch {
    const normalizedInput = normalizeText(categoryName);
    let bestMatch: CategoryMatch = {
      category: null,
      confidence: 'none',
      score: 0,
      matchedOn: 'name',
    };

    for (const category of existingCategories) {
      if (!category.name) continue;

      const normalizedCategoryName = normalizeText(category.name);

      // Check for exact match
      if (normalizedInput === normalizedCategoryName) {
        return {
          category,
          confidence: 'exact',
          score: 1.0,
          matchedOn: 'name',
        };
      }

      // Check if one is a substring of the other
      if (
        normalizedInput.includes(normalizedCategoryName) ||
        normalizedCategoryName.includes(normalizedInput)
      ) {
        const score = Math.max(
          calculateStringSimilarity(normalizedInput, normalizedCategoryName),
          0.85
        );
        if (score > bestMatch.score) {
          bestMatch = {
            category,
            confidence: this.getConfidenceLevel(score),
            score,
            matchedOn: 'name',
          };
        }
        continue;
      }

      // Fuzzy match using Levenshtein distance
      const similarityScore = calculateStringSimilarity(normalizedInput, normalizedCategoryName);
      if (similarityScore > bestMatch.score) {
        bestMatch = {
          category,
          confidence: this.getConfidenceLevel(similarityScore),
          score: similarityScore,
          matchedOn: 'name',
        };
      }
    }

    return bestMatch;
  }

  /**
   * Match category by keyword patterns
   */
  private matchByKeywords(
    transactionData: {
      categoryName?: string;
      payeeName?: string;
      description?: string;
    },
    existingCategories: Category[]
  ): CategoryMatch {
    // Combine all available text for keyword matching
    const searchText = normalizeText(
      [
        transactionData.categoryName || '',
        this.options.usePayeeName ? transactionData.payeeName || '' : '',
        transactionData.description || '',
      ].join(' ')
    );

    if (!searchText) {
      return {
        category: null,
        confidence: 'none',
        score: 0,
        matchedOn: 'none',
      };
    }

    let bestMatch: CategoryMatch = {
      category: null,
      confidence: 'none',
      score: 0,
      matchedOn: 'keyword',
    };

    // Check each category's keyword patterns
    for (const [categoryPattern, keywords] of Object.entries(this.keywordPatterns)) {
      // Find the category that matches this pattern name
      const category = existingCategories.find(
        (c) => c.name && normalizeText(c.name) === normalizeText(categoryPattern)
      );

      if (!category) continue;

      // Check if any keyword matches
      for (const keyword of keywords) {
        const normalizedKeyword = normalizeText(keyword);
        if (searchText.includes(normalizedKeyword)) {
          // Score based on keyword length (longer keywords = more specific = higher confidence)
          const keywordScore = Math.min(0.75 + keyword.length * 0.02, 0.95);

          if (keywordScore > bestMatch.score) {
            bestMatch = {
              category,
              confidence: this.getConfidenceLevel(keywordScore),
              score: keywordScore,
              matchedOn: transactionData.payeeName?.toLowerCase().includes(keyword.toLowerCase())
                ? 'payee'
                : 'description',
            };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Find multiple potential category matches (for user review)
   */
  findPotentialMatches(
    transactionData: {
      categoryName?: string;
      payeeName?: string;
      description?: string;
    },
    existingCategories: Category[],
    minScore: number = 0.6,
    maxResults: number = 5
  ): CategoryMatch[] {
    const matches: CategoryMatch[] = [];

    // Try name matching
    if (transactionData.categoryName) {
      const nameMatch = this.matchByName(transactionData.categoryName, existingCategories);
      if (nameMatch.score >= minScore) {
        matches.push(nameMatch);
      }
    }

    // Try keyword matching
    if (this.options.useKeywordPatterns) {
      const keywordMatch = this.matchByKeywords(transactionData, existingCategories);
      if (keywordMatch.score >= minScore) {
        // Check if this category is already in matches
        if (!matches.find((m) => m.category?.id === keywordMatch.category?.id)) {
          matches.push(keywordMatch);
        }
      }
    }

    // Sort by score (highest first) and return top results
    return matches.sort((a, b) => b.score - a.score).slice(0, maxResults);
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
   * Add custom keyword patterns for specific categories
   */
  addKeywordPattern(categoryName: string, keywords: string[]): void {
    this.keywordPatterns[categoryName] = [
      ...(this.keywordPatterns[categoryName] || []),
      ...keywords,
    ];
  }

  /**
   * Get all keyword patterns (useful for debugging or user configuration)
   */
  getKeywordPatterns(): Record<string, string[]> {
    return { ...this.keywordPatterns };
  }

  /**
   * Suggest a category name based on transaction data when no explicit category is provided
   * Returns the best matching category pattern name if confidence is high enough
   */
  suggestCategoryName(transactionData: {
    payeeName?: string;
    description?: string;
  }): string | null {
    // Combine payee and description for keyword matching
    const searchText = normalizeText(
      [transactionData.payeeName || '', transactionData.description || ''].join(' ')
    );

    if (!searchText) {
      return null;
    }

    let bestMatch: { categoryName: string; score: number } | null = null;

    // Check each category pattern's keywords
    for (const [categoryPattern, keywords] of Object.entries(this.keywordPatterns)) {
      for (const keyword of keywords) {
        const normalizedKeyword = normalizeText(keyword);
        if (searchText.includes(normalizedKeyword)) {
          // Score based on keyword length (longer keywords = more specific = higher confidence)
          const keywordScore = Math.min(0.75 + keyword.length * 0.02, 0.95);

          if (!bestMatch || keywordScore > bestMatch.score) {
            bestMatch = {
              categoryName: categoryPattern,
              score: keywordScore,
            };
          }
        }
      }
    }

    // Only return suggestions with medium or higher confidence (0.7+)
    if (bestMatch && bestMatch.score >= 0.7) {
      return bestMatch.categoryName;
    }

    return null;
  }
}
