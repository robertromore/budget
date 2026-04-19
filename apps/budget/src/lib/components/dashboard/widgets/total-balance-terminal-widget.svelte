<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const totalBalance = $derived(accountsState.getTotalBalance());
const accountCount = $derived(accountsState.accounts.size);
</script>

<div class="widget-terminal">
  <div class="mb-1.5 flex items-baseline justify-between">
    <span class="widget-terminal-heading">{config.title || 'NET.BAL'}</span>
    <span class="widget-terminal-faint text-[9px]">{accountCount} ACCT</span>
  </div>
  <div
    class="text-lg tabular-nums"
    class:widget-terminal-bright={totalBalance > 0}
    class:widget-terminal-neg={totalBalance < 0}
    class:widget-terminal-muted={totalBalance === 0}>
    {currencyFormatter.format(totalBalance)}
  </div>
</div>
