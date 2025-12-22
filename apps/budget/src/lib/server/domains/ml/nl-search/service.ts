/**
 * Natural Language Transaction Search Service
 *
 * Parses natural language queries into structured transaction filters.
 * Handles date expressions, amount ranges, payees, categories, and more.
 *
 * Examples:
 * - "Show me all Amazon purchases over $50"
 * - "What did I spend on coffee last month?"
 * - "Grocery expenses in December"
 * - "Large transactions over $500 this year"
 */

import { accounts, categories, payees, transactions } from "$lib/schema";
import { db } from "$lib/server/db";
import { and, desc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";

// =============================================================================
// Types
// =============================================================================

export interface ParsedQuery {
  // Date filters
  dateFrom?: string;
  dateTo?: string;

  // Amount filters
  minAmount?: number;
  maxAmount?: number;

  // Entity filters
  payeeNames?: string[];
  categoryNames?: string[];

  // Transaction type
  transactionType?: "income" | "expense" | "all";

  // Free text search
  searchTerms?: string[];

  // Sorting
  sortBy?: "date" | "amount";
  sortOrder?: "asc" | "desc";

  // Limit
  limit?: number;

  // Debug info
  interpretation: string;
  confidence: number;
}

export interface NLSearchResult {
  transactions: Array<{
    id: number;
    date: string;
    amount: number;
    notes: string | null;
    payeeName: string | null;
    categoryName: string | null;
    accountName: string | null;
  }>;
  query: ParsedQuery;
  totalCount: number;
  executionTimeMs: number;
}

// =============================================================================
// Constants
// =============================================================================

// Date expression patterns
const DATE_PATTERNS = {
  // Relative periods
  today: () => {
    const today = new Date();
    return { from: startOfDay(today), to: endOfDay(today) };
  },
  yesterday: () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return { from: startOfDay(date), to: endOfDay(date) };
  },
  "this week": () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    return { from: startOfDay(start), to: endOfDay(today) };
  },
  "last week": () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek - 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: startOfDay(start), to: endOfDay(end) };
  },
  "this month": () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: startOfDay(start), to: endOfDay(today) };
  },
  "last month": () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: startOfDay(start), to: endOfDay(end) };
  },
  "this quarter": () => {
    const today = new Date();
    const quarter = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), quarter * 3, 1);
    return { from: startOfDay(start), to: endOfDay(today) };
  },
  "last quarter": () => {
    const today = new Date();
    const quarter = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
    const end = new Date(today.getFullYear(), quarter * 3, 0);
    return { from: startOfDay(start), to: endOfDay(end) };
  },
  "this year": () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 1);
    return { from: startOfDay(start), to: endOfDay(today) };
  },
  "last year": () => {
    const today = new Date();
    const start = new Date(today.getFullYear() - 1, 0, 1);
    const end = new Date(today.getFullYear() - 1, 11, 31);
    return { from: startOfDay(start), to: endOfDay(end) };
  },
};

// Month names for parsing
const MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

// Amount modifier patterns
const AMOUNT_PATTERNS = [
  { regex: /over\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: "min" as const },
  { regex: /more\s+than\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: "min" as const },
  { regex: /above\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: "min" as const },
  { regex: /at\s+least\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: "min" as const },
  { regex: /under\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: "max" as const },
  { regex: /less\s+than\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: "max" as const },
  { regex: /below\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: "max" as const },
  { regex: /up\s+to\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: "max" as const },
  {
    regex: /between\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:and|-)\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    type: "range" as const,
  },
  { regex: /\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:to|-)\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: "range" as const },
  { regex: /around\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: "around" as const },
  { regex: /about\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: "around" as const },
  { regex: /exactly\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: "exact" as const },
];

