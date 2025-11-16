<script lang="ts" generics="TData">
import type { Snippet } from 'svelte';
import type { Table } from '@tanstack/table-core';
import DataCardGrid from './data-card-grid.svelte';
import { cn } from '$lib/utils';

interface Props {
  /** The TanStack table instance */
  table: Table<TData>;
  /** Current view mode */
  viewMode: 'table' | 'cards';
  /** Snippet for rendering the table view */
  tableView: Snippet<[Table<TData>]>;
  /** Snippet for rendering individual cards */
  cardView: Snippet<[TData]>;
  /** Grid configuration for card view */
  cardGridColumns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Gap between cards */
  cardGap?: number;
  /** Additional CSS classes for table container */
  tableClass?: string;
  /** Additional CSS classes for card grid */
  cardGridClass?: string;
}

let {
  table,
  viewMode = 'table',
  tableView,
  cardView,
  cardGridColumns = {
    default: 1,
    sm: 2,
    md: 2,
    lg: 3,
    xl: 4,
  },
  cardGap = 4,
  tableClass,
  cardGridClass,
}: Props = $props();
</script>

{#if viewMode === 'table'}
  <div class={cn('rounded-md border', tableClass)}>
    {@render tableView(table)}
  </div>
{:else}
  <DataCardGrid
    {table}
    card={cardView}
    columns={cardGridColumns}
    gap={cardGap}
    class={cardGridClass} />
{/if}
