<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import {
  ACCOUNT_TYPE_LABELS,
  type Account,
  type AccountType,
} from '$core/schema';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

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
      return accountsByAbs.slice(0, 4);
    case 'large':
      return accountsByAbs.slice(0, 8);
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

function padRight(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n - 1) + '…';
  return s + ' '.repeat(n - s.length);
}

function typeTag(t: AccountType | null | undefined): string {
  const upper = (t ?? 'other').toUpperCase();
  return upper.length > 7 ? upper.slice(0, 7) : upper;
}

function compactCurrency(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n >= 0 ? '' : '-') + '$' + (abs / 1000).toFixed(1) + 'K';
  return currencyFormatter.format(n);
}

const totalTone = $derived(
  total > 0
    ? 'widget-terminal-bright'
    : total < 0
      ? 'widget-terminal-neg'
      : 'widget-terminal-faint'
);

function balanceTone(amount: number): string {
  if (amount > 0) return 'widget-terminal-bright';
  if (amount < 0) return 'widget-terminal-neg';
  return 'widget-terminal-faint';
}
</script>

<div class="widget-terminal">
  <div class="mb-2 flex items-baseline justify-between border-b border-(--term-border) pb-1.5">
    <span class="widget-terminal-heading">{config.title || 'ACCT.BOOK'}</span>
    <span class="widget-terminal-faint text-[10px]">NET {compactCurrency(total)}</span>
  </div>

  {#if accounts.length === 0}
    <div class="widget-terminal-muted py-6 text-center text-[10px]">
      &gt; no.open.accounts
    </div>
  {:else if config.size === 'small'}
    <div class="flex flex-col gap-0.5">
      <div class="text-base tabular-nums {totalTone}">{compactCurrency(total)}</div>
      <span class="widget-terminal-faint text-[10px]">
        {activeCount} ACCT
      </span>
    </div>
  {:else if config.size === 'full'}
    <div class="space-y-1.5 text-[11px] tabular-nums">
      {#each groupedByType as [type, group]}
        <div>
          <div class="widget-terminal-faint flex items-baseline justify-between text-[10px] uppercase">
            <span>{typeTag(type)}</span>
            <span class={balanceTone(group.subtotal)}>{compactCurrency(group.subtotal)}</span>
          </div>
          {#each group.accounts as account}
            {@const bal = account.balance ?? 0}
            <div class="flex items-center gap-0.5 pl-2">
              <span class="widget-terminal-bright shrink-0">{padRight(account.name, 22)}</span>
              <span class="ml-auto shrink-0 {balanceTone(bal)}">
                {compactCurrency(bal)}
              </span>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {:else}
    <div class="space-y-0.5 text-[11px] tabular-nums">
      <div class="widget-terminal-muted text-[10px] uppercase">
        {padRight('ACCOUNT', 20)}{padRight('TYPE', 9)}BALANCE
      </div>
      {#each visibleAccounts as account}
        {@const bal = account.balance ?? 0}
        <div class="flex items-center gap-0.5">
          <span class="widget-terminal-bright shrink-0">{padRight(account.name, 20)}</span>
          <span class="widget-terminal-dim shrink-0">{padRight(typeTag(account.accountType), 9)}</span>
          <span class="ml-auto shrink-0 {balanceTone(bal)}">
            {compactCurrency(bal)}
          </span>
        </div>
      {/each}
      {#if remaining > 0}
        <div class="widget-terminal-muted pt-1 text-[10px]">
          &hellip; +{remaining} more
        </div>
      {/if}
    </div>
  {/if}
</div>
