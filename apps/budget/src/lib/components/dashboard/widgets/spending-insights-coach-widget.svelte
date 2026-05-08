<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import Target from '@lucide/svelte/icons/target';

let { config }: { config: DashboardWidget } = $props();

const customLimit = $derived(Number((config.settings as any)?.limit) || 0);
const limit = $derived.by(() => {
  if (customLimit > 0) return customLimit;
  switch (config.size) {
    case 'small':
      return 1;
    case 'medium':
      return 3;
    case 'large':
      return 6;
    default:
      return 10;
  }
});

const categoriesQuery = $derived(rpc.transactions.getWorkspaceTopCategories(limit).options());
const categories = $derived(
  ((categoriesQuery.data ?? []) as Array<{
    categoryName: string;
    totalAmount: number;
    transactionCount: number;
  }>).map((c) => ({
    name: c.categoryName ?? 'Uncategorized',
    amount: Math.abs(Number(c.totalAmount) || 0),
    count: Number(c.transactionCount) || 0,
  }))
);
const isLoading = $derived(categoriesQuery.isLoading);

const totalSpend = $derived(categories.reduce((s, c) => s + c.amount, 0));
const totalSavings = $derived(
  categories.reduce((s, c) => s + (c.amount - suggestedCap(c.amount)), 0)
);

function suggestedCap(amount: number): number {
  const target = amount * 0.9;
  return Math.round(target / 5) * 5;
}

function coachLine(name: string, amount: number, count: number): string {
  const cap = suggestedCap(amount);
  const savings = amount - cap;
  if (count > 20) {
    return `${count} charges this month. Try capping ${name} at ${currencyFormatter.format(cap)} — saves ~${currencyFormatter.format(savings)}.`;
  }
  return `Set a ${currencyFormatter.format(cap)} cap here next month — worth ~${currencyFormatter.format(savings)} if you hit it.`;
}
</script>

<div class="space-y-2.5">
  <div class="flex items-center gap-2">
    <div class="rounded-full bg-amber-500/15 p-1.5 dark:bg-amber-400/20">
      <Lightbulb class="text-amber-600 dark:text-amber-400 h-3.5 w-3.5"></Lightbulb>
    </div>
    <h3 class="text-sm font-semibold">Where to tighten up</h3>
  </div>

  {#if isLoading}
    <div class="space-y-2">
      {#each Array(Math.max(limit, 2)) as _}
        <div class="bg-muted h-16 animate-pulse rounded-lg"></div>
      {/each}
    </div>
  {:else if categories.length === 0}
    <p class="text-muted-foreground py-4 text-center text-xs">
      Not enough spending data yet to suggest caps.
    </p>
  {:else if config.size === 'small'}
    {@const top = categories[0]!}
    <div
      class="rounded-lg border border-amber-500/20 bg-amber-50/60 p-3 dark:border-amber-400/25 dark:bg-amber-950/20">
      <div class="mb-1 flex items-baseline justify-between gap-2">
        <span class="truncate font-medium text-sm">{top.name}</span>
        <span class="text-amount-negative shrink-0 text-xs font-semibold tabular-nums">
          {currencyFormatter.format(top.amount)}
        </span>
      </div>
      <p class="text-muted-foreground text-xs">
        Cap at <span class="text-foreground font-medium">{currencyFormatter.format(suggestedCap(top.amount))}</span>
        — saves ~<span class="text-amount-positive font-medium">{currencyFormatter.format(top.amount - suggestedCap(top.amount))}</span>
      </p>
    </div>
  {:else}
    {#if config.size === 'full'}
      <div class="text-muted-foreground flex items-baseline justify-between border-b pb-1.5 text-xs uppercase tracking-wider">
        <span>{categories.length} hot spots</span>
        <span class="tabular-nums">
          ~{currencyFormatter.format(totalSavings)} potential
        </span>
      </div>
    {/if}
    {#each categories as cat, i}
      <div
        class="rounded-lg border border-amber-500/20 bg-amber-50/60 p-3 dark:border-amber-400/25 dark:bg-amber-950/20">
        <div class="mb-1.5 flex items-baseline justify-between gap-2">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-muted-foreground text-[10px] font-semibold shrink-0">
              #{i + 1}
            </span>
            <span class="truncate font-medium text-sm">{cat.name}</span>
            {#if (config.size === 'large' || config.size === 'full') && totalSpend > 0}
              <span class="text-muted-foreground shrink-0 text-[10px]">
                · {((cat.amount / totalSpend) * 100).toFixed(0)}%
              </span>
            {/if}
          </div>
          <span class="text-sm font-semibold tabular-nums text-amount-negative shrink-0">
            {currencyFormatter.format(cat.amount)}
          </span>
        </div>
        <div class="flex items-start gap-1.5">
          <Target class="text-amber-600 dark:text-amber-400 h-3 w-3 shrink-0 translate-y-0.5"></Target>
          <p class="text-muted-foreground text-xs leading-relaxed">
            {coachLine(cat.name, cat.amount, cat.count)}
          </p>
        </div>
      </div>
    {/each}
  {/if}
</div>
