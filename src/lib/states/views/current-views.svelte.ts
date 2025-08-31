import { SvelteMap } from "svelte/reactivity";
import { CurrentViewState } from "./current-view.svelte";
import { Context } from "runed";
import type { TransactionsFormat } from "$lib/types";
import type { Table } from "@tanstack/table-core";

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
  previousViewId?: number = $state();

  editableViews = $derived(
    this.viewsStates
      .values()
      .filter((viewState) => viewState.view.id > 0)
      .toArray()
  );
  nonEditableViews = $derived(
    this.viewsStates.values().filter((viewState) => viewState.view.id < 0)
  );

  constructor(viewsStates: CurrentViewState<T>[] | null) {
    if (viewsStates) {
      this.viewsStates = new SvelteMap(
        viewsStates.map((viewsState) => [viewsState.view.id, viewsState])
      );
      this.activeViewId = viewsStates[0].view.id;
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
      return this.viewsStates
        .values()
        .filter((viewState) => id.includes(viewState.view.id))
        .toArray();
    }
    return this.viewsStates.values().find((viewState) => viewState.view.id === id);
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

    // Use setTimeout to break the reactive loop by deferring table updates
    setTimeout(() => {
      targetViewState.updateTableFilters();
      targetViewState.updateTableState();
    }, 0);
    
    return this;
  }

  addTemporaryView = (table: Table<T>) => {
    this.previousViewId = this.activeView.view.id;
    this.add(
      new CurrentViewState(
        {
          id: 0,
          name: "",
          description: "",
          icon: null,
          filters: [],
          display: {},
          dirty: true,
        },
        table
      )
    ).setActive(0);
  };

  removeTemporaryView = () => {
    this.remove(0, false);
    if (this.previousViewId) {
      this.setActive(this.previousViewId);
      this.previousViewId = undefined;
    }
  };
}

export const currentViews = new Context<CurrentViewsState<TransactionsFormat>>("current_views");
