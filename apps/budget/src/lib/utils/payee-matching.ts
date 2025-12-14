/**
 * Utilities for matching and comparing payee names.
 * Handles variations like different amounts in the name.
 */

/**
 * Normalize a payee name by removing amounts and common variations.
 * This allows matching payees like "Amazon - $25.99" with "Amazon - $12.50"
 *
 * @example
 * normalizePayeeForMatching("Amazon - $25.99") // "amazon"
 * normalizePayeeForMatching("PayPal *MERCHANT $50.00") // "paypal *merchant"
 * normalizePayeeForMatching("CHECKCARD 1234 STORE NAME") // "checkcard store name"
 */
export function normalizePayeeForMatching(payeeName: string): string {
  return (
    payeeName
      .toLowerCase()
      .trim()
      // Remove currency amounts with various formats: $25.99, $1,234.56, 25.99, etc.
      .replace(/\$\s*\d{1,3}(,\d{3})*(\.\d{2})?/g, "")
      // Remove standalone decimal numbers (like 25.99 without $)
      .replace(/\b\d+\.\d{2}\b/g, "")
      // Remove dates in various formats (MM/DD/YYYY, MM-DD-YY, etc.)
      .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, "")
      // Remove reference/confirmation numbers (sequences of 4+ digits)
      .replace(/\b\d{4,}\b/g, "")
      // Remove common transaction prefixes with numbers
      .replace(/\b(pos|ach|chk|checkcard|debit)\s*#?\d*/gi, "")
      // Clean up extra whitespace
      .replace(/\s+/g, " ")
      // Remove trailing/leading dashes and separators left behind
      .replace(/\s*[-–—*#]+\s*$/g, "")
      .replace(/^\s*[-–—*#]+\s*/g, "")
      .trim()
  );
}

/**
 * Check if two payee names are similar (ignoring amounts, dates, and reference numbers)
 *
 * @example
 * arePayeesSimilar("Amazon - $25.99", "Amazon - $12.50") // true
 * arePayeesSimilar("PAYPAL *STORE $50", "PAYPAL *STORE $100") // true
 * arePayeesSimilar("Target", "Walmart") // false
 */
export function arePayeesSimilar(payee1: string, payee2: string): boolean {
  const normalized1 = normalizePayeeForMatching(payee1);
  const normalized2 = normalizePayeeForMatching(payee2);

  // Both must normalize to something meaningful
  if (normalized1.length < 2 || normalized2.length < 2) {
    return false;
  }

  return normalized1 === normalized2;
}

/**
 * Find all transactions with similar payee names in a list.
 * Returns transactions that would match after normalization.
 *
 * @param transactions - Array of items with payee names
 * @param targetPayee - The payee name to match against
 * @param getPayee - Function to extract payee name from each item
 * @param excludeIndex - Optional index to exclude from results (e.g., the source row)
 */
export function findSimilarPayeeTransactions<T>(
  transactions: T[],
  targetPayee: string,
  getPayee: (item: T) => string | null | undefined,
  excludeIndex?: number
): { item: T; index: number }[] {
  const targetNormalized = normalizePayeeForMatching(targetPayee);

  if (targetNormalized.length < 2) {
    return [];
  }

  return transactions
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => {
      if (excludeIndex !== undefined && index === excludeIndex) {
        return false;
      }

      const payee = getPayee(item);
      if (!payee || typeof payee !== "string") {
        return false;
      }

      return arePayeesSimilar(payee, targetPayee);
    });
}
