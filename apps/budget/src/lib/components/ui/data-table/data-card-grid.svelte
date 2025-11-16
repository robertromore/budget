<script lang="ts" generics="TData">
import type {Snippet} from 'svelte';
import type {Table} from '@tanstack/table-core';
import {cn} from '$lib/utils';

interface Props {
  /** The TanStack table instance */
  table: Table<TData>;
  /** Snippet for rendering each card */
  card: Snippet<[TData]>;
  /** Grid columns configuration (responsive) */
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Gap between cards */
  gap?: number;
  /** Additional CSS classes for the container */
  class?: string | undefined;
}

let {
  table,
  card,
  columns = {
    default: 1,
    sm: 2,
    md: 2,
    lg: 3,
    xl: 4,
  },
  gap = 4,
  class: className,
}: Props = $props();

// Get the currently displayed rows (respecting pagination, filtering, etc.)
const rows = $derived(table.getRowModel().rows);

// Build grid class based on columns configuration
const gridClass = $derived.by(() => {
  const classes = ['grid'];

  if (columns.default) classes.push(`grid-cols-${columns.default}`);
  if (columns.sm) classes.push(`sm:grid-cols-${columns.sm}`);
  if (columns.md) classes.push(`md:grid-cols-${columns.md}`);
  if (columns.lg) classes.push(`lg:grid-cols-${columns.lg}`);
  if (columns.xl) classes.push(`xl:grid-cols-${columns.xl}`);

  classes.push(`gap-${gap}`);

  return classes.join(' ');
});
</script>

<div class={cn(gridClass, className)}>
  {#each rows as row (row.id)}
    {@render card(row.original)}
  {/each}
</div>

{#if rows.length === 0}
  <div class="py-12 text-center">
    <p class="text-muted-foreground text-sm">No results found.</p>
  </div>
{/if}