// Transaction type keywords
const EXPENSE_KEYWORDS = [
  "spent",
  "spend",
  "spending",
  "expenses",
  "expense",
  "purchases",
  "purchase",
  "bought",
  "buy",
  "paid",
  "pay",
  "payment",
  "cost",
];
const INCOME_KEYWORDS = [
  "earned",
  "earn",
  "income",
  "received",
  "receive",
  "deposit",
  "deposits",
  "salary",
  "paycheck",
  "refund",
];

// Prepositions that indicate payee/category context
const PAYEE_PREPOSITIONS = ["at", "from", "to"];
const CATEGORY_PREPOSITIONS = ["for", "on"];

// Size descriptors
const SIZE_DESCRIPTORS: Record<string, { min?: number; max?: number }> = {
  small: { max: 25 },
  tiny: { max: 10 },
  little: { max: 25 },
  large: { min: 100 },
  big: { min: 100 },
  huge: { min: 500 },
  major: { min: 200 },
  significant: { min: 100 },
};

// =============================================================================
// Helper Functions
// =============================================================================

function startOfDay(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split("T")[0];
}

function endOfDay(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split("T")[0];
}

function parseAmount(str: string): number {
  return parseFloat(str.replace(/,/g, ""));
}

// =============================================================================
// Service Implementation
// =============================================================================

export class NaturalLanguageSearchService {
  /**
   * Parse a natural language query into structured filters
   */
  parseQuery(query: string): ParsedQuery {
    const normalizedQuery = query.toLowerCase().trim();
    const interpretations: string[] = [];
    let confidence = 0.5;

    const result: ParsedQuery = {
      interpretation: "",
      confidence: 0,
    };

    // Parse date expressions
    const dateResult = this.extractDateRange(normalizedQuery);
    if (dateResult) {
      result.dateFrom = dateResult.from;
      result.dateTo = dateResult.to;
      interpretations.push(`Date: ${dateResult.description}`);
      confidence += 0.1;
    }

    // Parse amount expressions
    const amountResult = this.extractAmountRange(normalizedQuery);
    if (amountResult.minAmount !== undefined) {
      result.minAmount = amountResult.minAmount;
      interpretations.push(`Min amount: $${amountResult.minAmount}`);
      confidence += 0.1;
    }
    if (amountResult.maxAmount !== undefined) {
      result.maxAmount = amountResult.maxAmount;
      interpretations.push(`Max amount: $${amountResult.maxAmount}`);
      confidence += 0.1;
    }

    // Parse transaction type
    const transactionType = this.extractTransactionType(normalizedQuery);
    if (transactionType) {
      result.transactionType = transactionType;
      interpretations.push(`Type: ${transactionType}`);
      confidence += 0.05;
    }

    // Parse potential payee/category names
    const entities = this.extractEntities(normalizedQuery);
    if (entities.payees.length > 0) {
      result.payeeNames = entities.payees;
      interpretations.push(`Payees: ${entities.payees.join(", ")}`);
      confidence += 0.15;
    }
    if (entities.categories.length > 0) {
      result.categoryNames = entities.categories;
      interpretations.push(`Categories: ${entities.categories.join(", ")}`);
      confidence += 0.15;
    }

    // Extract remaining search terms
    const searchTerms = this.extractSearchTerms(normalizedQuery);
    if (searchTerms.length > 0) {
      result.searchTerms = searchTerms;
      interpretations.push(`Search: ${searchTerms.join(" ")}`);
    }

    // Parse sorting hints
    if (/largest|biggest|highest|most expensive/i.test(normalizedQuery)) {
      result.sortBy = "amount";
      result.sortOrder = "desc";
      interpretations.push("Sort: largest first");
    } else if (/smallest|lowest|cheapest/i.test(normalizedQuery)) {
      result.sortBy = "amount";
      result.sortOrder = "asc";
      interpretations.push("Sort: smallest first");
    } else if (/recent|latest|newest/i.test(normalizedQuery)) {
      result.sortBy = "date";
      result.sortOrder = "desc";
      interpretations.push("Sort: most recent first");
    } else if (/oldest|earliest|first/i.test(normalizedQuery)) {
      result.sortBy = "date";
      result.sortOrder = "asc";
      interpretations.push("Sort: oldest first");
    }

    // Parse limit hints
    const limitMatch = normalizedQuery.match(/(?:top|first|last)\s+(\d+)/i);
    if (limitMatch) {
      result.limit = parseInt(limitMatch[1], 10);
      interpretations.push(`Limit: ${result.limit}`);
    }

    result.interpretation = interpretations.join(" | ");
    result.confidence = Math.min(confidence, 1);

    return result;
  }

