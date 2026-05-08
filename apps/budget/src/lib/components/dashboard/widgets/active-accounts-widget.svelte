<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { ACCOUNT_TYPE_LABELS, type AccountType } from '$core/schema';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import CreditCard from '@lucide/svelte/icons/credit-card';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const allAccounts = $derived(Array.from(accountsState.accounts.values()));
const activeAccounts = $derived(accountsState.getActiveAccounts());
const activeCount = $derived(accountsState.activeCount);
const closedCount = $derived(allAccounts.length - activeCount);

const onBudgetCount = $derived(activeAccounts.filter((a) => a.onBudget === true).length);
const offBudgetCount = $derived(activeAccounts.filter((a) => a.onBudget === false).length);

// Per-type counts among active accounts. Sorted by count desc so the
// dominant types surface first in the grid at large/full sizes.
const byType = $derived.by(() => {
  const counts = new Map<AccountType, number>();
  for (const account of activeAccounts) {
    if (!account.accountType) continue;
    counts.set(account.accountType, (counts.get(account.accountType) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
});

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

<div class="flex items-start gap-3">
  <div class="bg-primary/10 rounded-lg p-2.5 shrink-0">
    <CreditCard class="text-primary h-5 w-5"></CreditCard>
  </div>
  <div class="min-w-0 flex-1">
    <div class="font-bold tabular-nums {countClass}">{activeCount}</div>

    {#if config.size !== 'small'}
      <p class="text-muted-foreground text-xs">
        {allAccounts.length} total · {closedCount} closed
      </p>
    {/if}

    {#if config.size === 'large' || config.size === 'full'}
      {#if byType.length > 0}
        <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          {#each byType as [type, count]}
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-muted-foreground truncate">{ACCOUNT_TYPE_LABELS[type]}</span>
              <span class="font-semibold tabular-nums">{count}</span>
            </div>
          {/each}
        </div>
      {/if}
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
</div>
