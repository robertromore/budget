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

const accountsState = AccountsState.get();
const accounts = $derived(accountsState.all);

const idleCash = $derived(calculateIdleCash(accounts));
const totalIdle = $derived(idleCash.reduce((sum, r) => sum + r.surplus, 0));
const recommendations = $derived(generateTransferRecommendations(accounts));

const hasTargetBalances = $derived(
  accounts.some((a) => a.targetBalance != null && !a.closed && !a.deletedAt)
);

const idleLimit = $derived.by(() => {
  switch (config.size) {
    case 'small':
      return 0;
    case 'medium':
      return 3;
    case 'large':
      return 6;
    default:
      return 20;
  }
});
const recsLimit = $derived.by(() => {
  switch (config.size) {
    case 'small':
      return 0;
    case 'medium':
      return 2;
    case 'large':
      return 4;
    default:
      return 10;
  }
});

const visibleIdle = $derived(idleCash.slice(0, idleLimit));
const idleRemaining = $derived(idleCash.length - visibleIdle.length);
const visibleRecs = $derived(recommendations.slice(0, recsLimit));
const recsRemaining = $derived(recommendations.length - visibleRecs.length);
const annualGainTotal = $derived(recommendations.reduce((s, r) => s + r.annualGain, 0));
</script>

{#if !hasTargetBalances}
  <div class="flex flex-col items-center gap-2 py-6 text-center">
    <WalletIcon class="text-muted-foreground h-8 w-8"></WalletIcon>
    <p class="text-muted-foreground text-sm">No target balances set</p>
    {#if config.size !== 'small'}
      <p class="text-muted-foreground text-xs">
        Set a target buffer on checking or savings accounts to surface idle cash opportunities.
      </p>
    {/if}
    <a href="/accounts" class="text-primary text-xs hover:underline">Go to accounts</a>
  </div>
{:else if idleCash.length === 0}
  <div class="flex flex-col items-center gap-2 py-6 text-center">
    <TrendingUpIcon class="h-8 w-8 text-success"></TrendingUpIcon>
    <p class="text-sm font-medium">All balances within target</p>
    {#if config.size !== 'small'}
      <p class="text-muted-foreground text-xs">No idle cash detected across tracked accounts.</p>
    {/if}
  </div>
{:else if config.size === 'small'}
  <div class="flex items-start gap-3">
    <div class="bg-warning-bg rounded-lg p-2.5 shrink-0">
      <WalletIcon class="text-warning-fg h-5 w-5"></WalletIcon>
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-warning text-xl font-bold tabular-nums">
        {currencyFormatter.format(totalIdle)}
      </div>
      <p class="text-muted-foreground truncate text-xs">
        idle across {idleCash.length} account{idleCash.length === 1 ? '' : 's'}
      </p>
    </div>
  </div>
{:else}
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-muted-foreground text-xs">Total idle cash</span>
      <span class="font-semibold text-warning tabular-nums">
        {currencyFormatter.format(totalIdle)}
      </span>
    </div>

    <div class="space-y-1.5">
      {#each visibleIdle as item (item.accountId)}
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground truncate">{item.accountName}</span>
          <span class="shrink-0 font-medium text-warning tabular-nums">
            +{currencyFormatter.format(item.surplus)}
          </span>
        </div>
      {/each}
      {#if idleRemaining > 0}
        <p class="text-muted-foreground text-center text-xs">+{idleRemaining} more</p>
      {/if}
    </div>

    {#if recommendations.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1.5 flex items-baseline justify-between">
          <p class="text-muted-foreground text-xs font-medium">Suggested moves</p>
          {#if config.size === 'large' || config.size === 'full'}
            <p class="text-muted-foreground text-[10px] tabular-nums">
              +{currencyFormatter.format(annualGainTotal)}/yr potential
            </p>
          {/if}
        </div>
        <div class="space-y-1.5">
          {#each visibleRecs as rec (`${rec.fromAccountId}:${rec.toAccountId}`)}
            <div class="flex items-center gap-1.5 text-xs">
              <span class="truncate">{rec.fromAccountName}</span>
              <ArrowRightIcon class="text-muted-foreground h-3 w-3 shrink-0"></ArrowRightIcon>
              <span class="truncate">{rec.toAccountName}</span>
              <span class="text-muted-foreground shrink-0 tabular-nums">
                (+{currencyFormatter.format(rec.annualGain)}/yr)
              </span>
            </div>
          {/each}
          {#if recsRemaining > 0}
            <p class="text-muted-foreground text-center text-xs">+{recsRemaining} more</p>
          {/if}
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
