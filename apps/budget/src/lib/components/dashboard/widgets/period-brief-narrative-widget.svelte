<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import type { AttentionItem, PeriodKind } from '$core/server/domains/insights';
import { Area, Line } from '$lib/components/layercake';
import { Button } from '$lib/components/ui/button';
import * as Tooltip from '$lib/components/ui/tooltip';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import Mail from '@lucide/svelte/icons/mail';
import { scaleLinear, scaleTime } from 'd3-scale';
import { LayerCake, Svg } from 'layercake';

let { config }: { config: DashboardWidget } = $props();

const period = $derived<PeriodKind>(
  ((config.settings as any)?.period as PeriodKind | undefined) === 'month' ? 'month' : 'week'
);

const briefQuery = $derived(rpc.insights.getPeriodBrief(period).options());
const brief = $derived(briefQuery.data ?? null);
const isLoading = $derived(briefQuery.isLoading);

let expanded = $state(false);

const periodWord = $derived(period === 'week' ? 'week' : 'month');
const lookbackWord = $derived(period === 'week' ? '4-week' : '3-month');

const headlineKind = $derived.by(() => {
  if (!brief) return 'neutral' as const;
  if (brief.pctVsAvg >= 15) return 'over' as const;
  if (brief.pctVsAvg <= -15) return 'under' as const;
  return 'neutral' as const;
});

const sparklineData = $derived.by(() => {
  if (!brief) return [];
  return brief.projectionSparkline.map((p) => ({
    date: new Date(`${p.date}T00:00:00`),
    value: p.value,
  }));
});

const sparklineDomain = $derived.by(() => {
  const vals = sparklineData.map((p) => p.value);
  if (vals.length === 0) return [0, 1] as [number, number];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max(1, (max - min) * 0.15);
  return [min - pad, max + pad] as [number, number];
});

const dailyMax = $derived.by(() => {
  if (!brief) return 1;
  let m = 0;
  for (const d of brief.dailyBreakdown) {
    if (d.current > m) m = d.current;
    if (d.avg > m) m = d.avg;
  }
  return Math.max(m, 1);
});

function formatPct(pct: number, withSign = true): string {
  const abs = Math.abs(pct).toFixed(0);
  if (!withSign) return `${abs}%`;
  if (pct > 0) return `+${abs}%`;
  if (pct < 0) return `−${abs}%`;
  return `${abs}%`;
}

