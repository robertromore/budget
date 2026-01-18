<!--
  Budget Analytics Tab

  Provides analytics visualizations for individual budget detail pages.
  Uses sidebar navigation pattern matching account analytics.
-->
<script lang="ts">
import { cn } from '$lib/utils';
import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
import {
  budgetAnalyticsTypes,
  getFilteredAnalytics,
  groupAnalyticsByCategory,
  type BudgetAnalyticType,
} from './(analytics)/budget-analytics-types';
import type { BudgetType } from '$lib/schema/budgets';

// Chart components
import BudgetSpendingTrendsChart from './(analytics)/budget-spending-trends-chart.svelte';
import BudgetCategoryBreakdownChart from './(analytics)/budget-category-breakdown-chart.svelte';
import BudgetPeriodComparisonChart from './(analytics)/budget-period-comparison-chart.svelte';
import BudgetBurndownChart from './(analytics)/budget-burndown-chart.svelte';

interface Props {
  budgetId: number;
  budgetType?: BudgetType;
  currentPeriodId?: number;
  previousPeriodId?: number;
  periodStartDate?: string;
  periodEndDate?: string;
}

let {
  budgetId,
  budgetType,
  currentPeriodId,
  previousPeriodId,
  periodStartDate,
  periodEndDate,
}: Props = $props();

// Filter analytics types based on budget type
const filteredAnalyticsTypes = $derived(getFilteredAnalytics(budgetType));

// Default to spending-trends
let selectedAnalytic = $state<string | null>(null);
const effectiveSelectedAnalytic = $derived(selectedAnalytic ?? 'spending-trends');
const currentAnalytic = $derived(
  filteredAnalyticsTypes.find((a) => a.id === effectiveSelectedAnalytic)
);

// Reset chart interactions when switching analytics
$effect(() => {
  effectiveSelectedAnalytic;
  chartInteractions.reset();
  chartSelection.reset();
});

// Group analytics by category
const groupedAnalytics = $derived(groupAnalyticsByCategory(filteredAnalyticsTypes));
</script>

<div class="flex flex-col gap-6">
  <!-- Header -->
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-2xl font-bold tracking-tight">Analytics</h2>
      <p class="text-muted-foreground">
        Spending trends and insights for this budget
      </p>
    </div>
  </div>

  <!-- Main Layout: Sidebar + Content -->
  <div class="flex gap-6">
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
        {#if effectiveSelectedAnalytic === 'spending-trends'}
          <BudgetSpendingTrendsChart {budgetId} />
        {:else if effectiveSelectedAnalytic === 'category-breakdown'}
          <BudgetCategoryBreakdownChart {budgetId} />
        {:else if effectiveSelectedAnalytic === 'period-comparison'}
          <BudgetPeriodComparisonChart
            {budgetId}
            {currentPeriodId}
            {previousPeriodId}
          />
        {:else if effectiveSelectedAnalytic === 'daily-burndown'}
          <BudgetBurndownChart
            {budgetId}
            startDate={periodStartDate}
            endDate={periodEndDate}
          />
        {/if}
      {/if}
    </div>
  </div>
</div>
