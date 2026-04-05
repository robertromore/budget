import {
  CalendarDate,
  type DateValue,
  getLocalTimeZone,
  parseDate,
  startOfWeek,
  today,
} from "@internationalized/date";

export const timezone = getLocalTimeZone();
export const currentDate = today(timezone);

export type SpecialDateValue = ["day" | "month" | "quarter" | "year" | "half-year", string];
export function getSpecialDateValue(date: string): SpecialDateValue {
  return date.split(":") as SpecialDateValue;
}

/**
 * Returns the day of week for a DateValue.
 * 0 = Sunday, 6 = Saturday
 *
 * @param date - The DateValue to get the day of week for
 * @returns The day of week for the given DateValue
 */
export function getDayOfWeek(date: DateValue): number {
  const jsDate = new Date(date.year, date.month - 1, date.day);
  return jsDate.getDay();
}

/**
 * Returns the ISO day of week for a DateValue.
 * 1 = Monday, 7 = Sunday (ISO 8601 format)
 */
export function getIsoWeekday(date: DateValue): number {
  const jsDate = date.toDate("UTC");
  const day = jsDate.getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Returns the number of days in the month for a DateValue
 */
export function getDaysInMonth(date: DateValue): number {
  const nextMonth = date.add({ months: 1 }).set({ day: 1 });
  const lastDayOfMonth = nextMonth.subtract({ days: 1 });
  return lastDayOfMonth.day;
}

export function getOrdinalSuffix(day: number): string {
  const j = day % 10,
    k = day % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

export function sameMonthAndYear(date1: DateValue, date2: DateValue): boolean {
  return date1.month === date2.month && date1.year === date2.year;
}

export function sameMonthOrFuture(date1: DateValue, date2: DateValue = currentDate): boolean {
  return (date1.month === date2.month && date1.year === date2.year) || date1 > date2;
}

export function sameMonthOrPast(date1: DateValue, date2: DateValue = currentDate): boolean {
  return (date1.month === date2.month && date1.year === date2.year) || date1 < date2;
}

/**
 * Get the first day in the visible grid of a calendar month.
 */
export function getFirstDayInCalendarMonth(
  date: DateValue,
  locale: string = "en-US",
  firstDayOfWeek: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat" = "sun"
): DateValue {
  const firstOfMonth = new CalendarDate(date.year, date.month, 1);
  return startOfWeek(firstOfMonth, locale, firstDayOfWeek);
}

/**
 * Finds the first occurrence of a specific weekday in a given month/year.
 */
export function getFirstSpecifiedWeekdayInMonth(
  targetYear: number,
  targetMonth: number,
  weekday: number
): DateValue {
  const firstOfMonth = new CalendarDate(targetYear, targetMonth, 1);
  const firstDayWeekday = getDayOfWeek(firstOfMonth);

  let daysToAdd = weekday - firstDayWeekday;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }

  return firstOfMonth.add({ days: daysToAdd });
}

export function getFirstWeekday(date: DateValue): DateValue {
  const targetWeekday = getDayOfWeek(date);
  const firstOfMonth = date.set({ day: 1 });
  const firstDayWeekday = getDayOfWeek(firstOfMonth);

  let daysToAdd = targetWeekday - firstDayWeekday;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }

  return firstOfMonth.add({ days: daysToAdd });
}

/**
 * Finds the next occurrence of a specific weekday from a given date.
 * If the given date is already the target weekday, returns the next week's occurrence.
 */
export function getNextWeekday(fromDate: DateValue, targetWeekday: number): DateValue {
  if (targetWeekday < 0 || targetWeekday > 6) {
    throw new Error("Target weekday must be between 0 (Sunday) and 6 (Saturday)");
  }

  const jsDate = fromDate.toDate(timezone);
  const currentWeekday = jsDate.getDay();

  let daysToAdd = targetWeekday - currentWeekday;
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }

  return fromDate.add({ days: daysToAdd });
}

/**
 * Finds the next occurrence of a specific weekday from a given date.
 * Optionally includes the same day if it matches the target weekday.
 */
export function getNextWeekdayFlexible(
  fromDate: DateValue,
  targetWeekday: number,
  includeSameDay: boolean = false
): DateValue {
  if (targetWeekday < 0 || targetWeekday > 6) {
    throw new Error("Target weekday must be between 0 (Sunday) and 6 (Saturday)");
  }

  const jsDate = fromDate.toDate(timezone);
  const currentWeekday = jsDate.getDay();

  if (currentWeekday === targetWeekday && includeSameDay) {
    return fromDate;
  }

  let daysToAdd = targetWeekday - currentWeekday;
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }

  return fromDate.add({ days: daysToAdd });
}

/**
 * Finds the next occurrence of a specific weekday using weekday option labels.
 */
export function getNextWeekdayByLabel(
  fromDate: DateValue,
  weekdayLabel: string,
  includeSameDay: boolean = false
): DateValue {
  const weekdayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const normalizedLabel = weekdayLabel.toLowerCase();
  const targetWeekday = weekdayMap[normalizedLabel];

  if (targetWeekday === undefined) {
    throw new Error(
      `Invalid weekday label: "${weekdayLabel}". Valid options: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday`
    );
  }

  return getNextWeekdayFlexible(fromDate, targetWeekday, includeSameDay);
}

