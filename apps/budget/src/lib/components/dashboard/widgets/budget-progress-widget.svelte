<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import { LayerCake, Svg } from 'layercake';
import { HorizontalBar, AxisY } from '$lib/components/layercake';
import { scaleBand, scaleLinear } from 'd3-scale';
import Target from '@lucide/svelte/icons/target';

let { config }: { config: DashboardWidget } = $props();

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

const budgetsQuery = rpc.budgets.listBudgets().options();
const budgets = $derived(budgetsQuery.data ?? []);
const isLoading = $derived(budgetsQuery.isLoading);

const limit = $derived((config.settings as any)?.limit ?? 6);

const chartData = $derived.by(() => {
  const items = budgets
    .filter((b: any) => b.metadata?.allocatedAmount && b.metadata.allocatedAmount > 0)
    .slice(0, limit);

  return items.map((b: any) => {
    const allocated = Number(b.metadata?.allocatedAmount) || 0;
    // Calculate spent from budget transactions relation
    const spent = (b.transactions ?? []).reduce(
      (sum: number, bt: any) => sum + Math.abs(Number(bt.allocatedAmount ?? bt.transaction?.amount ?? 0)),
      0
    );
    const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
    return {
      label: truncate(b.name, 18),
      value: pct,
      spent,
      allocated,
      isOver: spent > allocated,
    };
  });
});

// Scale the x-axis to the max percentage so bars are visually distinct
const xMax = $derived(
  chartData.length > 0 ? Math.max(100, ...chartData.map((d) => d.value)) : 100
);
</script>

{#if isLoading}
  <div class="space-y-3">
    {#each Array(3) as _}
      <div class="bg-muted h-8 animate-pulse rounded"></div>
    {/each}
  </div>
{:else if chartData.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-6">
    <Target class="text-muted-foreground h-10 w-10" />
    <p class="text-muted-foreground text-sm">No active budgets</p>
    <a href="/budgets" class="text-primary text-xs hover:underline">Create a budget</a>
  </div>
{:else}
  <div style="height: {Math.max(100, chartData.length * 36)}px;">
    <LayerCake
      data={chartData}
      x="value"
      y="label"
      yScale={scaleBand().padding(0.3)}
      xScale={scaleLinear()}
      xDomain={[0, xMax]}
      padding={{ top: 0, right: 40, bottom: 0, left: 130 }}>
      <Svg>
        {#if xMax > 100}
          {@const lineX = (100 / xMax) * 100}
          <line
            x1="{lineX}%"
            y1="0"
            x2="{lineX}%"
            y2="100%"
            stroke="var(--border)"
            stroke-width="1"
            stroke-dasharray="4 3" />
        {/if}
        <AxisY gridlines={false} tickMarks={false} />
        <HorizontalBar
          fill={(d) => (d.isOver ? 'var(--destructive)' : d.value >= 85 ? 'var(--chart-4)' : 'var(--chart-1)')}
          opacity={0.8}
          radius={3} />
      </Svg>
    </LayerCake>
  </div>
  <div class="mt-1 space-y-0.5">
    {#each chartData as d}
      <div class="text-muted-foreground flex items-center justify-between text-xs">
        <span class="truncate">{d.label}</span>
        <span class={d.isOver ? 'text-destructive' : ''}>
          {currencyFormatter.format(d.spent)} / {currencyFormatter.format(d.allocated)}
          ({d.value}%)
        </span>
      </div>
    {/each}
  </div>
{/if}
