/**
 * Pure formatting utilities with no browser or Svelte dependencies.
 * Safe to use in server-side code, shared packages, and any runtime.
 */

export const percentageFormatter = {
  format: (value: number): string => `${value.toFixed(1)}%`,
};

/**
 * Format a decimal value as a percentage
 * @param value - Decimal value (0.5 = 50%, 1.0 = 100%)
 * @param decimals - Number of decimal places (default: 0)
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a decimal value as a percentage with sign indicator
 * @param value - Decimal value (0.5 = 50%, -0.25 = -25%)
 * @param decimals - Number of decimal places (default: 1)
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
 */
export function formatPercentRaw(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export const daysFormatter = {
  format: (value: number): string => `${Math.round(value)} days`,
};

export function toSignedAmount(amount: number, referenceAmount: number): number {
  const magnitude = Math.abs(amount);
  return referenceAmount < 0 ? -magnitude : magnitude;
}

export function formatBudgetName(budgetId: number, budgetName?: string): string {
  return budgetName ?? `Budget #${budgetId}`;
}

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

export const recurringFormatter = {
  format: (frequency: string, interval: number = 1): string => {
    if (interval === 1) {
      return frequency.charAt(0).toUpperCase() + frequency.slice(1);
    } else {
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
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format a number with specific decimal places
 */
export function formatNumberFixed(value: number, decimals: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number with appropriate suffix (K, M, B)
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
 * Format any value for display (tooltips, errors, etc.)
 */
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
    if (Array.isArray(value)) {
      return value.length > 0 ? JSON.stringify(value, null, 2) : "[]";
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    try {
      const stringified = JSON.stringify(value, null, 2);
      return stringified === "{}" ? "" : stringified;
    } catch (error) {
      return "[Complex Object]";
    }
  }

  return String(value);
}
