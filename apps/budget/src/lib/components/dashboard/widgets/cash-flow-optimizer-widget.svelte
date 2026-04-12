<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import {
  calculateIdleCash,
  generateTransferRecommendations,
} from '$lib/utils/cash-flow-optimizer';
import { currencyFormatter } from '$lib/utils/formatters';
import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
import WalletIcon from '@lucide/svelte/icons/wallet';

let { config }: { config: DashboardWidget } = $props();

// AccountsState.get() returns a stable context instance — no $derived needed.
const accountsState = AccountsState.get();
const accounts = $derived(accountsState.all);

const idleCash = $derived(calculateIdleCash(accounts));
// Derived from idleCash to avoid calling calculateIdleCash a second time.
const totalIdle = $derived(idleCash.reduce((sum, r) => sum + r.surplus, 0));
const recommendations = $derived(generateTransferRecommendations(accounts));

const hasTargetBalances = $derived(
  accounts.some((a) => a.targetBalance != null && !a.closed && !a.deletedAt)
);
</script>

{#if !hasTargetBalances}
  <div class="flex flex-col items-center gap-2 py-6 text-center">
    <WalletIcon class="text-muted-foreground h-8 w-8"></WalletIcon>
    <p class="text-muted-foreground text-sm">No target balances set</p>
    <p class="text-muted-foreground text-xs">
      Set a target buffer on checking or savings accounts to surface idle cash opportunities.
    </p>
    <a href="/accounts" class="text-primary text-xs hover:underline">Go to accounts</a>
  </div>
{:else if idleCash.length === 0}
  <div class="flex flex-col items-center gap-2 py-6 text-center">
    <TrendingUpIcon class="h-8 w-8 text-success"></TrendingUpIcon>
    <p class="text-sm font-medium">All balances within target</p>
    <p class="text-muted-foreground text-xs">No idle cash detected across tracked accounts.</p>
  </div>
{:else}
  <div class="space-y-3">
    <!-- Summary -->
    <div class="flex items-center justify-between">
      <span class="text-muted-foreground text-xs">Total idle cash</span>
      <span class="font-semibold text-warning">
        {currencyFormatter.format(totalIdle)}
      </span>
    </div>

    <!-- Idle accounts -->
    <div class="space-y-1.5">
      {#each idleCash as item (item.accountId)}
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground truncate">{item.accountName}</span>
          <span class="shrink-0 font-medium text-warning">
            +{currencyFormatter.format(item.surplus)}
          </span>
        </div>
      {/each}
    </div>

    <!-- Transfer recommendations -->
    {#if recommendations.length > 0}
      <div class="border-t pt-2">
        <p class="text-muted-foreground mb-1.5 text-xs font-medium">Suggested moves</p>
        <div class="space-y-1.5">
          {#each recommendations as rec (`${rec.fromAccountId}:${rec.toAccountId}`)}
            <div class="flex items-center gap-1.5 text-xs">
              <span class="truncate">{rec.fromAccountName}</span>
              <ArrowRightIcon class="text-muted-foreground h-3 w-3 shrink-0"></ArrowRightIcon>
              <span class="truncate">{rec.toAccountName}</span>
              <span class="text-muted-foreground shrink-0">
                (+{currencyFormatter.format(rec.annualGain)}/yr)
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <a
      href="/accounts"
      class="text-muted-foreground hover:text-foreground mt-1 block pt-1 text-center text-xs transition-colors hover:underline">
      Manage accounts →
    </a>
  </div>
{/if}
