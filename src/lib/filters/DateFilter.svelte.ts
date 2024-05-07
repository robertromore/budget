import { BaseFilter, type FilterType, type FilterOperator } from './BaseFilter.svelte';
import type { ComponentProps, SvelteComponent } from 'svelte';
import type { Row } from '@tanstack/table-core';
import type { TransactionsFormat } from '$lib/components/types';
import DateFilterComponent from '$lib/components/filters/DateFilter.svelte';
import DateRangeFilterComponent from '$lib/components/filters/DateRangeFilter.svelte';
import type { DateValue } from '@internationalized/date';
import type { DateRange } from 'bits-ui';

export type DateFilterType = FilterType;

export class DateFilter extends BaseFilter {
  id: string = 'date';
  label: string = 'Date';
  props: ComponentProps<SvelteComponent<Record<string, any>>>;

  availableOperators: Record<string, FilterOperator> = {
    before: {
      value: 'before',
      label: 'Before',
      component: DateFilterComponent,
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: any } | { value: any }[],
      ) => {
        [value, new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );
        if (new_value && new_value[0]) {
          return (value as DateValue).compare(new_value[0] as unknown as DateValue) < 0;
        }
        return true;
      }
    },
    after: {
      value: 'after',
      label: 'After',
      component: DateFilterComponent,
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
        if (new_value && new_value[0]) {
          return (value as DateValue).compare(new_value[0] as unknown as DateValue) > 0;
        }
        return true;
      }
    },
    between: {
      value: 'between',
      label: 'Between',
      component: DateRangeFilterComponent,
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
        if (new_value && new_value[0]) {
          const range = new_value[0] as unknown as DateRange;
          if (range.start && range.end) {
            return (
              (value as DateValue).compare(range.start as unknown as DateValue) > 0 &&
              (value as DateValue).compare(range.end as unknown as DateValue) < 0
            );
          }
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
