import type { TransactionsFormat } from "$lib/types";
import { getSpecialDateValue } from "$lib/utils";
import type { DateValue } from "@internationalized/date";
import { dateDifference, isSamePeriod, parseISOString } from "$lib/utils/dates";
import type { ColumnFiltersState, Row, Updater } from "@tanstack/table-core";

function compareDate(originalDate: DateValue, compareDate: string) {
  // @todo? cache results so comparison is only done once
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
  // @todo? cache results so comparison is only done once
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
  entityIsFilter: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: Set<string | number>,
    addMeta: (meta: any) => void
  ) => {
    type validType = { [key: string]: any };
    const entityId = (row.original as validType)[columnId + "Id"];
    const entityIdStr = entityId === null ? "null" : entityId.toString();
    return filterValue.has(entityIdStr);
  },
  entityIsNotFilter: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: Set<string | number>,
    addMeta: (meta: any) => void
  ) => {
    type validType = { [key: string]: any };
    const entityId = (row.original as validType)[columnId + "Id"];
    const entityIdStr = entityId === null ? "null" : entityId.toString();
    return !filterValue.has(entityIdStr);
  },
  dateBefore: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue:
      | Set<string>
      | { operator: string; date?: string; from?: string; to?: string; values?: Set<string> },
    addMeta: (meta: any) => void
  ) => {
    // Handle new DateFilterValue format
    if (filterValue && typeof filterValue === "object" && "operator" in filterValue) {
      if (filterValue.operator === "before" && filterValue.date) {
        return (compareDate(row.original.date, filterValue.date) || 0) < 0;
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
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue:
      | Set<string>
      | { operator: string; date?: string; from?: string; to?: string; values?: Set<string> },
    addMeta: (meta: any) => void
  ) => {
    // Handle new DateFilterValue format
    if (filterValue && typeof filterValue === "object" && "operator" in filterValue) {
      if (filterValue.operator === "after" && filterValue.date) {
        return (compareDate(row.original.date, filterValue.date) || 0) > 0;
      }
      return true;
    }
    // Backward compatibility: Handle Set format
    const setFilter = filterValue as Set<string>;
    return setFilter.size === 0
      ? true
      : Array.from(setFilter.values()).some((date: string) => {
          return (compareDate(row.original.date, date) || 0) > 0;
        });
  },
  dateOn: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue:
      | Set<string>
      | { operator: string; date?: string; from?: string; to?: string; values?: Set<string> },
    addMeta: (meta: any) => void
  ) => {
    // Handle new DateFilterValue format
    if (filterValue && typeof filterValue === "object" && "operator" in filterValue) {
      if (filterValue.operator === "in" && filterValue.values) {
        return filterValue.values.size === 0
          ? true
          : Array.from(filterValue.values.values()).some((date: string) => {
              return compareDateInterval(row.original.date, date);
            });
      }
      return true;
    }
    // Backward compatibility: Handle Set format
    const setFilter = filterValue as Set<string>;
    return setFilter.size === 0
      ? true
      : Array.from(setFilter.values()).some((date: string) => {
          return compareDateInterval(row.original.date, date);
        });
  },
  dateIn: (
    row: Row<TransactionsFormat>,
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
  dateBetween: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: {
      operator: string;
      date?: string;
      from?: string;
      to?: string;
      values?: Set<string>;
    },
    addMeta: (meta: any) => void
  ) => {
    if (!filterValue || filterValue.operator !== "between") return true;
    if (!filterValue.from || !filterValue.to) return true;

    const fromComparison = compareDate(row.original.date, filterValue.from) || 0;
    const toComparison = compareDate(row.original.date, filterValue.to) || 0;

    return fromComparison >= 0 && toComparison <= 0;
  },
  equalsString: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: Set<string>,
    addMeta: (meta: any) => void
  ) => {
    return filterValue.size === 0
      ? true
      : filterValue.has(row.original[columnId as keyof TransactionsFormat] as string);
  },
  doesntEqualString: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: Set<string>,
    addMeta: (meta: any) => void
  ) => {
    return !filterValue.has(row.original[columnId as keyof TransactionsFormat] as string);
  },
  amountFilter: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: { type: string; value?: number; min?: number; max?: number },
    addMeta: (meta: any) => void
  ) => {
    const amount = row.original.amount;
    if (!filterValue || typeof amount !== "number") return true;

    switch (filterValue.type) {
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
