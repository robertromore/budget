import { browser } from "$app/environment";
import type { Transaction } from "$core/schema";
import { displayPreferences } from "$lib/stores/display-preferences.svelte";
import type { TransactionsFormat } from "$lib/types";
import { parseDate, toCalendarDate } from "@internationalized/date";

// Re-export all pure formatting utilities from formatters-core
export {
  percentageFormatter,
  formatPercent,
  formatPercentChange,
  formatPercentRaw,
  daysFormatter,
  toSignedAmount,
  formatBudgetName,
  periodFormatter,
  recurringFormatter,
  formatFileSize,
  formatNumberFixed,
  formatCompact,
  formatDisplayValue,
} from "./formatters-core";

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

/**
 * Format a number as USD currency with absolute value
 * Useful for display contexts where sign is shown separately
 */
export function formatCurrencyAbs(amount: number): string {
  return formatCurrency(Math.abs(amount));
}

export const transactionFormatter = {
  format: (transactions?: Transaction[]) => {
    return transactions?.map((transaction: Transaction): TransactionsFormat => {
      const {
        scheduleName,
        scheduleSlug,
        scheduleFrequency,
        scheduleInterval,
        scheduleNextOccurrence,
        budgetAllocations,
        ...rest
      } = transaction;
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
