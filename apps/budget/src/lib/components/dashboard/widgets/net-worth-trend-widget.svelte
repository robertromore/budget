<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import { LayerCake, Svg } from 'layercake';
import { Bar, AxisX } from '$lib/components/layercake';
import { scaleBand, scaleLinear } from 'd3-scale';
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

// Group by account type for bar chart
const byType = $derived.by(() => {
  const types = new Map<string, number>();
  for (const a of accounts.filter((a) => !a.closed)) {
    const key = a.accountType ?? 'other';
    types.set(key, (types.get(key) ?? 0) + (a.balance ?? 0));
  }
  return Array.from(types.entries())
    .map(([type, balance]) => ({
      label: type.replace('_', ' '),
      value: balance,
    }))
    .sort((a, b) => b.value - a.value);
});

const yMax = $derived(
  byType.length > 0 ? Math.max(...byType.map((d) => Math.abs(d.value))) * 1.15 : 100
);
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

    {#if byType.length > 1}
      <div class="h-28">
        <LayerCake
          data={byType}
          x="label"
          y="value"
          xScale={scaleBand().padding(0.3)}
          yScale={scaleLinear()}
          yDomain={[0, yMax]}
          padding={{ top: 5, right: 5, bottom: 24, left: 5 }}>
          <Svg>
            <AxisX gridlines={false} tickMarks={false} />
            <Bar
              fill={(d) => (d.value >= 0 ? 'var(--chart-1)' : 'var(--chart-2)')}
              opacity={0.8}
              radius={3} />
          </Svg>
        </LayerCake>
      </div>
    {/if}
  </div>
{/if}
