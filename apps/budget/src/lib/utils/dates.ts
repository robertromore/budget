import { browser } from "$app/environment";
import { displayPreferences } from "$lib/stores/display-preferences.svelte";
import type { DateValue } from "@internationalized/date";

// Re-export all pure date utilities from dates-core
export {
  timezone,
  currentDate,
  type SpecialDateValue,
  getSpecialDateValue,
  getDayOfWeek,
  getIsoWeekday,
  getDaysInMonth,
  getOrdinalSuffix,
  sameMonthAndYear,
  sameMonthOrFuture,
  sameMonthOrPast,
  getFirstDayInCalendarMonth,
  getFirstSpecifiedWeekdayInMonth,
  getFirstWeekday,
  getNextWeekday,
  getNextWeekdayFlexible,
  getNextWeekdayByLabel,
  getNthWeekdayOfMonth,
  getLastWeekdayOfMonth,
  parseDateValue,
  ensureDateValue,
  dateValueToJSDate,
  dateDifference,
  isSamePeriod,
  parseISOString,
  toISOString,
  getCurrentTimestamp,
  nowISOString,
  formatTimeAgo,
} from "./dates-core";

import { timezone } from "./dates-core";

/**
 * Format DateValue for display using user preferences when in browser
 * @param dateValue - DateValue to format
 * @param format - Format type ('short', 'medium', 'long') - used for fallback/SSR
 * @returns Formatted date string
 */
export function formatDateDisplay(
  dateValue: DateValue,
  format: "short" | "medium" | "long" = "medium"
): string {
  const jsDate = dateValue.toDate(timezone);

  // Use user preferences when in browser
  if (browser) {
    return displayPreferences.formatDate(jsDate);
  }

  // Fallback for SSR/server-side
  switch (format) {
    case "short":
      return new Intl.DateTimeFormat("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }).format(jsDate);

    case "long":
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
      }).format(jsDate);

    case "medium":
    default:
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(jsDate);
  }
}
