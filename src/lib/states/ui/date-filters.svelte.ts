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
