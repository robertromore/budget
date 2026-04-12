<script lang="ts">
import { AnalyticsChartShell } from '$lib/components/charts';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import type { Account } from '$core/schema/accounts';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import { LayerCake, Svg } from 'layercake';
import { Line, AxisX, AxisY, ZeroLine } from '$lib/components/layercake';
import { scaleTime, scaleLinear } from 'd3-scale';

interface Props {
  account?: Account;
}

let { account }: Props = $props();

// svelte-ignore state_referenced_locally
const historyQuery = $derived(rpc.netWorth.getNetWorthHistory(12).options());
const history = $derived(historyQuery.data ?? []);
const isLoading = $derived(historyQuery.isLoading);

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return `${SHORT_MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

const chartData = $derived(
  history.map((s) => ({
    date: new Date(s.snapshotDate + 'T00:00:00'),
    value: s.totalNetWorth,
  }))
);

const latestSnapshot = $derived(history.length > 0 ? history[history.length - 1] : null);
const firstSnapshot = $derived(history.length > 0 ? history[0] : null);
const change = $derived(
  latestSnapshot && firstSnapshot
    ? latestSnapshot.totalNetWorth - firstSnapshot.totalNetWorth
    : 0
);

const yValues = $derived(chartData.map((d) => d.value));
const rawMin = $derived(yValues.length > 0 ? Math.min(...yValues) : 0);
const rawMax = $derived(yValues.length > 0 ? Math.max(...yValues) : 100);
// Add 5% padding to the y-axis so the line doesn't hug the edges
const yPad = $derived(Math.max(Math.abs(rawMax - rawMin) * 0.05, 1));
const yDomain = $derived([rawMin - yPad, rawMax + yPad] as [number, number]);

</script>

<AnalyticsChartShell
  data={history}
  supportedChartTypes={[]}
  defaultChartType="line"
  loading={isLoading}
  emptyMessage="No net worth history yet. Come back tomorrow — snapshots are captured daily."
  chartId="net-worth-history">
  {#snippet title()}
    Net Worth History
  {/snippet}

  {#snippet subtitle()}
    12-month trend across all accounts
  {/snippet}

  {#snippet chart()}
    <div class="flex h-full w-full flex-col px-2 py-2">
      {#if chartData.length < 2}
        <div class="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 text-center">
          <TrendingUp class="h-10 w-10 opacity-30" />
          <p class="text-sm">
            Net worth history accumulates over time. Only today's snapshot exists so far.
          </p>
          {#if latestSnapshot}
            <p class="text-2xl font-bold">
              {currencyFormatter.format(latestSnapshot.totalNetWorth)}
            </p>
            <p class="text-muted-foreground text-xs">current net worth</p>
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
            padding={{ top: 8, right: 12, bottom: 28, left: 70 }}>
            <Svg>
              <AxisY
                ticks={5}
                gridlines={true}
                format={(d: number) => {
                  const abs = Math.abs(d);
                  if (abs >= 1_000_000) return `${d < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`;
                  if (abs >= 1_000) return `${d < 0 ? '-' : ''}$${(abs / 1_000).toFixed(0)}k`;
                  return currencyFormatter.format(d);
                }} />
              <AxisX
                ticks={Math.min(chartData.length, 6)}
                gridlines={false}
                format={(d: Date) => formatMonthLabel(d.toISOString().slice(0, 10))} />
              <ZeroLine />
              <Line
                stroke={latestSnapshot && latestSnapshot.totalNetWorth >= 0
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
    {#if latestSnapshot}
      <div class="mt-4 grid shrink-0 grid-cols-3 gap-4 border-t pt-4 text-center text-sm">
        <div>
          <p class="text-muted-foreground text-xs">Net Worth</p>
          <p
            class="font-semibold"
            class:text-amount-positive={latestSnapshot.totalNetWorth > 0}
            class:text-amount-negative={latestSnapshot.totalNetWorth < 0}>
            {currencyFormatter.format(latestSnapshot.totalNetWorth)}
          </p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Total Assets</p>
          <p class="font-semibold">{currencyFormatter.format(latestSnapshot.totalAssets)}</p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Total Liabilities</p>
          <p class="font-semibold">{currencyFormatter.format(latestSnapshot.totalLiabilities)}</p>
        </div>
      </div>
      {#if history.length >= 2 && firstSnapshot}
        <p class="text-muted-foreground mt-3 shrink-0 text-center text-xs">
          {change >= 0 ? '+' : ''}{currencyFormatter.format(change)} since {formatMonthLabel(firstSnapshot.snapshotDate)}
          · {history.length} daily snapshots
        </p>
      {/if}
    {/if}
  {/snippet}
</AnalyticsChartShell>
