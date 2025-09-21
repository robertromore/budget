import type { PageData } from '../$types';
import { currencyFormatter, recurringFormatter } from '$lib/utils/formatters';

export function formatAmount(schedule: PageData['schedule']): string {
  if (schedule.amount_type === 'range') {
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

  const today = new Date();
  const startDate = new Date(schedule.scheduleDate.start);
  const endDate = schedule.scheduleDate.end ? new Date(schedule.scheduleDate.end) : null;
  const frequency = schedule.scheduleDate.frequency;
  const interval = schedule.scheduleDate.interval || 1;

  let nextDate = new Date(startDate);

  // Find the first future date
  while (nextDate <= today) {
    switch (frequency) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case "weekly":
        nextDate.setDate(nextDate.getDate() + (7 * interval));
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      default:
        return null;
    }
  }

  // Check if it's within the end date
  if (endDate && nextDate > endDate) {
    return null;
  }

  return nextDate;
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