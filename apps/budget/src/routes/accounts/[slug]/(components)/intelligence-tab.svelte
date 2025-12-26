<script lang="ts">
  import {
    AnomalyAlertCard,
    BudgetRiskCard,
    ForecastSummaryCard,
    IncomeExpenseCard,
  } from "$lib/components/ml";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { ML } from "$lib/query/ml";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import DollarSign from "@lucide/svelte/icons/dollar-sign";
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import TrendingUp from "@lucide/svelte/icons/trending-up";

  interface Props {
    accountId: number;
    accountSlug: string;
  }

  let { accountId, accountSlug }: Props = $props();

  // Queries - use .options() for reactive interface
  // Income vs Expense breakdown
  const incomeExpenseQuery = $derived(
    ML.getIncomeExpenseBreakdown({ accountId }).options()
  );

  // Budget risk (global - not account specific in current API)
  const budgetRiskQuery = ML.getBudgetsAtRisk("medium").options();

  // Cash flow forecast
  const forecastQuery = $derived(
    ML.getCashFlowForecast({ horizon: 30, granularity: "daily", accountId }).options()
  );

  // Anomaly alerts (global - not account specific in current API)
  const anomalyAlertsQuery = ML.getAnomalyAlerts({ limit: 5, minRiskLevel: "medium" }).options();

  // Derived data for Income/Expense card
  const incomeExpenseData = $derived(incomeExpenseQuery?.data);
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p class="text-muted-foreground">
        ML-powered insights and predictions for this account
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" href="/settings/intelligence">
        <SlidersHorizontal class="mr-2 h-4 w-4" />
        ML Settings
      </Button>
    </div>
  </div>

  <!-- Account Insights Grid -->
  <div class="grid gap-4 md:grid-cols-2" data-tour-id="intelligence-insights">
    <!-- Income vs Expenses Card -->
    {#if incomeExpenseQuery.isLoading}
      <Skeleton class="h-[280px]" />
    {:else if incomeExpenseQuery.error}
      <Card.Root>
        <Card.Content class="flex h-[280px] items-center justify-center">
          <p class="text-muted-foreground">Unable to load income/expense data</p>
        </Card.Content>
      </Card.Root>
    {:else if incomeExpenseData?.breakdown}
      {@const breakdown = incomeExpenseData.breakdown}
      {@const mom = breakdown.monthOverMonth}
      <IncomeExpenseCard
        thisMonthIncome={mom.currentPeriod.income}
        thisMonthExpenses={mom.currentPeriod.expenses}
        lastMonthIncome={mom.previousPeriod.income}
        lastMonthExpenses={mom.previousPeriod.expenses}
        incomeTrend={breakdown.trends.income.direction}
        expenseTrend={breakdown.trends.expenses.direction}
        savingsRate={breakdown.currentMonth.savingsRate}
      />
    {:else}
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2 text-sm font-medium">
            <DollarSign class="h-4 w-4" />
            Income vs Expenses
          </Card.Title>
        </Card.Header>
        <Card.Content class="flex h-[200px] items-center justify-center">
          <p class="text-muted-foreground">No data available</p>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Budget Risk Card -->
    {#if budgetRiskQuery.isLoading}
      <Skeleton class="h-[280px]" />
    {:else if budgetRiskQuery.error}
      <Card.Root>
        <Card.Content class="flex h-[280px] items-center justify-center">
          <p class="text-muted-foreground">Unable to load budget risk data</p>
        </Card.Content>
      </Card.Root>
    {:else if budgetRiskQuery.data}
      {@const budgets = budgetRiskQuery.data.budgets}
      {@const topRisks = budgets.slice(0, 3).map(b => ({
        budgetId: b.budgetId,
        budgetName: b.budgetName,
        risk: b.overSpendRisk,
        predictedOverspend: b.predictedOverspend,
        percentSpent: b.percentUsed,
      }))}
      {@const highestRisk = budgets.length > 0 ? budgets[0].overSpendRisk : "none"}
      {@const totalOverspend = budgets.reduce((sum, b) => sum + Math.max(0, b.predictedOverspend), 0)}
      <BudgetRiskCard
        budgetsAtRisk={budgets.length}
        totalBudgets={budgetRiskQuery.data.total}
        overallRisk={highestRisk}
        predictedOverspend={totalOverspend}
        {topRisks}
      />
    {/if}
  </div>

  <!-- Main Content Grid -->
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Forecast Section -->
    <div class="space-y-4" data-tour-id="intelligence-suggestions">
      <div class="flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-lg font-semibold">
          <TrendingUp class="h-5 w-5" />
          Cash Flow Forecast
        </h2>
        <Button
          variant="ghost"
          size="sm"
          href="/accounts/{accountSlug}/intelligence/forecast"
        >
          View Details
          <ChevronRight class="ml-1 h-4 w-4" />
        </Button>
      </div>

      {#if forecastQuery.isLoading}
        <Skeleton class="h-[300px] w-full" />
      {:else if forecastQuery.error}
        <Card.Root class="border-destructive">
          <Card.Content class="pt-6">
            <p class="text-muted-foreground">Unable to load forecast data</p>
          </Card.Content>
        </Card.Root>
      {:else if forecastQuery.data}
        <ForecastSummaryCard
          title="30-Day Forecast"
          predictions={forecastQuery.data.predictions}
          confidence={forecastQuery.data.confidence}
          granularity="daily"
        />
      {:else}
        <Card.Root>
          <Card.Content class="py-8 text-center">
            <p class="text-muted-foreground">No forecast data available</p>
          </Card.Content>
        </Card.Root>
      {/if}
    </div>

    <!-- Anomalies Section -->
    <div class="space-y-4" data-tour-id="intelligence-anomalies">
      <div class="flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle class="h-5 w-5" />
          Recent Anomalies
        </h2>
        <Button
          variant="ghost"
          size="sm"
          href="/accounts/{accountSlug}/intelligence/anomalies"
        >
          View All
          <ChevronRight class="ml-1 h-4 w-4" />
        </Button>
      </div>

      {#if anomalyAlertsQuery.isLoading}
        <div class="space-y-3">
          {#each Array(3) as _}
            <Skeleton class="h-[120px] w-full" />
          {/each}
        </div>
      {:else if anomalyAlertsQuery.error}
        <Card.Root class="border-destructive">
          <Card.Content class="pt-6">
            <p class="text-muted-foreground">Unable to load anomaly alerts</p>
          </Card.Content>
        </Card.Root>
      {:else if anomalyAlertsQuery.data?.alerts.length === 0}
        <Card.Root>
          <Card.Content class="py-8 text-center">
            <AlertTriangle class="text-muted-foreground mx-auto mb-2 h-8 w-8" />
            <p class="text-muted-foreground">No anomalies detected</p>
            <p class="text-muted-foreground text-sm">
              Your recent transactions look normal
            </p>
          </Card.Content>
        </Card.Root>
      {:else if anomalyAlertsQuery.data}
        <div class="space-y-3">
          {#each anomalyAlertsQuery.data.alerts.slice(0, 3) as alert}
            <AnomalyAlertCard
              transactionId={alert.transactionId}
              overallScore={alert.overallScore}
              riskLevel={alert.riskLevel}
              explanation={alert.explanation}
              recommendedActions={alert.recommendedActions}
              dimensions={alert.dimensions}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
