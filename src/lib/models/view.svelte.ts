import type { View as ViewSchema } from '$lib/schema';
import { trpc } from '$lib/trpc/client';
import type { ViewFilter, ViewFilterWithSet } from '$lib/types';
import deeplyEqual, { equalArray } from '$lib/utils';
import type { ExpandedState, GroupingState, SortingState } from '@tanstack/table-core';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

export default class View {
  view: ViewSchema = $state() as ViewSchema;
  initial?: ViewSchema;
  #filterValues: SvelteMap<string, ViewFilterWithSet> = $state(new SvelteMap());
  dirty: boolean = $derived.by(() => {
    this.#filterValues;
    return (
      this.view.name !== this.initial?.name ||
      this.view.description !== this.initial.description ||
      !equalArray(this.view.display?.grouping || [], this.initial.display?.grouping || []) ||
      !equalArray(this.view.display?.sort || [], this.initial.display?.sort || []) ||
      !deeplyEqual(this.view.display?.expanded, this.initial.display?.expanded) ||
      // Same filter count?
      this.#filterValues.size !== this.initial.filters?.length ||
      // Same filters?
      !equalArray(
        this.#filterValues.keys().toArray(),
        this.initial.filters.map((filter) => filter.column)
      ) ||
      this.#filterValues.values().some(({ column, value }) => {
        return value.isDisjointFrom(
          new Set(this.initial?.filters?.find((filter) => filter.column === column)?.value)
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
      expanded: {}
    };

    this.initial = view;
    this.#filterValues = new SvelteMap<string, ViewFilterWithSet>(
      (this.view.filters as Array<Omit<ViewFilterWithSet, 'view'> & { view?: Array<unknown> }>).map(
        (filter) => [
          filter.column,
          Object.assign({}, filter, {
            value: new SvelteSet(filter.value || [])
          })
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

  getExpanded(): ExpandedState {
    return this.view.display?.expanded || {};
  }

  setExpanded(expanded: ExpandedState) {
    this.view.display!.expanded = expanded;
    return this;
  }

  getFilter(filter: string) {
    return this.#filterValues.get(filter);
  }

  addFilter(filter: ViewFilter) {
    if (this.#filterValues.has(filter.column)) {
      this.updateFilter(filter);
    }

    const newFilter: ViewFilterWithSet = Object.assign({}, filter, {
      value: new SvelteSet(filter.value)
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
            Object.assign({}, filter, {
              value: new SvelteSet(filter.value)
            })
          )
    );
  }

  removeFilter(filter: string) {
    this.#filterValues.delete(filter);
  }

  getFilterValue(column: string) {
    return this.#filterValues.get(column)?.value || new Set();
  }

  getAllFilteredColumns() {
    return this.#filterValues.keys();
  }

  getAllFilterValues() {
    return Array.from(this.#filterValues.values());
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
      this.view = this.initial;
      this.#filterValues = new SvelteMap<string, ViewFilterWithSet>(
        (
          this.view.filters as Array<Omit<ViewFilterWithSet, 'view'> & { view?: Array<unknown> }>
        ).map((filter) => [
          filter.column,
          Object.assign({}, filter, {
            value: new SvelteSet(filter.value || [])
          })
        ])
      );
    }
  }

  async saveView() {
    // id, name, description, icon, filters, display;
    await trpc().viewsRoutes.save.mutate({
      ...this.view,
      filters:
        this.view.filters?.map((filter) => ({
          ...filter,
          value: Array.from(filter.value)
        })) || null
    });
    this.initial = $state.snapshot(this.view);
    this.#filterValues = new SvelteMap<string, ViewFilterWithSet>(
      (this.view.filters as Array<Omit<ViewFilterWithSet, 'view'> & { view?: Array<unknown> }>).map(
        (filter) => [
          filter.column,
          Object.assign({}, filter, {
            value: new SvelteSet(filter.value || [])
          })
        ]
      )
    );
  }
}
