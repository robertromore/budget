import type { View as ViewSchema } from "$lib/schema";
import { orpc } from "$lib/rpc/client";
import type { ViewFilter, ViewFilterWithSet } from "$lib/types";
import deeplyEqual, { equalArray } from "$lib/utils";
import type {
  ExpandedState,
  GroupingState,
  SortingState,
  VisibilityState,
} from "@tanstack/table-core";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

export default class View {
  view: ViewSchema = $state() as ViewSchema;
  initial?: ViewSchema;
  #filterValues: SvelteMap<string, ViewFilterWithSet> = $state(new SvelteMap());
  dirty: boolean = $derived.by(() => {
    this.#filterValues;
    this.view.filters;
    this.initial?.filters;
    return (
      this.view.name !== this.initial?.name ||
      this.view.description !== this.initial.description ||
      !equalArray(this.view.display?.grouping || [], this.initial.display?.grouping || []) ||
      !equalArray(this.view.display?.sort || [], this.initial.display?.sort || []) ||
      !deeplyEqual(this.view.display?.expanded, this.initial.display?.expanded) ||
      !deeplyEqual(this.view.display?.visibility, this.initial.display?.visibility) ||
      // Same filter count?
      this.#filterValues.size !== this.initial.filters?.length ||
      // Same filters?
      !equalArray(
        this.#filterValues.keys().toArray(),
        this.initial.filters.map((filter) => filter.column)
      ) ||
      !equalArray(
        this.#filterValues
          .values()
          .toArray()
          .map((filterValue) => filterValue.filter),
        this.view.filters?.map((filter) => filter.filter) || []
      ) ||
      this.#filterValues.values().some(({ column, value }) => {
        const initialFilters = this.initial?.filters?.find(
          (filter) => filter.column === column
        )?.value;
        return (
          !(value.size === 0 && (initialFilters?.length || 0) === 0) &&
          value.isDisjointFrom(new Set(initialFilters))
        );
      })
    );
  });

  get id() {
    return this.view.id;
  }

  get name() {
    return this.view.name;
  }

  get description() {
    return this.view.description;
  }

  constructor(view: ViewSchema) {
    this.view = view;
    this.view.filters = this.view.filters || [];
    this.view.display = this.view.display || {
      grouping: [],
      sort: [],
      expanded: {},
      visibility: {},
    };

    this.initial = view;
    this.#filterValues = new SvelteMap<string, ViewFilterWithSet>(
      (this.view.filters as Array<Omit<ViewFilterWithSet, "view"> & { view?: Array<unknown> }>).map(
        (filter) => [
          filter.column,
          Object.assign({}, filter, {
            value: new SvelteSet(filter.value || []),
          }),
        ]
      )
    );
  }

  getColumn(filter: string) {
    return this.#filterValues.get(filter)?.column;
  }

  getGrouping(): GroupingState {
    return this.view.display?.grouping || [];
  }

  setGrouping(grouping: GroupingState) {
    this.view.display!.grouping = grouping;
    return this;
  }

  getSorting(): SortingState {
    return this.view.display?.sort || [];
  }

  setSorting(sorting: SortingState) {
    this.view.display!.sort = sorting;
    return this;
  }

  updateSorter = (column: string, value: boolean) => {
    this.view.display = this.view.display || {};
    this.view.display.sort =
      this.view.display.sort?.map((sorter) => {
        if (sorter.id !== column) {
          return sorter;
        }
        return Object.assign({}, sorter, { desc: value });
      }) || [];
    if (!this.view.display.sort?.find((sorter) => sorter.id === column)) {
      this.view.display.sort = this.view.display.sort?.concat({ id: column, desc: false });
    }
  };

  getExpanded(): ExpandedState {
    return this.view.display?.expanded || {};
  }

  setExpanded(expanded: ExpandedState) {
    this.view.display!.expanded = expanded;
    return this;
  }

  getVisibility(): VisibilityState {
    return this.view.display?.visibility || {};
  }

  setVisibility(visibility: VisibilityState) {
    this.view.display!.visibility = visibility;
    return this;
  }

  updateVisibility(column: string, visible: boolean) {
    this.view.display = this.view.display || {};
    this.view.display.visibility = Object.assign({}, this.view.display?.visibility || {}, {
      [column]: visible,
    });
  }

  getFilter(filter: string) {
    return this.#filterValues.get(filter);
  }

  addFilter(filter: ViewFilter) {
    if (this.#filterValues.has(filter.column)) {
      this.updateFilter(filter);
    }

    const newFilter: ViewFilterWithSet = Object.assign({}, filter, {
      value: new SvelteSet(filter.value),
    });

    this.#filterValues.set(filter.column, newFilter);
  }

  updateFilter(filter: Partial<ViewFilter>, replace: boolean = false) {
    if (!filter.column) {
      return;
    }

    if (!this.#filterValues.has(filter.column)) {
      return;
    }

    this.#filterValues.set(
      filter.column,
      replace
        ? (filter as ViewFilterWithSet)
        : Object.assign(
            {},
            this.#filterValues.get(filter.column),
            Object.assign(
              {},
              filter,
              filter.value
                ? {
                    value: new SvelteSet(filter.value),
                  }
                : {}
            )
          )
    );
  }

  removeFilter(filter: string) {
    this.#filterValues.delete(filter);
  }

  getFilterFn(column: string) {
    return this.#filterValues.get(column)?.filter;
  }

  getFilterValue(column: string) {
    return this.#filterValues.get(column)?.value || new Set();
  }

  getAllFilteredColumns() {
    return this.#filterValues.keys().toArray();
  }

  getAllFilterValues() {
    return Array.from(this.#filterValues.values()).map((filter) =>
      Object.assign({}, filter, { value: Array.from(filter.value) })
    );
  }

  getAllFilterValuesSet() {
    return this.#filterValues;
  }

  addFilterValue(filter: string, value: unknown) {
    if (!this.#filterValues.has(filter)) {
      return;
    }

    const thisFilter = this.#filterValues.get(filter);
    if (!thisFilter) {
      return;
    }

    thisFilter.value.add(value);
  }

  removeFilterValue(filter: string, value: unknown) {
    if (!this.#filterValues.has(filter)) {
      return;
    }

    const thisFilter = this.#filterValues.get(filter);
    if (!thisFilter) {
      return;
    }

    thisFilter.value.delete(value);
  }

  clearFilterValue(filter: string) {
    if (!this.#filterValues.has(filter)) {
      return;
    }

    const thisFilter = this.#filterValues.get(filter);
    if (!thisFilter) {
      return;
    }

    thisFilter.value.clear();
  }

  toggleFilterValue(filter: string, value: unknown) {
    if (!this.#filterValues.has(filter)) {
      return;
    }

    const thisFilter = this.#filterValues.get(filter);
    if (!thisFilter) {
      return;
    }

    if (thisFilter.value.has(value)) {
      thisFilter.value.delete(value);
    } else {
      thisFilter.value.add(value);
    }
  }

  reset() {
    if (this.initial) {
      // Setting `this.view = this.initial` seems to break the state resulting
      // in missing "views" in the toolbar.
      this.view.name = this.initial.name;
      this.view.description = this.initial.description;
      this.view.display = this.initial.display || {};
      this.view.display.grouping = this.initial.display?.grouping;
      this.view.display.sort = this.initial.display?.sort;
      this.view.display.expanded = this.initial.display?.expanded;
      this.view.display.visibility = this.initial.display?.visibility;
      this.view.filters = this.initial.filters;
      this.view.dirty = false;
      this.#filterValues = new SvelteMap<string, ViewFilterWithSet>(
        (
          this.view.filters as Array<Omit<ViewFilterWithSet, "view"> & { view?: Array<unknown> }>
        ).map((filter) => [
          filter.column,
          Object.assign({}, filter, {
            value: new SvelteSet(filter.value || []),
          }),
        ])
      );
    }
  }

  async saveView() {
    this.view.filters = $state
      .snapshot(this.#filterValues)
      .values()
      .toArray()
      .map((filter) => {
        return Object.assign({}, filter, { value: Array.from(filter.value) });
      });
    this.initial = $state.snapshot(this.view);
    await orpc().views.save(this.view);
  }

  async deleteView() {
    await orpc().views.removeMany({ entities: [this.view.id] });
  }
}
