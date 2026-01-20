import { browser } from "$app/environment";
import type { Transaction } from "$lib/schema";
import { displayPreferences } from "$lib/stores/display-preferences.svelte";
import type { TransactionsFormat } from "$lib/types";
import { parseDate, toCalendarDate } from "@internationalized/date";

// Fallback formatters for SSR/server-side
const fallbackCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const fallbackNumberFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
});

// Legacy export for compatibility - prefer formatCurrency() function
export const currencyFormatter = fallbackCurrencyFormatter;
export const numberFormatter = fallbackNumberFormatter;

// Helper function for formatting currency - uses user preferences when in browser
export function formatCurrency(amount: number): string {
  if (browser) {
    return displayPreferences.formatCurrency(amount);
  }
  return fallbackCurrencyFormatter.format(amount);
}

// Helper function for formatting numbers - uses user preferences when in browser
export function formatNumber(value: number): string {
  if (browser) {
    return displayPreferences.formatNumber(value);
  }
  return fallbackNumberFormatter.format(value);
}

export const percentageFormatter = {
  format: (value: number): string => `${value.toFixed(1)}%`,
};

/**
 * Format a decimal value as a percentage
 * @param value - Decimal value (0.5 = 50%, 1.0 = 100%)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string (e.g., "50%", "75.5%")
 *
 * @example
 * formatPercent(0.75) // "75%"
 * formatPercent(0.756, 1) // "75.6%"
 * formatPercent(1.25) // "125%"
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a decimal value as a percentage with sign indicator
 * @param value - Decimal value (0.5 = 50%, -0.25 = -25%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage with sign (e.g., "+50%", "-25.5%")
 *
 * @example
 * formatPercentChange(0.15) // "+15.0%"
 * formatPercentChange(-0.08) // "-8.0%"
 * formatPercentChange(0) // "0.0%"
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

export const daysFormatter = {
  format: (value: number): string => `${Math.round(value)} days`,
};

// Amount utilities
export function toSignedAmount(amount: number, referenceAmount: number): number {
  const magnitude = Math.abs(amount);
  return referenceAmount < 0 ? -magnitude : magnitude;
}

// Budget utilities
export function formatBudgetName(budgetId: number, budgetName?: string): string {
  return budgetName ?? `Budget #${budgetId}`;
}

export const transactionFormatter = {
  format: (transactions?: Transaction[]) => {
    return transactions?.map((transaction: Transaction): TransactionsFormat => {
      const { scheduleName, scheduleSlug, scheduleFrequency, scheduleInterval, scheduleNextOccurrence, budgetAllocations, ...rest } = transaction;
      return {
        ...rest,
        date: toCalendarDate(parseDate(transaction.date)),
        ...(scheduleName !== undefined && { scheduleName }),
        ...(scheduleSlug !== undefined && { scheduleSlug }),
        ...(scheduleFrequency !== undefined && { scheduleFrequency }),
        ...(scheduleInterval !== undefined && { scheduleInterval }),
        ...(scheduleNextOccurrence !== undefined && { scheduleNextOccurrence }),
        ...(budgetAllocations !== undefined && { budgetAllocations }),
      };
    });
  },
};

// Period formatter for converting time periods to proper adverbs
export const periodFormatter = {
  toAdverb: (period: string): string => {
    const periodMap: Record<string, string> = {
      day: "Daily",
      week: "Weekly",
      month: "Monthly",
      year: "Yearly",
      hour: "Hourly",
    };

    return periodMap[period] || `${period.charAt(0).toUpperCase() + period.slice(1)}ly`;
  },
};

// Recurring pattern formatter for schedules
export const recurringFormatter = {
  format: (frequency: string, interval: number = 1): string => {
    if (interval === 1) {
      // For interval of 1, use the frequency name directly
      return frequency.charAt(0).toUpperCase() + frequency.slice(1); // "Daily", "Weekly", etc.
    } else {
      // For intervals > 1, use "Every X [units]"
      const units =
        frequency === "daily"
          ? "days"
          : frequency === "weekly"
            ? "weeks"
            : frequency === "monthly"
              ? "months"
              : frequency === "yearly"
                ? "years"
                : frequency;
      return `Every ${interval} ${units}`;
    }
  },
};

/**
 * Format file size for display
 * @param bytes File size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "256 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
  return formatCurrency(Math.abs(amount));
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

// Value formatter for displaying any type of value in UI (tooltips, errors, etc.)
export function formatDisplayValue(value: any): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    // Handle arrays
    if (Array.isArray(value)) {
      return value.length > 0 ? JSON.stringify(value, null, 2) : "[]";
    }

    // Handle dates
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle plain objects
    try {
      const stringified = JSON.stringify(value, null, 2);
      // Return empty string for empty objects
      return stringified === "{}" ? "" : stringified;
    } catch (error) {
      // Fallback for circular references or other JSON.stringify errors
      return "[Complex Object]";
    }
  }

  // Fallback for any other type
  return String(value);
}
