<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const summaryQuery = rpc.transactions.getWorkspaceSummary().options();
const totalReceived = $derived(Number(summaryQuery.data?.totalReceived30d) || 0);
const totalSpent = $derived(Number(summaryQuery.data?.totalSpent30d) || 0);
const netFlow = $derived(totalReceived - totalSpent);

function compactCurrency(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n >= 0 ? '' : '-') + '$' + (abs / 1000).toFixed(1) + 'K';
  return currencyFormatter.format(n);
}
</script>

<div class="widget-terminal">
  <div class="mb-1.5 flex items-baseline justify-between">
    <span class="widget-terminal-heading">{config.title || 'CASH.FLOW 30D'}</span>
  </div>
  <div
    class="text-lg tabular-nums"
    class:widget-terminal-bright={netFlow > 0}
    class:widget-terminal-neg={netFlow < 0}
    class:widget-terminal-muted={netFlow === 0}>
    {netFlow >= 0 ? '+' : ''}{currencyFormatter.format(netFlow)}
  </div>
  <div class="mt-1 flex gap-2 text-[9px] tabular-nums">
    <span class="widget-terminal-pos">IN {compactCurrency(totalReceived)}</span>
    <span class="widget-terminal-neg">OUT {compactCurrency(totalSpent)}</span>
  </div>
</div>
