<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import {
  ACCOUNT_TYPE_LABELS,
  type Account,
  type AccountType,
} from '$core/schema';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import Wallet from '@lucide/svelte/icons/wallet';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const activeAccounts = $derived(accountsState.getActiveAccounts());
const total = $derived(accountsState.getTotalBalance());
const activeCount = $derived(accountsState.activeCount);

// Sort by absolute balance so the most-active accounts surface first
// regardless of sign — a $5k credit-card debt is more interesting on
// a summary than a $50 cash account.
const accountsByAbs = $derived(
  [...activeAccounts].sort((a, b) => Math.abs(b.balance ?? 0) - Math.abs(a.balance ?? 0))
);

// Per-size visible window. The `limit` setting from the widget settings
// dialog still wins when present, so power users can override.
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

const remaining = $derived(activeAccounts.length - visibleAccounts.length);

// Type-grouped buckets for `full` size.
const groupedByType = $derived.by(() => {
  const groups = new Map<AccountType, { accounts: Account[]; subtotal: number }>();
  for (const account of activeAccounts) {
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

const totalColor = $derived(
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
</script>

{#if activeAccounts.length === 0}
  <p class="text-muted-foreground text-center text-sm">No accounts yet</p>
{:else if config.size === 'small'}
  <div class="flex items-center gap-3">
    <div class="bg-primary/10 rounded-lg p-2.5 shrink-0">
      <Wallet class="text-primary h-5 w-5"></Wallet>
    </div>
    <div class="min-w-0 flex-1">
      <div class="truncate text-xl font-bold {totalColor}">
        {currencyFormatter.format(total)}
      </div>
      <p class="text-muted-foreground text-xs">
        {activeCount} account{activeCount === 1 ? '' : 's'}
      </p>
    </div>
  </div>
{:else if config.size === 'full'}
  <div class="space-y-3">
    <div class="flex items-baseline justify-between border-b pb-2">
      <span class="text-muted-foreground text-xs uppercase tracking-wider">Net</span>
      <span class="font-bold tabular-nums {totalColor}">
        {currencyFormatter.format(total)}
      </span>
    </div>
    {#each groupedByType as [type, group]}
      <div class="space-y-1">
        <div class="flex items-baseline justify-between text-xs">
          <span class="text-muted-foreground font-medium uppercase tracking-wider">
            {ACCOUNT_TYPE_LABELS[type]}
          </span>
          <span class="font-semibold tabular-nums {balanceColor(group.subtotal)}">
            {currencyFormatter.format(group.subtotal)}
          </span>
        </div>
        {#each group.accounts as account}
          <div class="flex items-center justify-between pl-3 text-sm">
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
  <div class="space-y-2">
    {#if config.size === 'large'}
      <div class="flex items-baseline justify-between border-b pb-2">
        <span class="text-muted-foreground text-xs uppercase tracking-wider">Net</span>
        <span class="font-bold tabular-nums {totalColor}">
          {currencyFormatter.format(total)}
        </span>
      </div>
    {/if}
    {#each visibleAccounts as account}
      <div class="flex items-center justify-between">
        <span class="truncate text-sm font-medium">{account.name}</span>
        <span class="text-sm tabular-nums {balanceColor(account.balance)}">
          {currencyFormatter.format(account.balance ?? 0)}
        </span>
      </div>
    {/each}
    {#if remaining > 0}
      <p class="text-muted-foreground text-center text-xs">+{remaining} more</p>
    {/if}
  </div>
{/if}
