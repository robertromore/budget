<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { Line, Area, AxisX } from '$lib/components/layercake';
import { rpc } from '$lib/query';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import { scaleLinear, scaleTime } from 'd3-scale';
import { LayerCake, Svg } from 'layercake';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import { copilotPalette } from './copilot-colors';

let { config }: { config: DashboardWidget } = $props();

const p = $derived(copilotPalette((config.settings as any)?.gradientColor));

const accountsState = $derived(AccountsState.get());
const today = new Date();
const currentBalance = $derived(accountsState.getTotalBalance());

const summaryQuery = rpc.transactions.getWorkspaceSummary().options();
const totalReceived = $derived(Number(summaryQuery.data?.totalReceived30d) || 0);
const totalSpent = $derived(Number(summaryQuery.data?.totalSpent30d) || 0);
const monthlyNet = $derived(totalReceived - totalSpent);

const historyQuery = $derived(rpc.netWorth.getNetWorthHistory(3).options());
const history = $derived(historyQuery.data ?? []);
const isLoading = $derived(historyQuery.isLoading);

// Forecast horizon scales with size: small skips the chart entirely;
// larger sizes project further out so the user gets more lead time.
const horizonDays = $derived.by(() => {
  switch (config.size) {
    case 'small':
      return 0;
    case 'medium':
      return 30;
    case 'large':
      return 90;
    case 'full':
      return 180;
    default:
      return 90;
  }
});

type Point = { date: Date; value: number; projected: boolean };

const chartData = $derived.by<Point[]>(() => {
  const past: Point[] = history.map((s) => ({
    date: new Date(s.snapshotDate + 'T00:00:00'),
    value: s.totalNetWorth,
    projected: false,
  }));

  // Anchor today
  if (past.length === 0 || past[past.length - 1]!.date < today) {
    past.push({ date: today, value: currentBalance, projected: false });
  }

  // Project forward at the workspace's current monthly rate.
  const projected: Point[] = [];
  const daysPerStep = 7;
  for (let d = daysPerStep; d <= horizonDays; d += daysPerStep) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + d);
    const projectedValue = currentBalance + (monthlyNet * d) / 30;
    projected.push({ date: futureDate, value: projectedValue, projected: true });
  }

  return [...past, ...projected];
});

// At "full" size, render a per-month milestones grid: the projected
// balance at each future month boundary.
const monthMilestones = $derived.by(() => {
  if (config.size !== 'full' || horizonDays === 0) return [];
  const milestones: Array<{ label: string; value: number; monthsOut: number }> = [];
  const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsOut = Math.ceil(horizonDays / 30);
  for (let m = 1; m <= monthsOut; m += 1) {
    const future = new Date(today);
    future.setMonth(today.getMonth() + m);
    milestones.push({
      label: `${SHORT[future.getMonth()]} '${String(future.getFullYear()).slice(2)}`,
      value: currentBalance + monthlyNet * m,
      monthsOut: m,
    });
  }
  return milestones;
});

const yValues = $derived(chartData.map((point) => point.value));
const rawMin = $derived(yValues.length > 0 ? Math.min(...yValues) : 0);
const rawMax = $derived(yValues.length > 0 ? Math.max(...yValues) : 1);
const yMin = $derived(rawMin < 0 ? rawMin * 1.08 : rawMin * 0.92);
const yMax = $derived(rawMax > 0 ? rawMax * 1.08 : rawMax * 0.92);

const projectedEnd = $derived(
  chartData.length > 0 ? chartData[chartData.length - 1]!.value : currentBalance
);
const projectedDelta = $derived(projectedEnd - currentBalance);
const isPositive = $derived(monthlyNet >= 0);

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const headlineClass = $derived.by(() => {
  switch (config.size) {
    case 'small':
      return 'text-xl';
    case 'large':
      return 'text-3xl';
    case 'full':
      return 'text-4xl';
    default:
      return 'text-3xl';
  }
});

