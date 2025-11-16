/**
 * Shared types for entity search components
 */

import type { SortOrder } from "./entity-search-state.svelte";

export interface SortOption<TSortBy extends string = string> {
  value: TSortBy;
  label: string;
  order: SortOrder;
}

export interface FilterSummary {
  key: string;
  label: string;
}
