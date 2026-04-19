<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const accounts = $derived(
  Array.from(accountsState.accounts.values()).filter((a) => !a.closed)
);
const limit = $derived((config.settings as any)?.limit ?? 6);
const visibleAccounts = $derived(accounts.slice(0, limit));

const total = $derived(accounts.reduce((s, a) => s + (a.balance ?? 0), 0));

function padRight(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n - 1) + '…';
  return s + ' '.repeat(n - s.length);
}

function typeTag(t: string | null | undefined): string {
  const upper = (t ?? 'OTHER').toUpperCase();
  return upper.length > 7 ? upper.slice(0, 7) : upper;
}

function compactCurrency(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n >= 0 ? '' : '-') + '$' + (abs / 1000).toFixed(1) + 'K';
  return currencyFormatter.format(n);
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
          <span
            class="ml-auto shrink-0"
            class:widget-terminal-bright={bal > 0}
            class:widget-terminal-neg={bal < 0}
            class:widget-terminal-faint={bal === 0}>
            {compactCurrency(bal)}
          </span>
        </div>
      {/each}
      {#if accounts.length > limit}
        <div class="widget-terminal-muted pt-1 text-[10px]">
          &hellip; +{accounts.length - limit} more
        </div>
      {/if}
    </div>
  {/if}
</div>
