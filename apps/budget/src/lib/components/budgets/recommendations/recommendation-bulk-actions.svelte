<script lang="ts">
import type {BudgetRecommendationWithRelations} from '$lib/schema/recommendations';
import type {Table} from '@tanstack/table-core';
import {Button} from '$lib/components/ui/button';
import Check from '@lucide/svelte/icons/check';
import X from '@lucide/svelte/icons/x';
import XIcon from '@lucide/svelte/icons/x';

interface Props {
  table: Table<BudgetRecommendationWithRelations>;
  onBulkApply: (recommendations: BudgetRecommendationWithRelations[]) => void;
  onBulkDismiss: (recommendations: BudgetRecommendationWithRelations[]) => void;
}

let {table, onBulkApply, onBulkDismiss}: Props = $props();

const selectedRows = $derived(table.getSelectedRowModel().rows);
const selectedCount = $derived(selectedRows.length);
const selectedRecommendations = $derived(selectedRows.map((row) => row.original));

// Only show bulk actions for pending recommendations
const pendingRecommendations = $derived(
  selectedRecommendations.filter((r) => r.status === 'pending')
);
const pendingCount = $derived(pendingRecommendations.length);
</script>

{#if selectedCount > 0 && pendingCount > 0}
  <div class="bg-muted flex items-center gap-2 rounded-md border px-4 py-2">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium">
        {pendingCount}
        {pendingCount === 1 ? 'recommendation' : 'recommendations'} selected
      </span>
    </div>

    <div class="ml-auto flex items-center gap-2">
      <Button onclick={() => onBulkApply(pendingRecommendations)} variant="default" size="sm">
        <Check class="mr-2 h-4 w-4" />
        Apply Selected
      </Button>

      <Button onclick={() => onBulkDismiss(pendingRecommendations)} variant="outline" size="sm">
        <X class="mr-2 h-4 w-4" />
        Dismiss Selected
      </Button>

      <Button
        onclick={() => {
          table.resetRowSelection();
        }}
        variant="ghost"
        size="sm"
        aria-label="Clear selection">
        <XIcon class="h-4 w-4" />
      </Button>
    </div>
  </div>
{/if}