  /**
   * Extract date range from natural language
   */
  private extractDateRange(query: string): { from: string; to: string; description: string } | null {
    // Check for relative date patterns first
    for (const [pattern, fn] of Object.entries(DATE_PATTERNS)) {
      if (query.includes(pattern)) {
        const range = fn();
        return { ...range, description: pattern };
      }
    }

    // Check for "past N days/weeks/months"
    const pastMatch = query.match(/(?:past|last)\s+(\d+)\s+(day|week|month|year)s?/i);
    if (pastMatch) {
      const count = parseInt(pastMatch[1], 10);
      const unit = pastMatch[2].toLowerCase();
      const today = new Date();
      const start = new Date(today);

      if (unit === "day") {
        start.setDate(today.getDate() - count);
      } else if (unit === "week") {
        start.setDate(today.getDate() - count * 7);
      } else if (unit === "month") {
        start.setMonth(today.getMonth() - count);
      } else if (unit === "year") {
        start.setFullYear(today.getFullYear() - count);
      }

      return {
        from: startOfDay(start),
        to: endOfDay(today),
        description: `past ${count} ${unit}${count > 1 ? "s" : ""}`,
      };
    }

    // Check for month names (e.g., "in December", "December 2024")
    for (const [monthName, monthIndex] of Object.entries(MONTHS)) {
      const monthPattern = new RegExp(`(?:in\\s+)?${monthName}(?:\\s+(\\d{4}))?`, "i");
      const monthMatch = query.match(monthPattern);
      if (monthMatch) {
        const year = monthMatch[1] ? parseInt(monthMatch[1], 10) : new Date().getFullYear();
        const start = new Date(year, monthIndex, 1);
        const end = new Date(year, monthIndex + 1, 0);
        return {
          from: startOfDay(start),
          to: endOfDay(end),
          description: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
        };
      }
    }

    // Check for year only (e.g., "in 2024")
    const yearMatch = query.match(/(?:in\s+)?(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 2000 && year <= 2100) {
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31);
        return {
          from: startOfDay(start),
          to: endOfDay(end),
          description: `Year ${year}`,
        };
      }
    }