const containerPadding = $derived(config.size === 'small' ? 'p-4' : 'p-6');
</script>

<div class="relative overflow-hidden rounded-2xl border shadow-sm {containerPadding} {p.heroContainer}">
  {#if config.size === 'small'}
    <div class="flex items-start gap-3">
      <div class="rounded-lg p-2.5 shrink-0 {p.iconBg}">
        {#if isPositive}
          <TrendingUp class="h-4 w-4 {p.iconFg}"></TrendingUp>
        {:else}
          <TrendingDown class="h-4 w-4 {p.iconFg}"></TrendingDown>
        {/if}
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
          {config.title || 'Forecast'}
        </p>
        <div class="font-bold tracking-tight tabular-nums {headlineClass}">
          {currencyFormatter.format(currentBalance)}
        </div>
        <p
          class="text-xs tabular-nums"
          class:text-amount-positive={monthlyNet > 0}
          class:text-amount-negative={monthlyNet < 0}>
          {monthlyNet >= 0 ? '+' : ''}{currencyFormatter.format(monthlyNet)}/mo
        </p>
      </div>
    </div>
  {:else}
    <div class="relative z-10 mb-4 flex items-start justify-between gap-4">
      <div class="space-y-1">
        <p class="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          {config.title || `${horizonDays}-day forecast`}
        </p>
        <div class="font-bold tracking-tight tabular-nums {headlineClass}">
          {currencyFormatter.format(projectedEnd)}
        </div>
        <p class="text-muted-foreground text-xs">
          projected balance · {projectedDelta >= 0 ? '+' : ''}{currencyFormatter.format(projectedDelta)} vs today
        </p>
      </div>
      <div class="text-right space-y-0.5">
        <div class="text-muted-foreground text-[10px] uppercase tracking-wider">
          Monthly net
        </div>
        <div
          class="text-sm font-semibold tabular-nums"
          class:text-amount-positive={monthlyNet > 0}
          class:text-amount-negative={monthlyNet < 0}>
          {monthlyNet >= 0 ? '+' : ''}{currencyFormatter.format(monthlyNet)}
        </div>
      </div>
    </div>

    {#if isLoading}
      <div class="bg-muted h-40 animate-pulse rounded-xl"></div>
    {:else if chartData.length >= 2}
      <div class={config.size === 'full' ? 'h-56' : config.size === 'large' ? 'h-44' : 'h-36'}>
        <LayerCake
          data={chartData}
          x="date"
          y="value"
          xScale={scaleTime()}
          yScale={scaleLinear()}
          yDomain={[yMin, yMax]}
          padding={{ top: 4, right: 4, bottom: 22, left: 4 }}>
          <Svg>
            <Area fill="var(--chart-2)" opacity={0.12}></Area>
            <AxisX
              ticks={config.size === 'full' ? 6 : 5}
              gridlines={false}
              tickMarks={false}
              format={(d) => SHORT_MONTHS[d.getMonth()]!}></AxisX>
            <Line stroke="var(--chart-2)" strokeWidth={2}></Line>
          </Svg>
        </LayerCake>
      </div>
      <div class="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <span class="flex items-center gap-1">
          <span class="inline-block h-0.5 w-6 bg-chart-2"></span>
          Trend
        </span>
        <span>·</span>
        <span>Projected at current monthly rate</span>
      </div>

      {#if config.size === 'full' && monthMilestones.length > 0}
        <div class="mt-4 grid grid-cols-3 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          {#each monthMilestones as milestone}
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-muted-foreground truncate">
                +{milestone.monthsOut}mo
              </span>
              <span class="font-medium tabular-nums">
                {currencyFormatter.format(milestone.value)}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      <div class="text-muted-foreground py-10 text-center text-sm">
        Needs a few days of history to forecast.
      </div>
    {/if}
  {/if}
</div>
