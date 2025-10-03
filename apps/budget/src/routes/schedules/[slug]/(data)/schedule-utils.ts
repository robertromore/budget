import type { PageData } from '../$types';
import { currencyFormatter, recurringFormatter } from '$lib/utils/formatters';
import { nextDaily, nextWeekly, nextMonthly, nextYearly } from '$lib/utils/date-frequency';
import { parseISOString, currentDate } from '$lib/utils/dates';

export function formatAmount(schedule: PageData['schedule']): string {
  if (!schedule || schedule.amount == null) {
    return currencyFormatter.format(0);
  }

  if (schedule.amount_type === 'range' && schedule.amount_2 != null) {
    return `${currencyFormatter.format(schedule.amount)} - ${currencyFormatter.format(schedule.amount_2)}`;
  } else if (schedule.amount_type === 'approximate') {
    return `~${currencyFormatter.format(schedule.amount)}`;
  } else {
    return currencyFormatter.format(schedule.amount);
  }
}

export function formatRecurringPattern(schedule: PageData['schedule']): string {
  if (!schedule.scheduleDate || !schedule.scheduleDate.frequency) return 'One-time';

  return recurringFormatter.format(
    schedule.scheduleDate.frequency,
    schedule.scheduleDate.interval || 1
  );
}

export function calculateNextOccurrenceDate(schedule: PageData['schedule']): Date | null {
  if (!schedule.scheduleDate || !schedule.scheduleDate.frequency) return null;

  const frequency = schedule.scheduleDate.frequency;
  const interval = schedule.scheduleDate.interval || 1;
  const startDateValue = parseISOString(schedule.scheduleDate.start);
  const endDateValue = schedule.scheduleDate.end ? parseISOString(schedule.scheduleDate.end) : null;

  if (!startDateValue) return null;

  const today = currentDate;

  // Use proper date generation to get next occurrence
  let futureDates;
  switch (frequency) {
    case "daily":
      futureDates = nextDaily(startDateValue, endDateValue, interval, 10);
      break;
    case "weekly":
      futureDates = nextWeekly(
        startDateValue,
        endDateValue,
        interval,
        schedule.scheduleDate.week_days || [],
        10
      );
      break;
    case "monthly":
      futureDates = nextMonthly(
        startDateValue,
        endDateValue,
        interval,
        schedule.scheduleDate.days || null,
        schedule.scheduleDate.weeks || [],
        schedule.scheduleDate.weeks_days || [],
        10
      );
      break;
    case "yearly":
      futureDates = nextYearly(startDateValue, startDateValue, endDateValue, interval, 10);
      break;
    default:
      return null;
  }

  // Find the first date that's in the future
  const nextDateValue = futureDates.find(date => date.compare(today) > 0);

  if (!nextDateValue) return null;

  // Convert DateValue to JavaScript Date
  return new Date(nextDateValue.year, nextDateValue.month - 1, nextDateValue.day);
}

export function calculateNextOccurrence(schedule: PageData['schedule']): string {
  const nextDate = calculateNextOccurrenceDate(schedule);

  if (!nextDate) {
    if (!schedule.scheduleDate || !schedule.scheduleDate.frequency) {
      return 'No recurring pattern';
    }
    return 'Schedule ended';
  }

  return nextDate.toLocaleDateString();
}

export function getStatusVariant(status: string | null): 'default' | 'secondary' {
  return status === 'active' ? 'default' : 'secondary';
}