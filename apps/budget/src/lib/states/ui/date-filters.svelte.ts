import type { FacetedFilterOption } from "$lib/types";
import { getContext, setContext } from "svelte";

const KEY = Symbol("date_filters");

export class DateFiltersState {
  dateFilters: FacetedFilterOption[] = $state() as FacetedFilterOption[];

  constructor(date_filters: FacetedFilterOption[]) {
    this.dateFilters = date_filters;
    setContext(KEY, this);
  }

  static get() {
    return getContext<DateFiltersState>(KEY);
  }

  // Getters
  get all(): FacetedFilterOption[] {
    return [...this.dateFilters];
  }

  get count(): number {
    return this.dateFilters.length;
  }

  // Find operations
  getByValue(value: string): FacetedFilterOption | undefined {
    return this.dateFilters.find((filter) => filter.value === value);
  }

  getByLabel(label: string): FacetedFilterOption | undefined {
    return this.dateFilters.find((filter) => filter.label === label);
  }

  findBy(predicate: (filter: FacetedFilterOption) => boolean): FacetedFilterOption | undefined {
    return this.dateFilters.find(predicate);
  }

  filterBy(predicate: (filter: FacetedFilterOption) => boolean): FacetedFilterOption[] {
    return this.dateFilters.filter(predicate);
  }

  // CRUD operations
  add(dateFilter: FacetedFilterOption) {
    // Check for duplicates based on value
    const exists = this.dateFilters.some((filter) => filter.value === dateFilter.value);
    if (!exists) {
      this.dateFilters.push(dateFilter);
    }
  }

  removeByValue(value: string): FacetedFilterOption | undefined {
    const index = this.dateFilters.findIndex((filter) => filter.value === value);
    if (index !== -1) {
      return this.dateFilters.splice(index, 1)[0];
    }
    return undefined;
  }

  remove(dateFilter: FacetedFilterOption): FacetedFilterOption | undefined {
    return this.removeByValue(dateFilter.value);
  }

  update(dateFilter: FacetedFilterOption): boolean {
    const index = this.dateFilters.findIndex((filter) => filter.value === dateFilter.value);
    if (index !== -1) {
      this.dateFilters[index] = dateFilter;
      return true;
    } else {
      this.add(dateFilter);
      return false;
    }
  }

  // Domain-specific methods
  getRecentFilters(): FacetedFilterOption[] {
    return this.filterBy((filter) => filter.value.includes("day") || filter.value.includes("week"));
  }

  getMonthlyFilters(): FacetedFilterOption[] {
    return this.filterBy((filter) => filter.value.includes("month"));
  }

  getYearlyFilters(): FacetedFilterOption[] {
    return this.filterBy((filter) => filter.value.includes("year"));
  }

  // Sort filters by recency (most recent first)
  sortByRecency(): void {
    this.dateFilters.sort((a, b) => {
      // Simple sorting by days/weeks/months/years
      const getOrder = (value: string): number => {
        if (value.includes("day")) return 1;
        if (value.includes("week")) return 2;
        if (value.includes("month")) return 3;
        if (value.includes("year")) return 4;
        return 5;
      };

      const orderA = getOrder(a.value);
      const orderB = getOrder(b.value);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Within same category, sort by numerical value
      const numA = parseInt(a.value.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.value.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });
  }

  // Utility methods
  has(value: string): boolean {
    return this.dateFilters.some((filter) => filter.value === value);
  }

  clear(): void {
    this.dateFilters = [];
  }
}
