<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { ACCOUNT_TYPE_LABELS, type AccountType } from '$core/schema';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import Wallet from '@lucide/svelte/icons/wallet';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const totalBalance = $derived(accountsState.getTotalBalance());
const accountCount = $derived(accountsState.activeCount);
const onBudgetBalance = $derived(accountsState.getOnBudgetBalance());
const offBudgetBalance = $derived(accountsState.getOffBudgetBalance());

// At "full" size, break the total down by account type so the wider
// box has something to fill. Excludes closed accounts (matching the
// totals above).
const byType = $derived.by(() => {
  const totals = new Map<AccountType, number>();
  for (const account of accountsState.getActiveAccounts()) {
    if (!account.accountType) continue;
    const current = totals.get(account.accountType) ?? 0;
    totals.set(account.accountType, current + (account.balance || 0));
  }
  return Array.from(totals.entries())
    .filter(([, amount]) => amount !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
});

const balanceColor = $derived(
  totalBalance > 0 ? 'text-amount-positive' : totalBalance < 0 ? 'text-amount-negative' : 'text-muted-foreground'
);

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
</script>

<div class="flex items-start gap-3">
  <div class="bg-primary/10 rounded-lg p-2.5 shrink-0">
    <Wallet class="text-primary h-5 w-5"></Wallet>
  </div>
  <div class="min-w-0 flex-1">
    <div class="truncate font-bold {amountClass} {balanceColor}">
      {currencyFormatter.format(totalBalance)}
    </div>

    {#if config.size !== 'small'}
      <p class="text-muted-foreground text-xs">
        Across {accountCount} account{accountCount === 1 ? '' : 's'}
      </p>
    {/if}

    {#if config.size === 'large' || config.size === 'full'}
      <div class="mt-3 flex gap-4 text-xs">
        <div>
          <p class="text-muted-foreground">On-budget</p>
          <p class="font-semibold">{currencyFormatter.format(onBudgetBalance)}</p>
        </div>
        <div>
          <p class="text-muted-foreground">Off-budget</p>
          <p class="font-semibold">{currencyFormatter.format(offBudgetBalance)}</p>
        </div>
      </div>
    {/if}

    {#if config.size === 'full' && byType.length > 0}
      <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
        {#each byType as [type, amount]}
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-muted-foreground truncate">{ACCOUNT_TYPE_LABELS[type]}</span>
            <span class="tabular-nums font-medium">{currencyFormatter.format(amount)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
