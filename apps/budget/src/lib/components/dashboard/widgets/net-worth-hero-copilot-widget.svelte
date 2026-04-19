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

const chartData = $derived(
  history.map((s) => ({
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
</script>

<div
  class="relative overflow-hidden rounded-2xl border p-6 shadow-sm {p.heroContainer}">
  <div class="relative z-10 mb-6 space-y-1">
    <p class="text-muted-foreground text-xs font-medium uppercase tracking-wider">
      {config.title || 'Net worth'}
    </p>
    <div
      class="text-5xl font-bold tracking-tight"
      class:text-foreground={netWorth > 0}
      class:text-amount-negative={netWorth < 0}
      class:text-muted-foreground={netWorth === 0}>
      {currencyFormatter.format(netWorth)}
    </div>
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
        {isPositive ? '+' : ''}{currencyFormatter.format(delta)} over 12 months
      </span>
    </div>
  </div>

  {#if isLoading}
    <div class="bg-muted h-40 animate-pulse rounded-xl"></div>
  {:else if chartData.length >= 2}
    <div class="h-48">
      <LayerCake
        data={chartData}
        x="date"
        y="value"
        xScale={scaleTime()}
        yScale={scaleLinear()}
        yDomain={[yMin, yMax]}
        padding={{ top: 4, right: 4, bottom: 22, left: 4 }}>
        <Svg>
          <Area fill="var(--chart-2)" opacity={0.15} />
          <Line stroke="var(--chart-2)" strokeWidth={2.5} />
          <AxisX
            ticks={Math.min(chartData.length, 4)}
            gridlines={false}
            tickMarks={false}
            format={(d) => SHORT_MONTHS[d.getMonth()]!} />
        </Svg>
      </LayerCake>
    </div>
  {:else}
    <div class="text-muted-foreground py-10 text-center text-sm">
      History accumulates daily — check back tomorrow.
    </div>
  {/if}
</div>
