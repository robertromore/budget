<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import { LayerCake, Svg } from 'layercake';
import { Line, AxisX } from '$lib/components/layercake';
import { scaleTime, scaleLinear } from 'd3-scale';
import LineChart from '@lucide/svelte/icons/line-chart';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const accounts = $derived(Array.from(accountsState.accounts.values()));

const netWorth = $derived(accountsState.getTotalBalance());
const onBudget = $derived(accountsState.getOnBudgetBalance());
const offBudget = $derived(accountsState.getOffBudgetBalance());

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthShort(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return SHORT_MONTHS[d.getMonth()]!;
}

const historyQuery = $derived(rpc.netWorth.getNetWorthHistory(12).options());
const history = $derived(historyQuery.data ?? []);
const isLoadingHistory = $derived(historyQuery.isLoading);

// Per-size: how many trailing snapshots to plot. The series is
// already capped at 12 server-side, so this is effectively a slice.
const monthsToShow = $derived.by(() => {
  switch (config.size) {
    case 'small':
      return 0;
    case 'medium':
      return 6;
    case 'large':
      return 12;
    case 'full':
      return 12;
    default:
      return 12;
  }
});

const recent = $derived(history.slice(-Math.max(monthsToShow, 2)));
const chartData = $derived(
  recent.map((s) => ({
    date: new Date(s.snapshotDate + 'T00:00:00'),
    value: s.totalNetWorth,
  }))
);

const yValues = $derived(chartData.map((d) => d.value));
const rawMin = $derived(yValues.length > 0 ? Math.min(...yValues) : 0);
const rawMax = $derived(yValues.length > 0 ? Math.max(...yValues) : 100);
const yMin = $derived(rawMin < 0 ? rawMin * 1.05 : rawMin * 0.97);
const yMax = $derived(rawMax > 0 ? rawMax * 1.05 : rawMax * 0.97);

const priorValue = $derived(chartData.length > 1 ? chartData[0]!.value : netWorth);
const delta = $derived(netWorth - priorValue);
const deltaPct = $derived(priorValue !== 0 ? (delta / Math.abs(priorValue)) * 100 : 0);
const isPositive = $derived(delta >= 0);

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
</script>

{#if accounts.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-6">
    <LineChart class="text-muted-foreground h-10 w-10"></LineChart>
    <p class="text-muted-foreground text-sm">No accounts to track</p>
  </div>
{:else if config.size === 'small'}
  <div class="flex items-start gap-3">
    <div class="bg-primary/10 rounded-lg p-2.5 shrink-0">
      {#if isPositive}
        <TrendingUp class="text-amount-positive h-5 w-5"></TrendingUp>
      {:else}
        <TrendingDown class="text-amount-negative h-5 w-5"></TrendingDown>
      {/if}
    </div>
    <div class="min-w-0 flex-1">
      <div
        class="font-bold tabular-nums {headlineClass}"
        class:text-amount-positive={netWorth > 0}
        class:text-amount-negative={netWorth < 0}
        class:text-muted-foreground={netWorth === 0}>
        {currencyFormatter.format(netWorth)}
      </div>
      <p class="text-muted-foreground text-xs tabular-nums">
        {isPositive ? '+' : ''}{deltaPct.toFixed(1)}% · 12m
      </p>
    </div>
  </div>
{:else}
  <div class="space-y-4">
    <div class="text-center">
      <div
        class="font-bold tabular-nums {headlineClass}"
        class:text-amount-positive={netWorth > 0}
        class:text-amount-negative={netWorth < 0}
        class:text-muted-foreground={netWorth === 0}>
        {currencyFormatter.format(netWorth)}
      </div>
      <p class="text-muted-foreground text-xs">Net Worth</p>
    </div>

    {#if config.size === 'large' || config.size === 'full'}
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-lg border p-2.5 text-center">
          <div class="text-sm font-semibold tabular-nums">{currencyFormatter.format(onBudget)}</div>
          <div class="text-muted-foreground text-xs">On Budget</div>
        </div>
        <div class="rounded-lg border p-2.5 text-center">
          <div class="text-sm font-semibold tabular-nums">{currencyFormatter.format(offBudget)}</div>
          <div class="text-muted-foreground text-xs">Off Budget</div>
        </div>
      </div>
    {/if}

    {#if isLoadingHistory}
      <div class="bg-muted h-24 animate-pulse rounded"></div>
    {:else if chartData.length >= 2}
      <div class={config.size === 'full' ? 'h-40' : 'h-24'}>
        <LayerCake
          data={chartData}
          x="date"
          y="value"
          xScale={scaleTime()}
          yScale={scaleLinear()}
          yDomain={[yMin, yMax]}
          padding={{ top: 4, right: 4, bottom: 20, left: 4 }}>
          <Svg>
            <AxisX
              ticks={Math.min(chartData.length, 4)}
              gridlines={false}
              tickMarks={false}
              format={(d) => formatMonthShort(d.toISOString().slice(0, 10))}></AxisX>
            <Line
              stroke={netWorth >= 0 ? 'var(--chart-2)' : 'var(--chart-1)'}
              strokeWidth={2}></Line>
          </Svg>
        </LayerCake>
      </div>
      <p class="text-muted-foreground flex items-center justify-between text-xs">
        <span>{chartData.length}-month trend</span>
        <span class:text-amount-positive={isPositive && delta !== 0} class:text-amount-negative={!isPositive && delta !== 0}>
          {delta >= 0 ? '+' : ''}{currencyFormatter.format(delta)} ({deltaPct.toFixed(1)}%)
        </span>
      </p>
    {:else}
      <p class="text-muted-foreground text-center text-xs">
        History accumulates daily — check back tomorrow for your first trend
      </p>
    {/if}

    {#if config.size === 'full' && chartData.length >= 2}
      <div class="grid grid-cols-3 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        {#each chartData.slice().reverse() as snapshot}
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-muted-foreground truncate">
              {formatMonthShort(snapshot.date.toISOString().slice(0, 10))}
            </span>
            <span class="font-medium tabular-nums">
              {currencyFormatter.format(snapshot.value)}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
