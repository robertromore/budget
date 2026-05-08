<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const summaryQuery = rpc.transactions.getWorkspaceSummary().options();
const totalReceived = $derived(Number(summaryQuery.data?.totalReceived30d) || 0);
const totalSpent = $derived(Number(summaryQuery.data?.totalSpent30d) || 0);
const txCount = $derived(Number(summaryQuery.data?.transactionCount30d) || 0);
const pendingCount = $derived(Number(summaryQuery.data?.pendingCount) || 0);
const pendingTotal = $derived(Number(summaryQuery.data?.totalPending) || 0);
const netFlow = $derived(totalReceived - totalSpent);
const isPositive = $derived(netFlow >= 0);

// Only fetch the top category at large/full sizes — it's a separate
// query and small/medium variants don't surface the data anyway.
const wantsTopCategory = $derived(config.size === 'large' || config.size === 'full');
const topCategoriesQuery = $derived(
  wantsTopCategory ? rpc.transactions.getWorkspaceTopCategories(1).options() : null
);
const topCategory = $derived.by(() => {
  if (!topCategoriesQuery) return null;
  const list = (topCategoriesQuery.data ?? []) as Array<{
    categoryName: string;
    totalAmount: number;
  }>;
  if (list.length === 0) return null;
  const top = list[0]!;
  return {
    name: top.categoryName ?? 'Uncategorized',
    amount: Math.abs(Number(top.totalAmount) || 0),
  };
});

const accountsState = $derived(AccountsState.get());
const netWorth = $derived(accountsState.getTotalBalance());

const now = new Date();
const monthName = now.toLocaleString('en-US', { month: 'long' });

const pacing = $derived.by(() => {
  if (totalReceived === 0) return 'quiet';
  const ratio = totalSpent / totalReceived;
  if (ratio < 0.5) return 'light';
  if (ratio < 0.75) return 'on-pace';
  if (ratio < 1) return 'heavy';
  return 'over';
});

const pacingPhrase = $derived(
  {
    quiet: 'a quiet month so far',
    light: 'running light — plenty of room in the budget',
    'on-pace': 'pacing about where you usually land',
    heavy: 'spending a little heavier than usual',
    over: "outspending what's come in",
  }[pacing]
);

const savingsRate = $derived(
  totalReceived > 0 ? Math.max(0, netFlow / totalReceived) : 0
);
</script>

<div class="font-serif leading-relaxed" class:text-[13px]={config.size === 'small'} class:text-[15px]={config.size !== 'small'}>
  <p class="text-muted-foreground mb-2 text-[11px] font-sans uppercase tracking-wider">
    {monthName} · at a glance
  </p>

  {#if config.size === 'small'}
    <p>
      {pacingPhrase.charAt(0).toUpperCase() + pacingPhrase.slice(1)} —
      net
      <span
        class="font-semibold tabular-nums"
        class:text-amount-positive={isPositive && netFlow !== 0}
        class:text-amount-negative={!isPositive}>
        {netFlow >= 0 ? '+' : ''}{currencyFormatter.format(netFlow)}
      </span>.
    </p>
  {:else}
    <div class="space-y-3">
      <p>
        So far this month you've
        {#if netFlow === 0}
          broken even on cash flow —
          <span class="font-semibold tabular-nums">{currencyFormatter.format(totalReceived)}</span>
          in and the same amount out.
        {:else if isPositive}
          brought in
          <span class="text-amount-positive font-semibold tabular-nums">
            {currencyFormatter.format(totalReceived)}
          </span>
          and spent
          <span class="font-semibold tabular-nums">{currencyFormatter.format(totalSpent)}</span>, leaving you
          <span class="text-amount-positive font-semibold tabular-nums">
            {currencyFormatter.format(netFlow)}
          </span>
          ahead.
        {:else}
          spent
          <span class="text-amount-negative font-semibold tabular-nums">
            {currencyFormatter.format(totalSpent)}
          </span>
          against
          <span class="font-semibold tabular-nums">{currencyFormatter.format(totalReceived)}</span>
          of income —
          <span class="text-amount-negative font-semibold tabular-nums">
            {currencyFormatter.format(netFlow)}
          </span>
          behind on cash flow.
        {/if}
      </p>

      <p class="text-muted-foreground">
        You're
        <span class="text-foreground italic">{pacingPhrase}</span>.
        Net worth stands at
        <span class="text-foreground font-semibold tabular-nums">
          {currencyFormatter.format(netWorth)}
        </span>.
      </p>

      {#if config.size === 'large' || config.size === 'full'}
        <p class="text-muted-foreground">
          {#if txCount > 0}
            That's across
            <span class="text-foreground font-semibold tabular-nums">{txCount}</span>
            transaction{txCount === 1 ? '' : 's'}{#if totalReceived > 0}, with a savings rate of
              <span class="text-foreground font-semibold">{(savingsRate * 100).toFixed(0)}%</span>{/if}.
          {/if}
          {#if topCategory && topCategory.amount > 0}
            Biggest spend went to
            <span class="text-foreground font-semibold">{topCategory.name}</span>
            at
            <span class="text-foreground font-semibold tabular-nums">
              {currencyFormatter.format(topCategory.amount)}
            </span>.
          {/if}
        </p>
      {/if}

      {#if config.size === 'full' && pendingCount > 0}
        <p class="text-muted-foreground">
          And there
          {pendingCount === 1 ? 'is' : 'are'}
          <span class="text-foreground font-semibold tabular-nums">{pendingCount}</span>
          pending transaction{pendingCount === 1 ? '' : 's'} totaling
          <span
            class="font-semibold tabular-nums"
            class:text-amount-positive={pendingTotal > 0}
            class:text-amount-negative={pendingTotal < 0}>
            {pendingTotal >= 0 ? '+' : ''}{currencyFormatter.format(pendingTotal)}
          </span>
          waiting to clear.
        </p>
      {/if}
    </div>
  {/if}
</div>
