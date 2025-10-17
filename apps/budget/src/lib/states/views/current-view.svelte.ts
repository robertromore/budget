import { default as ViewModel } from "$lib/models/view.svelte";
import type { View } from "$lib/schema";
import type { TransactionsFormat, ViewFilter } from "$lib/types";
import type {
  ExpandedState,
  FilterFnOption,
  GroupingState,
  SortingState,
  Table,
  VisibilityState,
} from "@tanstack/table-core";
import { Context } from "runed";

/**
 * A state class representing the currently active view.
 */
export class CurrentViewState<TData> {
  view: ViewModel = $state() as ViewModel;
  table: Table<TData> = $state() as Table<TData>;

  constructor(view: View, table: Table<TData>) {
    this.view = new ViewModel(view);
    this.table = table;

    return this;
  }

  updateTableState() {
    this.table.setGrouping(this.view.getGrouping());
    this.table.setSorting(this.view.getSorting());
    this.table.setExpanded(this.view.getExpanded());
    this.table.setColumnVisibility(this.view.getVisibility());
  }

  resetToInitialState() {
    this.view.reset();
    this.updateTableFilters();
    this.updateTableState();
  }

  addFilter(filter: ViewFilter) {
    this.view.addFilter(filter);
  }

  updateFilter(filter: Partial<ViewFilter>, replace: boolean = false) {
    this.view.updateFilter(filter, replace);

    if (!filter.column) {
      return;
    }

    const replaced = this.view.getFilter(filter.column);
    const column = this.table.getColumn(filter.column);
    if (column) {
      column.columnDef.filterFn = replaced?.filter as keyof FilterFnOption<unknown>;
      column.setFilterValue(replaced?.value);
    }
  }

  removeFilter(filter: string) {
    this.view.removeFilter(filter);

    const column = this.table.getColumn(filter);
    if (column) {
      column.setFilterValue("");
    }
  }

  addFilterValue(filter: string, value: unknown) {
    this.view.addFilterValue(filter, value);
    this.updateTableFilter(filter);
  }

  removeFilterValue(filter: string, value: unknown) {
    this.view.removeFilterValue(filter, value);
    this.updateTableFilter(filter);
  }

  clearFilterValue(filter: string) {
    this.view.clearFilterValue(filter);
    this.updateTableFilter(filter);
  }

  toggleFilterValue(filter: string, value: unknown) {
    this.view.toggleFilterValue(filter, value);
    this.updateTableFilter(filter);
  }

  updateTableFilter(column: string) {
    this.table.getColumn(column)?.setFilterValue(this.view.getFilterValue(column));
  }

  clearTableFilters() {
    this.table.setColumnFilters([]);
  }

  updateTableFilters() {
    this.clearTableFilters();
    this.table
      .getVisibleFlatColumns()
      .filter((column) => column.getCanFilter())
      .forEach((column) => {
        const filterFn = this.view.getFilterFn(column.id);
        if (filterFn) {
          column.columnDef.filterFn = filterFn as FilterFnOption<TData>;
        }
        const filterValue = this.view.getFilterValue(column.id);
        const filterFnName = this.view.getFilterFn(column.id);

        // For amount and date filters with operator-based format, check if we have a valid object, not a Set
        const operatorBasedFilters = ['amountFilter', 'dateIn', 'dateAfter', 'dateBefore', 'dateBetween'];
        if (operatorBasedFilters.includes(filterFnName || '') && filterValue && typeof filterValue === 'object' && filterValue !== null && !('size' in filterValue)) {
          column.setFilterValue(filterValue);
        } else if (filterValue && typeof filterValue === 'object' && filterValue !== null && 'size' in filterValue && (filterValue as Set<unknown>).size > 0) {
          // For Set-based filters
          column.setFilterValue(filterValue);
        }
      });
  }

  updateTableGrouping(grouping: GroupingState) {
    this.view.setGrouping(grouping);
    this.table.setGrouping(grouping);
  }

  updateTableAllRowsExpanded(expanded: ExpandedState) {
    this.view.setExpanded(expanded);
    this.table.setExpanded(expanded);
  }

  updateTableSorting(sorting: SortingState) {
    this.view.setSorting(sorting);
    this.table.setSorting(sorting);
  }

  updateTableVisibility(visibility: VisibilityState) {
    this.view.setVisibility(visibility);
    this.table.setColumnVisibility(visibility);
  }

  updateColumnVisibility(column: string, visible: boolean) {
    this.view.updateVisibility(column, visible);
    this.table.setColumnVisibility(this.view.getVisibility());
  }

  toggleColumnVisibility(column: string) {
    this.updateColumnVisibility(column, this.view.getVisibility()[column] ?? false);
  }
}

export const currentView = new Context<CurrentViewState<TransactionsFormat>>("current_view");
