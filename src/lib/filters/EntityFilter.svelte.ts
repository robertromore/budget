import { BaseFilter, type FilterType, type FilterOperator } from './BaseFilter.svelte';
import type { ComponentProps, SvelteComponent } from 'svelte';
import EntityFilterComponent from '$lib/components/filters/EntityFilter.svelte';
import MultipleEntityFilter from '$lib/components/filters/MultipleEntityFilter.svelte';
import type { Row } from '@tanstack/table-core';
import type { TransactionsFormat } from '$lib/components/types';
import EntitySelectWidget from './widgets/EntitySelectWidget';
import EntityTextWidget from './widgets/EntityTextWidget';

export type EntityFilterType = FilterType;

export class EntityFilter extends BaseFilter {
  id: string = 'entity';
  label: string = 'Entity';
  props: ComponentProps<SvelteComponent<Record<string, any>>>;

  availableOperators: Record<string, FilterOperator> = {
    is: {
      value: 'is',
      label: 'is',
      component: EntityFilterComponent,
      widgets: [EntitySelectWidget, EntityTextWidget],
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

        if (new_value && new_value[0].value) {
          return value === new_value[0].value;
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
        new_value: { value: any } | { value: any }[]
      ) => {
        [value, new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );

        if (new_value) {
          return value !== new_value[0].value;
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
        new_value: { value: any } | { value: any }[]
      ) => {
        [value, new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );

        if (!new_value.length) {
          return true;
        }
        if (new_value) {
          return new_value.map((fv) => fv.value).includes(value as string);
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
        new_value: { value: any } | { value: any }[]
      ) => {
        [value, new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );

        if (new_value) {
          return !new_value.map((fv) => fv.value).includes(value as string);
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
