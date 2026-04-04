/**
 * Server-safe date utility functions for date arithmetic.
 *
 * These use native JavaScript Date objects with local timezone components,
 * avoiding the UTC interpretation that new Date("YYYY-MM-DD") uses.
 * Safe for both server and client contexts (no browser-only imports).
 */

/**
 * Parse a YYYY-MM-DD string into a Date using local timezone components.
 * Avoids the UTC interpretation that new Date("YYYY-MM-DD") uses.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format a Date as YYYY-MM-DD using local timezone components.
 * Avoids the UTC shift that toISOString() introduces.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calculate the absolute number of days between two YYYY-MM-DD date strings.
 */
export function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = parseLocalDate(dateStr1);
  const d2 = parseLocalDate(dateStr2);
  return Math.round(Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate the absolute number of days between two Date objects.
 */
export function daysBetweenDates(d1: Date, d2: Date): number {
  return Math.round(Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Add a frequency-based interval to a date (mutates the date).
 * Handles monthly day-of-month overflow (e.g., Jan 31 + 1 month = Feb 28/29).
 */
export function addInterval(date: Date, frequency: string, interval: number): void {
  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + interval);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7 * interval);
      break;
    case "monthly": {
      const targetMonth = date.getMonth() + interval;
      const originalDay = date.getDate();
      date.setMonth(targetMonth);
      // Guard against day-of-month overflow (e.g., Jan 31 + 1 month should be Feb 28, not Mar 3)
      if (date.getDate() !== originalDay) {
        date.setDate(0); // Roll back to last day of the previous month
      }
      break;
    }
    case "yearly":
      date.setFullYear(date.getFullYear() + interval);
      break;
  }
}
