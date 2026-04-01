<script lang="ts">
import type { DashboardWidget } from '$lib/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import Clock from '@lucide/svelte/icons/clock';

let { config }: { config: DashboardWidget } = $props();

const summaryQuery = rpc.transactions.getWorkspaceSummary().options();
const totalPending = $derived(Number(summaryQuery.data?.totalPending) || 0);
const pendingCount = $derived(Number(summaryQuery.data?.pendingCount) || 0);
</script>

<div class="flex items-center gap-3">
  <div class="bg-primary/10 rounded-lg p-2.5">
    <Clock class="text-primary h-5 w-5" />
  </div>
  <div class="min-w-0 flex-1">
    <div class="text-2xl font-bold" class:text-muted-foreground={totalPending === 0}>
      {currencyFormatter.format(totalPending)}
    </div>
    <p class="text-muted-foreground text-xs">{pendingCount} pending transaction{pendingCount !== 1 ? 's' : ''}</p>
  </div>
</div>
