<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import Clock from '@lucide/svelte/icons/clock';
import { copilotPalette } from './copilot-colors';

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

const p = $derived(copilotPalette((config.settings as any)?.gradientColor));

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

const amountTone = $derived(
  totalPending > 0
    ? 'text-foreground'
    : totalPending < 0
      ? 'text-amount-negative'
      : 'text-muted-foreground'
);
</script>

<div class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-2 flex items-center gap-2">
    <div class="rounded-lg p-1.5 {p.iconBg}">
      <Clock class="h-3.5 w-3.5 {p.iconFg}"></Clock>
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Pending'}
    </span>
  </div>

  <div class="font-bold tracking-tight {amountClass} {amountTone}">
    {currencyFormatter.format(totalPending)}
  </div>

  {#if config.size !== 'small'}
    <p class="text-muted-foreground mt-0.5 text-xs">
      {pendingCount} pending transaction{pendingCount === 1 ? '' : 's'}
    </p>
  {/if}

  {#if config.size === 'large' || config.size === 'full'}
    <div class="mt-3 flex gap-4 text-xs">
      <div>
        <p class="text-muted-foreground">Incoming</p>
        <p class="text-amount-positive font-semibold">
          {currencyFormatter.format(pendingInflow)}
        </p>
        <p class="text-muted-foreground text-[10px]">
          {pendingInflowCount} item{pendingInflowCount === 1 ? '' : 's'}
        </p>
      </div>
      <div>
        <p class="text-muted-foreground">Outgoing</p>
        <p class="text-amount-negative font-semibold">
          {currencyFormatter.format(-pendingOutflow)}
        </p>
        <p class="text-muted-foreground text-[10px]">
          {pendingOutflowCount} item{pendingOutflowCount === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  {/if}

  {#if config.size === 'full' && oldestPendingDate}
    <div class="text-muted-foreground mt-3 text-xs">
      {#if oldestPendingDate === newestPendingDate}
        All from {oldestPendingDate}
      {:else}
        Oldest {oldestPendingDate} · Newest {newestPendingDate}
      {/if}
    </div>
  {/if}
</div>
