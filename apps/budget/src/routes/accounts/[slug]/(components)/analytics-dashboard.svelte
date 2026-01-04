<script lang="ts">
import { cn } from '$lib/utils';
import type { TransactionsFormat } from '$lib/types';
import type { Account } from '$lib/schema/accounts';
import { analyticsTypes } from './(analytics)/analytics-types';
import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
import { chartSelection } from '$lib/states/ui/chart-selection.svelte';

// Interactive components
import ChartDrillDownSheet from './chart-drill-down-sheet.svelte';
import ChartDateRangeIndicator from './chart-date-range-indicator.svelte';
import { TimePeriodSelector } from '$lib/components/charts';

// Credit Card charts
import CreditUtilizationChart from './(charts)/credit-utilization-chart.svelte';
import CreditBalanceChart from './(charts)/credit-balance-chart.svelte';
import CreditPaymentChart from './(charts)/credit-payment-chart.svelte';
import CreditPayoffChart from './(charts)/credit-payoff-chart.svelte';

// Existing charts
import CategoryCompositionChart from './(charts)/category-composition-chart.svelte';
import CategoryRadarChart from './(charts)/category-radar-chart.svelte';
import DailySpendingCalendar from './(charts)/daily-spending-calendar.svelte';
import IncomeVsExpensesChart from './(charts)/income-vs-expenses-chart.svelte';
import MonthlySpendingChart from './(charts)/monthly-spending-chart.svelte';
import PayeeRankingsChart from './(charts)/payee-rankings-chart.svelte';
import TopCategoriesView from './(charts)/top-categories-view.svelte';
import TransactionExplorerChart from './(charts)/transaction-explorer-chart.svelte';

// New charts
import SpendingVelocityChart from './(charts)/spending-velocity-chart.svelte';
import YearOverYearChart from './(charts)/year-over-year-chart.svelte';
import WeekdayPatternsChart from './(charts)/weekday-patterns-chart.svelte';
import SpendingDistributionChart from './(charts)/spending-distribution-chart.svelte';
import OutlierDetectionChart from './(charts)/outlier-detection-chart.svelte';
import RecurringSpendingChart from './(charts)/recurring-spending-chart.svelte';
import SavingsRateChart from './(charts)/savings-rate-chart.svelte';
import CashFlowChart from './(charts)/cash-flow-chart.svelte';
import CategoryTrendsChart from './(charts)/category-trends-chart.svelte';
import PayeeFrequencyChart from './(charts)/payee-frequency-chart.svelte';
import PayeeTrendsChart from './(charts)/payee-trends-chart.svelte';
import NewPayeesChart from './(charts)/new-payees-chart.svelte';

interface Props {
  transactions: TransactionsFormat[];
  accountId: string;
  accountType?: string;
  account?: Account;
}

let { transactions, accountId, accountType, account }: Props = $props();

// Filter analytics types based on account type
const filteredAnalyticsTypes = $derived.by(() => {
  return analyticsTypes.filter((analytic) => {
    // If analytic specifies account types, check if current account matches
    if (analytic.accountTypes) {
      return accountType ? analytic.accountTypes.includes(accountType) : false;
    }
    // Otherwise, show to all account types
    return true;
  });
});

// Current selection - default to credit-utilization for credit cards, otherwise monthly-spending
const defaultAnalytic = $derived(
  accountType === 'credit_card' ? 'credit-utilization' : 'monthly-spending'
);
let selectedAnalytic = $state<string | null>(null);
const effectiveSelectedAnalytic = $derived(selectedAnalytic ?? defaultAnalytic);
const currentAnalytic = $derived(
  filteredAnalyticsTypes.find((a) => a.id === effectiveSelectedAnalytic)
);

// Reset chart interactions and selection when switching analytics
$effect(() => {
  // Track the current analytic to trigger when it changes
  effectiveSelectedAnalytic;

  // Reset all chart interaction state (drill-down, date range, hidden series)
  chartInteractions.reset();
  // Reset any selected data points
  chartSelection.reset();
});

// Group analytics by category (using filtered types)
const groupedAnalytics = $derived.by(() => {
  const groups = new Map<string, typeof analyticsTypes>();

  for (const analytic of filteredAnalyticsTypes) {
    const category = analytic.category;
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(analytic);
  }

  return groups;
});

// Filter transactions based on global time period
// Access globalPeriod reactively
const globalPeriod = $derived(timePeriodFilter.globalPeriod);

const filteredTransactions = $derived.by(() => {
  const period = globalPeriod;
  if (period.preset === 'all-time') return transactions;

  const range = timePeriodFilter.getDateRange(period);
  if (!range) return transactions;

  return transactions.filter((tx) => {
    // Use UTC-based comparison to match chart data processing
    // tx.date is a CalendarDate - extract YYYY-MM-DD and create UTC Date
    const dateStr = tx.date.toString(); // Returns "YYYY-MM-DD"
    const [year, month, day] = dateStr.split('-').map(Number);
    const txDateUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return txDateUtc >= range.start && txDateUtc <= range.end;
  });
});
</script>

