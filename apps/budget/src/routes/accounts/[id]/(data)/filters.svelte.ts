import type {TransactionsFormat} from "$lib/types";
import {getSpecialDateValue} from "$lib/utils";
import {getLocalTimeZone, type DateValue} from "@internationalized/date";
import type {ColumnFiltersState, Row, Updater} from "@tanstack/table-core";
import {
  differenceInDays,
  differenceInMonths,
  differenceInQuarters,
  differenceInYears,
  isSameDay,
  isSameMonth,
  isSameQuarter,
  isSameYear,
  parseISO,
} from "date-fns";

function compareDate(originalDate: DateValue, compareDate: string) {
  // @todo? cache results so comparison is only done once
  const [range, stringDate] = compareDate.includes(":")
    ? getSpecialDateValue(compareDate)
    : ["day", compareDate];
  const date = parseISO(stringDate);
  const og = originalDate.toString();
  switch (range) {
    case "month":
      return differenceInMonths(og, date);

    case "quarter":
      return differenceInQuarters(og, date);

    case "half-year":
      return Math.floor(differenceInMonths(og, date) / 6);

    case "year":
      return differenceInYears(og, date);

    case "day":
    default:
      return differenceInDays(og, date);
  }
}

function compareDateInterval(originalDate: DateValue, compareDate: string) {
  // @todo? cache results so comparison is only done once
  const [range, stringDate] = compareDate.includes(":")
    ? getSpecialDateValue(compareDate)
    : ["day", compareDate];
  const date = parseISO(stringDate);
  const og = originalDate.toDate(getLocalTimeZone());
  switch (range) {
    case "month":
      return isSameMonth(og, date);

    case "quarter":
      return isSameQuarter(og, date);

    case "half-year":
      return null;

    case "year":
      return isSameYear(og, date);

    case "day":
    default:
      return isSameDay(og, date);
  }
}

export const filters = {
  entityIsFilter: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: Set<string | number>,
    addMeta: (meta: any) => void
  ) => {
    type validType = {[key: string]: any};
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
    type validType = {[key: string]: any};
    const entityId = (row.original as validType)[columnId + "Id"];
    const entityIdStr = entityId === null ? "null" : entityId.toString();
    return !filterValue.has(entityIdStr);
  },
  dateBefore: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: Set<string>,
    addMeta: (meta: any) => void
  ) => {
    return filterValue.size === 0
      ? true
      : filterValue.values().some((date) => {
          return (compareDate(row.original.date, date) || 0) < 0;
        });
  },
  dateAfter: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: Set<string>,
    addMeta: (meta: any) => void
  ) => {
    return filterValue.size === 0
      ? true
      : filterValue.values().some((date) => {
          return (compareDate(row.original.date, date) || 0) > 0;
        });
  },
  dateOn: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: Set<string>,
    addMeta: (meta: any) => void
  ) => {
    return filterValue.size === 0
      ? true
      : filterValue.values().some((date) => {
          return compareDateInterval(row.original.date, date);
        });
  },
  dateIn: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: Set<string>,
    addMeta: (meta: any) => void
  ) => {
    return filterValue.size === 0
      ? true
      : filterValue.values().some((date) => {
          return compareDateInterval(row.original.date, date);
        });
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
    filterValue: {type: string; value?: number; min?: number; max?: number},
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
