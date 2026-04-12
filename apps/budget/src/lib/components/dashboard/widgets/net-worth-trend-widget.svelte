<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import { LayerCake, Svg } from 'layercake';
import { Line, AxisX } from '$lib/components/layercake';
import { scaleTime, scaleLinear } from 'd3-scale';
import LineChart from '@lucide/svelte/icons/line-chart';

let { config }: { config: DashboardWidget } = $props();

const accountsState = $derived(AccountsState.get());
const accounts = $derived(Array.from(accountsState.accounts.values()));

const netWorth = $derived(accountsState.getTotalBalance());
const onBudget = $derived(
  accounts
    .filter((a) => a.onBudget && !a.closed)
    .reduce((s, a) => s + (a.balance ?? 0), 0)
);
const offBudget = $derived(
  accounts
    .filter((a) => !a.onBudget && !a.closed)
    .reduce((s, a) => s + (a.balance ?? 0), 0)
);

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthShort(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return SHORT_MONTHS[d.getMonth()]!;
}

// svelte-ignore state_referenced_locally
const historyQuery = $derived(rpc.netWorth.getNetWorthHistory(12).options());
const history = $derived(historyQuery.data ?? []);
const isLoadingHistory = $derived(historyQuery.isLoading);

const chartData = $derived(
  history.map((s) => ({
    date: new Date(s.snapshotDate + 'T00:00:00'),
    value: s.totalNetWorth,
  }))
);

const yValues = $derived(chartData.map((d) => d.value));
const rawMin = $derived(yValues.length > 0 ? Math.min(...yValues) : 0);
const rawMax = $derived(yValues.length > 0 ? Math.max(...yValues) : 100);
const yMin = $derived(rawMin < 0 ? rawMin * 1.05 : rawMin * 0.97);
const yMax = $derived(rawMax > 0 ? rawMax * 1.05 : rawMax * 0.97);
</script>

{#if accounts.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-6">
    <LineChart class="text-muted-foreground h-10 w-10" />
    <p class="text-muted-foreground text-sm">No accounts to track</p>
  </div>
{:else}
  <div class="space-y-4">
    <div class="text-center">
      <div
        class="text-3xl font-bold"
        class:text-green-600={netWorth > 0}
        class:text-red-600={netWorth < 0}
        class:text-muted-foreground={netWorth === 0}>
        {currencyFormatter.format(netWorth)}
      </div>
      <p class="text-muted-foreground text-xs">Net Worth</p>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-lg border p-2.5 text-center">
        <div class="text-sm font-semibold">{currencyFormatter.format(onBudget)}</div>
        <div class="text-muted-foreground text-xs">On Budget</div>
      </div>
      <div class="rounded-lg border p-2.5 text-center">
        <div class="text-sm font-semibold">{currencyFormatter.format(offBudget)}</div>
        <div class="text-muted-foreground text-xs">Off Budget</div>
      </div>
    </div>

    <!-- 12-month net worth history line chart -->
    {#if isLoadingHistory}
      <div class="bg-muted h-24 animate-pulse rounded"></div>
    {:else if chartData.length >= 2}
      <div class="h-24">
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
              format={(d) => formatMonthShort(d.toISOString().slice(0, 10))} />
            <Line
              stroke={netWorth >= 0 ? 'var(--chart-2)' : 'var(--chart-1)'}
              strokeWidth={2} />
          </Svg>
        </LayerCake>
      </div>
      <p class="text-muted-foreground text-center text-xs">12-month trend</p>
    {:else}
      <p class="text-muted-foreground text-center text-xs">
        History accumulates daily — check back tomorrow for your first trend
      </p>
    {/if}
  </div>
{/if}
