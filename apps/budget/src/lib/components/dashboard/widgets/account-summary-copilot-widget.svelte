<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import Banknote from '@lucide/svelte/icons/banknote';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Landmark from '@lucide/svelte/icons/landmark';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Wallet from '@lucide/svelte/icons/wallet';
import { copilotPalette } from './copilot-colors';

let { config }: { config: DashboardWidget } = $props();

const p = $derived(copilotPalette((config.settings as any)?.gradientColor));

const accountsState = $derived(AccountsState.get());
const accounts = $derived(
  Array.from(accountsState.accounts.values()).filter((a) => !a.closed)
);
const limit = $derived((config.settings as any)?.limit ?? 5);
const visibleAccounts = $derived(accounts.slice(0, limit));

function iconFor(type: string | null | undefined) {
  switch (type) {
    case 'credit_card':
      return CreditCard;
    case 'savings':
      return PiggyBank;
    case 'investment':
      return TrendingUp;
    case 'loan':
      return Landmark;
    case 'cash':
      return Banknote;
    default:
      return Wallet;
  }
}
</script>

<div class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-3 flex items-center gap-2">
    <div class="rounded-lg p-1.5 {p.iconBg}">
      <Wallet class="h-3.5 w-3.5 {p.iconFg}" />
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Accounts'}
    </span>
  </div>

  {#if accounts.length === 0}
    <p class="text-muted-foreground py-4 text-center text-sm">No open accounts yet</p>
  {:else}
    <div class="space-y-1.5">
      {#each visibleAccounts as account}
        {@const Icon = iconFor(account.accountType)}
        <div class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors {p.rowHover}">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full {p.iconBgSoft} {p.iconFg}">
            <Icon class="h-4 w-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{account.name}</div>
            {#if account.accountType}
              <div class="text-muted-foreground text-xs capitalize">
                {account.accountType.replace(/_/g, ' ')}
              </div>
            {/if}
          </div>
          <span
            class="shrink-0 text-sm font-semibold tabular-nums"
            class:text-amount-positive={account.balance && account.balance > 0}
            class:text-amount-negative={account.balance && account.balance < 0}
            class:text-muted-foreground={!account.balance || account.balance === 0}>
            {currencyFormatter.format(account.balance || 0)}
          </span>
        </div>
      {/each}
      {#if accounts.length > limit}
        <p class="text-muted-foreground pt-1 text-center text-xs">
          +{accounts.length - limit} more
        </p>
      {/if}
    </div>
  {/if}
</div>
