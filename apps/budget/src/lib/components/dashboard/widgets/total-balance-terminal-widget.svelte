<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { ACCOUNT_TYPE_LABELS, type AccountType } from '$core/schema';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const totalBalance = $derived(accountsState.getTotalBalance());
const accountCount = $derived(accountsState.activeCount);
const onBudgetBalance = $derived(accountsState.getOnBudgetBalance());
const offBudgetBalance = $derived(accountsState.getOffBudgetBalance());

// Per-type breakdown for the `full` size — same logic as the default
// variant; the terminal styling differs but the data shape is identical.
const byType = $derived.by(() => {
  const totals = new Map<AccountType, number>();
  for (const account of accountsState.getActiveAccounts()) {
    if (!account.accountType) continue;
    totals.set(account.accountType, (totals.get(account.accountType) ?? 0) + (account.balance || 0));
  }
  return Array.from(totals.entries())
    .filter(([, amount]) => amount !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
});

const balanceTone = $derived(
  totalBalance > 0
    ? 'widget-terminal-bright'
    : totalBalance < 0
      ? 'widget-terminal-neg'
      : 'widget-terminal-muted'
);

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
</script>

<div class="widget-terminal">
  <div class="mb-1.5 flex items-baseline justify-between">
    <span class="widget-terminal-heading">{config.title || 'NET.BAL'}</span>
    {#if config.size !== 'small'}
      <span class="widget-terminal-faint text-[9px]">{accountCount} ACCT</span>
    {/if}
  </div>

  <div class="tabular-nums {amountClass} {balanceTone}">
    {currencyFormatter.format(totalBalance)}
  </div>

  {#if config.size === 'large' || config.size === 'full'}
    <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] tabular-nums">
      <span class="widget-terminal-faint">ON.BDGT</span>
      <span class="widget-terminal-faint">OFF.BDGT</span>
      <span class="widget-terminal-bright">{currencyFormatter.format(onBudgetBalance)}</span>
      <span class="widget-terminal-bright">{currencyFormatter.format(offBudgetBalance)}</span>
    </div>
  {/if}

  {#if config.size === 'full' && byType.length > 0}
    <div class="mt-2 space-y-0.5 text-[10px] tabular-nums">
      {#each byType as [type, amount]}
        <div class="flex items-baseline justify-between gap-2">
          <span class="widget-terminal-faint truncate uppercase">{ACCOUNT_TYPE_LABELS[type]}</span>
          <span class="widget-terminal-bright">{currencyFormatter.format(amount)}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
