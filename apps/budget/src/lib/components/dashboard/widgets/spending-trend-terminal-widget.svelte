<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AxisX, AxisY, Bar } from '$lib/components/layercake';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import { scaleBand, scaleLinear } from 'd3-scale';
import { LayerCake, Svg } from 'layercake';

let { config }: { config: DashboardWidget } = $props();

const SHORT_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function shortMonth(isoMonth: string): string {
  const [, month] = isoMonth.split('-');
  return SHORT_MONTHS[Number(month) - 1]!;
}

const spendingQuery = rpc.transactions.getWorkspaceMonthlySpending().options();
const monthlyData = $derived(
  (spendingQuery.data ?? []) as Array<{
    month: string;
    spending: number;
    income: number;
    transactionCount: number;
  }>
);
const isLoading = $derived(spendingQuery.isLoading);

const monthsToShow = $derived.by(() => {
  switch (config.size) {
    case 'small':
      return 0;
    case 'medium':
      return 3;
    case 'large':
      return 6;
    case 'full':
      return 12;
    default:
      return 6;
  }
});

const recentMonths = $derived(monthlyData.slice(-Math.max(monthsToShow, 2)));
const chartData = $derived(
  recentMonths.map((m) => ({
    label: shortMonth(m.month),
    value: Math.abs(Number(m.spending) || 0),
  }))
);
const yMax = $derived(
  chartData.length > 0 ? Math.max(...chartData.map((d) => d.value)) * 1.1 : 100
);
const avg = $derived(
  chartData.length > 0 ? chartData.reduce((s, d) => s + d.value, 0) / chartData.length : 0
);
const latest = $derived(chartData.length > 0 ? chartData[chartData.length - 1]!.value : 0);
const delta = $derived(latest - avg);
const deltaPct = $derived(avg > 0 ? (delta / avg) * 100 : 0);

function compactCurrency(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + Math.round(n);
}
</script>

<div class="widget-terminal">
  <div class="mb-2 flex items-baseline justify-between border-b border-(--term-border) pb-1.5">
    <span class="widget-terminal-heading">{config.title || `SPEND.TREND // ${monthsToShow}M`}</span>
    {#if config.size !== 'small'}
      <span class="widget-terminal-faint text-[10px]">{chartData.length} MO</span>
    {/if}
  </div>

  {#if config.size === 'small'}
    <div class="flex items-baseline gap-2">
      <span class="widget-terminal-bright text-base tabular-nums">{compactCurrency(latest)}</span>
      <span
        class="text-[10px] tabular-nums"
        class:widget-terminal-bright={delta <= 0}
        class:widget-terminal-neg={delta > 0}>
        {delta > 0 ? '+' : ''}{deltaPct.toFixed(0)}%
      </span>
    </div>
    <div class="widget-terminal-faint mt-0.5 text-[9px] uppercase">VS.AVG</div>
  {:else}
    {#if config.size === 'large' || config.size === 'full'}
      <div class="mb-2 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <div class="widget-terminal-dim text-[9px] uppercase">AVG</div>
          <div class="widget-terminal-bright text-sm tabular-nums">{compactCurrency(avg)}</div>
        </div>
        <div>
          <div class="widget-terminal-dim text-[9px] uppercase">LATEST</div>
          <div class="widget-terminal-bright text-sm tabular-nums">{compactCurrency(latest)}</div>
        </div>
        <div>
          <div class="widget-terminal-dim text-[9px] uppercase">Δ vs AVG</div>
          <div
            class="text-sm tabular-nums"
            class:widget-terminal-bright={delta <= 0}
            class:widget-terminal-neg={delta > 0}>
            {delta > 0 ? '+' : ''}{deltaPct.toFixed(1)}%
          </div>
        </div>
      </div>
    {/if}

    {#if isLoading}
      <div class="h-32 animate-pulse rounded bg-(--term-bg-soft)"></div>
    {:else if chartData.length >= 1}
      <div class={config.size === 'full' ? 'h-40' : 'h-32'}>
        <LayerCake
          data={chartData}
          x="label"
          y="value"
          xScale={scaleBand().padding(0.25)}
          yScale={scaleLinear()}
          yDomain={[0, yMax]}
          padding={{ top: 4, right: 4, bottom: 18, left: 40 }}>
          <Svg>
            <AxisY
              ticks={3}
              gridlines={true}
              tickMarks={false}
              class="[&_text]:fill-(--term-fg-dim)! [&_text]:text-[9px]! [&_line]:stroke-(--term-fg-faint)!"
              format={(d) => {
                if (d >= 1000) return (d / 1000).toFixed(0) + 'K';
                return String(d);
              }}></AxisY>
            <AxisX
              gridlines={false}
              tickMarks={false}
              class="[&_text]:fill-(--term-fg-dim)! [&_text]:text-[9px]! [&_line]:stroke-(--term-fg-faint)!"></AxisX>
            <Bar fill="oklch(0.86 0.2 152)" opacity={0.85} radius={1}></Bar>
          </Svg>
        </LayerCake>
      </div>
    {:else}
      <div class="widget-terminal-muted py-6 text-center text-[10px]">
        &gt; insufficient.data
      </div>
    {/if}

    {#if config.size === 'full' && chartData.length > 0}
      <div class="mt-2 grid grid-cols-3 gap-x-3 gap-y-0.5 text-[10px] tabular-nums">
        {#each chartData.slice().reverse() as month}
          <div class="flex items-baseline justify-between">
            <span class="widget-terminal-faint">{month.label}</span>
            <span class="widget-terminal-bright">{compactCurrency(month.value)}</span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
