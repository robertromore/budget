/**
 * Server-Side Formatting Utilities
 *
 * These formatters are safe to use in server-side code (tRPC routes, services, etc.)
 * They provide consistent formatting without browser-specific features.
 *
 * Note: For client-side code, prefer `$lib/utils/formatters` which respects user preferences.
 */

// Re-export shared pure functions from main formatters
export {
  formatPercent,
  formatPercentChange,
  formatPercentRaw,
  formatCompact,
  formatFileSize,
  formatNumberFixed,
  formatDisplayValue,
} from "$lib/utils/formatters";

// =============================================================================
// Currency Formatting (Server-specific with decimals option)
// =============================================================================

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyFormatterNoDecimals = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format a number as USD currency (server-side, no user preferences)
 * @param amount - The amount to format
 * @param decimals - Whether to include decimal places (default: true)
 * @returns Formatted currency string (e.g., "$1,234.56" or "-$50.00")
 *
 * @example
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(-50) // "-$50.00"
 * formatCurrency(1000, false) // "$1,000"
 */
export function formatCurrency(amount: number, decimals = true): string {
  const formatter = decimals ? currencyFormatter : currencyFormatterNoDecimals;
  return formatter.format(amount);
}

/**
 * Format a number as USD currency with absolute value
 * Useful for display contexts where sign is shown separately
 * @param amount - The amount to format
 * @returns Formatted currency string without negative sign
 *
 * @example
 * formatCurrencyAbs(-1234.56) // "$1,234.56"
 */
export function formatCurrencyAbs(amount: number): string {
  return currencyFormatter.format(Math.abs(amount));
}

// =============================================================================
// Number Formatting (Server-specific)
// =============================================================================

const numberFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
});

/**
 * Format a number with thousands separators (server-side)
 * @param value - The number to format
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234567) // "1,234,567"
 */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

// =============================================================================
// Date Formatting (Server-specific)
// =============================================================================

/**
 * Format a date as a short date string
 * @param date - Date object or ISO string
 * @returns Formatted date (e.g., "Jan 15")
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Format a date as month and year
 * @param date - Date object or ISO string
 * @param longMonth - Use full month name (default: true)
 * @returns Formatted date (e.g., "January 2024" or "Jan 2024")
 */
export function formatMonthYear(date: Date | string, longMonth = true): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: longMonth ? "long" : "short",
    year: "numeric",
  });
}

/**
 * Format a date as a full date string
 * @param date - Date object or ISO string
 * @returns Formatted date (e.g., "January 15, 2024")
 */
export function formatFullDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date as ISO date string (YYYY-MM-DD)
 * @param date - Date object
 * @returns ISO date string
 */
export function formatISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}