<div class="flex flex-col gap-6">
  <!-- Header -->
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-2xl font-bold tracking-tight">Analytics</h2>
      <p class="text-muted-foreground">
        Detailed analysis of your spending patterns and financial trends
      </p>
    </div>
    <!-- Global filter hidden for now - using per-chart filters instead -->
    <!-- <div class="flex items-center gap-2">
      <TimePeriodSelector />
      <ChartDateRangeIndicator />
    </div> -->
  </div>

  <!-- Main Layout: Vertical Tabs + Content -->
  <div class="flex gap-6" data-tour-id="analytics-period-selector">
    <!-- Vertical Tab List -->
    <div class="w-56 shrink-0 space-y-4">
      {#each groupedAnalytics as [category, analytics]}
        <div class="space-y-1">
          <h3 class="text-muted-foreground px-2 text-xs font-semibold uppercase tracking-wider">
            {category}
          </h3>
          <div class="space-y-0.5">
            {#each analytics as analytic}
              <button
                class={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  effectiveSelectedAnalytic === analytic.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
                onclick={() => (selectedAnalytic = analytic.id)}
              >
                <analytic.icon class="h-4 w-4 shrink-0" />
                <span class="truncate">{analytic.title}</span>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <!-- Chart Content -->
    <div class="min-w-0 flex-1">
      {#if currentAnalytic}
        <!-- Credit Card Analytics - pass ALL transactions since these charts have their own ChartPeriodBadge -->
        {#if effectiveSelectedAnalytic === 'credit-utilization'}
          <CreditUtilizationChart {account} {transactions} />
        {:else if effectiveSelectedAnalytic === 'credit-balance'}
          <CreditBalanceChart {account} {transactions} />
        {:else if effectiveSelectedAnalytic === 'credit-payments'}
          <CreditPaymentChart {account} {transactions} />
        {:else if effectiveSelectedAnalytic === 'credit-payoff'}
          <CreditPayoffChart {account} {transactions} />

        <!-- Time-Based -->
        {:else if effectiveSelectedAnalytic === 'monthly-spending'}
          <div data-tour-id="analytics-trend-chart">
            <MonthlySpendingChart accountId={Number(accountId)} />
          </div>
        {:else if effectiveSelectedAnalytic === 'income-vs-expenses'}
          <IncomeVsExpensesChart transactions={filteredTransactions} />
        {:else if effectiveSelectedAnalytic === 'daily-calendar'}
          <DailySpendingCalendar transactions={filteredTransactions} />
        {:else if effectiveSelectedAnalytic === 'spending-velocity'}
          <SpendingVelocityChart transactions={filteredTransactions} />
        {:else if effectiveSelectedAnalytic === 'year-over-year'}
          <YearOverYearChart transactions={filteredTransactions} />
        {:else if effectiveSelectedAnalytic === 'weekday-patterns'}
          <WeekdayPatternsChart transactions={filteredTransactions} />

        <!-- Category Analysis -->
        {:else if effectiveSelectedAnalytic === 'category-composition'}
          <CategoryCompositionChart transactions={filteredTransactions} />
        {:else if effectiveSelectedAnalytic === 'top-categories'}
          <div data-tour-id="analytics-category-chart">
            <TopCategoriesView transactions={filteredTransactions} />
          </div>
        {:else if effectiveSelectedAnalytic === 'category-radar'}
          <CategoryRadarChart transactions={filteredTransactions} />
        {:else if effectiveSelectedAnalytic === 'category-trends'}
          <CategoryTrendsChart transactions={filteredTransactions} />

        <!-- Behavioral Insights -->
        {:else if effectiveSelectedAnalytic === 'spending-distribution'}
          <SpendingDistributionChart transactions={filteredTransactions} />
        {:else if effectiveSelectedAnalytic === 'outlier-detection'}
          <OutlierDetectionChart transactions={filteredTransactions} />
        {:else if effectiveSelectedAnalytic === 'recurring-spending'}
          <RecurringSpendingChart transactions={filteredTransactions} />

        <!-- Financial Health -->
        {:else if effectiveSelectedAnalytic === 'savings-rate'}
          <SavingsRateChart transactions={filteredTransactions} />
        {:else if effectiveSelectedAnalytic === 'cash-flow'}
          <CashFlowChart transactions={filteredTransactions} />

        <!-- Payee Analysis -->
        {:else if effectiveSelectedAnalytic === 'top-payees'}
          <PayeeRankingsChart transactions={filteredTransactions} />
        {:else if effectiveSelectedAnalytic === 'payee-frequency'}
          <PayeeFrequencyChart transactions={filteredTransactions} />
        {:else if effectiveSelectedAnalytic === 'payee-trends'}
          <PayeeTrendsChart transactions={filteredTransactions} />
        {:else if effectiveSelectedAnalytic === 'new-payees'}
          <NewPayeesChart transactions={filteredTransactions} />

        <!-- Transaction Analysis -->
        {:else if effectiveSelectedAnalytic === 'transaction-explorer'}
          <TransactionExplorerChart transactions={filteredTransactions} />
        {/if}
      {/if}
    </div>
  </div>
</div>

<!-- Drill-down sheet for chart interactions -->
<ChartDrillDownSheet transactions={filteredTransactions} />
