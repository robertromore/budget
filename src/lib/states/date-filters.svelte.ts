import type { FacetedFilterOption } from "$lib/types";
import { Context } from "runed";

export class DateFiltersState {
  dateFilters: FacetedFilterOption[] = $state() as FacetedFilterOption[];

  constructor(date_filters: FacetedFilterOption[]) {
    this.dateFilters = date_filters;
  }

  add(dateFilter: FacetedFilterOption) {
    this.dateFilters.push(dateFilter);
  }

  remove(dateFilter: FacetedFilterOption) {
    this.dateFilters = this.dateFilters.filter((filter) => filter.value !== dateFilter.value);
  }

  update(dateFilter: FacetedFilterOption) {
    const index = this.dateFilters.findIndex((filter) => filter.value === dateFilter.value);
    if (index !== -1) {
      this.dateFilters[index] = dateFilter;
    } else {
      this.add(dateFilter);
    }
  }
}

export const dateFiltersContext = new Context<DateFiltersState>("date_filters");
