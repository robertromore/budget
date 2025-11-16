<script lang="ts">
import type {BudgetWithRelations} from '$lib/server/domains/budgets';
import {formatCurrency} from '$lib/utils';
import {Progress} from '$lib/components/ui/progress';
import {TriangleAlert, TrendingUp, TrendingDown, Check} from '@lucide/svelte/icons';

interface BudgetAllocation {
  budgetId: number;
  amount: number;
}

interface Props {
  budgets: BudgetWithRelations[];
  allocations: BudgetAllocation[];
}

let {budgets, allocations}: Props = $props();

// Calculate impact for each budget
const budgetImpacts = $derived.by(() => {
  return allocations
    .map((allocation) => {
      const budget = budgets.find((b) => b.id === allocation.budgetId);
      if (!budget) return null;

      // Calculate current spent from budget transactions
      const currentSpent =
        budget.transactions?.reduce((sum, t) => sum + Math.abs(t.allocatedAmount), 0) || 0;

      // Get budget limit from metadata (for account-monthly budgets)
      const budgetLimit = budget.metadata?.limit as number | undefined;

      // Calculate new total after this transaction
      const newTotal = currentSpent + Math.abs(allocation.amount);

      // Calculate remaining or overspend
      const remaining = budgetLimit ? budgetLimit - newTotal : null;
      const percentUsed = budgetLimit ? (newTotal / budgetLimit) * 100 : null;

      // Determine status
      let status: 'safe' | 'warning' | 'danger' | 'over';
      if (percentUsed !== null) {
        if (percentUsed >= 100) status = 'over';
        else if (percentUsed >= 90) status = 'danger';
        else if (percentUsed >= 75) status = 'warning';
        else status = 'safe';
      } else {
        // For budgets without limits, just show if adding or removing
        status = allocation.amount < 0 ? 'safe' : 'warning';
      }

      return {
        budget,
        allocation,
        currentSpent,
        newTotal,
        budgetLimit,
        remaining,
        percentUsed,
        status,
      };
    })
    .filter(Boolean);
});

// Helper to get status color classes
function getStatusClasses(status: 'safe' | 'warning' | 'danger' | 'over') {
  switch (status) {
    case 'safe':
      return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
    case 'warning':
      return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800';
    case 'danger':
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
    case 'over':
      return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-700';
    default:
      return '';
  }
}

// Helper to get icon based on status
function getStatusIcon(status: 'safe' | 'warning' | 'danger' | 'over', isNegativeAmount: boolean) {
  if (isNegativeAmount) return TrendingDown; // Income/refund
  if (status === 'over') return TriangleAlert;
  if (status === 'danger') return TriangleAlert;
  if (status === 'warning') return TrendingUp;
  return Check;
}
</script>

{#if budgetImpacts.length > 0}
  <div class="border-border bg-muted/20 space-y-3 rounded-lg border p-4">
    <h4 class="flex items-center gap-2 text-sm font-medium">
      <TrendingUp class="h-4 w-4" />
      Budget Impact Preview
    </h4>

    <div class="space-y-3">
      {#each budgetImpacts as impact}
        {@const statusClasses = getStatusClasses(impact.status)}
        {@const StatusIcon = getStatusIcon(impact.status, impact.allocation.amount < 0)}

        <div class="space-y-2 rounded-md border p-3 {statusClasses}">
          <!-- Budget Name and Status Icon -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <StatusIcon class="h-4 w-4 shrink-0" />
              <span class="text-sm font-medium">{impact.budget.name}</span>
            </div>
            {#if impact.status === 'over'}
              <span
                class="rounded bg-red-200 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
                Over Budget
              </span>
            {/if}
          </div>

          <!-- Current vs New Amounts -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div class="text-muted-foreground">Current Spent</div>
              <div class="font-mono font-medium">{formatCurrency(impact.currentSpent)}</div>
            </div>
            <div>
              <div class="text-muted-foreground">After Transaction</div>
              <div class="font-mono font-medium">{formatCurrency(impact.newTotal)}</div>
            </div>
          </div>

          <!-- Progress Bar (only if budget has limit) -->
          {#if impact.budgetLimit && impact.percentUsed !== null}
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-muted-foreground">
                  {impact.percentUsed.toFixed(1)}% of {formatCurrency(impact.budgetLimit)}
                </span>
                {#if impact.remaining !== null}
                  <span
                    class:text-red-600={impact.remaining < 0}
                    class:dark:text-red-400={impact.remaining < 0}>
                    {impact.remaining >= 0 ? 'Remaining' : 'Over'}: {formatCurrency(
                      Math.abs(impact.remaining)
                    )}
                  </span>
                {/if}
              </div>
              <Progress value={Math.min(impact.percentUsed, 100)} max={100} class="h-2" />
            </div>
          {/if}

          <!-- Impact Amount -->
          <div class="flex items-center gap-2 border-t border-current/20 pt-1 text-xs">
            <span class="text-muted-foreground">Transaction Impact:</span>
            <span
              class="font-mono font-medium"
              class:text-green-600={impact.allocation.amount < 0}
              class:dark:text-green-400={impact.allocation.amount < 0}>
              {impact.allocation.amount < 0 ? '−' : '+'}{formatCurrency(
                Math.abs(impact.allocation.amount)
              )}
            </span>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
