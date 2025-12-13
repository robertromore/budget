import type { TopCategoryData } from "$lib/types";
import type { Row } from "@tanstack/table-core";
import type {
  AmountFilterValue,
  FilterRegistry,
  TextFilterValue
} from "./filter-registry";

/**
 * Filter categories by amount range
 */
export const amountFilter = (
  row: Row<TopCategoryData>,
  columnId: string,
  filterValue: AmountFilterValue
): boolean => {
  const amount = row.original.amount;

  switch (filterValue.type) {
    case "equals":
      if (filterValue.value === undefined) return true;
      return amount === filterValue.value;
    case "notEquals":
      if (filterValue.value === undefined) return true;
      return amount !== filterValue.value;
    case "greaterThan":
      if (filterValue.value === undefined) return true;
      return amount > filterValue.value;
    case "lessThan":
      if (filterValue.value === undefined) return true;
      return amount < filterValue.value;
    case "between":
      if (filterValue.min === undefined && filterValue.max === undefined) return true;
      const min = filterValue.min ?? -Infinity;
      const max = filterValue.max ?? Infinity;
      return amount >= min && amount <= max;
    default:
      return true;
  }
};

/**
 * Filter categories by transaction count range
 */
export const countFilter = (
  row: Row<TopCategoryData>,
  columnId: string,
  filterValue: AmountFilterValue
): boolean => {
  const count = row.original.count;

  switch (filterValue.type) {
    case "equals":
      if (filterValue.value === undefined) return true;
      return count === filterValue.value;
    case "notEquals":
      if (filterValue.value === undefined) return true;
      return count !== filterValue.value;
    case "greaterThan":
      if (filterValue.value === undefined) return true;
      return count > filterValue.value;
    case "lessThan":
      if (filterValue.value === undefined) return true;
      return count < filterValue.value;
    case "between":
      if (filterValue.min === undefined && filterValue.max === undefined) return true;
      const min = filterValue.min ?? -Infinity;
      const max = filterValue.max ?? Infinity;
      return count >= min && count <= max;
    default:
      return true;
  }
};

/**
 * Filter categories by percentage range
 */
export const percentageFilter = (
  row: Row<TopCategoryData>,
  columnId: string,
  filterValue: AmountFilterValue
): boolean => {
  const percentage = row.original.percentage;

  switch (filterValue.type) {
    case "equals":
      if (filterValue.value === undefined) return true;
      return percentage === filterValue.value;
    case "notEquals":
      if (filterValue.value === undefined) return true;
      return percentage !== filterValue.value;
    case "greaterThan":
      if (filterValue.value === undefined) return true;
      return percentage > filterValue.value;
    case "lessThan":
      if (filterValue.value === undefined) return true;
      return percentage < filterValue.value;
    case "between":
      if (filterValue.min === undefined && filterValue.max === undefined) return true;
      const min = filterValue.min ?? 0;
      const max = filterValue.max ?? 100;
      return percentage >= min && percentage <= max;
    default:
      return true;
  }
};

/**
 * Filter categories by name (text search)
 */
export const nameContainsFilter = (
  row: Row<TopCategoryData>,
  columnId: string,
  filterValue: TextFilterValue
): boolean => {
  const name = row.original.name;
  const searchValue = filterValue.caseSensitive
    ? filterValue.value
    : filterValue.value.toLowerCase();
  const nameToSearch = filterValue.caseSensitive ? name : name.toLowerCase();

  switch (filterValue.type) {
    case "contains":
      return nameToSearch.includes(searchValue);
    case "equals":
      return nameToSearch === searchValue;
    case "startsWith":
      return nameToSearch.startsWith(searchValue);
    case "endsWith":
      return nameToSearch.endsWith(searchValue);
    default:
      return true;
  }
};

/**
 * Registry of all category-specific filter functions
 */
export const categoryFilters: FilterRegistry<TopCategoryData> = {
  amountFilter,
  countFilter,
  percentageFilter,
  nameContains: nameContainsFilter,
};
