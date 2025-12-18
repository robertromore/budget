<script lang="ts">
import ChartPlaceholder from '$lib/components/ui/chart-placeholder.svelte';
import { getMonthlySpendingAggregates } from '$lib/query/transactions';
import { currencyFormatter } from '$lib/utils/formatters';
import AnalyticsChartShell from './analytics-chart-shell.svelte';

interface Props {
  accountId: number;
}

let { accountId }: Props = $props();

// Fetch monthly spending aggregates from dedicated endpoint
const monthlySpendingQuery = getMonthlySpendingAggregates(accountId).options();

// Transform API data into chart format
const monthlySpendingData = $derived.by(() => {
  const data = monthlySpendingQuery.data;
  if (!data?.length) return [];

  return data.map(
    (
      item: {
        month: string;
        monthLabel: string;
        spending: number;
        transactionCount: number;
      },
      index: number
    ) => {
      // Convert month string (YYYY-MM) to Date object for proper time scale
      const [year, month] = item.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1); // month is 0-indexed in Date constructor

      return {
        month: item.month,
        monthDisplay: item.monthLabel
          .split(' ')
          .map((word: string, i: number) => (i === 0 ? word.slice(0, 3) : word.slice(-2)))
          .join(' '), // "Jan 25" format
        spending: item.spending,
        monthLabel: item.monthLabel,
        transactionCount: item.transactionCount,
        date: date, // Use date object for x-axis
        x: date,
        y: item.spending,
      };
    }
  );
});

// Summary statistics for the shell component
const summaryStats = $derived.by(() => {
  if (!monthlySpendingData.length) {
    return [
      { label: 'Average Monthly', value: '$0.00' },
      { label: 'Highest', value: '$0.00' },
      { label: 'Lowest', value: '$0.00' },
      { label: 'Total', value: '$0.00' },
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
  const totalTransactions = monthlySpendingData.reduce(
    (sum: number, d: any) => sum + d.transactionCount,
    0
  );

  return [
    {
      label: 'Average Monthly',
      value: currencyFormatter.format(average),
    },
    {
      label: 'Highest',
      value: currencyFormatter.format(highest),
      description: highestMonth || undefined,
    },
    {
      label: 'Lowest',
      value: currencyFormatter.format(lowest),
      description: lowestMonth || undefined,
    },
    {
      label: 'Total',
      value: currencyFormatter.format(total),
      description: `${totalTransactions} transactions`,
    },
  ];
});
</script>

<AnalyticsChartShell
  loading={monthlySpendingQuery.isLoading}
  error={monthlySpendingQuery.error?.message}
  data={monthlySpendingData}
  {summaryStats}
  emptyMessage="Add some expense transactions to see spending trends">
  {#snippet title()}
    Monthly Spending Trends
  {/snippet}

  {#snippet subtitle()}
    Expense patterns and analytics over time
  {/snippet}

  {#snippet chart({ data }: { data: typeof monthlySpendingData })}
    <ChartPlaceholder class="h-full" title="Monthly Spending Trends Chart" />
  {/snippet}
</AnalyticsChartShell>
