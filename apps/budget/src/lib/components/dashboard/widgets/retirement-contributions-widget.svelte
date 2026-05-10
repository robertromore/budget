<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import AccountContributionRow from './account-contribution-row.svelte';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const accounts = $derived(Array.from(accountsState.accounts.values()));

const investmentAccounts = $derived(
  accounts.filter(
    (a) =>
      !a.closed &&
      a.accountType === 'investment' &&
      a.annualContributionLimit != null &&
      a.annualContributionLimit > 0
  )
);

const investmentNoLimit = $derived(
  accounts.filter(
    (a) =>
      !a.closed &&
      a.accountType === 'investment' &&
      (a.annualContributionLimit == null || a.annualContributionLimit === 0)
  )
);

const customLimit = $derived(Number((config.settings as any)?.limit) || 0);
const visibleLimit = $derived.by(() => {
  if (customLimit > 0) return customLimit;
  switch (config.size) {
    case 'small':
      return 1;
    case 'medium':
      return 3;
    case 'large':
      return 6;
    default:
      return 20;
  }
});

const visibleWithLimit = $derived(investmentAccounts.slice(0, visibleLimit));
const remainingWithLimit = $derived(investmentAccounts.length - visibleWithLimit.length);
const showNoLimit = $derived(config.size === 'large' || config.size === 'full');
const totalActive = $derived(investmentAccounts.length + investmentNoLimit.length);
</script>

{#if investmentAccounts.length === 0 && investmentNoLimit.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-6">
    <TrendingUp class="text-muted-foreground h-10 w-10"></TrendingUp>
    <p class="text-muted-foreground text-sm">No investment accounts</p>
    <a href="/accounts" class="text-primary text-xs hover:underline">Add an investment account</a>
  </div>
{:else if config.size === 'small'}
  <div class="flex items-start gap-3">
    <div class="bg-primary/10 rounded-lg p-2.5 shrink-0">
      <TrendingUp class="text-primary h-5 w-5"></TrendingUp>
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-xl font-bold tabular-nums">{totalActive}</div>
      <p class="text-muted-foreground truncate text-xs">
        {investmentAccounts.length} with limit{investmentAccounts.length === 1 ? '' : 's'}
        {#if investmentNoLimit.length > 0}
          · {investmentNoLimit.length} unset
        {/if}
      </p>
    </div>
  </div>
{:else}
  <div class="space-y-1">
    {#if config.size === 'full' && investmentAccounts.length > 0}
      <div class="text-muted-foreground border-b pb-1.5 text-xs uppercase tracking-wider">
        {investmentAccounts.length} tracked · {investmentNoLimit.length} unset
      </div>
    {/if}

    {#each visibleWithLimit as account (account.id)}
      <AccountContributionRow {account}></AccountContributionRow>
    {/each}

    {#if remainingWithLimit > 0}
      <p class="text-muted-foreground pt-1 text-center text-xs">+{remainingWithLimit} more</p>
    {/if}

    {#if showNoLimit && investmentNoLimit.length > 0}
      {#if investmentAccounts.length > 0}
        <div class="mt-2 border-t pt-2">
          <p class="text-muted-foreground px-2 pb-1 text-xs">No limit set</p>
        </div>
      {/if}
      {#each investmentNoLimit as account (account.id)}
        <a
          href="/accounts/{account.slug}?tab=settings"
          class="hover:bg-muted flex items-center justify-between rounded-md p-2 transition-colors">
          <span class="truncate text-sm">{account.name}</span>
          <span class="text-muted-foreground text-xs hover:text-primary">Set limit →</span>
        </a>
      {/each}
    {:else if investmentNoLimit.length > 0 && config.size === 'medium'}
      <p class="text-muted-foreground pt-1 text-center text-xs">
        +{investmentNoLimit.length} without a limit set
      </p>
    {/if}
  </div>
{/if}
