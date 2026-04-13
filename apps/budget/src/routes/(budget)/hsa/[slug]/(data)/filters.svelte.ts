import { getSpecialDateValue } from "$lib/utils";
import { dateDifference, isSamePeriod, parseISOString } from "$lib/utils/dates";
import type { DateValue } from "@internationalized/date";
import type { ColumnFiltersState, Row, Updater } from "@tanstack/table-core";
import type { ExpenseFormat } from "./columns.svelte";

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
    filterValue: Set<string>,
    addMeta: (meta: any) => void
  ) => {
    return filterValue.size === 0
      ? true
      : Array.from(filterValue.values()).some((date: string) => {
          return (compareDate(row.original.date, date) || 0) < 0;
        });
  },

  dateAfter: (
    row: Row<ExpenseFormat>,
    columnId: string,
    filterValue: Set<string>,
    addMeta: (meta: any) => void
  ) => {
    return filterValue.size === 0
      ? true
      : Array.from(filterValue.values()).some((date: string) => {
          return (compareDate(row.original.date, date) || 0) > 0;
        });
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
          return compareDateInterval(row.original.date, date);
        });
  },

  dateIn: (
    row: Row<ExpenseFormat>,
    columnId: string,
    filterValue: Set<string>,
    addMeta: (meta: any) => void
  ) => {
    return filterValue.size === 0
      ? true
      : Array.from(filterValue.values()).some((date: string) => {
          return compareDateInterval(row.original.date, date);
        });
  },

  // Amount filters
  amountFilter: (
    row: Row<ExpenseFormat>,
    columnId: string,
    filterValue: { type: string; value?: number; min?: number; max?: number },
    addMeta: (meta: any) => void
  ) => {
    const amount = row.original[columnId as keyof ExpenseFormat] as number;
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
