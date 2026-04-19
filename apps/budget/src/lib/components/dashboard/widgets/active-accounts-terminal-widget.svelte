<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const accounts = $derived(Array.from(accountsState.accounts.values()));
const activeCount = $derived(accounts.filter((a) => !a.closed).length);
const closedCount = $derived(accounts.length - activeCount);
</script>

<div class="widget-terminal">
  <div class="mb-1.5 flex items-baseline justify-between">
    <span class="widget-terminal-heading">{config.title || 'ACCT.OPEN'}</span>
    <span class="widget-terminal-faint text-[9px]">{closedCount} CLSD</span>
  </div>
  <div class="widget-terminal-bright text-lg tabular-nums">
    {activeCount}
    <span class="widget-terminal-muted text-xs">/ {accounts.length}</span>
  </div>
</div>
