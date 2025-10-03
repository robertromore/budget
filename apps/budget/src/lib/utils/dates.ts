import {
  CalendarDate,
  type DateValue,
  getLocalTimeZone,
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
 * @param timeZone - The timezone to use (default: UTC)
 * @returns The day of week for the given DateValue
 *
 * @example
 * // Get the day of week for today in local timezone
 * const today = getLocalTimeZone();
 * const dayOfWeek = getDayOfWeek(today);
 */
export function getDayOfWeek(date: DateValue): number {
  // Use standard Date constructor which is more reliable than toDate()
  // month - 1 because Date constructor expects 0-indexed months
  const jsDate = new Date(date.year, date.month - 1, date.day);
  return jsDate.getDay(); // 0=Sunday … 6=Saturday
}

/**
 * Returns the ISO day of week for a DateValue.
 * 1 = Monday, 7 = Sunday (ISO 8601 format)
 *
 * @param date - The DateValue to get the ISO day of week for
 * @returns The ISO day of week (1-7)
 *
 * @example
 * const date = new CalendarDate(2024, 1, 15); // Monday
 * const isoDay = getIsoWeekday(date); // Returns 1
 */
export function getIsoWeekday(date: DateValue): number {
  const jsDate = date.toDate('UTC');
  const day = jsDate.getUTCDay();
  return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
}

/**
 * Returns the number of days in the month for a DateValue
 *
 * @param date - The DateValue to get days in month for
 * @returns Number of days in the month (28-31)
 *
 * @example
 * const jan = new CalendarDate(2024, 1, 15);
 * const days = getDaysInMonth(jan); // Returns 31
 *
 * const feb = new CalendarDate(2024, 2, 1);
 * const febDays = getDaysInMonth(feb); // Returns 29 (leap year)
 */
export function getDaysInMonth(date: DateValue): number {
  const nextMonth = date.add({ months: 1 }).set({ day: 1 });
  const lastDayOfMonth = nextMonth.subtract({ days: 1 });
  return lastDayOfMonth.day;
}

/* ------------------------------------------------------------------ */
/* Helper that returns the correct ordinal suffix for a day number   */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* Find first occurrence of a date's weekday                        */
/* ------------------------------------------------------------------ */

/**
 * Get the first day in the visible grid of a calendar month.
 *
 * @param date - A DateValue within the target month
 * @param locale - BCP47 locale string (e.g. "en-US")
 * @param firstDayOfWeek - Optional first day of week override ("sun", "mon", etc.)
 */
export function getFirstDayInCalendarMonth(
  date: DateValue,
  locale: string = "en-US",
  firstDayOfWeek: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat" = "sun"
): DateValue {
  // Go to the 1st of the month
  const firstOfMonth = new CalendarDate(date.year, date.month, 1);

  // Snap to the beginning of that week
  return startOfWeek(firstOfMonth, locale, firstDayOfWeek);
}

/**
 * Finds the first occurrence of a date's weekday in the same month.
 * For example, if given a date that falls on a Wednesday, this will return
 * the first Wednesday of that month.
 *
 * @param date - The DateValue to find the first weekday occurrence for
 * @param timeZone - The timezone to use (default: "UTC")
 * @returns The first occurrence of the date's weekday in the same month
 *
 * @example
 * // If given January 17th, 2024 (a Wednesday), returns January 3rd, 2024 (first Wednesday)
 * const someWednesday = new CalendarDate(2024, 1, 17);
 * const firstWednesday = getFirstWeekday(someWednesday);
 */
/**
 * Finds the first occurrence of a specific weekday in a given month/year.
 *
 * @param targetYear - The target year
 * @param targetMonth - The target month (1-12)
 * @param weekday - The weekday to find (0 = Sunday, 6 = Saturday)
 * @param timeZone - The timezone to use (default: "UTC")
 * @returns The first occurrence of the weekday in the specified month
 */
export function getFirstSpecifiedWeekdayInMonth(
  targetYear: number,
  targetMonth: number,
  weekday: number
): DateValue {
  // Create first day of target month
  const firstOfMonth = new CalendarDate(targetYear, targetMonth, 1);
  const firstDayWeekday = getDayOfWeek(firstOfMonth);

  // Calculate how many days to add to reach the target weekday
  let daysToAdd = weekday - firstDayWeekday;
  if (daysToAdd < 0) {
    daysToAdd += 7; // Move to next week if target weekday is earlier in the week
  }

  // Add the calculated days to the first of the month
  return firstOfMonth.add({days: daysToAdd});
}

export function getFirstWeekday(date: DateValue): DateValue {
  const targetWeekday = getDayOfWeek(date);

  // Get the first day of the same month
  const firstOfMonth = date.set({day: 1});
  const firstDayWeekday = getDayOfWeek(firstOfMonth);

  // Calculate how many days to add to reach the target weekday
  let daysToAdd = targetWeekday - firstDayWeekday;
  if (daysToAdd < 0) {
    daysToAdd += 7; // Move to next week if target weekday is earlier in the week
  }

  // Add the calculated days to the first of the month
  return firstOfMonth.add({days: daysToAdd});
}

/* ------------------------------------------------------------------ */
/* Find next occurrence of a specific weekday                         */
/* ------------------------------------------------------------------ */

/**
 * Finds the next occurrence of a specific weekday from a given date.
 * If the given date is already the target weekday, returns the next week's occurrence.
 *
 * @param fromDate - The starting date (DateValue)
 * @param targetWeekday - Target weekday (0 = Sunday, 1 = Monday, ..., 6 = Saturday) - ISO format
 * @returns The next DateValue that falls on the target weekday
 *
 * @example
 * // Find next Friday from today
 * const nextFriday = getNextWeekday(today(getLocalTimeZone()), 5);
 *
 * // Find next Monday from a specific date
 * const someDate = new DateValue(2024, 1, 15);
 * const nextMonday = getNextWeekday(someDate, 1);
 */
export function getNextWeekday(fromDate: DateValue, targetWeekday: number): DateValue {
  // Validate weekday input (0-6, where 0 = Sunday, 6 = Saturday)
  if (targetWeekday < 0 || targetWeekday > 6) {
    throw new Error("Target weekday must be between 0 (Sunday) and 6 (Saturday)");
  }

  // Convert CalendarDate to JavaScript Date to get current weekday
  const jsDate = fromDate.toDate(timezone);

  // Get current weekday (JavaScript: 0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentWeekday = jsDate.getDay();

  // Calculate days to add to reach target weekday
  // We always want the NEXT occurrence, so if it's already the target weekday,
  // we go to next week
  let daysToAdd = targetWeekday - currentWeekday;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Move to next week
  }

  // Add the calculated days to the original date
  return fromDate.add({days: daysToAdd});
}

