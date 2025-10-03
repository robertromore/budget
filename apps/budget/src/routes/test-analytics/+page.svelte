<script lang="ts">
import { getSpendingTrends, getCategoryBreakdown, getDailySpending, getBudgetSummaryStats } from '$lib/query/budgets';

const budgetId = 1;

const spendingTrendsQuery = getSpendingTrends(budgetId).options();
const categoryBreakdownQuery = getCategoryBreakdown(budgetId).options();
const dailySpendingQuery = getDailySpending(budgetId, '2024-01-01', '2024-12-31').options();
const summaryStatsQuery = getBudgetSummaryStats(budgetId).options();
</script>

<div class="container mx-auto py-6 space-y-6">
  <h1 class="text-3xl font-bold">Analytics Endpoints Test</h1>

  <div class="space-y-4">
    <div class="border rounded-lg p-4">
      <h2 class="text-xl font-semibold mb-2">Spending Trends</h2>
      {#if $spendingTrendsQuery.isLoading}
        <p>Loading...</p>
      {:else if $spendingTrendsQuery.error}
        <p class="text-red-500">Error: {$spendingTrendsQuery.error.message}</p>
      {:else}
        <pre class="bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify($spendingTrendsQuery.data, null, 2)}</pre>
      {/if}
    </div>

    <div class="border rounded-lg p-4">
      <h2 class="text-xl font-semibold mb-2">Category Breakdown</h2>
      {#if $categoryBreakdownQuery.isLoading}
        <p>Loading...</p>
      {:else if $categoryBreakdownQuery.error}
        <p class="text-red-500">Error: {$categoryBreakdownQuery.error.message}</p>
      {:else}
        <pre class="bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify($categoryBreakdownQuery.data, null, 2)}</pre>
      {/if}
    </div>

    <div class="border rounded-lg p-4">
      <h2 class="text-xl font-semibold mb-2">Daily Spending</h2>
      {#if $dailySpendingQuery.isLoading}
        <p>Loading...</p>
      {:else if $dailySpendingQuery.error}
        <p class="text-red-500">Error: {$dailySpendingQuery.error.message}</p>
      {:else}
        <pre class="bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify($dailySpendingQuery.data, null, 2)}</pre>
      {/if}
    </div>

    <div class="border rounded-lg p-4">
      <h2 class="text-xl font-semibold mb-2">Summary Stats</h2>
      {#if $summaryStatsQuery.isLoading}
        <p>Loading...</p>
      {:else if $summaryStatsQuery.error}
        <p class="text-red-500">Error: {$summaryStatsQuery.error.message}</p>
      {:else}
        <pre class="bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify($summaryStatsQuery.data, null, 2)}</pre>
      {/if}
    </div>
  </div>
</div>
