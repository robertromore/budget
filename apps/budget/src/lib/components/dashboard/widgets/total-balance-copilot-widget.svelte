<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { ACCOUNT_TYPE_LABELS, type AccountType } from '$core/schema';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import Wallet from '@lucide/svelte/icons/wallet';
import { copilotPalette } from './copilot-colors';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const totalBalance = $derived(accountsState.getTotalBalance());
const accountCount = $derived(accountsState.activeCount);
const onBudgetBalance = $derived(accountsState.getOnBudgetBalance());
const offBudgetBalance = $derived(accountsState.getOffBudgetBalance());

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

const p = $derived(copilotPalette((config.settings as any)?.gradientColor));

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

const amountTone = $derived(
  totalBalance > 0
    ? 'text-foreground'
    : totalBalance < 0
      ? 'text-amount-negative'
      : 'text-muted-foreground'
);
</script>

<div class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-2 flex items-center gap-2">
    <div class="rounded-lg p-1.5 {p.iconBg}">
      <Wallet class="h-3.5 w-3.5 {p.iconFg}"></Wallet>
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Total balance'}
    </span>
  </div>

  <div class="font-bold tracking-tight {amountClass} {amountTone}">
    {currencyFormatter.format(totalBalance)}
  </div>

  {#if config.size !== 'small'}
    <p class="text-muted-foreground mt-0.5 text-xs">
      across {accountCount} account{accountCount === 1 ? '' : 's'}
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
          <span class="font-medium tabular-nums">{currencyFormatter.format(amount)}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
