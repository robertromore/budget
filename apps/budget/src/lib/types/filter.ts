// $lib/types/filter.ts
import type { TableDensity } from "$lib/components/data-table/state/types";
import type { RenderComponentConfig } from "$lib/components/ui/data-table";
import type { Column } from "@tanstack/table-core";
import type { Component } from "svelte";
import type { SvelteSet } from "svelte/reactivity";

/**
 * The raw filter applied to a column.
 */
export type ViewFilter = {
  column: string;
  filter: string;
  value: unknown[];
};

/**
 * Same as `ViewFilter` but the value is wrapped in a Svelte set.
 */
export type ViewFilterWithSet = ViewFilter & { value: SvelteSet<unknown> };

/**
 * A faceted filter option shown in the UI (icon + text).
 */
export type FacetedFilterOption = {
  label: string;
  value: string;
  icon?: Component;
};

/**
 * Amount filter value with type and range values.
 */
export type AmountFilterValue = {
  type: string;
  value?: number;
  min?: number;
  max?: number;
};

/**
 * A filter that renders a component (date‑picker, multi‑select, …).
 */
export type FilterInputOption<T> = {
  name: string;
  icon?: Component;
  component: () => RenderComponentConfig<Component<{}, {}, "">>;
  column: Column<T, unknown>;
  value: unknown[];
};

/**
 * View‑state that can be serialized / restored.
 */
export type ViewDisplayState = {
  [key: string]: any;
  grouping?: import("@tanstack/table-core").GroupingState;
  sort?: import("@tanstack/table-core").SortingState;
  expanded?: import("@tanstack/table-core").ExpandedState;
  visibility?: import("@tanstack/table-core").VisibilityState;
  pinning?: import("@tanstack/table-core").ColumnPinningState;
  columnOrder?: string[];
  density?: TableDensity;
  stickyHeader?: boolean;
  pageSize?: number;
  viewMode?: "table" | "cards";
};
