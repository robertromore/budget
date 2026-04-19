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
const p = $derived(copilotPalette((config.settings as any)?.gradientColor));
</script>

<div class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-2 flex items-center gap-2">
    <div class="rounded-lg p-1.5 {p.iconBg}">
      <Clock class="h-3.5 w-3.5 {p.iconFg}" />
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Pending'}
    </span>
  </div>
  <div
    class="text-2xl font-bold tracking-tight"
    class:text-muted-foreground={totalPending === 0}>
    {currencyFormatter.format(totalPending)}
  </div>
  <p class="text-muted-foreground mt-0.5 text-xs">
    {pendingCount} pending transaction{pendingCount === 1 ? '' : 's'}
  </p>
</div>
