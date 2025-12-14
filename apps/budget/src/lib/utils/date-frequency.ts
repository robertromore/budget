// $lib/utils/frequency.ts
import { DATABASE_LIMITS } from "$lib/constants/api";
import { CalendarDate, type DateValue, startOfWeek } from "@internationalized/date";
import { getDayOfWeek, getNextWeekdayFlexible, getNthWeekdayOfMonth } from "./dates";

/**
 * Configuration options for date generation functions
 */
interface DateGenerationOptions {
  start: DateValue;
  end?: DateValue | null;
  interval: number;
  limit?: number;
}

/**
 * Result of date generation with metadata
 */
interface DateGenerationResult {
  dates: DateValue[];
  truncated: boolean;
  totalGenerated: number;
}

/**
 * Safety limit for database operations (pagination, bulk operations)
 * This limit should stay low to prevent performance issues
 */
const DATABASE_SAFETY_LIMIT = DATABASE_LIMITS.MAX_SAFETY_LIMIT;

/**
 * Higher safety limit for calendar date generation
 * This allows generating dates for extended calendar navigation
 * while still preventing infinite loops
 */
const DATE_GENERATION_SAFETY_LIMIT = 10000;

/**
 * Generate dates with either end date or limit constraint
 */
function generateDatesWithConstraints(
  generator: () => DateValue | null,
  options: DateGenerationOptions
): DateGenerationResult {
  const { start, end, limit } = options;
  const dates: DateValue[] = [];
  let totalGenerated = 0;
  let truncated = false;

  // Determine the effective limit:
  // - If limit is provided and reasonable, use it (capped at safety limit)
  // - If no limit provided, use database safety limit as fallback
  const providedLimit = limit ?? DATABASE_SAFETY_LIMIT;
  const effectiveLimit = Math.min(providedLimit, DATE_GENERATION_SAFETY_LIMIT);

  while (totalGenerated < effectiveLimit) {
    const nextDate = generator();

    if (!nextDate) break;

    // Check if we've exceeded the end date
    if (end && nextDate > end) break;

    // Only include dates on or after the start date
    if (nextDate.compare(start) >= 0) {
      dates.push(nextDate);

      // If we have an end date, don't apply limit
      if (!end && dates.length >= effectiveLimit) {
        truncated = true;
        break;
      }
    }

    totalGenerated++;

    // Safety check to prevent infinite loops when all dates are before start
    if (totalGenerated > DATE_GENERATION_SAFETY_LIMIT * 2) {
      break;
    }
  }

  return { dates, truncated, totalGenerated };
}

/**
 * ----------  DAILY ----------
 */
export function nextDaily(
  start: DateValue,
  end: DateValue | null,
  interval: number,
  limit: number
): DateValue[] {
  if (interval <= 0) return [];

  let cursor = start;
  const options: DateGenerationOptions = { start, end, interval, limit };

  const generator = () => {
    const current = cursor;
    cursor = cursor.add({ days: interval });
    return current;
  };

  return generateDatesWithConstraints(generator, options).dates;
}

/**
 * ----------  WEEKLY ----------
 */
export function nextWeekly(
  start: DateValue,
  end: DateValue | null,
  interval: number,
  weekDays: number[],
  limit: number
): DateValue[] {
  if (interval <= 0) return [];

  const normalizedWeekDays = weekDays.length > 0 ? weekDays : [getDayOfWeek(start)];
  let weekCursor = start;
  let dayIndex = 0;
  let isFirstWeek = true;

  const options: DateGenerationOptions = { start, end, interval, limit };

  const generator = () => {
    // If we've processed all days for this week, move to next interval
    if (dayIndex >= normalizedWeekDays.length) {
      // Only advance by interval weeks after the first week
      if (!isFirstWeek) {
        weekCursor = weekCursor.add({ weeks: interval });
      } else {
        isFirstWeek = false;
      }
      dayIndex = 0;
    }

    if (dayIndex < normalizedWeekDays.length) {
      const targetWeekday = normalizedWeekDays[dayIndex];

      // For the first week, find dates that could be before the start date
      // but are still in the expanded calendar view
      let nextDate;
      if (isFirstWeek || dayIndex === 0) {
        // Find the next occurrence of this weekday from the current week cursor
        nextDate = getNextWeekdayFlexible(weekCursor, targetWeekday, true);

        // If this is the first week and we haven't found our start point yet,
        // we might need to go back to catch earlier dates in the week
        if (isFirstWeek && nextDate.compare(start) > 0) {
          const weekStart = startOfWeek(weekCursor, "en-us", "sun");
          const candidateDate = getNextWeekdayFlexible(weekStart, targetWeekday, true);
          if (candidateDate.compare(nextDate) <= 0) {
            nextDate = candidateDate;
          }
        }
      } else {
        nextDate = getNextWeekdayFlexible(weekCursor, targetWeekday, true);
      }

      dayIndex++;
      return nextDate;
    }

    return null;
  };

  return generateDatesWithConstraints(generator, options).dates;
}

