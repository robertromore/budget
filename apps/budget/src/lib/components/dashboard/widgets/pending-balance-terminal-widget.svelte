<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const summaryQuery = rpc.transactions.getWorkspaceSummary().options();
const totalPending = $derived(Number(summaryQuery.data?.totalPending) || 0);
const pendingCount = $derived(Number(summaryQuery.data?.pendingCount) || 0);
const pendingInflow = $derived(Number(summaryQuery.data?.pendingInflow) || 0);
const pendingOutflow = $derived(Number(summaryQuery.data?.pendingOutflow) || 0);
const pendingInflowCount = $derived(Number(summaryQuery.data?.pendingInflowCount) || 0);
const pendingOutflowCount = $derived(Number(summaryQuery.data?.pendingOutflowCount) || 0);
const oldestPendingDate = $derived(summaryQuery.data?.oldestPendingDate ?? null);
const newestPendingDate = $derived(summaryQuery.data?.newestPendingDate ?? null);

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
  totalPending > 0
    ? 'widget-terminal-bright'
    : totalPending < 0
      ? 'widget-terminal-neg'
      : 'widget-terminal-muted'
);
</script>

<div class="widget-terminal">
  <div class="mb-1.5 flex items-baseline justify-between">
    <span class="widget-terminal-heading">{config.title || 'PENDING'}</span>
    {#if config.size !== 'small'}
      <span class="widget-terminal-faint text-[9px]">{pendingCount} TX</span>
    {/if}
  </div>

  <div class="tabular-nums {amountClass} {balanceTone}">
    {currencyFormatter.format(totalPending)}
  </div>

  {#if config.size === 'large' || config.size === 'full'}
    <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] tabular-nums">
      <span class="widget-terminal-faint">IN ({pendingInflowCount})</span>
      <span class="widget-terminal-faint">OUT ({pendingOutflowCount})</span>
      <span class="widget-terminal-bright">{currencyFormatter.format(pendingInflow)}</span>
      <span class="widget-terminal-neg">{currencyFormatter.format(-pendingOutflow)}</span>
    </div>
  {/if}

  {#if config.size === 'full' && oldestPendingDate}
    <div class="widget-terminal-faint mt-2 text-[10px] tabular-nums">
      {#if oldestPendingDate === newestPendingDate}
        ALL.FROM {oldestPendingDate}
      {:else}
        OLDEST {oldestPendingDate} · NEWEST {newestPendingDate}
      {/if}
    </div>
  {/if}
</div>
