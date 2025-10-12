<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";
  import {Button} from "$lib/components/ui/button";
  import {CircleDollarSign, Plus, TriangleAlert} from "@lucide/svelte/icons";
  import {currencyFormatter} from "$lib/utils/formatters";
  import {listBudgets} from "$lib/query/budgets";
  import BudgetAllocationDialog from "$lib/components/dialogs/budget-allocation-dialog.svelte";
  import type {TransactionsFormat} from "$lib/types";
  import {getQueryClient} from "$lib/query/_client";
  import {transactionKeys} from "$lib/query/transactions";

  interface Props {
    transaction: TransactionsFormat;
    onManageClick?: () => void;
  }

  let {transaction, onManageClick}: Props = $props();

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

    const totalAllocated = budgetAllocations.reduce((sum, allocation) =>
      sum + Math.abs(allocation.allocatedAmount), 0
    );
    const transactionAmount = Math.abs(transaction.amount);
    const remainingAmount = transactionAmount - totalAllocated;

    return {
      totalAllocated,
      remainingAmount,
      isFullyAllocated: Math.abs(remainingAmount) < 0.01,
      hasAllocations: budgetAllocations.length > 0
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
      queryKey: [...transactionKeys.all(), "account", accountId]
    });

    queryClient.invalidateQueries({
      queryKey: [...transactionKeys.all(), "all", accountId]
    });

    // Also invalidate any budget-related queries that might show transaction allocation data
    queryClient.invalidateQueries({
      queryKey: ["budgets"]
    });
  }
</script>

<div class="flex flex-col gap-1 min-w-0">
  {#if isRealTransaction}
    {#if budgetAllocations.length > 0}
      <!-- Show allocated budgets -->
      <div class="flex flex-wrap gap-1">
        {#each budgetAllocations as allocation (allocation.id)}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                type="button"
                class="group flex items-center gap-1.5 px-2 py-1 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-md text-xs transition-all cursor-pointer max-w-[140px] dark:bg-emerald-950/30 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
                onclick={handleManageClick}
              >
                <div class="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 group-hover:bg-emerald-200 dark:bg-emerald-800 dark:group-hover:bg-emerald-700 transition-colors">
                  <CircleDollarSign class="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span class="truncate font-medium text-emerald-800 dark:text-emerald-100">{allocation.budgetName}</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-mono font-medium shrink-0">
                  {currencyFormatter.format(Math.abs(allocation.allocatedAmount))}
                </span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <div class="space-y-1">
                <p class="font-medium">{allocation.budgetName}</p>
                <p class="text-xs">Allocated: {currencyFormatter.format(Math.abs(allocation.allocatedAmount))}</p>
                <p class="text-xs">Percentage: {((Math.abs(allocation.allocatedAmount) / Math.abs(transaction.amount)) * 100).toFixed(1)}%</p>
                <p class="text-xs opacity-75">{allocation.autoAssigned ? 'Auto-assigned' : 'Manual allocation'}</p>
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
          <span>Over-allocated: {currencyFormatter.format(Math.abs(allocationSummary.remainingAmount))}</span>
        </div>
      {/if}

      <!-- Status indicator -->
      {#if allocationStatus === 'full'}
        <div class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <CircleDollarSign class="h-3 w-3" />
          <span>Fully allocated</span>
        </div>
      {/if}
    {:else if availableBudgets.length > 0}
      <!-- No allocation yet, show add button -->
      <Button
        size="sm"
        variant="ghost"
        onclick={handleManageClick}
        class="group h-6 px-2 text-xs justify-start hover:bg-primary/10 transition-all"
      >
        <div class="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 group-hover:bg-primary/20 mr-1.5 transition-colors">
          <Plus class="h-2.5 w-2.5 text-primary" />
        </div>
        <span class="text-primary group-hover:text-primary font-medium">Allocate to budget</span>
      </Button>
    {:else}
      <!-- No budgets available -->
      <div class="flex items-center gap-1 text-xs text-muted-foreground">
        <CircleDollarSign class="h-3 w-3" />
        <span>No budgets available</span>
      </div>
    {/if}
  {:else}
    <!-- For scheduled transactions -->
    <div class="flex items-center gap-1 text-xs text-muted-foreground">
      <span>—</span>
    </div>
  {/if}
</div>

<!-- Budget Allocation Dialog -->
<BudgetAllocationDialog
  bind:open={allocationDialogOpen}
  transaction={transaction}
  onAllocationChanged={handleAllocationChanged}
/>