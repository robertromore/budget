<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import X from '@lucide/svelte/icons/x';
import type { Table } from '@tanstack/table-core';
import type { ExpenseFormat } from '../(data)/columns.svelte';
import DataTableViewOptions from './expense-table-view-options.svelte';

interface Props {
  table: Table<ExpenseFormat>;
}

let { table }: Props = $props();

const isFiltered = $derived(table.getState().columnFilters.length > 0);
</script>

<div class="flex items-center justify-between">
  <div class="flex flex-1 items-center space-x-2">
    <Input
      placeholder="Search expenses..."
      value={table.getState().globalFilter ?? ''}
      oninput={(e) => table.setGlobalFilter(e.currentTarget.value)}
      class="h-8 w-[150px] lg:w-[250px]" />
    {#if isFiltered}
      <Button variant="ghost" onclick={() => table.resetColumnFilters()} class="h-8 px-2 lg:px-3">
        Reset
        <X class="ml-2 size-4" />
      </Button>
    {/if}
  </div>
  <DataTableViewOptions {table} />
</div>
