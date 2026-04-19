<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const summaryQuery = rpc.transactions.getWorkspaceSummary().options();
const totalReceived = $derived(Number(summaryQuery.data?.totalReceived30d) || 0);
const totalSpent = $derived(Number(summaryQuery.data?.totalSpent30d) || 0);
const netFlow = $derived(totalReceived - totalSpent);
const isPositive = $derived(netFlow >= 0);

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
</script>

<div class="space-y-3 font-serif text-[15px] leading-relaxed">
  <p class="text-muted-foreground text-[11px] font-sans uppercase tracking-wider">
    {monthName} · at a glance
  </p>
  <p>
    So far this month you've
    {#if netFlow === 0}
      broken even on cash flow —
      <span class="font-semibold">{currencyFormatter.format(totalReceived)}</span>
      in and the same amount out.
    {:else if isPositive}
      brought in
      <span class="font-semibold text-amount-positive">{currencyFormatter.format(totalReceived)}</span>
      and spent
      <span class="font-semibold">{currencyFormatter.format(totalSpent)}</span>, leaving you
      <span class="font-semibold text-amount-positive">
        {currencyFormatter.format(netFlow)}
      </span>
      ahead.
    {:else}
      spent
      <span class="font-semibold text-amount-negative">{currencyFormatter.format(totalSpent)}</span>
      against
      <span class="font-semibold">{currencyFormatter.format(totalReceived)}</span>
      of income —
      <span class="font-semibold text-amount-negative">
        {currencyFormatter.format(netFlow)}
      </span>
      behind on cash flow.
    {/if}
  </p>
  <p class="text-muted-foreground">
    You're
    <span class="text-foreground italic">{pacingPhrase}</span>.
    Net worth stands at
    <span class="text-foreground font-semibold">{currencyFormatter.format(netWorth)}</span>.
  </p>
</div>
