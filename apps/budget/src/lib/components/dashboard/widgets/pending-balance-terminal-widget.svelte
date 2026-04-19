<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const summaryQuery = rpc.transactions.getWorkspaceSummary().options();
const totalPending = $derived(Number(summaryQuery.data?.totalPending) || 0);
const pendingCount = $derived(Number(summaryQuery.data?.pendingCount) || 0);
</script>

<div class="widget-terminal">
  <div class="mb-1.5 flex items-baseline justify-between">
    <span class="widget-terminal-heading">{config.title || 'PENDING'}</span>
    <span class="widget-terminal-faint text-[9px]">{pendingCount} TX</span>
  </div>
  <div
    class="text-lg tabular-nums"
    class:widget-terminal-bright={totalPending > 0}
    class:widget-terminal-neg={totalPending < 0}
    class:widget-terminal-muted={totalPending === 0}>
    {currencyFormatter.format(totalPending)}
  </div>
</div>
