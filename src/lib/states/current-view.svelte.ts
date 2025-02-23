import type { View } from "$lib/schema";
import { default as ViewModel } from "$lib/models/view.svelte";
import { trpc } from "$lib/trpc/client";
import type { TransactionsFormat, ViewFilter } from "$lib/types";
import deeplyEqual, { equalArray } from "$lib/utils";
import type {
  ExpandedState,
  FilterFnOption,
  GroupingState,
  SortingState,
  Table,
  VisibilityState,
} from "@tanstack/table-core";
import { Context } from "runed";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

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
    // this.table.setColumnFilters(this.view.getAllFilterValues())
    this.table.setGrouping(this.view.getGrouping());
    this.table.setSorting(this.view.getSorting());
    this.table.setExpanded(this.view.getExpanded());
    this.table.setColumnVisibility(this.view.getVisibility());
  }

  resetToInitialState() {
    this.view.reset();
    // this.view.filters = this.initialState?.filters || [];
    this.updateTableFilters();
    this.updateTableState();

    // this.view.display = this.view.display || {};
    // this.view.display.grouping =
    //   this.initialState?.display?.grouping || this.table.initialState.grouping || [];
    // this.view.display.sort =
    //   this.initialState?.display?.sort || this.table.initialState.sorting || [];
    // this.view.display.expandAll =
    //   this.initialState?.display?.expandAll || this.table.initialState.expanded || {};
    // this.updateTableState();
  }

  addFilter(filter: ViewFilter) {
    this.view.addFilter(filter);
    // this.updateFilter(filter);
    // if (this.view.filters?.find(existingFilter => existingFilter.column === filter.column)) {
    //   this.updateFilter(filter);
    // }

    // this.view.filters = this.view.filters?.concat(filter) || [];
    // this.filters.set(
    //   filter.column,
    //   Object.assign({}, filter, { temporary: true, value: new SvelteSet(filter.value) })
    // );

    // this.dirty = !this.isClean();
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
    // this.table.getAllColumns().forEach((column) => column.setFilterValue(undefined));
  }

  updateTableFilters() {
    this.clearTableFilters();
    this.table
      .getVisibleFlatColumns()
      .filter((column) => column.getCanFilter())
      .forEach((column) => {
        if (this.view.getFilterValue(column.id).size > 0) {
          column.setFilterValue(this.view.getFilterValue(column.id));
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

  updateTableSorter = (column: string, value: boolean) => {
    this.view.updateSorter(column, value);
    this.table.setSorting(this.view.getSorting());
  };

  updateTableVisibility(visibility: VisibilityState) {
    this.view.setVisibility(visibility);
    this.table.setColumnVisibility(visibility);
  }

  updateColumnVisibility(column: string, visible: boolean) {
    this.view.updateVisibility(column, visible);
    this.table.setColumnVisibility(this.view.getVisibility());
  }

  toggleColumnVisibility(column: string) {
    this.updateColumnVisibility(column, this.view.getVisibility()[column]);
  }
}

export const currentView = new Context<CurrentViewState<TransactionsFormat>>("current_view");
