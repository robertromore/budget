/**
 * Server-Side Formatting Utilities
 *
 * These formatters are safe to use in server-side code (tRPC routes, services, etc.)
 * They provide consistent formatting without browser-specific features.
 *
 * Note: For client-side code, prefer `$lib/utils/formatters` which respects user preferences.
 */

// =============================================================================
// Currency Formatting
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
 * Format a number as USD currency
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
// Number Formatting
// =============================================================================

const numberFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
});

/**
 * Format a number with thousands separators
 * @param value - The number to format
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234567) // "1,234,567"
 */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/**
 * Format a number with specific decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 *
 * @example
 * formatNumberFixed(1234.5678, 2) // "1,234.57"
 */
export function formatNumberFixed(value: number, decimals: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// =============================================================================
// Percentage Formatting
// =============================================================================

/**
 * Format a decimal value as a percentage
 * @param value - Decimal value (0.5 = 50%, 1.0 = 100%)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercent(0.75) // "75%"
 * formatPercent(0.756, 1) // "75.6%"
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a decimal value as a percentage with sign indicator
 * @param value - Decimal value (0.5 = +50%, -0.25 = -25%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage with sign
 *
 * @example
 * formatPercentChange(0.15) // "+15.0%"
 * formatPercentChange(-0.08) // "-8.0%"
 */
export function formatPercentChange(value: number, decimals = 1): string {
  const percent = (value * 100).toFixed(decimals);
  if (value > 0) return `+${percent}%`;
  return `${percent}%`;
}

/**
 * Format a raw percentage value (already multiplied by 100)
 * @param value - Percentage value (50 = 50%, 100 = 100%)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentRaw(75) // "75%"
 * formatPercentRaw(75.6, 1) // "75.6%"
 */
export function formatPercentRaw(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

// =============================================================================
// Date Formatting
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

// =============================================================================
// Utility Formatters
// =============================================================================

/**
 * Format a number with appropriate suffix (K, M, B)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with suffix
 *
 * @example
 * formatCompact(1234) // "1.2K"
 * formatCompact(1500000) // "1.5M"
 */
export function formatCompact(value: number, decimals = 1): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(decimals)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(decimals)}K`;
  }
  return `${sign}${absValue.toFixed(decimals)}`;
}

/**
 * Format file size in bytes to human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "256 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
