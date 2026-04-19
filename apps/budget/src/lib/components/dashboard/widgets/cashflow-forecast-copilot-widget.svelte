<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { Line, Area, AxisX } from '$lib/components/layercake';
import { rpc } from '$lib/query';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import { scaleLinear, scaleTime } from 'd3-scale';
import { LayerCake, Svg } from 'layercake';
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

  // Project forward 90 days using the monthly net rate.
  const projected: Point[] = [];
  const daysPerStep = 7;
  for (let d = daysPerStep; d <= 90; d += daysPerStep) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + d);
    const projectedValue = currentBalance + (monthlyNet * d) / 30;
    projected.push({ date: futureDate, value: projectedValue, projected: true });
  }

  return [...past, ...projected];
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

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
</script>

<div
  class="relative overflow-hidden rounded-2xl border p-6 shadow-sm {p.heroContainer}">
  <div class="relative z-10 mb-4 flex items-start justify-between gap-4">
    <div class="space-y-1">
      <p class="text-muted-foreground text-xs font-medium uppercase tracking-wider">
        {config.title || '90-day forecast'}
      </p>
      <div class="text-3xl font-bold tracking-tight">
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
    <div class="h-44">
      <LayerCake
        data={chartData}
        x="date"
        y="value"
        xScale={scaleTime()}
        yScale={scaleLinear()}
        yDomain={[yMin, yMax]}
        padding={{ top: 4, right: 4, bottom: 22, left: 4 }}>
        <Svg>
          <Area fill="var(--chart-2)" opacity={0.12} />
          <AxisX
            ticks={5}
            gridlines={false}
            tickMarks={false}
            format={(d) => SHORT_MONTHS[d.getMonth()]!} />
          <Line stroke="var(--chart-2)" strokeWidth={2} />
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
  {:else}
    <div class="text-muted-foreground py-10 text-center text-sm">
      Needs a few days of history to forecast.
    </div>
  {/if}
</div>
