<script lang="ts">
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import type { Account } from '$core/schema/accounts';

interface Props {
  account: Account;
}

let { account }: Props = $props();

// account.id is stable for this component's lifetime — the parent keys each row by account.id.
// svelte-ignore state_referenced_locally
const summaryQuery = $derived(rpc.accounts.getContributionSummary(account.id).options());
const summary = $derived(summaryQuery.data ?? null);
const isLoading = $derived(summaryQuery.isLoading);

const limit = $derived(account.annualContributionLimit);
const percentUsed = $derived(summary?.percentUsed ?? 0);

function progressColor(pct: number): string {
  if (pct >= 100) return 'var(--chart-1)';
  if (pct >= 75) return 'var(--chart-3)';
  return 'var(--chart-2)';
}
</script>

<a href="/accounts/{account.slug}?tab=analytics" class="hover:bg-muted block rounded-md p-2 transition-colors">
  <div class="flex items-center justify-between gap-2 text-sm">
    <span class="truncate font-medium">{account.name}</span>
    {#if isLoading}
      <span class="text-muted-foreground text-xs">Loading…</span>
    {:else if summary && limit}
      <span class="font-mono text-xs">
        {currencyFormatter.format(summary.contributed)}
        <span class="text-muted-foreground">/ {currencyFormatter.format(limit)}</span>
      </span>
    {:else if summary}
      <span class="font-mono text-xs">{currencyFormatter.format(summary.contributed)}</span>
    {/if}
  </div>
  {#if limit && limit > 0}
    <div class="bg-muted mt-1.5 h-1.5 w-full overflow-hidden rounded-full">
      <div
        class="h-full rounded-full transition-all duration-500"
        style="width: {Math.min(percentUsed, 100)}%; background: {progressColor(percentUsed)};"></div>
    </div>
    <div class="text-muted-foreground mt-0.5 text-right text-xs">
      {percentUsed.toFixed(0)}%
    </div>
  {/if}
</a>
