import type { ExpenseFormat } from "./expense-columns.svelte";
import { getSpecialDateValue } from "$lib/utils";
import type { DateValue } from "@internationalized/date";
import { dateDifference, isSamePeriod, parseISOString } from "$lib/utils/dates";
import type { ColumnFiltersState, Row, Updater } from "@tanstack/table-core";

function compareDate(originalDate: DateValue, compareDate: string) {
  const [range, stringDate] = compareDate.includes(":")
    ? getSpecialDateValue(compareDate)
    : ["day", compareDate];
  const date = parseISOString(stringDate);
  if (!date) return null;

  switch (range) {
    case "month":
      return dateDifference(originalDate, date, "months");
    case "quarter":
      return dateDifference(originalDate, date, "quarters");
    case "half-year":
      return Math.floor(dateDifference(originalDate, date, "months") / 6);
    case "year":
      return dateDifference(originalDate, date, "years");
    case "day":
    default:
      return dateDifference(originalDate, date, "days");
  }
}

function compareDateInterval(originalDate: DateValue, compareDate: string) {
  const [range, stringDate] = compareDate.includes(":")
    ? getSpecialDateValue(compareDate)
    : ["day", compareDate];
  const date = parseISOString(stringDate);
  if (!date) return null;

  switch (range) {
    case "month":
      return isSamePeriod(originalDate, date, "month");
    case "quarter":
      return isSamePeriod(originalDate, date, "quarter");
    case "half-year":
      return null;
    case "year":
      return isSamePeriod(originalDate, date, "year");
    case "day":
    default:
      return isSamePeriod(originalDate, date, "day");
  }
}

