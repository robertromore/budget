import type { PageData } from '../$types';

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

  const projections: ProjectionData[] = [];
  const frequency = schedule.scheduleDate.frequency!;
  const interval = schedule.scheduleDate.interval || 1;
  const endDate = schedule.scheduleDate.end ? new Date(schedule.scheduleDate.end) : null;

  // Generate projections for next 12 months
  const today = new Date();
  const futureLimit = new Date();
  futureLimit.setMonth(futureLimit.getMonth() + 12);

  // Start from the schedule's start date and find the first future occurrence
  const startDate = new Date(schedule.scheduleDate.start);
  let nextDate = new Date(startDate);

  // Find the first future date using the same logic as calculateNextOccurrence
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
    }
  }

  // Generate projections starting from the first valid future date
  while (projections.length < 20 && nextDate <= futureLimit && (!endDate || nextDate <= endDate)) {
    const monthsFromNow = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));

    projections.push({
      date: new Date(nextDate),
      dateString: nextDate.toISOString().split('T')[0],
      amount: schedule.amount,
      description: `${schedule.name} - recurring`,
      monthsFromNow
    });

    // Calculate next occurrence
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
    }
  }

  return projections;
}