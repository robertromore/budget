<script lang="ts">
import * as Chart from '$lib/components/ui/chart';
import * as Card from '$lib/components/ui/card';
import { LineChart, Axis } from 'layerchart';
import type {TransactionsFormat} from '$lib/types';
import { monthYearFmt, monthYearShortFmt } from '$lib/utils/date-formatters';
import { timezone } from '$lib/utils/dates';
import { currencyFormatter } from '$lib/utils/formatters';

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

// Summary statistics for income vs expenses
const summaryStats = $derived.by(() => {
  if (!chartData.length) return null;

  const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0);
  const netIncome = totalIncome - totalExpenses;
  const avgMonthlyIncome = totalIncome / chartData.length;
  const avgMonthlyExpenses = totalExpenses / chartData.length;

  return {
    totalIncome,
    totalExpenses,
    netIncome,
    avgMonthlyIncome,
    avgMonthlyExpenses,
    monthCount: chartData.length
  };
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
} satisfies Chart.ChartConfig;

</script>

{#if chartData.length > 0}
  <!-- Summary Statistics Panel -->
  {#if summaryStats}
    <div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card.Root>
        <Card.Content class="p-4 text-center">
          <div class="text-2xl font-bold text-green-600">{currencyFormatter.format(summaryStats.avgMonthlyIncome)}</div>
          <div class="text-sm text-muted-foreground">Avg Monthly Income</div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="p-4 text-center">
          <div class="text-2xl font-bold text-red-600">{currencyFormatter.format(summaryStats.avgMonthlyExpenses)}</div>
          <div class="text-sm text-muted-foreground">Avg Monthly Expenses</div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="p-4 text-center">
          <div class="text-2xl font-bold {summaryStats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}">
            {currencyFormatter.format(summaryStats.netIncome)}
          </div>
          <div class="text-sm text-muted-foreground">Net Income ({summaryStats.monthCount} months)</div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="p-4 text-center">
          <div class="text-2xl font-bold">
            {summaryStats.avgMonthlyExpenses > 0
              ? (summaryStats.avgMonthlyIncome / summaryStats.avgMonthlyExpenses * 100).toFixed(0) + '%'
              : '∞'
            }
          </div>
          <div class="text-sm text-muted-foreground">Income Ratio</div>
        </Card.Content>
      </Card.Root>
    </div>
  {/if}

  <Chart.Container config={chartConfig} class="h-[300px] w-full">
    <LineChart
      data={chartData}
      x="monthDisplay"
      series={[
        { key: "income", color: "var(--chart-2)" },
        { key: "expenses", color: "var(--chart-1)" },
      ]}
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
              <span class="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig]?.label || name}</span>
              <span class="text-foreground font-mono font-medium tabular-nums">
                {currencyFormatter.format(Number(value) || 0)}
              </span>
            </div>
          {/snippet}
        </Chart.Tooltip>
      {/snippet}
    </LineChart>
  </Chart.Container>
{:else}
  <div class="h-[400px] w-full flex items-center justify-center">
    <div class="text-center space-y-2">
      <p class="text-lg font-medium text-muted-foreground">No income/expense data available</p>
      <p class="text-sm text-muted-foreground/70">Add some transactions to see income vs expense trends</p>
    </div>
  </div>
{/if}
