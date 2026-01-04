import {
  DateFormatter,
  getLocalTimeZone,
  parseDate,
  type DateValue,
} from "@internationalized/date";
import { getSpecialDateValue } from "./dates";

export const dayFmt = new DateFormatter("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
export const monthFmt = new DateFormatter("en-US", {
  month: "long",
});
export const monthYearFmt = new DateFormatter("en-US", {
  month: "short",
  year: "numeric",
});
export const monthYearLongFmt = new DateFormatter("en-US", {
  month: "long",
  year: "numeric",
});
export const monthYearShortFmt = new DateFormatter("en-US", {
  month: "2-digit",
  year: "2-digit",
});
export const dateFormatter = new DateFormatter("en-US", {
  dateStyle: "long",
});
export const rawDateFormatter = new DateFormatter("en-US", {
  dateStyle: "short",
});

// Short date format for charts: "Jan 15"
export const shortDateFmt = new DateFormatter("en-US", {
  month: "short",
  day: "numeric",
});

// Weekday + short date for charts: "Mon, Jan 15"
export const weekdayShortDateFmt = new DateFormatter("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

// Month year format with 2-digit year: "Jan '24"
export const monthYearTinyFmt = new DateFormatter("en-US", {
  month: "short",
  year: "2-digit",
});

export function getSpecialDateValueAsLabel(date: string): string {
  if (!date.includes(":")) {
    return dayFmt.format(parseDate(date).toDate(getLocalTimeZone()));
  }

  const [type, value] = getSpecialDateValue(date);
  switch (type) {
    case "quarter":
      return `Q${value}`;

    case "half-year":
      const date = parseDate(value);
      const half = date.month > 6 ? "2" : "1";
      return `H${half} ${date.year}`;

    case "year":
      return parseDate(value).year.toString();

    case "month":
    default:
      return monthYearFmt.format(parseDate(value).toDate(getLocalTimeZone()));
  }
}

// Define a map for the ordinal suffixes
const suffixMap = {
  one: "st",
  two: "nd",
  few: "rd",
  other: "th",
};

// Create an Intl.PluralRules instance for ordinal numbers in English
const pr = new Intl.PluralRules("en-US", { type: "ordinal" });

// Create an Intl.PluralRules instance for cardinal numbers (for pluralization)
export const pluralRules = new Intl.PluralRules("en-US", { type: "cardinal" });

/** Formats a `Date` as “{short month}. {day}, {year}” e.g. “Aug. 1st, 2023” */
export const formatDate = (d: Date): string => {
  // month abbreviation (e.g. "Aug")
  const monthAbbr = new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
  const monthWithDot = `${monthAbbr}.`;

  // day + ordinal suffix
  const day = d.getDate();
  // Select the appropriate plural rule for the day
  const ordinalRule = pr.select(day) as keyof typeof suffixMap;
  const dayWithSuffix = `${day}${suffixMap[ordinalRule] ?? "th"}`;

  // year
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(d);

  return `${monthWithDot} ${dayWithSuffix}, ${year}`;
};

export function formatDayOfMonth(date: DateValue): string {
  const day = date.day; // Get the day of the month (1-31)

  // Select the appropriate plural rule for the day
  const ordinalRule = pr.select(day) as keyof typeof suffixMap;

  // Combine the day with its corresponding suffix, defaulting to 'th' if not found
  return `${day}${suffixMap[ordinalRule] ?? "th"}`;
}

/**
 * Format a day number with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
 * @param day - Day of the month (1-31)
 * @returns Formatted day with ordinal suffix (e.g., "21st")
 */
export function formatDayOrdinal(day: number): string {
  const ordinalRule = pr.select(day) as keyof typeof suffixMap;
  return `${day}${suffixMap[ordinalRule] ?? "th"}`;
}

// ===== Date formatting functions for regular Date objects =====
// These are optimized for chart components that work with native Date objects

/**
 * Format a Date as short date: "Jan 15"
 * Commonly used in chart tooltips and axis labels
 */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Format a Date with weekday: "Mon, Jan 15"
 * Used in detailed tooltips
 */
export function formatWeekdayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a Date as month and year: "Jan 2024"
 * Used in chart axis labels and tooltips
 */
export function formatMonthYear(date: Date, options?: { long?: boolean; utc?: boolean }): string {
  const formatOptions: Intl.DateTimeFormatOptions = {
    month: options?.long ? "long" : "short",
    year: "numeric",
  };
  if (options?.utc) {
    formatOptions.timeZone = "UTC";
  }
  return date.toLocaleDateString("en-US", formatOptions);
}

/**
 * Format a Date as short month year: "Jan '24"
 * Used in compact chart displays
 */
export function formatMonthYearShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/**
 * Extract date string in YYYY-MM-DD format from a Date object
 * Commonly used for data point IDs and comparisons
 */
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Extract month string in YYYY-MM format from a Date object
 * Commonly used for monthly aggregation keys
 */
export function toMonthString(date: Date): string {
  return date.toISOString().slice(0, 7);
}
