import type { DateValue } from "@internationalized/date";
import type { Option } from "./options";
/**
 * Analyzes data date range and generates appropriate period options
 * @param data - Array of data items
 * @param dateField - The field name containing date values
 * @returns Array of available period options
 */
export declare function generatePeriodOptions(data: any[], dateField: string): Option[];
/**
 * Gets the start date for filtering based on a period key
 * @param periodKey - The period key (0 for all time, number for months, 'ytd' for year to date)
 * @returns DateValue representing the start date, or null for all time
 */
export declare function getPeriodStartDate(periodKey: string | number): DateValue | null;
/**
 * Filters data based on a period key
 * @param data - Array of data items to filter
 * @param dateField - The field name containing date values
 * @param periodKey - The period key to filter by
 * @returns Filtered array of data items
 */
export declare function filterDataByPeriod<T>(data: T[], dateField: string, periodKey: string | number): T[];
//# sourceMappingURL=chart-periods.d.ts.map