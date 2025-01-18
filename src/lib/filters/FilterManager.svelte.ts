import { mergeObjects } from '$lib/utils';
import type { FilterMeta, Row } from '@tanstack/table-core';
import type { FilterOperator, FilterType, SelectedFilterOperator } from './BaseFilter.svelte';
import type { TransactionsFormat } from '$lib/components/types';

export class FilterManager {
  filters: FilterType[] | undefined = $state([]);
  selectedOperators: SelectedFilterOperator[] = $state([
    {
      operator: undefined,
      value: undefined
    }
  ]);
  idx: number = $state(0);

  getFilter(filter_id: string) {
    return this.filters?.find((filter: FilterType) => filter.id === filter_id);
  }

  setSelectedOperator(operator: SelectedFilterOperator, idx: number | undefined = this.idx) {
    this.selectedOperators[idx] = operator;
  }

  addSelectedOperator() {
    this.selectedOperators[++this.idx] = {
      operator: undefined,
      value: undefined
    };
  }

  removeSelectedOperator(idx: number | undefined = this.idx) {
    this.selectedOperators.splice(idx, 1);
    --this.idx;
  }

  updateSelectedOperator(
    partial: Partial<SelectedFilterOperator>,
    idx: number | undefined = this.idx
  ) {
    this.selectedOperators[idx] = Object.assign({}, this.selectedOperators[idx], partial);
  }

  passes(
    row: Row<TransactionsFormat>,
    columnId: string,
    value: unknown,
    addMeta: (meta: FilterMeta) => void
  ): boolean {
    return this.selectedOperators.every((operator: SelectedFilterOperator) => {
      if (operator.operator === undefined && operator.value === undefined) {
        return true;
      }

      if (operator.operator) {
        if (operator.value === undefined) {
          return true;
        }
        const [filter_id] = operator.operator.split(':');
        const actualOperator: FilterOperator =
          this.availableOperators[filter_id][operator.operator];
        if (actualOperator.passes && operator.value !== undefined) {
          return actualOperator.passes(row, columnId, value, operator.value, addMeta);
        }
      }
      return false;
    });
  }

  get size(): number {
    return this.idx;
  }

  get availableOperators() {
    const allAvailable = this.filters?.reduce(
      (all, next) => Object.assign(all, { [next.id]: next.availableOperators }),
      {}
    );
    const merged: Record<string, Record<string, FilterOperator>> = {};
    if (allAvailable) {
      Object.entries(allAvailable).map(
        ([id, ops]: [string, Record<string, FilterOperator> | unknown]) => {
          merged[id] = merged[id] || {};
          if (ops) {
            Object.keys(ops).map((key: string) => {
              merged[id][`${id}:${key}`] = ops[key as keyof typeof ops];
            });
          }
        }
      );
    }
    return merged;
  }

  getFilterComponent(id: string) {
    const [filter_id, operator_id] = id.split(':');
    return this.filters?.find((value: FilterType) => value.id === filter_id)?.availableOperators[
      operator_id
    ].component;
  }

  getFilterProps(id: string) {
    const [filter_id, operator_id] = id.split(':');
    const filter = this.filters?.find((value: FilterType) => value.id === filter_id);
    const operator = this.filters?.find((value: FilterType) => value.id === filter_id)
      ?.availableOperators[operator_id];
    return operator?.transformProps ? operator?.transformProps(filter?.props) : filter?.props;
  }

  constructor(filters: FilterType[] | undefined) {
    this.filters = filters;
  }
}
