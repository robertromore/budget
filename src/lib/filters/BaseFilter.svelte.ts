import type EntityFilter from '$lib/components/filters/EntityFilter.svelte';
import type TextFilter from '$lib/components/filters/TextFilter.svelte';
import type MultipleEntityFilter from '$lib/components/filters/MultipleEntityFilter.svelte';
import type { ComponentProps, ComponentType, SvelteComponent } from 'svelte';
import type { FilterMeta, Row } from '@tanstack/table-core';
import type { TransactionsFormat } from '$lib/components/types';
import type DateFilter from '$lib/components/filters/DateFilter.svelte';
import type DateRangeFilter from '$lib/components/filters/DateRangeFilter.svelte';

export type Selected<Value> = {
  value: Value;
  label?: string | undefined;
};

enum FilterVerb {
  IS = 'is',
  IS_NOT = 'is not',
  INCLUDE_ALL = 'include all of',
  INCLUDE_ANY = 'include any of',
  EXCLUDE_ALL = 'exclude all if',
  EXCLUDE_ANY = 'exclude any if',
  BEFORE = 'before',
  AFTER = 'after',
  IN = 'in',
  NOT_IN = 'not in',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'does not contain',
  BETWEEN = 'between'
};

type DeclarativeFilter = {
  subject: unknown;
  complement: unknown;
  verb: FilterVerb;
};

export type WithIdAndLabel = {
  id: string;
  label: string;
}

export interface FilterWidget extends WithIdAndLabel {
  component:
    | typeof EntityFilter
    | typeof MultipleEntityFilter
    | typeof TextFilter
    | typeof DateFilter
    | typeof DateRangeFilter;
  props: ComponentProps<SvelteComponent<Record<string, FilterOperator>>>;
  icon: string;
}

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
    | typeof DateRangeFilter;
  widgets?: FilterWidget[];
  passes?: (
    row: Row<TransactionsFormat>,
    columnId: string,
    value: unknown,
    new_value: { value: any } | { value: any }[],
    addMeta?: (meta: FilterMeta) => void
  ) => boolean;
}

export interface SelectedFilterOperator {
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

export interface FilterType extends WithIdAndLabel {
  availableOperators: Record<string, FilterOperator>;
  props: ComponentProps<SvelteComponent<Record<string, FilterOperator>>>;
  accessorFn: (value: any) => any;
};
