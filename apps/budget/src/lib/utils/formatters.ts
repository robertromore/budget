import type {TransactionsFormat} from "$lib/types";
import type {Transaction} from "$lib/schema";
import {parseDate, toCalendarDate} from "@internationalized/date";

// @todo change to user's preferred locale
export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const numberFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
});

// Helper function for formatting currency
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export const percentageFormatter = {
  format: (value: number): string => `${value.toFixed(1)}%`,
};

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
      return {
        ...transaction,
        date: toCalendarDate(parseDate(transaction.date)),
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
