import {
  BaseFilter,
  type FilterType,
  type FilterOperator,
  type SelectedFilterOperator
} from './BaseFilter.svelte';
import type { ComponentProps, SvelteComponent } from 'svelte';
import TextFilterComponent from '$lib/components/filters/TextFilter.svelte';
import type { Row } from '@tanstack/table-core';
import type { TransactionsFormat } from '$lib/components/types';

export type EntityFilterType = FilterType;

export class TextFilter extends BaseFilter {
  id: string = 'string';
  label: string = 'String';
  props: ComponentProps<SvelteComponent<Record<string, any>>>;

  availableOperators: Record<string, FilterOperator> = {
    contains: {
      value: 'contains',
      label: 'contains',
      component: TextFilterComponent,
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: any } | { value: any }[]
      ) => {
        if (!Array.isArray(new_value)) {
          new_value = [new_value];
        }

        value = this.accessorFn(row.getValue(columnId));
        if (new_value && new_value[0]) {
          return (value as string)
            .toLowerCase()
            .includes((new_value[0] as unknown as string).toLowerCase());
        }
        return true;
      }
    },
    does_not_contain: {
      value: 'does_not_contain',
      label: "doesn't contain",
      component: TextFilterComponent,
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: any } | { value: any }[]
      ) => {
        if (!Array.isArray(new_value)) {
          new_value = [new_value];
        }

        value = this.accessorFn(row.getValue(columnId));
        if (new_value && new_value[0]) {
          return !(value as string)
            .toLowerCase()
            .includes((new_value[0] as unknown as string).toLowerCase());
        }
        return true;
      }
    },
    starts_with: {
      value: 'starts_with',
      label: 'starts with',
      component: TextFilterComponent,
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: any } | { value: any }[]
      ) => {
        if (!Array.isArray(new_value)) {
          new_value = [new_value];
        }

        value = this.accessorFn(row.getValue(columnId));
        if (new_value && new_value[0]) {
          return (value as string)
            .toLowerCase()
            .startsWith((new_value[0] as unknown as string).toLowerCase());
        }
        return true;
      }
    },
    ends_with: {
      value: 'ends_with',
      label: 'ends with',
      component: TextFilterComponent,
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: any } | { value: any }[]
      ) => {
        if (!Array.isArray(new_value)) {
          new_value = [new_value];
        }

        value = this.accessorFn(row.getValue(columnId));
        if (new_value && new_value[0]) {
          return (value as string)
            .toLowerCase()
            .endsWith((new_value[0] as unknown as string).toLowerCase());
        }
        return true;
      }
    }
  };

  constructor(
    props: ComponentProps<SvelteComponent<Record<string, any>>>,
    accessorFn: (row: any) => any
  ) {
    super();
    this.props = props;
    this.accessorFn = accessorFn;
  }
}
