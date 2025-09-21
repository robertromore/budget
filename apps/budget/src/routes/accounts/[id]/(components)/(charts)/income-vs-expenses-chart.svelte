<script lang="ts">
import * as ChartUI from '$lib/components/ui/chart';
import { Chart, Spline, Axis, Svg } from 'layerchart';
import type {TransactionsFormat} from '$lib/types';
import { monthYearFmt, monthYearShortFmt } from '$lib/utils/date-formatters';
import { timezone } from '$lib/utils/dates';
import { currencyFormatter } from '$lib/utils/formatters';
import AnalyticsChartShell from './analytics-chart-shell.svelte';

interface Props {
  transactions: TransactionsFormat[];
}

let {transactions}: Props = $props();

// Transform transaction data into monthly income vs expenses
const chartData = $derived.by(() => {
  if (!transactions?.length) return [];

  // Group transactions by month and separate income/expenses
  const monthlyData: Array<{month: string, monthDisplay: string, income: number, expenses: number, monthLabel: string}> = [];
  const seenMonths = new Set<string>();

  transactions.forEach(transaction => {
    const monthKey = `${transaction.date.year}-${String(transaction.date.month).padStart(2, '0')}`; // YYYY-MM format

    // If we haven't seen this month yet, create a new entry
    if (!seenMonths.has(monthKey)) {
      const monthLabel = monthYearFmt.format(transaction.date.toDate(timezone));
      const monthDisplay = monthYearShortFmt.format(transaction.date.toDate(timezone));
      monthlyData.push({
        month: monthKey,
        monthDisplay,
        income: 0,
        expenses: 0,
        monthLabel
      });
      seenMonths.add(monthKey);
    }

    // Find existing entry and add to appropriate category
    const existing = monthlyData.find(item => item.month === monthKey)!;
    if (transaction.amount >= 0) {
      existing.income += transaction.amount;
    } else {
      existing.expenses += Math.abs(transaction.amount);
    }
  });

  // Sort by month and return
  return monthlyData.sort((a, b) => a.month.localeCompare(b.month));
});

// Summary statistics for the shell component
const summaryStats = $derived.by(() => {
  if (!chartData.length) {
    return [
      { label: 'Avg Monthly Income', value: '$0.00' },
      { label: 'Avg Monthly Expenses', value: '$0.00' },
      { label: 'Net Income', value: '$0.00' },
      { label: 'Income Ratio', value: '0%' }
    ];
  }

  const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0);
  const netIncome = totalIncome - totalExpenses;
  const avgMonthlyIncome = totalIncome / chartData.length;
  const avgMonthlyExpenses = totalExpenses / chartData.length;

  const incomeRatio = avgMonthlyExpenses > 0
    ? (avgMonthlyIncome / avgMonthlyExpenses * 100).toFixed(0) + '%'
    : '∞';

  return [
    {
      label: 'Avg Monthly Income',
      value: currencyFormatter.format(avgMonthlyIncome)
    },
    {
      label: 'Avg Monthly Expenses',
      value: currencyFormatter.format(avgMonthlyExpenses)
    },
    {
      label: 'Net Income',
      value: currencyFormatter.format(netIncome),
      description: `${chartData.length} months`
    },
    {
      label: 'Income Ratio',
      value: incomeRatio
    }
  ];
});

// Chart configuration for grouped bar chart
const chartConfig = {
  income: {
    label: 'Income',
    color: 'hsl(var(--chart-1))'
  },
  expenses: {
    label: 'Expenses',
    color: 'hsl(var(--chart-2))'
  }
} satisfies ChartUI.ChartConfig;

</script>

<AnalyticsChartShell
  data={chartData}
  {summaryStats}
  emptyMessage="Add some transactions to see income vs expense trends"
>
  {#snippet title()}
    Income vs Expenses
  {/snippet}

  {#snippet subtitle()}
    Monthly comparison of income and expense patterns
  {/snippet}

  {#snippet chart({ data }: { data: typeof chartData })}
    <ChartUI.Container config={chartConfig} class="h-full w-full">
      <Chart {data} x="monthDisplay" yNice padding={{ left: 80, right: 20, top: 20, bottom: 40 }}>
        <Svg>
          <Spline y="income" class="stroke-[--color-income]" />
          <Spline y="expenses" class="stroke-[--color-expenses]" />
        </Svg>

        {#snippet axis()}
          <Axis placement="left" format="currency" grid rule />
          <Axis placement="bottom" grid rule />
        {/snippet}

        {#snippet tooltip({ data })}
          <ChartUI.Tooltip>
            {#snippet formatter({ value, name })}
              <div class="flex flex-1 shrink-0 justify-between leading-none items-center">
                <span class="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig]?.label || name}</span>
                <span class="text-foreground font-mono font-medium tabular-nums">
                  {currencyFormatter.format(Number(value) || 0)}
                </span>
              </div>
            {/snippet}
          </ChartUI.Tooltip>
        {/snippet}
      </Chart>
    </ChartUI.Container>
  {/snippet}
</AnalyticsChartShell>
