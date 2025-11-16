<script lang="ts">
import type {ExpenseFormat} from '../(data)/expense-columns.svelte';
import {Button} from '$lib/components/ui/button';
import Trash2 from '@lucide/svelte/icons/trash-2';
import X from '@lucide/svelte/icons/x';

interface Props {
  expenses: ExpenseFormat[];
  onBulkDelete: () => void;
}

let {expenses, onBulkDelete}: Props = $props();

const selectedCount = $derived(expenses.length);
</script>

{#if selectedCount > 0}
  <div class="bg-muted flex items-center gap-2 rounded-md border px-4 py-2">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium">
        {selectedCount}
        {selectedCount === 1 ? 'expense' : 'expenses'} selected
      </span>
    </div>

    <div class="ml-auto flex items-center gap-2">
      <Button onclick={onBulkDelete} variant="destructive" size="sm">
        <Trash2 class="mr-2 h-4 w-4" />
        Delete Selected
      </Button>
    </div>
  </div>
{/if}
