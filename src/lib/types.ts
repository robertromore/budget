import type { Category, Payee } from "$lib/schema";
import type { DateValue } from "@internationalized/date";
import type { Component } from "svelte";
import type { RenderComponentConfig } from "./components/ui/data-table/render-helpers";
import type {
  Column,
  ExpandedState,
  GroupingState,
  SortingState,
  VisibilityState,
} from "@tanstack/table-core";
import type { SvelteSet } from "svelte/reactivity";

export type EditableBooleanItem = {
  value: boolean;
};
export type EditableDateItem = DateValue;
export type EditableEntityItem = {
  id: number;
  name: string | null;
  [key: string]: unknown;
};
export type EditableNumericItem = {
  value: number | null;
  formatted: string | null;
};
export type SelectableEditableEntity = {
  value: string;
  label: string;
};
export type TransactionsFormat = {
  id: number;
  amount: number;
  date: DateValue;
  payeeId: number | null;
  payee: Payee | null;
  notes: string | null;
  category: Category | null;
  categoryId: number | null;
  status: "cleared" | "pending" | "scheduled" | null;
  accountId: number;
  parentId: number | null;
};

export type AvailableFiltersEntry = {
  id: string;
  label: string;
};
export type AvailableFilters = Array<AvailableFiltersEntry>;

export type UpdateDataFn = (value: unknown) => void;

export type ViewFilter = {
  column: string;
  filter: string;
  value: unknown[];
};

export type ViewFilterWithSet = ViewFilter & {
  value: SvelteSet<unknown>;
};

export type FacetedFilterOption = {
  label: string;
  value: string;
  icon?: Component;
};

export type FilterInputOption<T> = {
  name: string;
  icon?: Component;
  component: () => RenderComponentConfig<Component<{}, {}, "">>;
  column: Column<T, unknown>;
  value: unknown[];
};

export type ViewDisplayState = {
  [key: string]: any;
  grouping?: GroupingState;
  sort?: SortingState;
  expanded?: ExpandedState;
  visibility?: VisibilityState;
};
