<script lang="ts">
import * as Chart from '$lib/components/ui/chart';
import * as Card from '$lib/components/ui/card';
import { AreaChart, Axis } from 'layerchart';
import { currencyFormatter } from '$lib/utils/formatters';
import { getMonthlySpendingAggregates } from '$lib/query/transactions';

interface Props {
  accountId: number;
}

let { accountId }: Props = $props();

// Fetch monthly spending aggregates from dedicated endpoint
const monthlySpendingQuery = getMonthlySpendingAggregates(accountId).options();

// Transform API data into chart format
const monthlySpendingData = $derived.by(() => {
  const data = $monthlySpendingQuery.data;
  if (!data?.length) return [];

  return data.map((item: {
    month: string;
    monthLabel: string;
    spending: number;
    transactionCount: number;
  }) => ({
    month: item.month,
    monthDisplay: item.monthLabel.split(' ').map((word: string, i: number) => i === 0 ? word.slice(0, 3) : word.slice(-2)).join(' '), // "Jan 25" format
    spending: item.spending,
    monthLabel: item.monthLabel,
    transactionCount: item.transactionCount
  }));
});

// Chart configuration
const chartConfig = {
  spending: {
    label: 'Monthly Spending',
    color: 'hsl(var(--chart-1))'
  }
} satisfies Chart.ChartConfig;

// Summary statistics
const summaryStats = $derived.by(() => {
  if (!monthlySpendingData.length) return null;

  const amounts = monthlySpendingData.map((d: any) => d.spending);
  const total = amounts.reduce((sum: number, amount: number) => sum + amount, 0);
  const average = total / amounts.length;
  const highest = Math.max(...amounts);
  const lowest = Math.min(...amounts);

  // Find which months had highest/lowest spending
  const highestMonth = monthlySpendingData.find((d: any) => d.spending === highest)?.monthLabel;
  const lowestMonth = monthlySpendingData.find((d: any) => d.spending === lowest)?.monthLabel;

  // Sum total transaction count
  const totalTransactions = monthlySpendingData.reduce((sum: number, d: any) => sum + d.transactionCount, 0);

  return {
    total,
    average,
    highest,
    lowest,
    highestMonth,
    lowestMonth,
    monthCount: amounts.length,
    totalTransactions
  };
});
</script>

{#if $monthlySpendingQuery.isLoading}
  <div class="h-[400px] w-full flex items-center justify-center">
    <div class="text-center space-y-2">
      <p class="text-lg font-medium text-muted-foreground">Loading spending analytics...</p>
    </div>
  </div>
{:else if $monthlySpendingQuery.error}
  <div class="h-[400px] w-full flex items-center justify-center">
    <div class="text-center space-y-2">
      <p class="text-lg font-medium text-destructive">Error loading spending data</p>
      <p class="text-sm text-muted-foreground/70">{$monthlySpendingQuery.error.message}</p>
    </div>
  </div>
{:else if monthlySpendingData.length > 0}
  <!-- Summary Statistics Panel -->
  {#if summaryStats}
    <div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card.Root>
        <Card.Content class="p-4 text-center">
          <div class="text-2xl font-bold">{currencyFormatter.format(summaryStats.average)}</div>
          <div class="text-sm text-muted-foreground">Average Monthly</div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="p-4 text-center">
          <div class="text-2xl font-bold text-red-600">{currencyFormatter.format(summaryStats.highest)}</div>
          <div class="text-sm text-muted-foreground">Highest ({summaryStats.highestMonth})</div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="p-4 text-center">
          <div class="text-2xl font-bold text-green-600">{currencyFormatter.format(summaryStats.lowest)}</div>
          <div class="text-sm text-muted-foreground">Lowest ({summaryStats.lowestMonth})</div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="p-4 text-center">
          <div class="text-2xl font-bold">{currencyFormatter.format(summaryStats.total)}</div>
          <div class="text-sm text-muted-foreground">Total ({summaryStats.totalTransactions} transactions)</div>
        </Card.Content>
      </Card.Root>
    </div>
  {/if}

  <Chart.Container config={chartConfig} class="h-[300px] w-full">
    <AreaChart
      data={monthlySpendingData}
      x="monthDisplay"
      y="spending"
      yNice
      padding={{ left: 80, right: 20, top: 20, bottom: 40 }}
    >
      {#snippet axis()}
        <Axis placement="left" format="currency" grid rule />
        <Axis placement="bottom" grid rule />
      {/snippet}

      {#snippet tooltip()}
        <Chart.Tooltip
          labelFormatter={(value, payload) => {
            return payload?.[0]?.payload?.monthLabel || value;
          }}
        >
          {#snippet formatter({ value, name })}
            <div class="flex flex-1 shrink-0 justify-between leading-none items-center">
              <span class="text-muted-foreground">{name}</span>
              <span class="text-foreground font-mono font-medium tabular-nums">
                {currencyFormatter.format(Number(value))}
              </span>
            </div>
          {/snippet}
        </Chart.Tooltip>
      {/snippet}
    </AreaChart>
  </Chart.Container>
{:else}
  <div class="h-[400px] w-full flex items-center justify-center">
    <div class="text-center space-y-2">
      <p class="text-lg font-medium text-muted-foreground">No spending data available</p>
      <p class="text-sm text-muted-foreground/70">Add some expense transactions to see spending trends</p>
    </div>
  </div>
{/if}
