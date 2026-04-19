<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import { copilotPalette } from './copilot-colors';

let { config }: { config: DashboardWidget } = $props();

const summaryQuery = rpc.transactions.getWorkspaceSummary().options();
const totalReceived = $derived(Number(summaryQuery.data?.totalReceived30d) || 0);
const totalSpent = $derived(Number(summaryQuery.data?.totalSpent30d) || 0);
const netFlow = $derived(totalReceived - totalSpent);
const isPositive = $derived(netFlow >= 0);
const p = $derived(copilotPalette((config.settings as any)?.gradientColor));
</script>

<div class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-2 flex items-center gap-2">
    <div class="rounded-lg p-1.5 {p.iconBg}">
      {#if isPositive}
        <TrendingUp class="h-3.5 w-3.5 {p.iconFg}" />
      {:else}
        <TrendingDown class="h-3.5 w-3.5 {p.iconFg}" />
      {/if}
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Net 30 days'}
    </span>
  </div>
  <div
    class="text-2xl font-bold tracking-tight"
    class:text-amount-positive={isPositive && netFlow !== 0}
    class:text-amount-negative={!isPositive}
    class:text-muted-foreground={netFlow === 0}>
    {netFlow >= 0 ? '+' : ''}{currencyFormatter.format(netFlow)}
  </div>
  <p class="text-muted-foreground mt-0.5 text-xs tabular-nums">
    +{currencyFormatter.format(totalReceived)} · −{currencyFormatter.format(totalSpent)}
  </p>
</div>
