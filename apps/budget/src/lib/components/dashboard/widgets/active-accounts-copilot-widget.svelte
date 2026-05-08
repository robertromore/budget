<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { ACCOUNT_TYPE_LABELS, type AccountType } from '$core/schema';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import CreditCard from '@lucide/svelte/icons/credit-card';
import { copilotPalette } from './copilot-colors';

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

const p = $derived(copilotPalette((config.settings as any)?.gradientColor));

const countClass = $derived.by(() => {
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
</script>

<div class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-2 flex items-center gap-2">
    <div class="rounded-lg p-1.5 {p.iconBg}">
      <CreditCard class="h-3.5 w-3.5 {p.iconFg}"></CreditCard>
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Accounts'}
    </span>
  </div>

  <div class="font-bold tracking-tight tabular-nums {countClass}">{activeCount}</div>

  {#if config.size !== 'small'}
    <p class="text-muted-foreground mt-0.5 text-xs">
      {allAccounts.length} total · {closedCount} closed
    </p>
  {/if}

  {#if (config.size === 'large' || config.size === 'full') && byType.length > 0}
    <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
      {#each byType as [type, count]}
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-muted-foreground truncate">{ACCOUNT_TYPE_LABELS[type]}</span>
          <span class="font-semibold tabular-nums">{count}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if config.size === 'full'}
    <div class="mt-3 flex gap-4 text-xs">
      <div>
        <p class="text-muted-foreground">On-budget</p>
        <p class="font-semibold tabular-nums">{onBudgetCount}</p>
      </div>
      <div>
        <p class="text-muted-foreground">Off-budget</p>
        <p class="font-semibold tabular-nums">{offBudgetCount}</p>
      </div>
    </div>
  {/if}
</div>
