<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { Area, Line, AxisX } from '$lib/components/layercake';
import { rpc } from '$lib/query';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import { scaleLinear, scaleTime } from 'd3-scale';
import { LayerCake, Svg } from 'layercake';
import { copilotPalette } from './copilot-colors';

let { config }: { config: DashboardWidget } = $props();

const p = $derived(copilotPalette((config.settings as any)?.gradientColor));

const accountsState = $derived(AccountsState.get());
const netWorth = $derived(accountsState.getTotalBalance());

const historyQuery = $derived(rpc.netWorth.getNetWorthHistory(12).options());
const history = $derived(historyQuery.data ?? []);
const isLoading = $derived(historyQuery.isLoading);

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
const rawMax = $derived(yValues.length > 0 ? Math.max(...yValues) : 1);
const yMin = $derived(rawMin < 0 ? rawMin * 1.05 : rawMin * 0.95);
const yMax = $derived(rawMax > 0 ? rawMax * 1.05 : rawMax * 0.95);

const priorValue = $derived(chartData.length > 1 ? chartData[0]!.value : netWorth);
const delta = $derived(netWorth - priorValue);
const deltaPct = $derived(priorValue !== 0 ? (delta / Math.abs(priorValue)) * 100 : 0);
const isPositive = $derived(delta >= 0);

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const headlineClass = $derived.by(() => {
  switch (config.size) {
    case 'small':
      return 'text-2xl';
    case 'medium':
      return 'text-3xl';
    case 'large':
      return 'text-4xl';
    case 'full':
      return 'text-5xl';
    default:
      return 'text-5xl';
  }
});

const containerPadding = $derived(config.size === 'small' ? 'p-4' : 'p-6');
</script>

<div class="relative overflow-hidden rounded-2xl border shadow-sm {containerPadding} {p.heroContainer}">
  <div class="relative z-10 mb-{config.size === 'small' ? '1' : '6'} space-y-1">
    <p class="text-muted-foreground text-xs font-medium uppercase tracking-wider">
      {config.title || 'Net worth'}
    </p>
    <div
      class="font-bold tracking-tight tabular-nums {headlineClass}"
      class:text-foreground={netWorth > 0}
      class:text-amount-negative={netWorth < 0}
      class:text-muted-foreground={netWorth === 0}>
      {currencyFormatter.format(netWorth)}
    </div>
    {#if config.size !== 'small'}
      <div class="flex items-center gap-2 text-sm">
        <span
          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
          class:bg-success-bg={isPositive && delta !== 0}
          class:text-success-fg={isPositive && delta !== 0}
          class:bg-destructive-bg={!isPositive}
          class:text-destructive={!isPositive}
          class:bg-muted={delta === 0}
          class:text-muted-foreground={delta === 0}>
          {delta > 0 ? '↑' : delta < 0 ? '↓' : '•'}
          {isPositive ? '+' : ''}{deltaPct.toFixed(1)}%
        </span>
        <span class="text-muted-foreground">
          {isPositive ? '+' : ''}{currencyFormatter.format(delta)} over {chartData.length} months
        </span>
      </div>
    {:else}
      <p class="text-muted-foreground text-xs tabular-nums">
        {isPositive ? '+' : ''}{deltaPct.toFixed(1)}% · 12m
      </p>
    {/if}
  </div>

  {#if config.size === 'small'}
    <!-- Single-value KPI tile; no chart. -->
  {:else if isLoading}
    <div class="bg-muted h-40 animate-pulse rounded-xl"></div>
  {:else if chartData.length >= 2}
    <div class={config.size === 'full' ? 'h-56' : config.size === 'large' ? 'h-48' : 'h-36'}>
      <LayerCake
        data={chartData}
        x="date"
        y="value"
        xScale={scaleTime()}
        yScale={scaleLinear()}
        yDomain={[yMin, yMax]}
        padding={{ top: 4, right: 4, bottom: 22, left: 4 }}>
        <Svg>
          <Area fill="var(--chart-2)" opacity={0.15}></Area>
          <Line stroke="var(--chart-2)" strokeWidth={2.5}></Line>
          <AxisX
            ticks={Math.min(chartData.length, 4)}
            gridlines={false}
            tickMarks={false}
            format={(d) => SHORT_MONTHS[d.getMonth()]!}></AxisX>
        </Svg>
      </LayerCake>
    </div>

    {#if config.size === 'full'}
      <div class="mt-4 grid grid-cols-3 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        {#each chartData.slice().reverse() as snapshot}
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-muted-foreground truncate">
              {SHORT_MONTHS[snapshot.date.getMonth()]!}
            </span>
            <span class="font-medium tabular-nums">
              {currencyFormatter.format(snapshot.value)}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    <div class="text-muted-foreground py-10 text-center text-sm">
      History accumulates daily — check back tomorrow.
    </div>
  {/if}
</div>
