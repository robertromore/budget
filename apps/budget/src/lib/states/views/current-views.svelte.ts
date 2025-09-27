import type { TransactionsFormat, ViewFilter } from "$lib/types";
import type { Table } from "@tanstack/table-core";
import { Context } from "runed";
import { SvelteMap } from "svelte/reactivity";
import { CurrentViewState } from "./current-view.svelte";

/**
 * A state class representing multiple active views.
 */
export class CurrentViewsState<T> {
  viewsStates: SvelteMap<number, CurrentViewState<T>> = new SvelteMap() as SvelteMap<
    number,
    CurrentViewState<T>
  >;
  activeViewId: number = $state() as number;
  activeView: CurrentViewState<T> = $derived(this.viewsStates.get(this.activeViewId))!;
  previousViewId: number | undefined = $state();

  editableViews = $derived(
    Array.from(this.viewsStates
      .values())
      .filter((viewState) => viewState.view.id > 0)
  );
  nonEditableViews = $derived(
    Array.from(this.viewsStates
      .values())
      .filter((viewState) => viewState.view.id < 0)
  );

  constructor(viewsStates: CurrentViewState<T>[] | null) {
    if (viewsStates) {
      this.viewsStates = new SvelteMap(
        viewsStates.map((viewsState) => [viewsState.view.id, viewsState])
      );
      this.activeViewId = viewsStates[0]?.view.id ?? -100;
    }
  }

  add(viewState: CurrentViewState<T>, active: boolean = true) {
    this.viewsStates.set(viewState.view.id, viewState);
    if (active) {
      this.activeViewId = viewState.view.id;
    }
    return this;
  }

  get(id: number | number[]) {
    if (Array.isArray(id)) {
      return Array.from(this.viewsStates
        .values())
        .filter((viewState) => id.includes(viewState.view.id));
    }
    return Array.from(this.viewsStates.values()).find((viewState) => viewState.view.id === id);
  }

  remove(viewState: CurrentViewState<T> | number, setFirstToActive: boolean = true) {
    let _viewState;
    if (typeof viewState === "number") {
      _viewState = this.viewsStates.get(viewState);
      this.viewsStates.delete(viewState);
    } else {
      _viewState = viewState;
      this.viewsStates.delete((viewState as CurrentViewState<T>).view.id);
    }

    _viewState?.view.deleteView();

    if (setFirstToActive) {
      this.setActive(this.viewsStates.values().next().value!);
    }
    return this;
  }

  setActive(viewState: CurrentViewState<T> | number) {
    let targetViewState: CurrentViewState<T>;

    if (typeof viewState === "number") {
      this.activeViewId = viewState;
      targetViewState = this.viewsStates.get(viewState)!;
    } else {
      this.activeViewId = (viewState as CurrentViewState<T>).view.id;
      targetViewState = viewState as CurrentViewState<T>;
    }

    // Apply table updates synchronously to ensure filter UI displays correctly
    targetViewState.updateTableFilters();
    targetViewState.updateTableState();

    return this;
  }

  addTemporaryView = (table: Table<T>) => {
    this.previousViewId = this.activeView.view.id;

    // Get current filters directly from table columns to preserve complex values
    const tableFilters: ViewFilter[] = [];
    table.getVisibleFlatColumns()
      .filter((column) => column.getCanFilter())
      .forEach((column) => {
        const filterValue = column.getFilterValue();
        if (filterValue !== undefined) {
          // Get the filter function name from the current view
          const filterFn = this.activeView.view.getFilterFn(column.id) || '';

          // Handle different filter types appropriately
          let value: unknown[];
          if (filterFn === 'amountFilter' && typeof filterValue === 'object' && filterValue !== null) {
            // For amount filters, wrap the single object in an array
            value = [filterValue];
          } else if (filterValue instanceof Set) {
            // For Set values, convert to array
            value = Array.from(filterValue);
          } else if (Array.isArray(filterValue)) {
            // Already an array
            value = filterValue;
          } else {
            // Single value, wrap in array
            value = [filterValue];
          }

          tableFilters.push({
            column: column.id,
            filter: filterFn,
            value: value
          });
        }
      });


    const newViewState = new CurrentViewState(
      {
        id: 0,
        name: "",
        description: "",
        icon: null,
        filters: tableFilters,
        display: {},
        dirty: true,
      },
      table
    );

    this.add(newViewState).setActive(0);

    // Apply the copied filters to the table
    newViewState.updateTableFilters();

  };

  removeTemporaryView = () => {
    this.remove(0, false);
    if (this.previousViewId !== undefined) {
      this.setActive(this.previousViewId);
      this.previousViewId = undefined;
    }
  };
}

export const currentViews = new Context<CurrentViewsState<TransactionsFormat>>("current_views");
