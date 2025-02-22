import { BaseFilter, type FilterType, type FilterOperator } from "./BaseFilter.svelte";
import type { ComponentProps, SvelteComponent } from "svelte";
import type { Row } from "@tanstack/table-core";
import type { TransactionsFormat } from "$lib/components/types";
import DateFilterComponent from "$lib/components/filters/DateFilter.svelte";
import DateRangeFilterComponent from "$lib/components/filters/DateRangeFilter.svelte";
import type { DateValue } from "@internationalized/date";
import type { DateRange } from "bits-ui";

export type DateFilterType = FilterType;

export class DateFilter extends BaseFilter {
  id = "date";
  label = "Date";
  props: ComponentProps<SvelteComponent<Record<string, unknown>>>;

  availableOperators: Record<string, FilterOperator> = {
    on: {
      value: "on",
      label: "On",
      component: DateFilterComponent,
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
          return (
            (massaged_value as DateValue).compare(massaged_new_value[0] as unknown as DateValue) ===
            0
          );
        }
        return true;
      },
    },
    before: {
      value: "before",
      label: "Before",
      component: DateFilterComponent,
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
          return (
            (massaged_value as DateValue).compare(massaged_new_value[0] as unknown as DateValue) < 0
          );
        }
        return true;
      },
    },
    after: {
      value: "after",
      label: "After",
      component: DateFilterComponent,
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
          return (
            (massaged_value as DateValue).compare(massaged_new_value[0] as unknown as DateValue) > 0
          );
        }
        return true;
      },
    },
    between: {
      value: "between",
      label: "Between",
      component: DateRangeFilterComponent,
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
          const range = massaged_new_value[0] as unknown as DateRange;
          if (range.start && range.end) {
            return (
              (massaged_value as DateValue).compare(range.start as unknown as DateValue) > 0 &&
              (massaged_value as DateValue).compare(range.end as unknown as DateValue) < 0
            );
          }
        }
        return true;
      },
    },
  };

  constructor(
    props: ComponentProps<SvelteComponent<Record<string, unknown>>>,
    accessorFn: (row: unknown) => unknown
  ) {
    super();
    this.props = props;
    this.accessorFn = accessorFn;
  }
}