function attentionLine(item: AttentionItem): { lead: string; rest: string } {
  switch (item.kind) {
    case 'category-trend':
      return {
        lead: `${item.categoryName} is trending ${formatPct(item.pctVsAvg)}`,
        rest: ` vs your typical ${periodWord} — about ${currencyFormatter.format(item.deltaAmount)} more than usual.`,
      };
    case 'price-change':
      return {
        lead: `${item.payeeName} raised its price`,
        rest: ` from ${currencyFormatter.format(item.previousAmount)} to ${currencyFormatter.format(item.newAmount)} on ${formatShortDate(item.changeDate)}.`,
      };
    case 'inactive-subscription':
      return {
        lead: `${item.payeeName} (${currencyFormatter.format(item.amount)})`,
        rest: ` hasn't been opened since ${formatShortDate(item.lastSeenDate)}. Worth canceling?`,
      };
  }
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
</script>

<div class="bg-card relative overflow-hidden rounded-2xl border shadow-sm">
  {#if isLoading || !brief}
    <div class="space-y-4 p-6">
      <div class="bg-muted h-3 w-32 animate-pulse rounded"></div>
      <div class="bg-muted h-10 w-3/4 animate-pulse rounded"></div>
      <div class="bg-muted h-10 w-2/3 animate-pulse rounded"></div>
      <div class="space-y-2">
        <div class="bg-muted h-3 w-full animate-pulse rounded"></div>
        <div class="bg-muted h-3 w-5/6 animate-pulse rounded"></div>
      </div>
    </div>
  {:else}
    <div
      class="grid gap-x-8 gap-y-6 p-6 sm:p-7"
      class:lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]={config.size === 'full' || config.size === 'large'}>
      <!-- LEFT: Editorial column -->
      <div class="min-w-0 space-y-4">
        <p class="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.18em]">
          {periodWord === 'week' ? 'Weekly' : 'Monthly'} brief · {brief.periodLabel}
        </p>

        <h2 class="font-serif text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          You spent
          <span
            class="font-bold"
            class:text-amount-negative={headlineKind === 'over'}
            class:text-amount-positive={headlineKind === 'under'}>
            {currencyFormatter.format(brief.totalSpent)}
          </span>
          this {periodWord}
          {#if brief.avgPeriodSpent > 0}
            —
            <span
              class:text-amount-negative={brief.pctVsAvg >= 5}
              class:text-amount-positive={brief.pctVsAvg <= -5}>
              {formatPct(brief.pctVsAvg)}
            </span>
            vs your {lookbackWord} average{#if brief.driverCategories.length > 0},
              driven mostly by
              {#each brief.driverCategories as cat, i}
                <span class="text-amount-negative">{cat.categoryName}</span>{#if i < brief.driverCategories.length - 1}
                  {' '}and{' '}
                {/if}
              {/each}{/if}.
          {:else}
            .
          {/if}
        </h2>

        <p class="text-muted-foreground text-sm leading-relaxed sm:text-[15px]">
          {#if brief.netCashflow >= 0}
            Your cash position is up
            <span class="text-amount-positive font-semibold tabular-nums">
              +{currencyFormatter.format(brief.netCashflow)}
            </span>
            on the {periodWord}{#if brief.recentPaycheck} thanks to the {formatShortDate(brief.recentPaycheck.date)} {brief.recentPaycheck.payeeName.toLowerCase().includes('paycheck') || brief.recentPaycheck.payeeName.toLowerCase().includes('payroll') ? 'paycheck' : 'deposit'}{/if}.
          {:else}
            You're down
            <span class="text-amount-negative font-semibold tabular-nums">
              {currencyFormatter.format(brief.netCashflow)}
            </span>
            on the {periodWord} so far.
          {/if}
          Projected end-of-month balance is
          <strong class="text-foreground tabular-nums">
            {currencyFormatter.format(brief.projectedEndOfMonthBalance)}
          </strong>{#if brief.floor > 0} —
            <span
              class="font-semibold tabular-nums"
              class:text-amount-positive={brief.aboveFloor >= 0}
              class:text-amount-negative={brief.aboveFloor < 0}>
              {currencyFormatter.format(Math.abs(brief.aboveFloor))}
            </span>
            {brief.aboveFloor >= 0 ? 'above' : 'below'} your floor{/if}.
        </p>

        {#if brief.attentionItems.length > 0 && config.size !== 'medium'}
          <div class="space-y-1.5">
            <p class="text-foreground text-sm font-medium">
              {brief.attentionItems.length === 1
                ? 'One thing'
                : brief.attentionItems.length === 2
                  ? 'Two things'
                  : 'Three things'} worth your attention this {periodWord}:
            </p>
            <ul class="space-y-1.5 text-sm leading-relaxed">
              {#each brief.attentionItems as item}
                {@const line = attentionLine(item)}
                <li class="flex gap-2">
                  <span class="text-muted-foreground mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-current"></span>
                  <span class="min-w-0">
                    <strong class="text-foreground">{line.lead}</strong>{line.rest}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if config.size === 'full' || config.size === 'large'}
          <div class="flex items-center gap-2 pt-1">
            <Button
              variant={expanded ? 'default' : 'secondary'}
              size="sm"
              onclick={() => (expanded = !expanded)}>
              {expanded ? 'Collapse' : 'Read full brief'}
            </Button>
            <Tooltip.Root>
              <Tooltip.Trigger>
                {#snippet child({ props })}
                  <Button {...props} variant="outline" size="sm" disabled>
                    <Mail class="mr-1.5 h-3.5 w-3.5"></Mail>
                    Send to email
                  </Button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content>Email digest coming soon</Tooltip.Content>
            </Tooltip.Root>
          </div>
        {/if}

        {#if expanded && (config.size === 'full' || config.size === 'large')}
          <div class="space-y-3 border-t pt-4 text-sm">
            <p class="text-foreground font-medium">All movers vs {lookbackWord} average</p>
            <div class="grid gap-1 text-xs sm:grid-cols-2">
              {#each brief.topMovers as mover}
                <div class="flex items-baseline justify-between gap-2 border-b pb-1">
                  <span class="truncate">{mover.categoryName}</span>
                  <span class="shrink-0 tabular-nums">
                    <span
                      class:text-amount-negative={mover.delta > 0}
                      class:text-amount-positive={mover.delta < 0}>
                      {mover.delta >= 0 ? '+' : ''}{currencyFormatter.format(mover.delta)}
                    </span>
                    <span class="text-muted-foreground ml-1">
                      ({formatPct(mover.pctVsAvg)})
                    </span>
                  </span>
                </div>
              {/each}
            </div>
            <p class="text-muted-foreground text-xs">
              Based on {brief.transactionCount} transaction{brief.transactionCount === 1 ? '' : 's'} between
              {formatShortDate(brief.periodStart)} and {formatShortDate(brief.periodEnd)}.
            </p>
          </div>
        {/if}
      </div>

      <!-- RIGHT: Panel column (large/full only) -->
      {#if config.size === 'full' || config.size === 'large'}
        <div class="space-y-3">
          {#if brief.dailyBreakdown.length > 0}
            <div class="rounded-xl border p-3">
              <div class="mb-2 flex items-baseline justify-between">
                <p class="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                  {periodWord === 'week' ? 'Week spend vs avg' : 'Month spend vs avg'}
                </p>
                {#if brief.avgPeriodSpent > 0}
                  <p
                    class="text-[11px] font-semibold tabular-nums"
                    class:text-amount-negative={brief.pctVsAvg >= 5}
                    class:text-amount-positive={brief.pctVsAvg <= -5}>
                    {formatPct(brief.pctVsAvg)}
                  </p>
                {/if}
              </div>
              <div class="space-y-1">
                {#each brief.dailyBreakdown as day}
                  <div class="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 text-[11px]">
                    <span class="text-muted-foreground">{day.label}</span>
                    <div class="relative h-3.5">
                      <div
                        class="bg-chart-2/40 absolute left-0 top-0 h-1.5 rounded-r"
                        style="width: {(day.avg / dailyMax) * 100}%;"></div>
                      <div
                        class="bg-amber-500 absolute bottom-0 left-0 h-1.5 rounded-r"
                        style="width: {(day.current / dailyMax) * 100}%;"></div>
                    </div>
                    <span class="tabular-nums">{currencyFormatter.format(day.current)}</span>
                  </div>
                {/each}
              </div>
              <div class="text-muted-foreground mt-2 flex items-center gap-3 text-[10px]">
                <span class="flex items-center gap-1">
                  <span class="bg-chart-2/40 inline-block h-1.5 w-3 rounded"></span>
                  {lookbackWord} avg
                </span>
                <span class="flex items-center gap-1">
                  <span class="inline-block h-1.5 w-3 rounded bg-amber-500"></span>
                  This {periodWord}
                </span>
              </div>
            </div>
          {/if}

          {#if brief.topMovers.length > 0}
            <div class="rounded-xl border p-3">
              <p class="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wider">
                Top movers
              </p>
              <div class="space-y-1.5">
                {#each brief.topMovers.slice(0, 4) as mover}
                  <div class="flex items-baseline justify-between gap-2 text-xs">
                    <span class="truncate font-medium">{mover.categoryName}</span>
                    <span class="text-muted-foreground shrink-0 tabular-nums text-[10px]">
                      {formatPct(mover.pctVsAvg)} vs avg
                    </span>
                    <span
                      class="shrink-0 text-xs font-semibold tabular-nums"
                      class:text-amount-negative={mover.delta > 0}
                      class:text-amount-positive={mover.delta < 0}>
                      {mover.delta >= 0 ? '+' : ''}{currencyFormatter.format(mover.delta)}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if sparklineData.length >= 2}
            <div class="rounded-xl border p-3">
              <p class="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wider">
                Projection
              </p>
              <div class="h-16">
                <LayerCake
                  data={sparklineData}
                  x="date"
                  y="value"
                  xScale={scaleTime()}
                  yScale={scaleLinear()}
                  yDomain={sparklineDomain}
                  padding={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                  <Svg>
                    <Area fill="var(--chart-2)" opacity={0.18}></Area>
                    <Line stroke="var(--chart-2)" strokeWidth={1.5}></Line>
                  </Svg>
                </LayerCake>
              </div>
              <p class="text-muted-foreground mt-1 text-[10px] tabular-nums">
                End of month:
                <span class="text-foreground font-semibold">
                  {currencyFormatter.format(brief.projectedEndOfMonthBalance)}
                </span>
                (projected)
              </p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
