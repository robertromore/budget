import { BaseFilter, type FilterType, type FilterOperator } from './BaseFilter.svelte';
import type { ComponentProps, SvelteComponent } from 'svelte';
import NumberTextFilter from '$lib/components/filters/NumberTextFilter.svelte';
import type { Row } from '@tanstack/table-core';
import type { EditableNumericItem, TransactionsFormat } from '$lib/components/types';
import NumberSliderWidget from './widgets/NumberSliderWidget';
import NumberTextWidget from './widgets/NumberTextWidget';

export type NumberFilterType = FilterType;

export class NumberFilter extends BaseFilter {
  id: string = 'number';
  label: string = 'Number';
  props: ComponentProps<SvelteComponent<Record<string, any>>> = {};

  availableOperators: Record<string, FilterOperator> = {
    equals: {
      value: 'equals',
      label: 'equals',
      component: NumberTextFilter,
      widgets: [NumberSliderWidget, NumberTextWidget],
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: any } | { value: any }[]
      ) => {
        [value, new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );

        if (value && new_value && new_value[0]) {
          return (
            parseFloat((value as EditableNumericItem).value as unknown as string) ===
            parseFloat(new_value[0] as unknown as string)
          );
        }
        return true;
      }
    },
    less_than: {
      value: 'less_than',
      label: 'less than',
      component: NumberTextFilter,
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: any } | { value: any }[]
      ) => {
        [value, new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );

        if (value && new_value && new_value[0]) {
          return (
            parseFloat((value as EditableNumericItem).value as unknown as string) <
            parseFloat(new_value[0] as unknown as string)
          );
        }
        return true;
      }
    },
    greater_than: {
      value: 'greater_than',
      label: 'greater than',
      component: NumberTextFilter,
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: any } | { value: any }[]
      ) => {
        [value, new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );

        if (value && new_value && new_value[0]) {
          return (
            parseFloat((value as EditableNumericItem).value as unknown as string) >
            parseFloat(new_value[0] as unknown as string)
          );
        }
        return true;
      }
    }
  };

  constructor(
    props?: ComponentProps<SvelteComponent<Record<string, any>>>,
    accessorFn?: (row: any) => any
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
