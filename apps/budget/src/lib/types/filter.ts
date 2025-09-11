// $lib/types/filter.ts
import type {Column} from "@tanstack/table-core";
import type {SvelteSet} from "svelte/reactivity";
import type {RenderComponentConfig} from "$ui/lib/components/ui/data-table";
import type {Component} from "svelte";

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
export type ViewFilterWithSet = ViewFilter & {value: SvelteSet<unknown>};

/**
 * A faceted filter option shown in the UI (icon + text).
 */
export type FacetedFilterOption = {
  label: string;
  value: string;
  icon?: Component;
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
};