    return null;
  }

  /**
   * Extract amount range from natural language
   */
  private extractAmountRange(query: string): { minAmount?: number; maxAmount?: number } {
    const result: { minAmount?: number; maxAmount?: number } = {};

    // Check for size descriptors
    for (const [descriptor, range] of Object.entries(SIZE_DESCRIPTORS)) {
      if (query.includes(descriptor)) {
        if (range.min !== undefined) result.minAmount = range.min;
        if (range.max !== undefined) result.maxAmount = range.max;
        return result;
      }
    }

    // Check for amount patterns
    for (const { regex, type } of AMOUNT_PATTERNS) {
      const match = query.match(regex);
      if (match) {
        if (type === "min") {
          result.minAmount = parseAmount(match[1]);
        } else if (type === "max") {
          result.maxAmount = parseAmount(match[1]);
        } else if (type === "range") {
          result.minAmount = parseAmount(match[1]);
          result.maxAmount = parseAmount(match[2]);
        } else if (type === "around") {
          const value = parseAmount(match[1]);
          result.minAmount = value * 0.8;
          result.maxAmount = value * 1.2;
        } else if (type === "exact") {
          const value = parseAmount(match[1]);
          result.minAmount = value - 0.01;
          result.maxAmount = value + 0.01;
        }
        return result;
      }
    }

    return result;
  }

  /**
   * Extract transaction type (income/expense)
   */
  private extractTransactionType(query: string): "income" | "expense" | null {
    const hasExpenseKeyword = EXPENSE_KEYWORDS.some((kw) => query.includes(kw));
    const hasIncomeKeyword = INCOME_KEYWORDS.some((kw) => query.includes(kw));

    if (hasExpenseKeyword && !hasIncomeKeyword) return "expense";
    if (hasIncomeKeyword && !hasExpenseKeyword) return "income";
    return null;
  }

  /**
   * Extract potential payee and category names
   */
  private extractEntities(query: string): { payees: string[]; categories: string[] } {
    const payees: string[] = [];
    const categories: string[] = [];

    // Look for "at/from/to [Name]" patterns for payees
    for (const prep of PAYEE_PREPOSITIONS) {
      const pattern = new RegExp(`${prep}\\s+([a-z][a-z\\s'&-]+?)(?:\\s+(?:in|on|for|last|this|over|under|between|$))`, "gi");
      let match;
      while ((match = pattern.exec(query)) !== null) {
        const name = match[1].trim();
        if (name.length > 1 && !this.isCommonWord(name)) {
          payees.push(name);
        }
      }
    }

    // Look for "for/on [category]" patterns for categories
    for (const prep of CATEGORY_PREPOSITIONS) {
      const pattern = new RegExp(`${prep}\\s+([a-z][a-z\\s'&-]+?)(?:\\s+(?:at|from|to|in|last|this|over|under|between|$))`, "gi");
      let match;
      while ((match = pattern.exec(query)) !== null) {
        const name = match[1].trim();
        if (name.length > 1 && !this.isCommonWord(name)) {
          categories.push(name);
        }
      }
    }

    // Also check for capitalized words that might be proper nouns (payee names)
    const capitalizedPattern = /\b([A-Z][a-zA-Z'&-]+(?:\s+[A-Z][a-zA-Z'&-]+)*)\b/g;
    const originalQuery = query;
    let match;
    while ((match = capitalizedPattern.exec(originalQuery)) !== null) {
      const name = match[1].toLowerCase();
      if (name.length > 2 && !this.isCommonWord(name) && !payees.includes(name)) {
        payees.push(name);
      }
    }

    return { payees, categories };
  }

  /**
   * Check if a word is a common word that shouldn't be treated as an entity
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "up",
      "about",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "under",
      "all",
      "any",
      "both",
      "each",
      "few",
      "more",
      "most",
      "other",
      "some",
      "show",
      "me",
      "my",
      "what",
      "did",
      "i",
      "do",
      "how",
      "much",
      "many",
      "where",
      "when",
      "which",
      "who",
      "find",
      "get",
      "list",
      "search",
      "transactions",
      "transaction",
      "purchases",
      "purchase",
      "expenses",
      "expense",
      "income",
      "spent",
      "spend",
      "spending",
      "month",
      "week",
      "year",
      "day",
      "today",
      "yesterday",
      "last",
      "this",
      "past",
      "recent",
      "large",
      "small",
      "big",
      "over",
      "under",
      "dollars",
    ]);
    return commonWords.has(word.toLowerCase());
  }

  /**
   * Extract remaining search terms after removing recognized patterns
   */
  private extractSearchTerms(query: string): string[] {
    // Remove recognized patterns
    let cleaned = query;

    // Remove date patterns
    for (const pattern of Object.keys(DATE_PATTERNS)) {
      cleaned = cleaned.replace(new RegExp(pattern, "gi"), "");
    }
    cleaned = cleaned.replace(/(?:past|last)\s+\d+\s+(?:day|week|month|year)s?/gi, "");
    for (const monthName of Object.keys(MONTHS)) {
      cleaned = cleaned.replace(new RegExp(`(?:in\\s+)?${monthName}(?:\\s+\\d{4})?`, "gi"), "");
    }

    // Remove amount patterns
    for (const { regex } of AMOUNT_PATTERNS) {
      cleaned = cleaned.replace(regex, "");
    }

    // Remove common question words and verbs
    cleaned = cleaned.replace(
      /\b(show|me|my|what|did|i|do|how|much|many|where|when|which|who|find|get|list|search|the|a|an|all|any)\b/gi,
      ""
    );

    // Remove transaction type keywords
    cleaned = cleaned.replace(
      /\b(spent|spend|spending|expenses?|purchases?|bought|buy|paid|pay|payments?|costs?|earned?|income|received?|deposits?)\b/gi,
      ""
    );

    // Remove sort keywords
    cleaned = cleaned.replace(/\b(largest|biggest|highest|most|smallest|lowest|cheapest|recent|latest|newest|oldest|earliest|first|last|top)\b/gi, "");

    // Remove size descriptors
    cleaned = cleaned.replace(/\b(small|tiny|little|large|big|huge|major|significant|expensive)\b/gi, "");

    // Clean up and extract remaining meaningful words
    const words = cleaned
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9'-]/gi, "").trim())
      .filter((w) => w.length > 2 && !this.isCommonWord(w));

    return [...new Set(words)];
  }

  /**
   * Execute the search query
   */
  async search(query: string, workspaceId: number, options?: { limit?: number }): Promise<NLSearchResult> {
    const startTime = Date.now();
    const parsed = this.parseQuery(query);
    const limit = options?.limit ?? parsed.limit ?? 50;

    // Build conditions array - using SQL type for compatibility
    const conditions: SQL<unknown>[] = [];

    // Date range
    if (parsed.dateFrom) {
      conditions.push(gte(transactions.date, parsed.dateFrom));
    }
    if (parsed.dateTo) {
      conditions.push(lte(transactions.date, parsed.dateTo));
    }

    // Amount range (handle transaction type)
    // Note: amounts are stored in cents, so multiply user amounts by 100
    const minAmountCents = parsed.minAmount !== undefined ? Math.round(parsed.minAmount * 100) : undefined;
    const maxAmountCents = parsed.maxAmount !== undefined ? Math.round(parsed.maxAmount * 100) : undefined;

    if (parsed.transactionType === "expense") {
      conditions.push(lte(transactions.amount, 0));
      if (minAmountCents !== undefined) {
        // For expenses, amounts are negative, so minAmount of 50 means <= -5000 cents
        conditions.push(lte(transactions.amount, -minAmountCents));
      }
      if (maxAmountCents !== undefined) {
        conditions.push(gte(transactions.amount, -maxAmountCents));
      }
    } else if (parsed.transactionType === "income") {
      conditions.push(gte(transactions.amount, 0));
      if (minAmountCents !== undefined) {
        conditions.push(gte(transactions.amount, minAmountCents));
      }
      if (maxAmountCents !== undefined) {
        conditions.push(lte(transactions.amount, maxAmountCents));
      }
    } else {
      // For "all" or unspecified, use absolute value comparison
      if (minAmountCents !== undefined) {
        const orCondition = or(
          gte(transactions.amount, minAmountCents),
          lte(transactions.amount, -minAmountCents)
        );
        if (orCondition) conditions.push(orCondition);
      }
      if (maxAmountCents !== undefined) {
        const andCondition = and(
          lte(transactions.amount, maxAmountCents),
          gte(transactions.amount, -maxAmountCents)
        );
        if (andCondition) conditions.push(andCondition);
      }
    }

    // Exclude deleted and filter by workspace (through accounts)
    conditions.push(isNull(transactions.deletedAt));
    conditions.push(eq(accounts.workspaceId, workspaceId));

    // Get payee IDs if names specified
    let payeeIds: number[] = [];
    if (parsed.payeeNames && parsed.payeeNames.length > 0) {
      const payeeResults = await db
        .select({ id: payees.id })
        .from(payees)
        .where(
          and(
            eq(payees.workspaceId, workspaceId),
            or(
              ...parsed.payeeNames.map((name) =>
                sql`lower(${payees.name}) LIKE ${`%${name.toLowerCase()}%`}`
              )
            )
          )
        );
      payeeIds = payeeResults.map((p) => p.id);
      if (payeeIds.length > 0) {
        conditions.push(inArray(transactions.payeeId, payeeIds));
      }
    }

    // Get category IDs if names specified
    let categoryIds: number[] = [];
    if (parsed.categoryNames && parsed.categoryNames.length > 0) {
      const categoryResults = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.workspaceId, workspaceId),
            or(
              ...parsed.categoryNames.map((name) =>
                sql`lower(${categories.name}) LIKE ${`%${name.toLowerCase()}%`}`
              )
            )
          )
        );
      categoryIds = categoryResults.map((c) => c.id);
      if (categoryIds.length > 0) {
        conditions.push(inArray(transactions.categoryId, categoryIds));
      }
    }

    // Search terms in notes
    if (parsed.searchTerms && parsed.searchTerms.length > 0) {
      const noteConditions = parsed.searchTerms.map((term) =>
        sql`lower(${transactions.notes}) LIKE ${`%${term.toLowerCase()}%`}`
      );
      const orCondition = or(...noteConditions);
      if (orCondition) conditions.push(orCondition);
    }

    // Build the query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        notes: transactions.notes,
        payeeName: payees.name,
        categoryName: categories.name,
        accountName: accounts.name,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(payees, eq(transactions.payeeId, payees.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(whereClause)
      .orderBy(
        parsed.sortOrder === "asc"
          ? parsed.sortBy === "amount"
            ? transactions.amount
            : transactions.date
          : desc(parsed.sortBy === "amount" ? transactions.amount : transactions.date)
      )
      .limit(limit);

    const executionTimeMs = Date.now() - startTime;

    return {
      transactions: results.map((r) => ({
        id: r.id,
        date: r.date,
        amount: r.amount / 100, // Convert from cents
        notes: r.notes,
        payeeName: r.payeeName,
        categoryName: r.categoryName,
        accountName: r.accountName,
      })),
      query: parsed,
      totalCount: results.length,
      executionTimeMs,
    };
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(
    partialQuery: string,
    workspaceId: number
  ): Promise<{ suggestions: string[]; type: "payee" | "category" | "date" | "amount" }[]> {
    const suggestions: { suggestions: string[]; type: "payee" | "category" | "date" | "amount" }[] = [];
    const query = partialQuery.toLowerCase().trim();

    // If query ends with "at " or "from ", suggest payees
    if (/(?:at|from|to)\s*$/.test(query)) {
      const recentPayees = await db
        .select({ name: payees.name })
        .from(payees)
        .where(eq(payees.workspaceId, workspaceId))
        .limit(5);
      suggestions.push({
        suggestions: recentPayees.map((p) => p.name).filter((n): n is string => n !== null),
        type: "payee",
      });
    }

    // If query ends with "for " or "on ", suggest categories
    if (/(?:for|on)\s*$/.test(query)) {
      const cats = await db
        .select({ name: categories.name })
        .from(categories)
        .where(eq(categories.workspaceId, workspaceId))
        .limit(5);
      suggestions.push({
        suggestions: cats.map((c) => c.name).filter((n): n is string => n !== null),
        type: "category",
      });
    }

    // Suggest date patterns
    if (/\b(in|last|this|past)\s*$/.test(query)) {
      suggestions.push({
        suggestions: ["last month", "this month", "last week", "this year", "past 30 days"],
        type: "date",
      });
    }

    // Suggest amount patterns
    if (/\b(over|under|around|about|between)\s*$/.test(query)) {
      suggestions.push({
        suggestions: ["$50", "$100", "$500", "$1000"],
        type: "amount",
      });
    }

    return suggestions;
  }
}

// Factory function
export function createNaturalLanguageSearchService(): NaturalLanguageSearchService {
  return new NaturalLanguageSearchService();
}
