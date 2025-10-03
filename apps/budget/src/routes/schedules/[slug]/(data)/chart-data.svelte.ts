import type { PageData } from '../$types';
import { CalendarDate } from '@internationalized/date';
import { nextDaily, nextWeekly, nextMonthly, nextYearly } from '$lib/utils/date-frequency';
import { parseISOString, currentDate } from '$lib/utils/dates';

export interface ChartDataPoint {
  date: string;
  amount: number;
  type: 'historical' | 'projected';
  status?: string;
  dateLabel: string;
}

export interface CalendarDataPoint {
  date: Date;
  value: number | null;
  type: 'historical' | 'projected' | null;
  amount: number;
  status?: string;
}

export interface ProjectionData {
  date: Date;
  dateString: string;
  amount: number;
  description: string;
  monthsFromNow: number;
}

export function generateCumulativeBalanceData(schedule: PageData['schedule']): ChartDataPoint[] {
  const rawData: ChartDataPoint[] = [];

  // Add historical transactions
  schedule.transactions.forEach((transaction: any) => {
    rawData.push({
      date: transaction.date,
      amount: transaction.amount,
      type: 'historical',
      status: transaction.status,
      dateLabel: new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  });

  // Generate future projections if schedule is recurring
  if (schedule.scheduleDate && schedule.status === 'active') {
    const startDate = new Date(schedule.scheduleDate.start);
    const endDate = schedule.scheduleDate.end ? new Date(schedule.scheduleDate.end) : null;
    const frequency = schedule.scheduleDate.frequency!;
    const interval = schedule.scheduleDate.interval || 1;

    // Generate next 6 months of projections
    const today = new Date();
    const futureLimit = new Date();
    futureLimit.setMonth(futureLimit.getMonth() + 6);

    let nextDate = new Date(today);
    if (frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + interval);
    } else if (frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + (7 * interval));
    } else if (frequency === 'daily') {
      nextDate.setDate(nextDate.getDate() + interval);
    }

    while (nextDate <= futureLimit && (!endDate || nextDate <= endDate)) {
      rawData.push({
        date: nextDate.toISOString().split('T')[0],
        amount: schedule.amount,
        type: 'projected',
        dateLabel: nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });

      // Calculate next occurrence
      if (frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + interval);
      } else if (frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + (7 * interval));
      } else if (frequency === 'daily') {
        nextDate.setDate(nextDate.getDate() + interval);
      }
    }
  }

  // Sort by date first
  const sortedData = rawData.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate cumulative balance
  let cumulativeBalance = 0;
  const cumulativeData = sortedData.map((item) => {
    cumulativeBalance += item.amount;
    return {
      ...item,
      cumulativeBalance,
      amount: cumulativeBalance // Use cumulative balance as the y-value for the chart
    };
  });

  return cumulativeData;
}

export function generateCalendarData(schedule: PageData['schedule']): CalendarDataPoint[] {
  const data: CalendarDataPoint[] = [];

  // Add historical transactions
  schedule.transactions.forEach((transaction: any) => {
    data.push({
      date: new Date(transaction.date),
      value: Math.abs(transaction.amount), // Use absolute value for scale
      type: 'historical',
      amount: transaction.amount,
      status: transaction.status
    });
  });

  // Generate future projections if schedule is recurring
  if (schedule.scheduleDate && schedule.status === 'active') {
    const startDate = new Date(schedule.scheduleDate.start);
    const endDate = schedule.scheduleDate.end ? new Date(schedule.scheduleDate.end) : null;
    const frequency = schedule.scheduleDate.frequency!;
    const interval = schedule.scheduleDate.interval || 1;

    // Generate next 6 months of projections
    const today = new Date();
    const futureLimit = new Date();
    futureLimit.setMonth(futureLimit.getMonth() + 6);

    let nextDate = new Date(today);
    if (frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + interval);
    } else if (frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + (7 * interval));
    } else if (frequency === 'daily') {
      nextDate.setDate(nextDate.getDate() + interval);
    }

    while (nextDate <= futureLimit && (!endDate || nextDate <= endDate)) {
      data.push({
        date: new Date(nextDate),
        value: Math.abs(schedule.amount),
        type: 'projected',
        amount: schedule.amount
      });

      // Calculate next occurrence
      if (frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + interval);
      } else if (frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + (7 * interval));
      } else if (frequency === 'daily') {
        nextDate.setDate(nextDate.getDate() + interval);
      }
    }
  }

  return data;
}

export function generateFutureProjections(schedule: PageData['schedule']): ProjectionData[] {
  if (!schedule.scheduleDate || schedule.status !== 'active') return [];

  const frequency = schedule.scheduleDate.frequency!;
  const interval = schedule.scheduleDate.interval || 1;
  const startDateValue = parseISOString(schedule.scheduleDate.start) || currentDate;
  const endDateValue = schedule.scheduleDate.end ? parseISOString(schedule.scheduleDate.end) : null;

  // Calculate date range for projections (next 12 months from today)
  const today = currentDate;
  const futureLimit = today.add({ months: 12 });

  // Use proper date generation based on frequency
  let futureDates;
  switch (frequency) {
    case "daily":
      futureDates = nextDaily(startDateValue, futureLimit, interval, 100);
      break;
    case "weekly":
      futureDates = nextWeekly(
        startDateValue,
        futureLimit,
        interval,
        schedule.scheduleDate.week_days || [],
        100
      );
      break;
    case "monthly":
      futureDates = nextMonthly(
        startDateValue,
        futureLimit,
        interval,
        schedule.scheduleDate.days || null,
        schedule.scheduleDate.weeks || [],
        schedule.scheduleDate.weeks_days || [],
        100
      );
      break;
    case "yearly":
      futureDates = nextYearly(startDateValue, startDateValue, futureLimit, interval, 20);
      break;
    default:
      return [];
  }

  // Filter to only future dates and apply end date if specified
  const filteredDates = futureDates.filter(date => {
    if (date.compare(today) <= 0) return false; // Only future dates
    if (endDateValue && date.compare(endDateValue) > 0) return false; // Within end date
    return true;
  });

  // Convert to projection data
  const todayJs = new Date();
  const projections: ProjectionData[] = filteredDates.slice(0, 20).map(dateValue => {
    const jsDate = new Date(dateValue.year, dateValue.month - 1, dateValue.day);
    const monthsFromNow = Math.floor((jsDate.getTime() - todayJs.getTime()) / (1000 * 60 * 60 * 24 * 30));

    return {
      date: jsDate,
      dateString: `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`,
      amount: schedule.amount,
      description: `${schedule.name} - recurring`,
      monthsFromNow
    };
  });

  return projections;
}