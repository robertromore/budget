import type {DateValue} from "@internationalized/date";
import {currentDate, parseDateValue} from "./dates";
import type {Option} from "./options";

/**
 * Analyzes data date range and generates appropriate period options
 * @param data - Array of data items
 * @param dateField - The field name containing date values
 * @returns Array of available period options
 */
export function generatePeriodOptions(data: any[], dateField: string): Option[] {
  if (!data.length) return [{key: 0, label: "All Time"}];

  // Extract and sort all dates from the data
  const dates = data
    .map((item) => parseDateValue(item[dateField]))
    .filter((date): date is DateValue => date !== null)
    .sort((a, b) => a.compare(b));

  if (dates.length === 0) {
    return [{key: 0, label: "All Time"}];
  }

  const earliestDate = dates[0];
  const latestDate = dates[dates.length - 1];

  // Calculate total months in dataset
  const totalMonths =
    (latestDate!.year - earliestDate!.year) * 12 + (latestDate!.month - earliestDate!.month) + 1;

  const options: Option[] = [{key: 0, label: "All Time"}];

  // Generate period options based on data span
  // Use quarters of the total span, with reasonable minimums and maximums
  const quarterSpan = Math.max(3, Math.floor(totalMonths / 4));
  const halfSpan = Math.max(6, Math.floor(totalMonths / 2));
  const threeQuarterSpan = Math.max(9, Math.floor((totalMonths * 3) / 4));

  // Add periods that make sense for the dataset size
  if (totalMonths >= 6) {
    // For datasets with 6+ months, add a short-term view
    const shortTerm = Math.min(6, quarterSpan);
    options.push({
      key: shortTerm,
      label: `Last ${shortTerm} Month${shortTerm === 1 ? "" : "s"}`,
    });
  }

  if (totalMonths >= 12) {
    // For datasets with 12+ months, add a medium-term view
    const mediumTerm = Math.min(12, halfSpan);
    if (mediumTerm > 6) {
      // Only add if different from short-term
      options.push({
        key: mediumTerm,
        label: `Last ${mediumTerm} Months`,
      });
    }
  }

  if (totalMonths >= 18) {
    // For larger datasets, add a long-term view
    const longTerm = Math.min(24, threeQuarterSpan);
    if (longTerm > 12) {
      // Only add if different from medium-term
      options.push({
        key: longTerm,
        label: `Last ${longTerm} Months`,
      });
    }
  }

  // Add "Year to Date" if we have data in the current year
  const hasCurrentYearData = dates.some((date) => date.year === currentDate.year);
  if (hasCurrentYearData) {
    options.push({key: "ytd", label: "Year to Date"});
  }

  return options;
}

/**
 * Gets the start date for filtering based on a period key
 * @param periodKey - The period key (0 for all time, number for months, 'ytd' for year to date)
 * @returns DateValue representing the start date, or null for all time
 */
export function getPeriodStartDate(periodKey: string | number): DateValue | null {
  if (periodKey === 0 || periodKey === "0") return null; // All time

  // Handle Year to Date
  if (periodKey === "ytd") {
    return currentDate.set({month: 1, day: 1}); // January 1st of current year
  }

  // Handle numeric month periods
  const months = typeof periodKey === "number" ? periodKey : parseInt(periodKey.toString());
  if (!isNaN(months) && months > 0) {
    return currentDate.subtract({months}).set({day: 1});
  }

  return null;
}

/**
 * Filters data based on a period key
 * @param data - Array of data items to filter
 * @param dateField - The field name containing date values
 * @param periodKey - The period key to filter by
 * @returns Filtered array of data items
 */
export function filterDataByPeriod<T>(
  data: T[],
  dateField: string,
  periodKey: string | number
): T[] {
  if (periodKey === 0 || periodKey === "0") return data; // All time

  const startDate = getPeriodStartDate(periodKey);
  if (!startDate) return data;

  return data.filter((item) => {
    const itemDate = parseDateValue((item as any)[dateField]);
    return itemDate ? itemDate.compare(startDate) >= 0 : true;
  });
}
