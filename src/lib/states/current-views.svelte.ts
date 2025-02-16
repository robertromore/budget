import { SvelteMap } from 'svelte/reactivity';
import { CurrentViewState } from './current-view.svelte';
import { Context } from 'runed';
import type { TransactionsFormat } from '$lib/types';
import type { Table } from '@tanstack/table-core';

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

  constructor(viewsStates: CurrentViewState<T>[] | null) {
    if (viewsStates) {
      this.viewsStates = new SvelteMap(
        viewsStates.map((viewsState) => [viewsState.view.id, viewsState])
      );
      // viewsStates.forEach((viewState) => this.add(viewState));
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

  remove(viewState: CurrentViewState<T> | number) {
    if (typeof viewState === 'number') {
      this.viewsStates.delete(viewState);
    } else {
      this.viewsStates.delete((viewState as CurrentViewState<T>).view.id);
    }
    return this;
  }

  setActive(viewState: CurrentViewState<T> | number) {
    if (typeof viewState === 'number') {
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
          id: -1,
          name: 'New view',
          description: '',
          icon: null,
          filters: [],
          display: {},
          dirty: true
        },
        table
      )
    ).setActive(-1);
  };

  removeTemporaryView = () => {
    this.remove(-1);
    if (this.previousViewId) {
      this.setActive(this.previousViewId);
      this.previousViewId = undefined;
    }
  };
}

export const currentViews = new Context<CurrentViewsState<TransactionsFormat>>('current_views');
