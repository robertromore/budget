import { BaseFilter, type FilterType, type FilterOperator } from './BaseFilter.svelte';
import type { ComponentProps, SvelteComponent } from 'svelte';
import EntityFilterComponent from '$lib/components/filters/EntityFilter.svelte';
import MultipleEntityFilter from '$lib/components/filters/MultipleEntityFilter.svelte';
import type { Row } from '@tanstack/table-core';
import type { TransactionsFormat } from '$lib/components/types';

export type EntityFilterType = FilterType;

export class EntityFilter extends BaseFilter {
  id = 'entity';
  label = 'Entity';
  props: ComponentProps<SvelteComponent<Record<string, unknown>>>;

  availableOperators: Record<string, FilterOperator> = {
    is: {
      value: 'is',
      label: 'is',
      component: EntityFilterComponent,
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: unknown } | { value: unknown }[]
      ) => {
        const [massaged_value, massaged_new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );

        if (massaged_new_value?.[0]) {
          return massaged_value === massaged_new_value[0].value;
        }
        return true;
      }
    },
    is_not: {
      value: 'is_not',
      label: 'is not',
      component: EntityFilterComponent,
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: unknown } | { value: unknown }[]
      ) => {
        const [massaged_value, massaged_new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );

        if (massaged_new_value) {
          return value !== massaged_new_value[0].value;
        }
        return true;
      }
    },
    one_of: {
      value: 'one_of',
      label: 'one of',
      component: MultipleEntityFilter,
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: unknown } | { value: unknown }[]
      ) => {
        const [massaged_value, massaged_new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );

        if (!massaged_new_value.length) {
          return true;
        }
        if (massaged_new_value) {
          return massaged_new_value.map((fv) => fv.value).includes(value as string);
        }
        return true;
      }
    },
    not_one_of: {
      value: 'not_one_of',
      label: 'not one of',
      component: MultipleEntityFilter,
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: unknown } | { value: unknown }[]
      ) => {
        const [massaged_value, massaged_new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );

        if (massaged_new_value) {
          return !massaged_new_value.map((fv) => fv.value).includes(value as string);
        }
        return true;
      }
    }
  };

  constructor(
    props: ComponentProps<SvelteComponent<Record<string, unknown>>>,
    accessorFn: (row: unknown) => unknown
  ) {
    super();
    this.props = props;
    this.accessorFn = accessorFn;

    // Set the label to the value of props.label.
    this.label = props.label as string || 'Entity';
  }
}
