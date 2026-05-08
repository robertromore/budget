<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const budgetsQuery = rpc.budgets.listBudgets().options();
const budgets = $derived(budgetsQuery.data ?? []);
const isLoading = $derived(budgetsQuery.isLoading);

const summaries = $derived.by(() => {
  return budgets
    .filter((b: any) => b.metadata?.allocatedAmount && b.metadata.allocatedAmount > 0)
    .map((b: any) => {
      const allocated = Number(b.metadata?.allocatedAmount) || 0;
      const spent = (b.transactions ?? []).reduce(
        (sum: number, bt: any) =>
          sum + Math.abs(Number(bt.allocatedAmount ?? bt.transaction?.amount ?? 0)),
        0
      );
      const pct = allocated > 0 ? (spent / allocated) * 100 : 0;
      return { name: b.name, allocated, spent, pct, isOver: spent > allocated };
    })
    .sort((a, b) => b.pct - a.pct);
});

const onTrack = $derived(summaries.filter((s) => !s.isOver && s.pct < 85));
const watchOut = $derived(summaries.filter((s) => !s.isOver && s.pct >= 85));
const overspent = $derived(summaries.filter((s) => s.isOver));

const totalSpent = $derived(summaries.reduce((s, b) => s + b.spent, 0));
const totalAllocated = $derived(summaries.reduce((s, b) => s + b.allocated, 0));
const overrunTotal = $derived(
  overspent.reduce((s, b) => s + Math.max(0, b.spent - b.allocated), 0)
);
</script>

<div class="font-serif leading-relaxed" class:text-[13px]={config.size === 'small'} class:text-[15px]={config.size !== 'small'}>
  <p class="text-muted-foreground mb-2 text-[11px] font-sans uppercase tracking-wider">
    Budget rundown
  </p>

  {#if isLoading}
    <div class="bg-muted h-24 animate-pulse rounded"></div>
  {:else if summaries.length === 0}
    <p class="text-muted-foreground">
      You don't have any active budgets yet. <a href="/budgets" class="text-primary hover:underline">Create one</a> to see how you're pacing.
    </p>
  {:else if config.size === 'small'}
    <p>
      {#if overspent.length > 0}
        <span class="text-amount-negative font-semibold">{overspent.length} over</span>
      {:else if watchOut.length > 0}
        <span class="font-semibold">{watchOut.length} near cap</span>
      {:else}
        <span class="text-amount-positive font-semibold">All on pace</span>
      {/if}
      across <span class="font-semibold">{summaries.length}</span> budget{summaries.length === 1 ? '' : 's'}.
    </p>
  {:else}
    <div class="space-y-3">
      {#if overspent.length > 0}
        <p>
          You've <span class="text-amount-negative font-semibold">gone over</span> in
          {#each overspent as b, i}
            <span class="font-semibold">{b.name}</span>
            <span class="tabular-nums">({currencyFormatter.format(b.spent)} of {currencyFormatter.format(b.allocated)})</span>
            {#if i < overspent.length - 2}<span>, </span>
            {:else if i === overspent.length - 2}<span> and </span>
            {:else if overspent.length > 1}<span>. </span>{/if}
          {/each}
          {#if overspent.length === 1}.{/if}
        </p>
      {/if}

      {#if watchOut.length > 0}
        <p>
          {#if overspent.length > 0}You're also{:else}You're{/if} close to the cap on
          {#each watchOut as b, i}
            <span class="font-semibold">{b.name}</span>
            <span class="tabular-nums">({b.pct.toFixed(0)}%)</span>
            {#if i < watchOut.length - 2}<span>, </span>
            {:else if i === watchOut.length - 2}<span> and </span>
            {:else if watchOut.length > 1}<span>. </span>{/if}
          {/each}
          {#if watchOut.length === 1}.{/if}
        </p>
      {/if}

      {#if onTrack.length > 0}
        <p class="text-muted-foreground">
          The rest —
          <span class="text-foreground font-semibold">{onTrack.length}</span>
          budget{onTrack.length === 1 ? '' : 's'} — {onTrack.length === 1 ? 'is' : 'are'} tracking comfortably.
        </p>
      {/if}

      {#if overspent.length === 0 && watchOut.length === 0}
        <p>
          Every active budget is under
          <span class="font-semibold">85%</span> this period — nice pacing.
        </p>
      {/if}

      {#if config.size === 'large' || config.size === 'full'}
        <p class="text-muted-foreground">
          Across all your budgets you've spent
          <span class="text-foreground font-semibold tabular-nums">
            {currencyFormatter.format(totalSpent)}
          </span>
          of
          <span class="text-foreground font-semibold tabular-nums">
            {currencyFormatter.format(totalAllocated)}
          </span>
          allocated{#if overrunTotal > 0}, with
            <span class="text-amount-negative font-semibold tabular-nums">
              {currencyFormatter.format(overrunTotal)}
            </span> in total overruns{/if}.
        </p>
      {/if}

      {#if config.size === 'full' && summaries.length > 0}
        <div class="border-t pt-3">
          <p class="text-muted-foreground mb-2 text-[11px] font-sans uppercase tracking-wider">
            Per-budget detail
          </p>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 font-sans text-xs">
            {#each summaries as b}
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-foreground truncate">{b.name}</span>
                <span
                  class="tabular-nums"
                  class:text-amount-negative={b.isOver}
                  class:text-warning-fg={!b.isOver && b.pct >= 85}
                  class:text-muted-foreground={!b.isOver && b.pct < 85}>
                  {b.pct.toFixed(0)}%
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
