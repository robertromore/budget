import type { TransactionsFormat } from "$lib/types";
import { compareSpecialDateValueWithOperator, getSpecialDateValue } from "$lib/utils";
import { parseDate } from "@internationalized/date";
import type { ColumnFiltersState, Row, Updater } from "@tanstack/table-core";

export const filters = {
  entityIsFilter: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: Set<string | number>,
    addMeta: (meta: any) => void
  ) => {
    type validType = { [key: string]: any };
    return filterValue.has((row.original as validType)[columnId + "Id"].toString());
  },
  entityIsNotFilter: (
    row: Row<TransactionsFormat>,
    columnId: string,
    filterValue: Set<string | number>,
    addMeta: (meta: any) => void
  ) => {
    type validType = { [key: string]: any };
    return !filterValue.has((row.original as validType)[columnId + "Id"].toString());
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
          if (row.original.date) {
            return date.includes(":")
              ? (compareSpecialDateValueWithOperator(
                  row.original.date,
                  getSpecialDateValue(date),
                  "before"
                ) || -1) < 0
              : (row.original.date?.compare(parseDate(date)) || -1) < 0;
          }
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
          if (row.original.date) {
            return date.includes(":")
              ? (compareSpecialDateValueWithOperator(
                  row.original.date,
                  getSpecialDateValue(date),
                  "after"
                ) || -1) > 0
              : (row.original.date?.compare(parseDate(date)) || -1) > 0;
          }
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
          if (row.original.date) {
            return date.includes(":")
              ? (compareSpecialDateValueWithOperator(
                  row.original.date,
                  getSpecialDateValue(date),
                  "on"
                ) || -1) === 0
              : (row.original.date?.compare(parseDate(date)) || -1) === 0;
          }
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
          return typeof row.original.date === "string"
            ? (compareSpecialDateValueWithOperator(
                parseDate(row.original.date),
                getSpecialDateValue(date),
                "in"
              ) || -1) < 0
            : (row.original.date?.compare(parseDate(date)) || -1) < 0;
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

// const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
//   const opts: RankItemOptions = {
//     accessors: undefined
//   };
//   if (columnId === 'payee') {
//     opts.accessors = [
//       (item) => {
//         return `${$state.snapshot(payees.get().payees?.find((payee) => payee.id === item))?.name}`;
//       }
//     ];
//   }
//   if (columnId === 'category') {
//     opts.accessors = [
//       (item) => {
//         return `${
//           $state.snapshot(categories.get().categories?.find((category) => category.id === item))?.name
//         }`;
//       }
//     ];
//   }

//   // Rank the item
//   const itemRank = rankItem(row.getValue(columnId), value, opts);

//   // Store the itemRank info
//   addMeta({ itemRank });

//   // Return if the item should be filtered in/out
//   return itemRank.passed;
// };

// let pagination = $state<PaginationState>({
//   pageIndex: 0,
//   pageSize: 25
// });
