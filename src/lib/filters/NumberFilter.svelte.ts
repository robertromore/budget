import { BaseFilter, type FilterType, type FilterOperator } from './BaseFilter.svelte';
import type { ComponentProps, SvelteComponent } from 'svelte';
import NumberTextFilterComponent from '$lib/components/filters/NumberTextFilter.svelte';
import type { Row } from '@tanstack/table-core';
import type { EditableNumericItem, TransactionsFormat } from '$lib/components/types';
import NumberSliderFilter from '$lib/components/filters/NumberSliderFilter.svelte';

export type NumberFilterType = FilterType;

export class NumberFilter extends BaseFilter {
  id = 'number';
  label = 'Number';
  props: ComponentProps<SvelteComponent<Record<string, unknown>>> = {};

  availableOperators: Record<string, FilterOperator> = {
    equals: {
      value: 'equals',
      label: 'equals',
      component: NumberTextFilterComponent,
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

        if (massaged_value && massaged_new_value && massaged_new_value[0]) {
          return (
            Number.parseFloat(
              (massaged_value as EditableNumericItem).value as unknown as string
            ) === Number.parseFloat(massaged_new_value[0] as unknown as string)
          );
        }
        return true;
      }
    },
    less_than: {
      value: 'less_than',
      label: 'less than',
      component: NumberSliderFilter,
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

        if (massaged_value && massaged_new_value && massaged_new_value[0]) {
          return (
            Number.parseFloat((massaged_value as EditableNumericItem).value as unknown as string) <
            Number.parseFloat(massaged_new_value[0] as unknown as string)
          );
        }
        return true;
      }
    },
    greater_than: {
      value: 'greater_than',
      label: 'greater than',
      component: NumberSliderFilter,
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

        if (massaged_value && massaged_new_value && massaged_new_value[0]) {
          return (
            Number.parseFloat((massaged_value as EditableNumericItem).value as unknown as string) >
            Number.parseFloat(massaged_new_value[0] as unknown as string)
          );
        }
        return true;
      }
    },
    between: {
      value: 'between',
      label: 'between',
      component: NumberSliderFilter,
      transformProps: (props) => {
        return Object.assign({}, props, { useRange: true });
      },
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

        if (massaged_value && massaged_new_value && massaged_new_value[0]) {
          return (
            Number.parseFloat((massaged_value as EditableNumericItem).value as unknown as string) >
              Number.parseFloat(massaged_new_value[0] as unknown as string) &&
            Number.parseFloat((massaged_value as EditableNumericItem).value as unknown as string) <
              Number.parseFloat(massaged_new_value[1] as unknown as string)
          );
        }
        return true;
      }
    }
  };

  constructor(
    props?: ComponentProps<SvelteComponent<Record<string, unknown>>>,
    accessorFn?: (row: unknown) => unknown
  ) {
    super();
    if (props) {
      this.props = props;
    }
    if (accessorFn) {
      this.accessorFn = accessorFn;
    }
  }
}
