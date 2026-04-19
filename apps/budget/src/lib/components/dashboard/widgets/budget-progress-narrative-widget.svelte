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
</script>

<div class="space-y-3 font-serif text-[15px] leading-relaxed">
  <p class="text-muted-foreground text-[11px] font-sans uppercase tracking-wider">
    Budget rundown
  </p>

  {#if isLoading}
    <div class="bg-muted h-24 animate-pulse rounded"></div>
  {:else if summaries.length === 0}
    <p class="text-muted-foreground">
      You don't have any active budgets yet. <a
        href="/budgets"
        class="text-primary hover:underline">Create one</a
      > to see how you're pacing.
    </p>
  {:else}
    {#if overspent.length > 0}
      <p>
        You've <span class="font-semibold text-amount-negative">gone over</span> in
        {#each overspent as b, i}
          <span class="font-semibold">{b.name}</span>
          ({currencyFormatter.format(b.spent)} of {currencyFormatter.format(b.allocated)})
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
          ({b.pct.toFixed(0)}%)
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
  {/if}
</div>
