<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { Line, AxisX, AxisY } from '$lib/components/layercake';
import { rpc } from '$lib/query';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import { scaleLinear, scaleTime } from 'd3-scale';
import { LayerCake, Svg } from 'layercake';

let { config }: { config: DashboardWidget } = $props();

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
const yMin = $derived(rawMin < 0 ? rawMin * 1.05 : rawMin * 0.97);
const yMax = $derived(rawMax > 0 ? rawMax * 1.05 : rawMax * 0.97);

const priorValue = $derived(chartData.length > 1 ? chartData[0]!.value : netWorth);
const delta = $derived(netWorth - priorValue);
const deltaPct = $derived(priorValue !== 0 ? (delta / Math.abs(priorValue)) * 100 : 0);
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatSignedCurrency(n: number): string {
  const prefix = n > 0 ? '+' : '';
  return prefix + currencyFormatter.format(n);
}
</script>

<div class="widget-terminal text-[11px]">
  <div class="widget-terminal-border mb-2 flex items-baseline justify-between border-b border-(--term-border) pb-1.5">
    <span class="widget-terminal-heading">{config.title || 'NET.WORTH // 12M'}</span>
    <span class="widget-terminal-faint text-[10px]">{chartData.length} PTS</span>
  </div>

  <div class="mb-2 grid grid-cols-3 gap-2 text-[11px]">
    <div>
      <div class="widget-terminal-dim text-[9px] uppercase">CURRENT</div>
      <div class="widget-terminal-bright text-sm tabular-nums">
        {currencyFormatter.format(netWorth)}
      </div>
    </div>
    <div>
      <div class="widget-terminal-dim text-[9px] uppercase">12M Δ</div>
      <div
        class="text-sm tabular-nums"
        class:widget-terminal-bright={delta >= 0}
        class:widget-terminal-neg={delta < 0}>
        {formatSignedCurrency(delta)}
      </div>
    </div>
    <div>
      <div class="widget-terminal-dim text-[9px] uppercase">Δ%</div>
      <div
        class="text-sm tabular-nums"
        class:widget-terminal-bright={delta >= 0}
        class:widget-terminal-neg={delta < 0}>
        {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(2)}%
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="h-32 animate-pulse rounded bg-(--term-bg-soft)"></div>
  {:else if chartData.length >= 2}
    <div class="h-32">
      <LayerCake
        data={chartData}
        x="date"
        y="value"
        xScale={scaleTime()}
        yScale={scaleLinear()}
        yDomain={[yMin, yMax]}
        padding={{ top: 4, right: 40, bottom: 18, left: 4 }}>
        <Svg>
          <AxisY
            gridlines={true}
            tickMarks={false}
            class="[&_text]:fill-(--term-fg-dim)! [&_text]:text-[9px]! [&_line]:stroke-(--term-fg-faint)!"
            format={(d) => {
              const abs = Math.abs(d);
              if (abs >= 1000000) return (d / 1000000).toFixed(1) + 'M';
              if (abs >= 1000) return (d / 1000).toFixed(0) + 'K';
              return String(d);
            }} />
          <AxisX
            ticks={Math.min(chartData.length, 6)}
            gridlines={false}
            tickMarks={false}
            class="[&_text]:fill-(--term-fg-dim)! [&_text]:text-[9px]! [&_line]:stroke-(--term-fg-faint)!"
            format={(d) => MONTHS_SHORT[d.getMonth()]!} />
          <Line stroke="oklch(0.86 0.2 152)" strokeWidth={1.5} />
        </Svg>
      </LayerCake>
    </div>
  {:else}
    <div class="widget-terminal-muted py-6 text-center text-[10px]">
      &gt; insufficient.data — check back tomorrow
    </div>
  {/if}
</div>
