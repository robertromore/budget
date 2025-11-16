import type { TransactionsFormat } from "$lib/types";
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
    Array.from(this.viewsStates.values()).filter((viewState) => !viewState.view.isDefault)
  );
  nonEditableViews = $derived(
    Array.from(this.viewsStates.values()).filter((viewState) => viewState.view.isDefault)
  );

  constructor(viewsStates: CurrentViewState<T>[] | null) {
    if (viewsStates) {
      this.viewsStates = new SvelteMap(
        viewsStates.map((viewsState) => [viewsState.view.id, viewsState])
      );
      this.activeViewId = viewsStates[0]?.view.id || -100;
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
      return Array.from(this.viewsStates.values()).filter((viewState) =>
        id.includes(viewState.view.id)
      );
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
    if (typeof viewState === "number") {
      this.activeViewId = viewState;
    } else {
      this.activeViewId = (viewState as CurrentViewState<T>).view.id;
    }

    this.activeView.updateTableFilters();
    this.activeView.updateTableState();
    return this;
  }

  addTemporaryView = (table: Table<T>) => {
    this.previousViewId = this.activeView.view.id;
    this.add(
      new CurrentViewState(
        {
          id: 0,
          workspaceId: this.activeView.view.view.workspaceId,
          entityType: this.activeView.view.view.entityType,
          name: "",
          description: "",
          icon: null,
          filters: [],
          display: {},
          dirty: true,
          isDefault: false,
        },
        table
      )
    ).setActive(0);
  };

  removeTemporaryView = () => {
    this.remove(0, false);
    if (this.previousViewId !== undefined) {
      this.setActive(this.previousViewId);
    }
    this.previousViewId = undefined;
  };
}

export const currentViews = new Context<CurrentViewsState<TransactionsFormat>>("current_views");
