<script lang="ts">
import { AnalyticsChartShell } from '$lib/components/charts';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import {
  calculateFeeDragSeries,
  getTotalDrag,
} from '$lib/utils/investment-analytics';
import type { Account } from '$core/schema/accounts';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import Settings from '@lucide/svelte/icons/settings';
import { LayerCake, Svg } from 'layercake';
import { MultiLine, AxisX, AxisY } from '$lib/components/layercake';
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

const expenseRatio = $derived(account?.expenseRatio ?? 0);

const series = $derived(calculateFeeDragSeries(snapshots, expenseRatio));
const totalDrag = $derived(getTotalDrag(series));

// Chart: two lines — actual value and value without fees
const chartData = $derived(
  series.map((p) => ({
    date: p.date,
    value: p.value,
    valueWithoutFees: p.valueWithoutFees,
  }))
);

const hasData = $derived(series.length >= 2);
const hasExpenseRatio = $derived(expenseRatio > 0);

// Y domain encompassing both lines
const yValues = $derived(
  chartData.flatMap((d) => [d.value, d.valueWithoutFees])
);
const rawMin = $derived(yValues.length > 0 ? Math.min(...yValues) : 0);
const rawMax = $derived(yValues.length > 0 ? Math.max(...yValues) : 1000);
const yPad = $derived(Math.max(Math.abs(rawMax - rawMin) * 0.08, 10));
const yDomain = $derived([Math.max(0, rawMin - yPad), rawMax + yPad] as [number, number]);

// Projected annual drag from most recent portfolio value
const latestValue = $derived(
  snapshots.length > 0 ? snapshots[snapshots.length - 1].value : 0
);
const projectedAnnualDrag = $derived(
  hasExpenseRatio ? latestValue * (expenseRatio / 100) : 0
);

const settingsHref = $derived(
  account ? `/accounts/${account.slug}/settings` : '#'
);
</script>

<AnalyticsChartShell
  data={snapshots}
  supportedChartTypes={[]}
  defaultChartType="line"
  loading={isLoading}
  emptyMessage="No value snapshots recorded yet."
  chartId="fee-drag">
  {#snippet title()}
    Fee Drag Analysis
  {/snippet}

  {#snippet subtitle()}
    Cumulative fees paid vs. what your portfolio could have been without them
  {/snippet}

  {#snippet chart()}
    <div class="flex h-full w-full flex-col px-2 py-2">
      {#if !hasExpenseRatio}
        <div class="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 text-center">
          <TrendingDown class="h-10 w-10 opacity-30" />
          <p class="text-sm">No expense ratio set for this account.</p>
          <a href={settingsHref} class="text-primary flex items-center gap-1 text-xs hover:underline">
            <Settings class="h-3 w-3" />
            Set expense ratio in Financial Settings
          </a>
        </div>
      {:else if !hasData}
        <div class="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 text-center">
          <TrendingDown class="h-10 w-10 opacity-30" />
          {#if snapshots.length === 0}
            <p class="text-sm">No value snapshots yet.</p>
            <a
              href="{account?.slug ? `/accounts/${account.slug}/settings?section=investment-snapshots` : '#'}"
              class="text-primary flex items-center gap-1 text-xs hover:underline">
              <Settings class="h-3 w-3" />
              Add snapshots in Account Settings
            </a>
          {:else}
            <p class="text-sm">Add at least 2 snapshots to see fee drag over time.</p>
          {/if}
        </div>
      {:else}
        <div class="min-h-0 flex-1">
          <LayerCake
            data={chartData}
            x="date"
            y="valueWithoutFees"
            xScale={scaleTime()}
            yScale={scaleLinear()}
            yDomain={yDomain}
            padding={{ top: 8, right: 16, bottom: 28, left: 70 }}>
            <Svg>
              <AxisY
                ticks={5}
                gridlines={true}
                format={(d: number) => {
                  const abs = Math.abs(d);
                  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
                  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}k`;
                  return currencyFormatter.format(d);
                }} />
              <AxisX
                ticks={Math.min(chartData.length, 6)}
                gridlines={false}
                format={(d: Date) => {
                  const m = d.toLocaleString('default', { month: 'short' });
                  return `${m} '${String(d.getFullYear()).slice(2)}`;
                }} />
              <!-- Value without fees (what it could have been) — dashed -->
              <MultiLine
                y="valueWithoutFees"
                stroke="var(--chart-2)"
                strokeWidth={2}
                strokeDasharray="6 3" />
              <!-- Actual value — solid -->
              <MultiLine
                y="value"
                stroke="var(--chart-1)"
                strokeWidth={2.5} />
            </Svg>
          </LayerCake>
        </div>
      {/if}
    </div>
  {/snippet}

  {#snippet belowChart()}
    {#if hasData && hasExpenseRatio}
      <!-- Legend -->
      <div class="mt-3 flex shrink-0 justify-center gap-6">
        <div class="flex items-center gap-2 text-xs">
          <div class="h-0.5 w-6" style="background: var(--chart-1);"></div>
          <span>Actual value</span>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <svg width="24" height="2" aria-hidden="true">
            <line x1="0" y1="1" x2="24" y2="1" stroke="var(--chart-2)" stroke-width="2" stroke-dasharray="6 3" />
          </svg>
          <span class="text-muted-foreground">Without fees</span>
        </div>
      </div>

      <!-- Summary stats -->
      <div class="mt-4 grid shrink-0 grid-cols-3 gap-4 border-t pt-4 text-center text-sm">
        <div>
          <p class="text-muted-foreground text-xs">Total Fee Drag</p>
          <p class="font-semibold text-amber-600 dark:text-amber-400">
            {totalDrag !== null ? currencyFormatter.format(totalDrag) : '—'}
          </p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Expense Ratio</p>
          <p class="font-semibold">{expenseRatio.toFixed(3)}%</p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Projected Annual</p>
          <p class="font-semibold text-amber-600 dark:text-amber-400">
            {currencyFormatter.format(projectedAnnualDrag)}
          </p>
        </div>
      </div>
      <p class="text-muted-foreground mt-3 shrink-0 text-center text-xs">
        Based on {snapshots.length} snapshots · Expense ratio: {expenseRatio}%/yr
      </p>
    {/if}
  {/snippet}
</AnalyticsChartShell>