export const filters = {
  // Text field filters (provider, patient, etc.)
  textFieldFilter: (
    row: Row<ExpenseFormat>,
    columnId: string,
    filterValue: Set<string>,
    addMeta: (meta: any) => void
  ) => {
    const value = row.original[columnId as keyof ExpenseFormat];
    const valueStr = value === null ? "null" : String(value);
    return filterValue.size === 0 ? true : filterValue.has(valueStr);
  },

  // Date filters
  dateBefore: (
    row: Row<ExpenseFormat>,
    columnId: string,
    filterValue: Set<string> | { operator: string; date?: string },
    addMeta: (meta: any) => void
  ) => {
    // Handle new DateFilterValue format with operators
    if (filterValue && typeof filterValue === "object" && "operator" in filterValue) {
      if (filterValue.operator === "before" && filterValue.date) {
        const comparison = compareDate(row.original.date, filterValue.date);
        return comparison !== null && comparison < 0;
      }
      return true;
    }

    // Backward compatibility: Handle Set format
    const setFilter = filterValue as Set<string>;
    return setFilter.size === 0
      ? true
      : Array.from(setFilter.values()).some((date: string) => {
          return (compareDate(row.original.date, date) || 0) < 0;
        });
  },

  dateAfter: (
    row: Row<ExpenseFormat>,
    columnId: string,
    filterValue:
      | Set<string>
      | { operator: string; date?: string }
      | Set<{ operator: string; date?: string }>,
    addMeta: (meta: any) => void
  ) => {
    // Handle Set (from view system)
    if (filterValue instanceof Set) {
      const setFilter = filterValue as Set<any>;
      if (setFilter.size === 0) return true;

      const firstValue = Array.from(setFilter.values())[0];
      // Check if it's a Set of objects with operator
      if (typeof firstValue === "object" && firstValue !== null && "operator" in firstValue) {
        if (firstValue.operator === "after" && firstValue.date) {
          const comparison = compareDate(row.original.date, firstValue.date);
          return comparison !== null && comparison > 0;
        }
        return true;
      }

      // Backward compatibility: Set of date strings
      return Array.from(setFilter.values()).some((date: string) => {
        return (compareDate(row.original.date, date) || 0) > 0;
      });
    }

    // Handle direct object format
    if (filterValue && typeof filterValue === "object" && "operator" in filterValue) {
      if (filterValue.operator === "after" && filterValue.date) {
        const comparison = compareDate(row.original.date, filterValue.date);
        return comparison !== null && comparison > 0;
      }
      return true;
    }

    return true;
  },

  dateBetween: (
    row: Row<ExpenseFormat>,
    columnId: string,
    filterValue: { operator: string; from?: string; to?: string },
    addMeta: (meta: any) => void
  ) => {
    if (!filterValue || filterValue.operator !== "between") return true;
    if (!filterValue.from || !filterValue.to) return true;

    const fromComparison = compareDate(row.original.date, filterValue.from) || 0;
    const toComparison = compareDate(row.original.date, filterValue.to) || 0;

    return fromComparison >= 0 && toComparison <= 0;
  },

  dateOn: (
    row: Row<ExpenseFormat>,
    columnId: string,
    filterValue: Set<string>,
    addMeta: (meta: any) => void
  ) => {
    return filterValue.size === 0
      ? true
      : Array.from(filterValue.values()).some((date: string) => {
          const result = compareDateInterval(row.original.date, date);
          return result === true; // Explicitly check for true, not just truthy
        });
  },

  dateIn: (
    row: Row<ExpenseFormat>,
    columnId: string,
    filterValue:
      | Set<string>
      | Set<{ operator: string; date?: string; from?: string; to?: string; values?: Set<string> }>
      | { operator: string; date?: string; from?: string; to?: string; values?: Set<string> },
    addMeta: (meta: any) => void
  ) => {
    // Handle Set (from view system)
    if (filterValue instanceof Set) {
      const setFilter = filterValue as Set<any>;
      if (setFilter.size === 0) return true;

      const firstValue = Array.from(setFilter.values())[0];
      // Check if it's a Set of objects with operator
      if (typeof firstValue === "object" && firstValue !== null && "operator" in firstValue) {
        const operatorValue = firstValue as {
          operator: string;
          date?: string;
          from?: string;
          to?: string;
          values?: Set<string>;
        };

        // Handle different operators
        switch (operatorValue.operator) {
          case "in":
            if (operatorValue.values) {
              return operatorValue.values.size === 0
                ? true
                : Array.from(operatorValue.values.values()).some((date: string) => {
                    const result = compareDateInterval(row.original.date, date);
                    return result === true;
                  });
            }
            return true;

          case "after":
            if (operatorValue.date) {
              const comparison = compareDate(row.original.date, operatorValue.date);
              return comparison !== null && comparison > 0;
            }
            return true;

          case "before":
            if (operatorValue.date) {
              const comparison = compareDate(row.original.date, operatorValue.date);
              return comparison !== null && comparison < 0;
            }
            return true;

          case "between":
            if (operatorValue.from && operatorValue.to) {
              const fromComparison = compareDate(row.original.date, operatorValue.from) || 0;
              const toComparison = compareDate(row.original.date, operatorValue.to) || 0;
              return fromComparison >= 0 && toComparison <= 0;
            }
            return true;

          default:
            return true;
        }
      }

      // Backward compatibility: Set of date strings
      return Array.from(setFilter.values()).some((date: string) => {
        const result = compareDateInterval(row.original.date, date);
        return result === true;
      });
    }

    // Handle direct object format
    if (filterValue && typeof filterValue === "object" && "operator" in filterValue) {
      if (filterValue.operator === "in" && filterValue.values) {
        return filterValue.values.size === 0
          ? true
          : Array.from(filterValue.values.values()).some((date: string) => {
              const result = compareDateInterval(row.original.date, date);
              return result === true;
            });
      }
      return true;
    }

    return true;
  },

  // Amount filters
  amountFilter: (
    row: Row<ExpenseFormat>,
    columnId: string,
    filterValue: { type?: string; operator?: string; value?: number; min?: number; max?: number },
    addMeta: (meta: any) => void
  ) => {
    const amount = row.original[columnId as keyof ExpenseFormat] as number;
    if (!filterValue || typeof amount !== "number") return true;

    // Support both 'type' and 'operator' for backwards compatibility
    const operatorType = filterValue.operator || filterValue.type;
    if (!operatorType) return true;

    switch (operatorType) {
      case "equals":
        return filterValue.value !== undefined ? amount === filterValue.value : true;
      case "notEquals":
        return filterValue.value !== undefined ? amount !== filterValue.value : true;
      case "greaterThan":
        return filterValue.value !== undefined ? amount > filterValue.value : true;
      case "lessThan":
        return filterValue.value !== undefined ? amount < filterValue.value : true;
      case "between":
        return filterValue.min !== undefined && filterValue.max !== undefined
          ? amount >= filterValue.min && amount <= filterValue.max
          : true;
      default:
        return true;
    }
  },

  // Entity filters (for status, etc.)
  entityIsFilter: (
    row: Row<ExpenseFormat>,
    columnId: string,
    filterValue: Set<string | number>,
    addMeta: (meta: any) => void
  ) => {
    if (!filterValue || filterValue.size === 0) return true;
    const value = row.original[columnId as keyof ExpenseFormat];
    // Handle claimStatus which might be undefined
    const actualValue = value || "not_submitted";
    return filterValue.has(actualValue as string | number);
  },

  entityIsNotFilter: (
    row: Row<ExpenseFormat>,
    columnId: string,
    filterValue: Set<string | number>,
    addMeta: (meta: any) => void
  ) => {
    if (!filterValue || filterValue.size === 0) return true;
    const value = row.original[columnId as keyof ExpenseFormat];
    // Handle claimStatus which might be undefined
    const actualValue = value || "not_submitted";
    return !filterValue.has(actualValue as string | number);
  },
};

let _filtering = $state<ColumnFiltersState>([]);
export let filtering = () => _filtering;
export function setFiltering(updater: Updater<ColumnFiltersState>) {
  if (updater instanceof Function) {
    _filtering = updater(_filtering);
  } else _filtering = updater;
}

let _globalFilter = $state("");
export let globalFilter = () => _globalFilter;
export function setGlobalFilter(updater: Updater<string>) {
  if (updater instanceof Function) {
    _globalFilter = updater(_globalFilter);
  } else _globalFilter = updater;
}
