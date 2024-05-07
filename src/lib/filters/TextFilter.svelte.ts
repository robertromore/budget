import {
  BaseFilter,
  type FilterType,
  type FilterOperator
} from './BaseFilter.svelte';
import type { ComponentProps, SvelteComponent } from 'svelte';
import TextFilterComponent from '$lib/components/filters/TextFilter.svelte';
import type { FilterMeta, Row } from '@tanstack/table-core';
import type { TransactionsFormat } from '$lib/components/types';
import { rankItem } from '@tanstack/match-sorter-utils';

export type TextFilterType = FilterType;

export class TextFilter extends BaseFilter {
  id: string = 'string';
  label: string = 'String';
  props: ComponentProps<SvelteComponent<Record<string, any>>> = {};

  availableOperators: Record<string, FilterOperator> = {
    fuzzy: {
      value: 'fuzzy',
      label: 'fuzzy',
      component: TextFilterComponent,
      passes: (
        row: Row<TransactionsFormat>,
        columnId: string,
        value: unknown,
        new_value: { value: any } | { value: any }[],
        addMeta?: (meta: FilterMeta) => void
      ) => {
        if (!Array.isArray(new_value)) {
          new_value = [new_value];
        }

        const rowValue = row.getValue(columnId);
        if (rowValue) {
          value = this.accessorFn.length > 0 ? this.accessorFn(rowValue) : rowValue;

          // Rank the item
          const itemRank = rankItem(value, new_value[0] as unknown as string);
          if (addMeta) {
            addMeta({ itemRank });
          }
          return itemRank.passed;
        }
        return true;
      }
    },
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
        [value, new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );
        if (new_value && new_value[0]) {
          if (!value) {
            return false;
          }
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
        [value, new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );
        if (new_value && new_value[0]) {
          if (!value) {
            return false;
          }
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
        [value, new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );
        if (new_value && new_value[0]) {
          if (!value) {
            return false;
          }
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
        [value, new_value] = BaseFilter.massageValues(
          row,
          columnId,
          value,
          new_value,
          this.accessorFn
        );
        if (new_value && new_value[0]) {
          if (!value) {
            return false;
          }
          return (value as string)
            .toLowerCase()
            .endsWith((new_value[0] as unknown as string).toLowerCase());
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
