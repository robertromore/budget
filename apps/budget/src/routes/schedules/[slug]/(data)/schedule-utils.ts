import type { ScheduleWithDetails } from "$lib/server/domains/schedules";
import { nextDaily, nextMonthly, nextWeekly, nextYearly } from "$lib/utils/date-frequency";
import { currentDate, parseISOString } from "$lib/utils/dates";
import { currencyFormatter, recurringFormatter } from "$lib/utils/formatters";

export function formatAmount(schedule: ScheduleWithDetails): string {
  if (!schedule || schedule.amount == null) {
    return currencyFormatter.format(0);
  }

  if (schedule.amount_type === "range" && schedule.amount_2 != null) {
    return `${currencyFormatter.format(schedule.amount)} - ${currencyFormatter.format(schedule.amount_2)}`;
  } else if (schedule.amount_type === "approximate") {
    return `~${currencyFormatter.format(schedule.amount)}`;
  } else {
    return currencyFormatter.format(schedule.amount);
  }
}

export function formatRecurringPattern(schedule: ScheduleWithDetails): string {
  if (!schedule.scheduleDate || !schedule.scheduleDate.frequency) return "One-time";

  return recurringFormatter.format(
    schedule.scheduleDate.frequency,
    schedule.scheduleDate.interval || 1
  );
}

export function calculateNextOccurrenceDate(schedule: ScheduleWithDetails): Date | null {
  if (!schedule.scheduleDate || !schedule.scheduleDate.frequency) return null;

  const frequency = schedule.scheduleDate.frequency;
  const interval = schedule.scheduleDate.interval || 1;
  // Use currentDate as fallback if parsing fails (matching generateFutureProjections behavior)
  const startDateValue = parseISOString(schedule.scheduleDate.start) || currentDate;
  const endDateValue = schedule.scheduleDate.end ? parseISOString(schedule.scheduleDate.end) : null;

  const today = currentDate;

  // Use a future limit date (12 months from today, matching generateFutureProjections)
  const futureLimit = today.add({ months: 12 });

  // Generate dates using same approach as generateFutureProjections (which works correctly)
  let futureDates;
  switch (frequency) {
    case "daily":
      futureDates = nextDaily(startDateValue, futureLimit, interval, 100);
      break;
    case "weekly": {
      const weekDays = (schedule.scheduleDate.week_days || []) as number[];
      futureDates = nextWeekly(startDateValue, futureLimit, interval, weekDays, 100);
      break;
    }
    case "monthly": {
      // Determine which pattern to use (matching model logic)
      const scheduleDate = schedule.scheduleDate;
      const days = scheduleDate.days as number | number[] | null;
      const weeks = (scheduleDate.weeks || []) as number[];
      const weeksDays = (scheduleDate.weeks_days || []) as number[];
      const onDay =
        scheduleDate.on &&
        scheduleDate.on_type === "day" &&
        days &&
        Array.isArray(days) &&
        days.length > 0;
      const onThe =
        scheduleDate.on &&
        scheduleDate.on_type === "the" &&
        weeks.length &&
        weeksDays.length;

      if (onDay) {
        futureDates = nextMonthly(startDateValue, futureLimit, interval, days, [], [], 100);
      } else if (onThe) {
        futureDates = nextMonthly(startDateValue, futureLimit, interval, null, weeks, weeksDays, 100);
      } else {
        // Fallback: same day as start date
        futureDates = nextMonthly(
          startDateValue,
          futureLimit,
          interval,
          startDateValue.day,
          [],
          [],
          100
        );
      }
      break;
    }
    case "yearly":
      futureDates = nextYearly(startDateValue, startDateValue, futureLimit, interval, 20);
      break;
    default:
      return null;
  }

  // Filter to only future dates and apply end date if specified (matching generateFutureProjections)
  const filteredDates = futureDates.filter((date) => {
    if (date.compare(today) <= 0) return false; // Only future dates
    if (endDateValue && date.compare(endDateValue) > 0) return false; // Within end date
    return true;
  });

  // Return the first future date
  const nextDateValue = filteredDates[0];

  if (!nextDateValue) return null;

  // Convert DateValue to JavaScript Date
  return new Date(nextDateValue.year, nextDateValue.month - 1, nextDateValue.day);
}

export function calculateNextOccurrence(schedule: ScheduleWithDetails): string {
  const nextDate = calculateNextOccurrenceDate(schedule);

  if (!nextDate) {
    if (!schedule.scheduleDate || !schedule.scheduleDate.frequency) {
      return "No recurring pattern";
    }
    return "Schedule ended";
  }

  return nextDate.toLocaleDateString();
}

export function getStatusVariant(status: string | null): "default" | "secondary" {
  return status === "active" ? "default" : "secondary";
}
