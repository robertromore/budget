<script lang="ts">
import { AnalyticsChartShell } from '$lib/components/charts';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import {
  calculatePerformanceSeries,
  getLatestReturn,
} from '$lib/utils/investment-analytics';
import type { Account } from '$core/schema/accounts';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Settings from '@lucide/svelte/icons/settings';
import { LayerCake, Svg } from 'layercake';
import { Line, AxisX, AxisY, ZeroLine } from '$lib/components/layercake';
import { scaleTime, scaleLinear } from 'd3-scale';

interface Props {
  account?: Account;
}

let { account }: Props = $props();

// svelte-ignore state_referenced_locally
const snapshotsQuery = $derived(
  account ? rpc.investmentSnapshots.listSnapshots(account.id).options() : null
);
const snapshots = $derived(snapshotsQuery?.data ?? []);
const isLoading = $derived(snapshotsQuery?.isLoading ?? true);

const series = $derived(calculatePerformanceSeries(snapshots));
const latestReturn = $derived(getLatestReturn(series));

const chartData = $derived(
  series.map((p) => ({
    date: p.date,
    value: p.cumulativeReturn * 100, // display as percent
    rawValue: p.value,
  }))
);

const hasData = $derived(series.length >= 2);

// Summary values from first/last snapshot
const firstSnap = $derived(snapshots.length > 0 ? snapshots[0] : null);
const lastSnap = $derived(snapshots.length > 0 ? snapshots[snapshots.length - 1] : null);

const yValues = $derived(chartData.map((d) => d.value));
const rawMin = $derived(yValues.length > 0 ? Math.min(...yValues) : -5);
const rawMax = $derived(yValues.length > 0 ? Math.max(...yValues) : 10);
const yPad = $derived(Math.max(Math.abs(rawMax - rawMin) * 0.05, 0.1));
const yDomain = $derived([rawMin - yPad, rawMax + yPad] as [number, number]);

const settingsHref = $derived(account ? `/accounts/${account.slug}/settings?section=investment-snapshots` : '#');
</script>

<AnalyticsChartShell
  data={snapshots}
  supportedChartTypes={[]}
  defaultChartType="line"
  loading={isLoading}
  emptyMessage="No value snapshots recorded yet."
  chartId="investment-performance">
  {#snippet title()}
    Portfolio Performance
  {/snippet}

  {#snippet subtitle()}
    Cumulative return based on manually recorded value snapshots
  {/snippet}

  {#snippet chart()}
    <div class="flex h-full w-full flex-col px-2 py-2">
      {#if !hasData}
        <div class="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 text-center">
          <TrendingUp class="h-10 w-10 opacity-30" />
          {#if snapshots.length === 0}
            <p class="text-sm">No value snapshots yet.</p>
            <a href={settingsHref} class="text-primary flex items-center gap-1 text-xs hover:underline">
              <Settings class="h-3 w-3" />
              Add snapshots in Account Settings
            </a>
          {:else}
            <p class="text-sm">Add at least 2 snapshots to see a performance trend.</p>
          {/if}
        </div>
      {:else}
        <div class="min-h-0 flex-1">
          <LayerCake
            data={chartData}
            x="date"
            y="value"
            xScale={scaleTime()}
            yScale={scaleLinear()}
            yDomain={yDomain}
            padding={{ top: 8, right: 16, bottom: 28, left: 60 }}>
            <Svg>
              <AxisY
                ticks={5}
                gridlines={true}
                format={(d: number) => `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`} />
              <AxisX
                ticks={Math.min(chartData.length, 6)}
                gridlines={false}
                format={(d: Date) => {
                  const m = d.toLocaleString('default', { month: 'short' });
                  return `${m} '${String(d.getFullYear()).slice(2)}`;
                }} />
              <ZeroLine />
              <Line
                stroke={latestReturn !== null && latestReturn >= 0
                  ? 'var(--chart-2)'
                  : 'var(--chart-1)'}
                strokeWidth={2.5} />
            </Svg>
          </LayerCake>
        </div>
      {/if}
    </div>
  {/snippet}

  {#snippet belowChart()}
    {#if hasData && firstSnap && lastSnap && latestReturn !== null}
      <div class="mt-4 grid shrink-0 grid-cols-3 gap-4 border-t pt-4 text-center text-sm">
        <div>
          <p class="text-muted-foreground text-xs">Total Return</p>
          <p
            class="font-semibold"
            class:text-green-600={latestReturn >= 0}
            class:text-red-600={latestReturn < 0}>
            {latestReturn >= 0 ? '+' : ''}{(latestReturn * 100).toFixed(2)}%
          </p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Starting Value</p>
          <p class="font-semibold">{currencyFormatter.format(firstSnap.value)}</p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Current Value</p>
          <p class="font-semibold">{currencyFormatter.format(lastSnap.value)}</p>
        </div>
      </div>
      <p class="text-muted-foreground mt-3 shrink-0 text-center text-xs">
        Based on {snapshots.length} manually recorded value snapshots
      </p>
    {/if}
  {/snippet}
</AnalyticsChartShell>
