<script lang="ts">
import * as ChartUI from '$lib/components/ui/chart';
import { Chart, Area, Axis, Svg } from 'layerchart';
import { currencyFormatter } from '$lib/utils/formatters';
import { getMonthlySpendingAggregates } from '$lib/query/transactions';
import AnalyticsChartShell from './analytics-chart-shell.svelte';

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
} satisfies ChartUI.ChartConfig;

// Summary statistics for the shell component
const summaryStats = $derived.by(() => {
  if (!monthlySpendingData.length) {
    return [
      { label: 'Average Monthly', value: '$0.00' },
      { label: 'Highest', value: '$0.00' },
      { label: 'Lowest', value: '$0.00' },
      { label: 'Total', value: '$0.00' }
    ];
  }

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

  return [
    {
      label: 'Average Monthly',
      value: currencyFormatter.format(average)
    },
    {
      label: 'Highest',
      value: currencyFormatter.format(highest),
      description: highestMonth || undefined
    },
    {
      label: 'Lowest',
      value: currencyFormatter.format(lowest),
      description: lowestMonth || undefined
    },
    {
      label: 'Total',
      value: currencyFormatter.format(total),
      description: `${totalTransactions} transactions`
    }
  ];
});
</script>

<AnalyticsChartShell
  loading={$monthlySpendingQuery.isLoading}
  error={$monthlySpendingQuery.error?.message}
  data={monthlySpendingData}
  {summaryStats}
  emptyMessage="Add some expense transactions to see spending trends"
>
  {#snippet title()}
    Monthly Spending Trends
  {/snippet}

  {#snippet subtitle()}
    Expense patterns and analytics over time
  {/snippet}

  {#snippet chart({ data }: { data: typeof monthlySpendingData })}
    <ChartUI.Container config={chartConfig} class="h-full w-full">
      <Chart {data} x="monthDisplay" y="spending" yNice padding={{ left: 80, right: 20, top: 20, bottom: 40 }}>
        <Svg>
          <Area />
        </Svg>

        {#snippet axis()}
          <Axis placement="left" format="currency" grid rule />
          <Axis placement="bottom" grid rule />
        {/snippet}

        {#snippet tooltip({ data })}
          <ChartUI.Tooltip>
            {#snippet formatter({ value, name })}
              <div class="flex flex-1 shrink-0 justify-between leading-none items-center">
                <span class="text-muted-foreground">{name}</span>
                <span class="text-foreground font-mono font-medium tabular-nums">
                  {currencyFormatter.format(Number(value))}
                </span>
              </div>
            {/snippet}
          </ChartUI.Tooltip>
        {/snippet}
      </Chart>
    </ChartUI.Container>
  {/snippet}
</AnalyticsChartShell>
