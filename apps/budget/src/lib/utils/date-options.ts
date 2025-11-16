// $lib/utils/options.ts
import { getOrdinalSuffix } from "./dates";

export type Option<T> = { value: T; label: string };

/**
 * Generate a 1‑to‑31 day option list (with the proper ordinal suffix)
 */
export const dayOptions: Option<number>[] = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  const suffix = getOrdinalSuffix(day);
  return { value: day, label: `${day}${suffix}` };
});

/**
 * “Last day of month” – used when the user selects “last”.
 */
export const lastDayOption: Option<number> = { value: 32, label: "last day" };

/**
 * Weekday options – Sunday is 0, Saturday is 6 (JavaScript format)
 */
export const weekdayOptions: Option<number>[] = Array.from({ length: 7 }, (_, i) => {
  const value = i;
  const label = new Intl.DateTimeFormat("en-US", { weekday: "long" })
    .format(new Date(1970, 0, i + 4))
    .replace(/\w/, (c) => c.toUpperCase());
  return { value, label };
});

/**
 * “First”, “second”, … “last” week of a month
 */
export const weekOptions: Option<number>[] = [
  { value: 1, label: "first" },
  { value: 2, label: "second" },
  { value: 3, label: "third" },
  { value: 4, label: "fourth" },
  { value: 5, label: "last" },
];

/**
 * Months (January = 1 … December = 12)
 */
export const monthOptions: Option<number>[] = Array.from({ length: 12 }, (_, i) => {
  const value = i + 1;
  const label = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(1970, i, 1));
  return { value, label };
});

/**
 * ISO weekday options – Monday is 1, Sunday is 7 (ISO 8601 format)
 * Used for budget period templates and other ISO week-based scheduling
 */
export const isoWeekdayOptions: Option<string>[] = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "7", label: "Sunday" },
];

/**
 * Month options with string values for select components
 */
export const monthStringOptions: Option<string>[] = monthOptions.map((option) => ({
  value: option.value.toString(),
  label: option.label,
}));
