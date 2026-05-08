<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const summaryQuery = rpc.transactions.getWorkspaceSummary().options();
const totalReceived = $derived(Number(summaryQuery.data?.totalReceived30d) || 0);
const totalSpent = $derived(Number(summaryQuery.data?.totalSpent30d) || 0);
const txCount = $derived(Number(summaryQuery.data?.transactionCount30d) || 0);
const netFlow = $derived(totalReceived - totalSpent);

const grossActivity = $derived(totalReceived + totalSpent);
const avgPerTransaction = $derived(txCount > 0 ? grossActivity / txCount : 0);
const savingsRate = $derived(
  totalReceived > 0 ? Math.max(0, netFlow / totalReceived) : 0
);

function compactCurrency(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n >= 0 ? '' : '-') + '$' + (abs / 1000).toFixed(1) + 'K';
  return currencyFormatter.format(n);
}

const amountClass = $derived.by(() => {
  switch (config.size) {
    case 'small':
      return 'text-base';
    case 'large':
      return 'text-2xl';
    case 'full':
      return 'text-3xl';
    default:
      return 'text-lg';
  }
});

const balanceTone = $derived(
  netFlow > 0
    ? 'widget-terminal-bright'
    : netFlow < 0
      ? 'widget-terminal-neg'
      : 'widget-terminal-muted'
);
</script>

<div class="widget-terminal">
  <div class="mb-1.5 flex items-baseline justify-between">
    <span class="widget-terminal-heading">{config.title || 'CASH.FLOW 30D'}</span>
    {#if config.size !== 'small'}
      <span class="widget-terminal-faint text-[9px]">{txCount} TX</span>
    {/if}
  </div>

  <div class="tabular-nums {amountClass} {balanceTone}">
    {netFlow >= 0 ? '+' : ''}{currencyFormatter.format(netFlow)}
  </div>

  {#if config.size !== 'small'}
    <div class="mt-1 flex gap-2 text-[9px] tabular-nums">
      <span class="widget-terminal-pos">IN {compactCurrency(totalReceived)}</span>
      <span class="widget-terminal-neg">OUT {compactCurrency(totalSpent)}</span>
    </div>
  {/if}

  {#if config.size === 'large' || config.size === 'full'}
    <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] tabular-nums">
      <span class="widget-terminal-faint">AVG.TX</span>
      <span class="widget-terminal-faint">SAVINGS</span>
      <span class="widget-terminal-bright">{compactCurrency(avgPerTransaction)}</span>
      <span class="widget-terminal-bright">
        {totalReceived > 0 ? `${(savingsRate * 100).toFixed(0)}%` : '—'}
      </span>
    </div>
  {/if}

  {#if config.size === 'full'}
    <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] tabular-nums">
      <span class="widget-terminal-faint">INCOME</span>
      <span class="widget-terminal-faint">EXPENSES</span>
      <span class="widget-terminal-pos">{compactCurrency(totalReceived)}</span>
      <span class="widget-terminal-neg">{compactCurrency(-totalSpent)}</span>
      <span class="widget-terminal-faint">NET</span>
      <span class="widget-terminal-faint">GROSS</span>
      <span class={balanceTone}>{compactCurrency(netFlow)}</span>
      <span class="widget-terminal-bright">{compactCurrency(grossActivity)}</span>
    </div>
  {/if}
</div>
