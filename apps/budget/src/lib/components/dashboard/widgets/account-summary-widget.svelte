<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const accounts = $derived(Array.from(accountsState.accounts.values()));
const limit = $derived((config.settings as any)?.limit ?? 5);
const visibleAccounts = $derived(accounts.slice(0, limit));
</script>

<div class="space-y-2">
  {#each visibleAccounts as account}
    <div class="flex items-center justify-between">
      <span class="truncate text-sm font-medium">{account.name}</span>
      <span
        class="text-sm"
        class:text-green-600={account.balance && account.balance > 0}
        class:text-red-600={account.balance && account.balance < 0}
        class:text-muted-foreground={!account.balance || account.balance === 0}>
        {currencyFormatter.format(account.balance || 0)}
      </span>
    </div>
  {/each}
  {#if accounts.length > limit}
    <p class="text-muted-foreground text-center text-xs">+{accounts.length - limit} more</p>
  {/if}
  {#if accounts.length === 0}
    <p class="text-muted-foreground text-center text-sm">No accounts yet</p>
  {/if}
</div>
