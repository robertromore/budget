<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { type AccountType } from '$core/schema';
import { AccountsState } from '$lib/states/entities/accounts.svelte';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const allAccounts = $derived(Array.from(accountsState.accounts.values()));
const activeAccounts = $derived(accountsState.getActiveAccounts());
const activeCount = $derived(accountsState.activeCount);
const closedCount = $derived(allAccounts.length - activeCount);

const onBudgetCount = $derived(activeAccounts.filter((a) => a.onBudget === true).length);
const offBudgetCount = $derived(activeAccounts.filter((a) => a.onBudget === false).length);

const byType = $derived.by(() => {
  const counts = new Map<AccountType, number>();
  for (const account of activeAccounts) {
    if (!account.accountType) continue;
    counts.set(account.accountType, (counts.get(account.accountType) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
});

function typeTag(t: AccountType): string {
  const upper = t.toUpperCase();
  return upper.length > 7 ? upper.slice(0, 7) : upper;
}

const countClass = $derived.by(() => {
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
</script>

<div class="widget-terminal">
  <div class="mb-1.5 flex items-baseline justify-between">
    <span class="widget-terminal-heading">{config.title || 'ACCT.OPEN'}</span>
    {#if config.size !== 'small'}
      <span class="widget-terminal-faint text-[9px]">{closedCount} CLSD</span>
    {/if}
  </div>

  <div class="widget-terminal-bright tabular-nums {countClass}">
    {activeCount}
    <span class="widget-terminal-muted text-xs">/ {allAccounts.length}</span>
  </div>

  {#if (config.size === 'large' || config.size === 'full') && byType.length > 0}
    <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] tabular-nums">
      {#each byType as [type, count]}
        <span class="widget-terminal-faint truncate">{typeTag(type)}</span>
        <span class="widget-terminal-bright text-right">{count}</span>
      {/each}
    </div>
  {/if}

  {#if config.size === 'full'}
    <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] tabular-nums">
      <span class="widget-terminal-faint">ON.BDGT</span>
      <span class="widget-terminal-faint">OFF.BDGT</span>
      <span class="widget-terminal-bright">{onBudgetCount}</span>
      <span class="widget-terminal-bright">{offBudgetCount}</span>
    </div>
  {/if}
</div>
