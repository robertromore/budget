<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import TrendingDown from '@lucide/svelte/icons/trending-down';

let { config }: { config: DashboardWidget } = $props();

const summaryQuery = rpc.transactions.getWorkspaceSummary().options();
const totalReceived = $derived(Number(summaryQuery.data?.totalReceived30d) || 0);
const totalSpent = $derived(Number(summaryQuery.data?.totalSpent30d) || 0);
const netFlow = $derived(totalReceived - totalSpent);
const isPositive = $derived(netFlow >= 0);
</script>

<div class="flex items-center gap-3">
  <div class="bg-primary/10 rounded-lg p-2.5">
    {#if isPositive}
      <TrendingUp class="h-5 w-5 text-green-600" />
    {:else}
      <TrendingDown class="h-5 w-5 text-red-600" />
    {/if}
  </div>
  <div class="min-w-0 flex-1">
    <div
      class="text-2xl font-bold"
      class:text-green-600={isPositive && netFlow !== 0}
      class:text-red-600={!isPositive}
      class:text-muted-foreground={netFlow === 0}>
      {currencyFormatter.format(netFlow)}
    </div>
    <p class="text-muted-foreground text-xs">
      +{currencyFormatter.format(totalReceived)} in, -{currencyFormatter.format(totalSpent)} out
    </p>
  </div>
</div>