/**
 * Finds the next occurrence of a specific weekday from a given date.
 * Optionally includes the same day if it matches the target weekday.
 *
 * @param fromDate - The starting date (CalendarDate)
 * @param targetWeekday - Target weekday (0 = Sunday, 1 = Monday, ..., 6 = Saturday) - ISO format
 * @param includeSameDay - If true, returns the same day if it matches target weekday (default: false)
 * @returns The next CalendarDate that falls on the target weekday
 *
 * @example
 * // Find next Friday from today (excluding today if it's Friday)
 * const nextFriday = getNextWeekdayFlexible(today(getLocalTimeZone()), 5);
 *
 * // Find next Friday from today (including today if it's Friday)
 * const nextFriday = getNextWeekdayFlexible(today(getLocalTimeZone()), 5, true);
 */
export function getNextWeekdayFlexible(
  fromDate: DateValue,
  targetWeekday: number,
  includeSameDay: boolean = false
): DateValue {
  // Validate weekday input (0-6, where 0 = Sunday, 6 = Saturday)
  if (targetWeekday < 0 || targetWeekday > 6) {
    throw new Error("Target weekday must be between 0 (Sunday) and 6 (Saturday)");
  }

  // Convert DateValue to JavaScript Date to get current weekday
  const jsDate = fromDate.toDate(timezone);

  // Get current weekday (JavaScript: 0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  // Convert to ISO format (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentWeekday = jsDate.getDay();

  // If it's already the target weekday and we want to include same day
  if (currentWeekday === targetWeekday && includeSameDay) {
    return fromDate;
  }

  // Calculate days to add to reach target weekday
  let daysToAdd = targetWeekday - currentWeekday;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Move to next week
  }

  // Add the calculated days to the original date
  return fromDate.add({days: daysToAdd});
}