/**
 * Helper function to get the nth weekday of a specific month
 * @param week - Which week (1=first, 2=second, 3=third, 4=fourth, 5=last)
 * @param weekDay - Day of week (0=Sunday, 6=Saturday)
 */
export function getNthWeekdayOfMonth(
  year: number,
  month: number,
  week: number,
  weekDay: number
): DateValue | null {
  try {
    if (week === 5) {
      return getLastWeekdayOfMonth(year, month, weekDay);
    }

    const firstOfMonth = today(timezone).set({ year, month, day: 1 });
    const firstWeekDay = getDayOfWeek(firstOfMonth);

    let daysToAdd = weekDay - firstWeekDay;
    if (daysToAdd < 0) {
      daysToAdd += 7;
    }

    daysToAdd += (week - 1) * 7;

    const targetDate = firstOfMonth.add({ days: daysToAdd });

    if (targetDate.month === month) {
      return targetDate;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Helper function to get the last weekday of a specific month
 */
export function getLastWeekdayOfMonth(
  year: number,
  month: number,
  weekDay: number
): DateValue | null {
  try {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const firstOfNextMonth = today(timezone).set({ year: nextYear, month: nextMonth, day: 1 });
    const lastOfMonth = firstOfNextMonth.subtract({ days: 1 });

    for (let i = 0; i < 7; i++) {
      const candidateDate = lastOfMonth.subtract({ days: i });
      if (getDayOfWeek(candidateDate) === weekDay) {
        return candidateDate;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Parses a date value from various formats into a DateValue
 */
export function parseDateValue(dateValue: any): DateValue | null {
  if (!dateValue) return null;

  try {
    if (
      dateValue &&
      typeof dateValue === "object" &&
      "year" in dateValue &&
      "month" in dateValue &&
      "day" in dateValue
    ) {
      return dateValue as DateValue;
    }

    if (typeof dateValue === "string") {
      try {
        return parseDate(dateValue);
      } catch {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return null;
        return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
      }
    }

    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return null;
      return new CalendarDate(
        dateValue.getFullYear(),
        dateValue.getMonth() + 1,
        dateValue.getDate()
      );
    }

    if (typeof dateValue === "number" && !isNaN(dateValue)) {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;
      return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Safely converts various date formats to DateValue, with fallback to current date
 */
export function ensureDateValue(dateValue: any): DateValue {
  const parsed = parseDateValue(dateValue);
  return parsed || currentDate;
}

/**
 * Converts a DateValue to a JavaScript Date object for chart library compatibility
 */
export function dateValueToJSDate(dateValue: DateValue, timeZone: string = "UTC"): Date {
  return dateValue.toDate(timeZone);
}

/**
 * Calculate the difference between two dates in the specified unit
 */
export function dateDifference(
  date1: DateValue,
  date2: DateValue,
  unit: "days" | "months" | "quarters" | "years"
): number {
  switch (unit) {
    case "days":
      return Math.floor(
        (date1.toDate(timezone).getTime() - date2.toDate(timezone).getTime()) /
          (1000 * 60 * 60 * 24)
      );

    case "months":
      return (date1.year - date2.year) * 12 + (date1.month - date2.month);

    case "quarters": {
      const quarterDiff = Math.floor((date1.month - 1) / 3) - Math.floor((date2.month - 1) / 3);
      return (date1.year - date2.year) * 4 + quarterDiff;
    }

    case "years":
      return date1.year - date2.year;

    default:
      return 0;
  }
}

/**
 * Check if two dates are in the same period (day, month, quarter, year)
 */
export function isSamePeriod(
  date1: DateValue,
  date2: DateValue,
  unit: "day" | "month" | "quarter" | "year"
): boolean {
  switch (unit) {
    case "day":
      return date1.year === date2.year && date1.month === date2.month && date1.day === date2.day;

    case "month":
      return date1.year === date2.year && date1.month === date2.month;

    case "quarter": {
      const quarter1 = Math.floor((date1.month - 1) / 3);
      const quarter2 = Math.floor((date2.month - 1) / 3);
      return date1.year === date2.year && quarter1 === quarter2;
    }

    case "year":
      return date1.year === date2.year;

    default:
      return false;
  }
}

/**
 * Parse an ISO date string to DateValue
 */
export function parseISOString(isoString: string): DateValue | null {
  try {
    return parseDate(isoString);
  } catch (error) {
    return null;
  }
}

/**
 * Convert DateValue to ISO string format
 */
export function toISOString(dateValue: DateValue): string {
  const year = dateValue.year.toString().padStart(4, "0");
  const month = dateValue.month.toString().padStart(2, "0");
  const day = dateValue.day.toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get current timestamp in ISO format for database operations
 * @returns ISO string with current date only (YYYY-MM-DD)
 */
export function getCurrentTimestamp(): string {
  return toISOString(currentDate);
}

/**
 * Get current date-time as full ISO 8601 string.
 * @returns Full ISO string with date and time (e.g., "2024-01-15T10:30:00.000Z")
 */
export function nowISOString(): string {
  return new Date().toISOString();
}

/**
 * Format a date as a human-readable relative time string (e.g., "5 minutes ago")
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else {
    return date.toLocaleDateString();
  }
}
