import { CalendarDate, type DateValue } from "@internationalized/date";
export declare const timezone: string;
export declare const currentDate: CalendarDate;
export type SpecialDateValue = ["day" | "month" | "quarter" | "year" | "half-year", string];
export declare function getSpecialDateValue(date: string): SpecialDateValue;
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
export declare function getDayOfWeek(date: DateValue, timeZone?: string): number;
export declare function getOrdinalSuffix(day: number): string;
export declare function sameMonthAndYear(date1: DateValue, date2: DateValue): boolean;
export declare function sameMonthOrFuture(date1: DateValue, date2?: DateValue): boolean;
export declare function sameMonthOrPast(date1: DateValue, date2?: DateValue): boolean;
/**
 * Get the first day in the visible grid of a calendar month.
 *
 * @param date - A DateValue within the target month
 * @param locale - BCP47 locale string (e.g. "en-US")
 * @param firstDayOfWeek - Optional first day of week override ("sun", "mon", etc.)
 */
export declare function getFirstDayInCalendarMonth(date: DateValue, locale?: string, firstDayOfWeek?: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"): DateValue;
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
export declare function getFirstSpecifiedWeekdayInMonth(targetYear: number, targetMonth: number, weekday: number, timeZone?: string): DateValue;
export declare function getFirstWeekday(date: DateValue, timeZone?: string): DateValue;
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
export declare function getNextWeekday(fromDate: DateValue, targetWeekday: number): DateValue;
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
export declare function getNextWeekdayFlexible(fromDate: DateValue, targetWeekday: number, includeSameDay?: boolean): DateValue;
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
export declare function getNextWeekdayByLabel(fromDate: DateValue, weekdayLabel: string, includeSameDay?: boolean): DateValue;
/**
 * Helper function to get the nth weekday of a specific month
 * @param year - The year
 * @param month - The month (1-12)
 * @param week - Which week (1=first, 2=second, 3=third, 4=fourth, 5=last)
 * @param weekDay - Day of week (0=Sunday, 6=Saturday)
 * @returns DateValue or null if not found
 */
export declare function getNthWeekdayOfMonth(year: number, month: number, week: number, weekDay: number): DateValue | null;
/**
 * Helper function to get the last weekday of a specific month
 * @param year - The year
 * @param month - The month (1-12)
 * @param weekDay - Day of week (0=Sunday, 6=Saturday)
 * @returns DateValue or null if not found
 */
export declare function getLastWeekdayOfMonth(year: number, month: number, weekDay: number): DateValue | null;
/**
 * Parses a date value from various formats into a DateValue
 * @param dateValue - The date value to parse (string, Date, or DateValue)
 * @returns DateValue or null if parsing fails
 */
export declare function parseDateValue(dateValue: any): DateValue | null;
/**
 * Safely converts various date formats to DateValue, with fallback to current date
 * @param dateValue - The date value to parse (string, Date, or DateValue)
 * @returns DateValue (guaranteed to return a valid DateValue)
 */
export declare function ensureDateValue(dateValue: any): DateValue;
/**
 * Converts a DateValue to a JavaScript Date object for chart library compatibility
 * @param dateValue - The DateValue to convert
 * @param timeZone - The timezone to use (default: "UTC")
 * @returns JavaScript Date object
 */
export declare function dateValueToJSDate(dateValue: DateValue, timeZone?: string): Date;
//# sourceMappingURL=dates.d.ts.map