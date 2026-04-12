<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import AccountContributionRow from './account-contribution-row.svelte';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const accounts = $derived(Array.from(accountsState.accounts.values()));

// Investment accounts with a positive annual contribution limit
const investmentAccounts = $derived(
  accounts.filter(
    (a) =>
      !a.closed &&
      a.accountType === 'investment' &&
      a.annualContributionLimit != null &&
      a.annualContributionLimit > 0
  )
);

// Investment accounts without a limit (secondary list — link to settings)
const investmentNoLimit = $derived(
  accounts.filter(
    (a) =>
      !a.closed &&
      a.accountType === 'investment' &&
      (a.annualContributionLimit == null || a.annualContributionLimit === 0)
  )
);
</script>

{#if investmentAccounts.length === 0 && investmentNoLimit.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-6">
    <TrendingUp class="text-muted-foreground h-10 w-10" />
    <p class="text-muted-foreground text-sm">No investment accounts</p>
    <a href="/accounts" class="text-primary text-xs hover:underline">Add an investment account</a>
  </div>
{:else}
  <div class="space-y-1">
    {#each investmentAccounts as account (account.id)}
      <AccountContributionRow {account}></AccountContributionRow>
    {/each}

    {#if investmentNoLimit.length > 0}
      {#if investmentAccounts.length > 0}
        <div class="mt-2 border-t pt-2">
          <p class="text-muted-foreground px-2 pb-1 text-xs">No limit set</p>
        </div>
      {/if}
      {#each investmentNoLimit as account (account.id)}
        <a
          href="/accounts/{account.slug}/settings"
          class="hover:bg-muted flex items-center justify-between rounded-md p-2 transition-colors">
          <span class="truncate text-sm">{account.name}</span>
          <span class="text-muted-foreground text-xs hover:text-primary">Set limit →</span>
        </a>
      {/each}
    {/if}
  </div>
{/if}