/**
 * Finds the next occurrence of a specific weekday using weekday option labels.
 * This works with your existing weekdayOptions from utils/options.ts
 *
 * @param fromDate - The starting date (DateValue)
 * @param weekdayLabel - Weekday label ("Monday", "Tuesday", etc.) - case insensitive
 * @param includeSameDay - If true, returns the same day if it matches target weekday (default: false)
 * @returns The next DateValue that falls on the target weekday
 *
 * @example
 * // Find next Friday from today
 * const nextFriday = getNextWeekdayByLabel(today(getLocalTimeZone()), "Friday");
 *
 * // Find next Monday including today if it's Monday
 * const nextMonday = getNextWeekdayByLabel(someDate, "monday", true);
 */
export function getNextWeekdayByLabel(
  fromDate: DateValue,
  weekdayLabel: string,
  includeSameDay: boolean = false
): DateValue {
  // Map of weekday labels to ISO weekday numbers (1 = Monday, 7 = Sunday)
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
 * @param year - The year
 * @param month - The month (1-12)
 * @param week - Which week (1=first, 2=second, 3=third, 4=fourth, 5=last)
 * @param weekDay - Day of week (0=Sunday, 6=Saturday)
 * @returns DateValue or null if not found
 */
export function getNthWeekdayOfMonth(
  year: number,
  month: number,
  week: number,
  weekDay: number
): DateValue | null {
  try {
    if (week === 5) {
      // Special case: "last" weekday of the month
      return getLastWeekdayOfMonth(year, month, weekDay);
    }

    // Find the first day of the month
    const firstOfMonth = today(timezone).set({year, month, day: 1});
    const firstWeekDay = getDayOfWeek(firstOfMonth);

    // Calculate the first occurrence of the target weekday
    let daysToAdd = weekDay - firstWeekDay;
    if (daysToAdd < 0) {
      daysToAdd += 7;
    }

    // Add additional weeks to get to the nth occurrence
    daysToAdd += (week - 1) * 7;

    const targetDate = firstOfMonth.add({days: daysToAdd});

    // Verify the date is still in the same month
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
 * @param year - The year
 * @param month - The month (1-12)
 * @param weekDay - Day of week (0=Sunday, 6=Saturday)
 * @returns DateValue or null if not found
 */
export function getLastWeekdayOfMonth(
  year: number,
  month: number,
  weekDay: number
): DateValue | null {
  try {
    // Get the last day of the month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const firstOfNextMonth = today(timezone).set({year: nextYear, month: nextMonth, day: 1});
    const lastOfMonth = firstOfNextMonth.subtract({days: 1});

    // Work backwards from the last day to find the last occurrence of weekDay
    for (let i = 0; i < 7; i++) {
      const candidateDate = lastOfMonth.subtract({days: i});
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
 * @param dateValue - The date value to parse (string, Date, or DateValue)
 * @returns DateValue or null if parsing fails
 */
export function parseDateValue(dateValue: any): DateValue | null {
  if (!dateValue) return null;

  try {
    // If it's already a DateValue, return it
    if (
      dateValue &&
      typeof dateValue === "object" &&
      "year" in dateValue &&
      "month" in dateValue &&
      "day" in dateValue
    ) {
      return dateValue as DateValue;
    }

    // If it's a string, try to parse it
    if (typeof dateValue === "string") {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;
      return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }

    // If it's a Date object, convert it
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return null;
      return new CalendarDate(
        dateValue.getFullYear(),
        dateValue.getMonth() + 1,
        dateValue.getDate()
      );
    }

    // If it's a number (timestamp), convert it
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
 * @param dateValue - The date value to parse (string, Date, or DateValue)
 * @returns DateValue (guaranteed to return a valid DateValue)
 */
export function ensureDateValue(dateValue: any): DateValue {
  const parsed = parseDateValue(dateValue);
  return parsed || currentDate;
}

/**
 * Converts a DateValue to a JavaScript Date object for chart library compatibility
 * @param dateValue - The DateValue to convert
 * @param timeZone - The timezone to use (default: "UTC")
 * @returns JavaScript Date object
 */
export function dateValueToJSDate(dateValue: DateValue, timeZone: string = "UTC"): Date {
  return dateValue.toDate(timeZone);
}

/**
 * Calculate the difference between two dates in the specified unit
 * @param date1 - First date
 * @param date2 - Second date
 * @param unit - Unit to calculate difference in
 * @returns Number representing the difference (date1 - date2)
 */
export function dateDifference(
  date1: DateValue,
  date2: DateValue,
  unit: 'days' | 'months' | 'quarters' | 'years'
): number {
  switch (unit) {
    case 'days':
      return Math.floor((date1.toDate(timezone).getTime() - date2.toDate(timezone).getTime()) / (1000 * 60 * 60 * 24));

    case 'months':
      return (date1.year - date2.year) * 12 + (date1.month - date2.month);

    case 'quarters':
      const quarterDiff = Math.floor((date1.month - 1) / 3) - Math.floor((date2.month - 1) / 3);
      return (date1.year - date2.year) * 4 + quarterDiff;

    case 'years':
      return date1.year - date2.year;

    default:
      return 0;
  }
}

/**
 * Check if two dates are in the same period (day, month, quarter, year)
 * @param date1 - First date
 * @param date2 - Second date
 * @param unit - Period unit to compare
 * @returns True if dates are in the same period
 */
export function isSamePeriod(
  date1: DateValue,
  date2: DateValue,
  unit: 'day' | 'month' | 'quarter' | 'year'
): boolean {
  switch (unit) {
    case 'day':
      return date1.year === date2.year && date1.month === date2.month && date1.day === date2.day;

    case 'month':
      return date1.year === date2.year && date1.month === date2.month;

    case 'quarter':
      const quarter1 = Math.floor((date1.month - 1) / 3);
      const quarter2 = Math.floor((date2.month - 1) / 3);
      return date1.year === date2.year && quarter1 === quarter2;

    case 'year':
      return date1.year === date2.year;

    default:
      return false;
  }
}

/**
 * Parse an ISO date string to DateValue
 * @param isoString - ISO date string (e.g., "2024-01-15")
 * @returns DateValue or null if parsing fails
 */
export function parseISOString(isoString: string): DateValue | null {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;

    return new CalendarDate(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
  } catch (error) {
    return null;
  }
}

/**
 * Convert DateValue to ISO string format
 * @param dateValue - DateValue to convert
 * @returns ISO string (e.g., "2024-01-15")
 */
export function toISOString(dateValue: DateValue): string {
  const year = dateValue.year.toString().padStart(4, '0');
  const month = dateValue.month.toString().padStart(2, '0');
  const day = dateValue.day.toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format DateValue for display using consistent patterns
 * @param dateValue - DateValue to format
 * @param format - Format type ('short', 'medium', 'long')
 * @returns Formatted date string
 */
export function formatDateDisplay(dateValue: DateValue, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const jsDate = dateValue.toDate(timezone);

  switch (format) {
    case 'short':
      return new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      }).format(jsDate);

    case 'long':
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'long'
      }).format(jsDate);

    case 'medium':
    default:
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(jsDate);
  }
}

/**
 * Get current timestamp in ISO format for database operations
 * @returns ISO string with current date and time
 */
export function getCurrentTimestamp(): string {
  return toISOString(currentDate);
}
