import type { DateValue } from "@internationalized/date";
import { CalendarDate } from "@internationalized/date";

/**
 * US Federal Holidays utility
 *
 * Provides functions to detect and get information about US federal holidays.
 * Uses algorithmic calculation rather than a static list for any year.
 */

/**
 * US Federal Holiday definitions with calculation logic
 */
const US_FEDERAL_HOLIDAYS = {
  "New Year's Day": (year: number) => new CalendarDate(year, 1, 1),
  "Martin Luther King Jr. Day": (year: number) => getNthWeekdayOfMonth(year, 1, 1, 3), // 3rd Monday in January
  "Presidents' Day": (year: number) => getNthWeekdayOfMonth(year, 2, 1, 3), // 3rd Monday in February
  "Memorial Day": (year: number) => getLastWeekdayOfMonth(year, 5, 1), // Last Monday in May
  "Independence Day": (year: number) => new CalendarDate(year, 7, 4),
  "Labor Day": (year: number) => getNthWeekdayOfMonth(year, 9, 1, 1), // 1st Monday in September
  "Columbus Day": (year: number) => getNthWeekdayOfMonth(year, 10, 1, 2), // 2nd Monday in October
  "Veterans Day": (year: number) => new CalendarDate(year, 11, 11),
  "Thanksgiving Day": (year: number) => getNthWeekdayOfMonth(year, 11, 4, 4), // 4th Thursday in November
  "Christmas Day": (year: number) => new CalendarDate(year, 12, 25),
} as const;

/**
 * Get the nth weekday of a month
 * @param year - Year
 * @param month - Month (1-12)
 * @param weekday - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @param n - Which occurrence (1=first, 2=second, etc.)
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number
): CalendarDate {
  // Start with the first day of the month
  let date = new CalendarDate(year, month, 1);

  // Find the first occurrence of the target weekday
  let currentWeekday = date.toDate('UTC').getDay();
  let daysToAdd = (weekday - currentWeekday + 7) % 7;
  date = date.add({ days: daysToAdd });

  // Add weeks to get to the nth occurrence
  date = date.add({ weeks: n - 1 });

  return date;
}

/**
 * Get the last occurrence of a weekday in a month
 * @param year - Year
 * @param month - Month (1-12)
 * @param weekday - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
function getLastWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number
): CalendarDate {
  // Start with the last day of the month
  let date = new CalendarDate(year, month, 1).add({ months: 1 }).subtract({ days: 1 });

  // Walk backwards until we find the target weekday
  let currentWeekday = date.toDate('UTC').getDay();
  let daysToSubtract = (currentWeekday - weekday + 7) % 7;
  date = date.subtract({ days: daysToSubtract });

  return date;
}

/**
 * Get all US federal holidays for a given year
 */
export function getHolidaysForYear(year: number): Map<string, CalendarDate> {
  const holidays = new Map<string, CalendarDate>();

  for (const [name, calculator] of Object.entries(US_FEDERAL_HOLIDAYS)) {
    holidays.set(name, calculator(year));
  }

  return holidays;
}

/**
 * Check if a date is a US federal holiday
 */
export function isHoliday(date: DateValue): boolean {
  const holidays = getHolidaysForYear(date.year);

  for (const holiday of holidays.values()) {
    if (holiday.year === date.year &&
        holiday.month === date.month &&
        holiday.day === date.day) {
      return true;
    }
  }

  return false;
}

/**
 * Get the name of the holiday for a given date, or null if not a holiday
 */
export function getHolidayName(date: DateValue): string | null {
  const holidays = getHolidaysForYear(date.year);

  for (const [name, holiday] of holidays.entries()) {
    if (holiday.year === date.year &&
        holiday.month === date.month &&
        holiday.day === date.day) {
      return name;
    }
  }

  return null;
}

/**
 * Get all holidays between two dates
 */
export function getHolidaysInRange(start: DateValue, end: DateValue): Array<{name: string, date: CalendarDate}> {
  const holidays: Array<{name: string, date: CalendarDate}> = [];

  // Get holidays for all years in the range
  const startYear = start.year;
  const endYear = end.year;

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidaysForYear(year);

    for (const [name, date] of yearHolidays.entries()) {
      // Check if holiday falls within the range
      if (date.compare(start) >= 0 && date.compare(end) <= 0) {
        holidays.push({ name, date });
      }
    }
  }

  // Sort by date
  holidays.sort((a, b) => a.date.compare(b.date));

  return holidays;
}
