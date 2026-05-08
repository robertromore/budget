<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';

let { config }: { config: DashboardWidget } = $props();

const summaryQuery = rpc.transactions.getWorkspaceSummary().options();
const totalReceived = $derived(Number(summaryQuery.data?.totalReceived30d) || 0);
const totalSpent = $derived(Number(summaryQuery.data?.totalSpent30d) || 0);
const txCount = $derived(Number(summaryQuery.data?.transactionCount30d) || 0);
const netFlow = $derived(totalReceived - totalSpent);
const isPositive = $derived(netFlow >= 0);

// Derived metrics for the larger size tiers — no extra round-trip,
// these come straight from the summary aggregation we already have.
const grossActivity = $derived(totalReceived + totalSpent);
const avgPerTransaction = $derived(txCount > 0 ? grossActivity / txCount : 0);
// Savings rate makes sense only when there's actual income; otherwise
// it'd divide by zero or report a misleading 100%.
const savingsRate = $derived(
  totalReceived > 0 ? Math.max(0, netFlow / totalReceived) : 0
);

const amountClass = $derived.by(() => {
  switch (config.size) {
    case 'small':
      return 'text-xl';
    case 'large':
      return 'text-3xl';
    case 'full':
      return 'text-4xl';
    default:
      return 'text-2xl';
  }
});

const balanceColor = $derived(
  netFlow > 0
    ? 'text-amount-positive'
    : netFlow < 0
      ? 'text-amount-negative'
      : 'text-muted-foreground'
);
</script>

<div class="flex items-start gap-3">
  <div class="bg-primary/10 rounded-lg p-2.5 shrink-0">
    {#if isPositive}
      <TrendingUp class="text-amount-positive h-5 w-5"></TrendingUp>
    {:else}
      <TrendingDown class="text-amount-negative h-5 w-5"></TrendingDown>
    {/if}
  </div>
  <div class="min-w-0 flex-1">
    <div class="truncate font-bold {amountClass} {balanceColor}">
      {netFlow >= 0 ? '+' : ''}{currencyFormatter.format(netFlow)}
    </div>

    {#if config.size !== 'small'}
      <p class="text-muted-foreground text-xs tabular-nums">
        +{currencyFormatter.format(totalReceived)} in · −{currencyFormatter.format(totalSpent)} out
      </p>
    {/if}

    {#if config.size === 'large' || config.size === 'full'}
      <div class="mt-3 flex gap-4 text-xs">
        <div>
          <p class="text-muted-foreground">Transactions</p>
          <p class="font-semibold tabular-nums">{txCount}</p>
        </div>
        <div>
          <p class="text-muted-foreground">Avg / tx</p>
          <p class="font-semibold tabular-nums">{currencyFormatter.format(avgPerTransaction)}</p>
        </div>
        {#if totalReceived > 0}
          <div>
            <p class="text-muted-foreground">Savings rate</p>
            <p class="font-semibold tabular-nums">{(savingsRate * 100).toFixed(0)}%</p>
          </div>
        {/if}
      </div>
    {/if}

    {#if config.size === 'full'}
      <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div>
          <p class="text-muted-foreground">Income</p>
          <p class="text-amount-positive font-semibold tabular-nums">
            {currencyFormatter.format(totalReceived)}
          </p>
        </div>
        <div>
          <p class="text-muted-foreground">Expenses</p>
          <p class="text-amount-negative font-semibold tabular-nums">
            {currencyFormatter.format(-totalSpent)}
          </p>
        </div>
        <div>
          <p class="text-muted-foreground">Net</p>
          <p class="font-semibold tabular-nums {balanceColor}">
            {currencyFormatter.format(netFlow)}
          </p>
        </div>
        <div>
          <p class="text-muted-foreground">Gross activity</p>
          <p class="font-semibold tabular-nums">{currencyFormatter.format(grossActivity)}</p>
        </div>
      </div>
    {/if}
  </div>
</div>
