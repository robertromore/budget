// $lib/utils/frequency.ts
import { CalendarDate, today, type DateValue } from "@internationalized/date";
import { getDayOfWeek, getNextWeekdayFlexible, getNthWeekdayOfMonth, timezone } from "./dates";

/**
 * ----------  DAILY ----------
 */
export function nextDaily(
  start: DateValue,
  end: DateValue,
  interval: number,
  limit: number
): DateValue[] {
  const dates: DateValue[] = [];
  let cursor = start;

  while (cursor >= start && cursor <= end && dates.length < limit) {
    dates.push(cursor);
    cursor = cursor.add({ days: interval });
  }
  return dates;
}

/**
 * ----------  WEEKLY ----------
 */
export function nextWeekly(
  start: DateValue,
  end: DateValue,
  interval: number,
  weekDays: number[],
  limit: number
): DateValue[] {
  const dates: DateValue[] = [];
  let cursor = start;

  while (cursor >= start && cursor <= end && dates.length < limit) {
    if (weekDays.length > 0) {
      weekDays.forEach((wday) => {
        const nextDay = getNextWeekdayFlexible(cursor, wday, true);
        dates.push(nextDay);
      });
    } else {
      const nextDay = getNextWeekdayFlexible(cursor, getDayOfWeek(start, timezone), true);
      dates.push(nextDay);
    }
    cursor = cursor.add({ weeks: interval });
  }

  return dates;
}

/**
 * ----------  MONTHLY ----------
 * * if `onDay` is set – use that day of the month
 * * otherwise, use the “on the nth weekday” pattern
 */
export function nextMonthly(
  start: DateValue,
  end: DateValue,
  interval: number,
  days: number | null,
  weeks: number[],
  weekDays: number[],
  limit: number
): DateValue[] {
  const dates: DateValue[] = [];
  let cursor = start;

  while (cursor >= start && cursor <= end && dates.length < limit) {
    if (days && days > 0) {
      const nextDate = cursor.set({ day: days });
      dates.push(nextDate);
    } else if (weeks.length > 0 && weekDays.length > 0) {
      weeks.forEach((week) => {
        weekDays.forEach((weekDay) => {
          const candidateDate = getNthWeekdayOfMonth(cursor.year, cursor.month, week, weekDay);

          if (candidateDate) {
            dates.push(candidateDate);
          }
        });
      });
    } else {
      const nextDate = cursor.set({ day: start.day });
      dates.push(nextDate);
    }

    // Move to next occurrence (add interval months)
    cursor = cursor.add({ months: interval });

    // Safety check to prevent infinite loops
    if (cursor.year > end.year + 10) {
      break;
    }
  }

  // Sort dates chronologically and limit results
  return dates;
}

/**
 * ----------  YEARLY ----------
 */
export function nextYearly(
  actualStart: DateValue,
  start: DateValue,
  end: DateValue,
  interval: number,
  limit: number
): DateValue[] {
  const dates: DateValue[] = [];

  // Start from the first candidate >= calendar start
  let cursor = actualStart;

  // If actualStart is before the view, advance cursor to the first occurrence >= start
  while (cursor < start) {
    cursor = cursor.add({ years: interval });
  }

  while (cursor >= start && cursor <= end && dates.length < limit) {
    dates.push(cursor);

    let next = cursor.add({ years: interval });

    // Try to preserve same month/day as actualStart
    try {
      next = next.set({ month: actualStart.month, day: actualStart.day });
    } catch {
      // Handle invalid dates (e.g., Feb 29 on non-leap years)
      const lastDayOfMonth = new CalendarDate(next.year, actualStart.month, 1)
        .add({ months: 1 })
        .subtract({ days: 1 });
      next = lastDayOfMonth;
    }

    cursor = next;

    // Safety break
    if (cursor.year > end.year + 100) break;
  }

  return dates;
}
