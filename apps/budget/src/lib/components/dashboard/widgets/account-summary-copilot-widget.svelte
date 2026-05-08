<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import {
  ACCOUNT_TYPE_LABELS,
  type Account,
  type AccountType,
} from '$core/schema';
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
const accounts = $derived(accountsState.getActiveAccounts());
const total = $derived(accountsState.getTotalBalance());
const activeCount = $derived(accountsState.activeCount);

const accountsByAbs = $derived(
  [...accounts].sort((a, b) => Math.abs(b.balance ?? 0) - Math.abs(a.balance ?? 0))
);

const customLimit = $derived(Number((config.settings as any)?.limit) || 0);
const visibleAccounts = $derived.by(() => {
  if (customLimit > 0) return accountsByAbs.slice(0, customLimit);
  switch (config.size) {
    case 'medium':
      return accountsByAbs.slice(0, 3);
    case 'large':
      return accountsByAbs.slice(0, 6);
    default:
      return accountsByAbs;
  }
});
const remaining = $derived(accounts.length - visibleAccounts.length);

const groupedByType = $derived.by(() => {
  const groups = new Map<AccountType, { accounts: Account[]; subtotal: number }>();
  for (const account of accounts) {
    if (!account.accountType) continue;
    const existing = groups.get(account.accountType);
    if (existing) {
      existing.accounts.push(account);
      existing.subtotal += account.balance ?? 0;
    } else {
      groups.set(account.accountType, {
        accounts: [account],
        subtotal: account.balance ?? 0,
      });
    }
  }
  return Array.from(groups.entries()).sort(
    (a, b) => Math.abs(b[1].subtotal) - Math.abs(a[1].subtotal)
  );
});

const totalTone = $derived(
  total > 0
    ? 'text-amount-positive'
    : total < 0
      ? 'text-amount-negative'
      : 'text-muted-foreground'
);

function balanceColor(amount: number | null | undefined): string {
  if (!amount) return 'text-muted-foreground';
  return amount > 0 ? 'text-amount-positive' : 'text-amount-negative';
}

function iconFor(type: AccountType | null | undefined) {
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
      <Wallet class="h-3.5 w-3.5 {p.iconFg}"></Wallet>
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Accounts'}
    </span>
  </div>

  {#if accounts.length === 0}
    <p class="text-muted-foreground py-4 text-center text-sm">No open accounts yet</p>
  {:else if config.size === 'small'}
    <div class="text-xl font-bold tabular-nums {totalTone}">
      {currencyFormatter.format(total)}
    </div>
    <p class="text-muted-foreground mt-0.5 text-xs">
      {activeCount} account{activeCount === 1 ? '' : 's'}
    </p>
  {:else if config.size === 'full'}
    <div class="space-y-3">
      <div class="flex items-baseline justify-between border-b pb-2">
        <span class="text-muted-foreground text-xs uppercase tracking-wider">Net</span>
        <span class="font-bold tabular-nums {totalTone}">
          {currencyFormatter.format(total)}
        </span>
      </div>
      {#each groupedByType as [type, group]}
        {@const Icon = iconFor(type)}
        <div class="space-y-1">
          <div class="flex items-center gap-2 text-xs">
            <div class="rounded-md p-1 {p.iconBgSoft} {p.iconFg}">
              <Icon class="h-3 w-3"></Icon>
            </div>
            <span class="text-muted-foreground font-medium uppercase tracking-wider">
              {ACCOUNT_TYPE_LABELS[type]}
            </span>
            <span class="ml-auto font-semibold tabular-nums {balanceColor(group.subtotal)}">
              {currencyFormatter.format(group.subtotal)}
            </span>
          </div>
          {#each group.accounts as account}
            <div class="flex items-center justify-between pl-7 text-sm">
              <span class="truncate font-medium">{account.name}</span>
              <span class="tabular-nums {balanceColor(account.balance)}">
                {currencyFormatter.format(account.balance ?? 0)}
              </span>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {:else}
    <div class="space-y-1.5">
      {#if config.size === 'large'}
        <div class="mb-2 flex items-baseline justify-between border-b pb-2">
          <span class="text-muted-foreground text-xs uppercase tracking-wider">Net</span>
          <span class="font-bold tabular-nums {totalTone}">
            {currencyFormatter.format(total)}
          </span>
        </div>
      {/if}
      {#each visibleAccounts as account}
        {@const Icon = iconFor(account.accountType)}
        <div class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors {p.rowHover}">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full {p.iconBgSoft} {p.iconFg}">
            <Icon class="h-4 w-4"></Icon>
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{account.name}</div>
            {#if account.accountType}
              <div class="text-muted-foreground text-xs capitalize">
                {account.accountType.replace(/_/g, ' ')}
              </div>
            {/if}
          </div>
          <span class="shrink-0 text-sm font-semibold tabular-nums {balanceColor(account.balance)}">
            {currencyFormatter.format(account.balance ?? 0)}
          </span>
        </div>
      {/each}
      {#if remaining > 0}
        <p class="text-muted-foreground pt-1 text-center text-xs">+{remaining} more</p>
      {/if}
    </div>
  {/if}
</div>
