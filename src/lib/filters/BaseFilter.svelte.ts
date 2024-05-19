import type EntityFilter from '$lib/components/filters/EntityFilter.svelte';
import type TextFilter from '$lib/components/filters/TextFilter.svelte';
import type MultipleEntityFilter from '$lib/components/filters/MultipleEntityFilter.svelte';
import type { ComponentProps, SvelteComponent } from 'svelte';
import type { FilterMeta, Row } from '@tanstack/table-core';
import type { TransactionsFormat } from '$lib/components/types';
import type DateFilter from '$lib/components/filters/DateFilter.svelte';
import type DateRangeFilter from '$lib/components/filters/DateRangeFilter.svelte';
import type NumberTextFilter from '$lib/components/filters/NumberTextFilter.svelte';

export type Selected<Value> = {
  value: Value;
  label?: string | undefined;
};

export interface FilterOperator {
  value: string;
  label: string;
  /**
   * The UI component associated with this FilterOperator.
   */
  component:
    | typeof EntityFilter
    | typeof MultipleEntityFilter
    | typeof TextFilter
    | typeof DateFilter
    | typeof DateRangeFilter
    | typeof NumberTextFilter;
  passes?: (
    row: Row<TransactionsFormat>,
    columnId: string,
    value: unknown,
    new_value: { value: any } | { value: any }[],
    addMeta?: (meta: FilterMeta) => void
  ) => boolean;
}

export interface SelectedFilterOperator extends Object {
  operator: string | undefined;
  value: unknown;
}

export abstract class BaseFilter {
  abstract id: string;
  abstract label: string;

  /**
   * An object of operators indexed by their ID.
   */
  abstract availableOperators: Record<string, FilterOperator>;

  accessorFn: (row: any) => any = () => {};

  static massageValues(
    row: Row<TransactionsFormat>,
    columnId: string,
    value: unknown,
    new_value: { value: any } | { value: any }[],
    accessorFn?: (row: any) => any
  ): [any, any[]] {
    if (!Array.isArray(new_value)) {
      new_value = [new_value];
    }

    value = accessorFn?.length ? accessorFn(row.getValue(columnId)) : row.getValue(columnId);

    return [value, new_value];
  }
}

export type FilterType = {
  id: string;
  label: string;
  availableOperators: Record<string, FilterOperator>;
  props: ComponentProps<SvelteComponent<Record<string, FilterOperator>>>;
  accessorFn: (value: any) => any;
};