/**
 * ----------  MONTHLY ----------
 * * if `days` is set – use that day of the month
 * * otherwise, use the "on the nth weekday" pattern
 */
export function nextMonthly(
  start: DateValue,
  end: DateValue | null,
  interval: number,
  days: number[] | number | null,
  weeks: number[],
  weekDays: number[],
  limit: number
): DateValue[] {
  if (interval <= 0) return [];

  let cursor = start;
  let weekIndex = 0;
  let dayIndex = 0;
  let monthDayIndex = 0;

  const options: DateGenerationOptions = { start, end, interval, limit };

  // Normalize days to array format
  const normalizedDays = days === null ? null : Array.isArray(days) ? days : [days];

  const generator = () => {
    // Fixed day(s) of month
    if (normalizedDays && normalizedDays.length > 0) {
      // Handle multiple days per month
      if (monthDayIndex >= normalizedDays.length) {
        cursor = cursor.add({ months: interval });
        monthDayIndex = 0;
      }

      if (monthDayIndex < normalizedDays.length) {
        const targetDay = normalizedDays[monthDayIndex];
        monthDayIndex++;

        try {
          return cursor.set({ day: Math.min(targetDay, getDaysInMonth(cursor)) });
        } catch {
          return null;
        }
      }
    }

    // Nth weekday of month
    if (weeks.length > 0 && weekDays.length > 0) {
      if (weekIndex >= weeks.length) {
        cursor = cursor.add({ months: interval });
        weekIndex = 0;
        dayIndex = 0;
      }

      if (dayIndex >= weekDays.length) {
        weekIndex++;
        dayIndex = 0;
        return generator(); // Recursive call to handle next week/day combination
      }

      if (weekIndex < weeks.length && dayIndex < weekDays.length) {
        const week = weeks[weekIndex];
        const weekDay = weekDays[dayIndex];
        const candidateDate = getNthWeekdayOfMonth(cursor.year, cursor.month, week, weekDay);

        dayIndex++;
        return candidateDate;
      }
    }

    // Fallback: same day as start date
    try {
      const nextDate = cursor.set({ day: start.day });
      cursor = cursor.add({ months: interval });
      return nextDate;
    } catch {
      cursor = cursor.add({ months: interval });
      return null;
    }
  };

  return generateDatesWithConstraints(generator, options).dates.sort((a, b) => a.compare(b));
}

/**
 * ----------  YEARLY ----------
 */
export function nextYearly(
  actualStart: DateValue,
  start: DateValue,
  end: DateValue | null,
  interval: number,
  limit: number
): DateValue[] {
  if (interval <= 0) return [];

  let cursor = actualStart;

  // Advance to first occurrence >= start
  while (cursor < start) {
    cursor = getNextYearlyDate(cursor, actualStart, interval);
  }

  const options: DateGenerationOptions = { start, end, interval, limit };

  const generator = () => {
    const current = cursor;
    cursor = getNextYearlyDate(cursor, actualStart, interval);
    return current;
  };

  return generateDatesWithConstraints(generator, options).dates;
}

/**
 * Helper function to get the next yearly occurrence
 */
function getNextYearlyDate(current: DateValue, template: DateValue, interval: number): DateValue {
  let next = current.add({ years: interval });

  try {
    // Try to preserve same month/day as template
    next = next.set({ month: template.month, day: template.day });
  } catch {
    // Handle invalid dates (e.g., Feb 29 on non-leap years)
    const lastDayOfMonth = new CalendarDate(next.year, template.month, 1)
      .add({ months: 1 })
      .subtract({ days: 1 });
    next = lastDayOfMonth;
  }

  return next;
}

/**
 * Helper function to get days in a month
 */
function getDaysInMonth(date: DateValue): number {
  return date.set({ day: 1 }).add({ months: 1 }).subtract({ days: 1 }).day;
}
