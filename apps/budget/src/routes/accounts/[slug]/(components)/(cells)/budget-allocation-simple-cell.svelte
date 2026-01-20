<script lang="ts">
import BudgetAllocationDialog from '$lib/components/dialogs/budget-allocation-dialog.svelte';
import { Button } from '$lib/components/ui/button';
import * as Tooltip from '$lib/components/ui/tooltip';
import { getQueryClient } from '$lib/query/_client';
import { listBudgets } from '$lib/query/budgets';
import { transactionKeys } from '$lib/query/transactions';
import type { TransactionsFormat } from '$lib/types';
import { currencyFormatter, formatPercent } from '$lib/utils/formatters';
import { CircleDollarSign, Plus, TriangleAlert } from '@lucide/svelte/icons';

interface Props {
  transaction: TransactionsFormat;
  onManageClick?: () => void;
}

let { transaction, onManageClick }: Props = $props();

// Dialog state
let allocationDialogOpen = $state(false);

const budgetsQuery = listBudgets().options();
const availableBudgets = $derived.by(() => budgetsQuery.data ?? []);

// Check if this is a real transaction (not scheduled)
const isRealTransaction = $derived.by(() => typeof transaction.id === 'number');

// Get actual budget allocation data from transaction
const budgetAllocations = $derived.by(() => {
  if (!isRealTransaction || !transaction.budgetAllocations) return [];
  return transaction.budgetAllocations;
});

// Calculate allocation summary
const allocationSummary = $derived.by(() => {
  if (!isRealTransaction || !transaction.amount) return null;

  const totalAllocated = budgetAllocations.reduce(
    (sum, allocation) => sum + Math.abs(allocation.allocatedAmount),
    0
  );
  const transactionAmount = Math.abs(transaction.amount);
  const remainingAmount = transactionAmount - totalAllocated;

  return {
    totalAllocated,
    remainingAmount,
    isFullyAllocated: Math.abs(remainingAmount) < 0.01,
    hasAllocations: budgetAllocations.length > 0,
  };
});

const allocationStatus = $derived.by(() => {
  if (!isRealTransaction) return 'scheduled';
  if (!allocationSummary) return 'unallocated';
  if (!allocationSummary.hasAllocations) return 'unallocated';
  if (allocationSummary.remainingAmount > 0.01) return 'partial';
  if (allocationSummary.remainingAmount < -0.01) return 'over';
  return 'full';
});

function handleManageClick() {
  if (onManageClick) {
    onManageClick();
  } else {
    allocationDialogOpen = true;
  }
}

function handleAllocationChanged() {
  if (!isRealTransaction) return;

  const queryClient = getQueryClient();
  const accountId = transaction.accountId;

  // Invalidate all transaction queries for this account to refresh budget allocation data
  queryClient.invalidateQueries({
    queryKey: [...transactionKeys.all(), 'account', accountId],
  });

  queryClient.invalidateQueries({
    queryKey: [...transactionKeys.all(), 'all', accountId],
  });

  // Also invalidate any budget-related queries that might show transaction allocation data
  queryClient.invalidateQueries({
    queryKey: ['budgets'],
  });
}
</script>

<div class="flex min-w-0 flex-col gap-1">
  {#if isRealTransaction}
    {#if budgetAllocations.length > 0}
      <!-- Show allocated budgets -->
      <div class="flex flex-wrap gap-1">
        {#each budgetAllocations as allocation (allocation.id)}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                type="button"
                class="group flex max-w-[140px] cursor-pointer items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50/80 px-2 py-1 text-xs transition-all hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
                onclick={handleManageClick}>
                <div
                  class="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 transition-colors group-hover:bg-emerald-200 dark:bg-emerald-800 dark:group-hover:bg-emerald-700">
                  <CircleDollarSign class="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span class="truncate font-medium text-emerald-800 dark:text-emerald-100"
                  >{allocation.budgetName}</span>
                <span class="shrink-0 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {currencyFormatter.format(Math.abs(allocation.allocatedAmount))}
                </span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <div class="space-y-1">
                <p class="font-medium">{allocation.budgetName}</p>
                <p class="text-xs">
                  Allocated: {currencyFormatter.format(Math.abs(allocation.allocatedAmount))}
                </p>
                <p class="text-xs">
                  Percentage: {formatPercent(
                    Math.abs(allocation.allocatedAmount) / Math.abs(transaction.amount), 1
                  )}
                </p>
                <p class="text-xs opacity-75">
                  {allocation.autoAssigned ? 'Auto-assigned' : 'Manual allocation'}
                </p>
                <p class="text-xs opacity-75">Click to manage allocation</p>
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        {/each}
      </div>

      <!-- Show unallocated amount if any -->
      {#if allocationSummary && allocationSummary.remainingAmount > 0.01}
        <div class="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
          <TriangleAlert class="h-3 w-3" />
          <span>Unallocated: {currencyFormatter.format(allocationSummary.remainingAmount)}</span>
        </div>
      {:else if allocationSummary && allocationSummary.remainingAmount < -0.01}
        <div class="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <TriangleAlert class="h-3 w-3" />
          <span
            >Over-allocated: {currencyFormatter.format(
              Math.abs(allocationSummary.remainingAmount)
            )}</span>
        </div>
      {/if}

      <!-- Status indicator -->
      <!-- {#if allocationStatus === 'full'}
        <div class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <CircleDollarSign class="h-3 w-3" />
          <span>Fully allocated</span>
        </div>
      {/if} -->
    {:else if availableBudgets.length > 0}
      <!-- No allocation yet, show add button -->
      <Button
        size="sm"
        variant="ghost"
        onclick={handleManageClick}
        class="group hover:bg-primary/10 h-6 justify-start px-2 text-xs transition-all">
        <div
          class="bg-primary/10 group-hover:bg-primary/20 mr-1.5 flex h-4 w-4 items-center justify-center rounded-full transition-colors">
          <Plus class="text-primary h-2.5 w-2.5" />
        </div>
        <span class="text-primary group-hover:text-primary font-medium">Allocate to budget</span>
      </Button>
    {:else}
      <!-- No budgets available -->
      <div class="text-muted-foreground flex items-center gap-1 text-xs">
        <CircleDollarSign class="h-3 w-3" />
        <span>No budgets available</span>
      </div>
    {/if}
  {:else}
    <!-- For scheduled transactions -->
    <div class="text-muted-foreground flex items-center gap-1 text-xs">
      <span>—</span>
    </div>
  {/if}
</div>

<!-- Budget Allocation Dialog -->
<BudgetAllocationDialog
  bind:open={allocationDialogOpen}
  {transaction}
  onAllocationChanged={handleAllocationChanged} />
