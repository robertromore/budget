<script lang="ts">
  import {
    AnomalyAlertCard,
    BudgetRiskCard,
    ForecastSummaryCard,
    RecurringPatternCard,
    SavingsOpportunityCard,
  } from "$lib/components/ml";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import * as Tabs from "$lib/components/ui/tabs";
  import { ML } from "$lib/query/ml";
  import { formatCurrency } from "$lib/utils";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import BarChart3 from "@lucide/svelte/icons/bar-chart-3";
  import Bell from "@lucide/svelte/icons/bell";
  import Calendar from "@lucide/svelte/icons/calendar";
  import DollarSign from "@lucide/svelte/icons/dollar-sign";
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import PiggyBank from "@lucide/svelte/icons/piggy-bank";
  import Settings from "@lucide/svelte/icons/settings";
  import TrendingDown from "@lucide/svelte/icons/trending-down";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import Wallet from "@lucide/svelte/icons/wallet";

  interface Props {
    accountId: number;
    accountSlug: string;
  }

  let { accountId, accountSlug }: Props = $props();

  // Active tab state
  let activeTab = $state("spending");

  // ============================================================================
  // Spending Patterns Tab Queries (lazy loaded via enabled option)
  // ============================================================================
  const incomeExpenseQuery = ML.getIncomeExpenseBreakdown({ accountId }).options(
    () => ({ enabled: activeTab === "spending" })
  );

  const incomeExpenseHistory = ML.getIncomeExpenseHistory(6, accountId).options(
    () => ({ enabled: activeTab === "spending" })
  );

  const anomalyAlertsQuery = ML.getAnomalyAlerts({ limit: 3, minRiskLevel: "medium" }).options(
    () => ({ enabled: activeTab === "spending" })
  );

  const recurringPatternsQuery = ML.getRecurringPatterns({ accountId }).options(
    () => ({ enabled: activeTab === "spending" })
  );

  const recurringSummaryQuery = ML.getRecurringSummary({ accountId }).options(
    () => ({ enabled: activeTab === "spending" })
  );

  // ============================================================================
  // Predictive Alerts Tab Queries (lazy loaded via enabled option)
  // ============================================================================
  const forecastQuery = ML.getCashFlowForecast({ horizon: 30, granularity: "daily", accountId }).options(
    () => ({ enabled: activeTab === "alerts" })
  );

  const budgetRiskQuery = ML.getBudgetsAtRisk("medium").options(
    () => ({ enabled: activeTab === "alerts" })
  );

  const missingPatternsQuery = ML.getMissingPatterns({ daysAhead: 7 }).options(
    () => ({ enabled: activeTab === "alerts" })
  );

  // ============================================================================
  // Optimization Tab Queries (lazy loaded via enabled option)
  // ============================================================================
  const savingsQuery = ML.getSavingsOpportunities({ lookbackMonths: 6 }).options(
    () => ({ enabled: activeTab === "optimization" })
  );

  const savingsSummaryQuery = ML.getSavingsSummary().options(
    () => ({ enabled: activeTab === "optimization" })
  );

  const unusedSubscriptionsQuery = ML.getUnusedSubscriptions().options(
    () => ({ enabled: activeTab === "optimization" })
  );

  const priceIncreasesQuery = ML.getPriceIncreases().options(
    () => ({ enabled: activeTab === "optimization" })
  );

  const duplicateServicesQuery = ML.getDuplicateServices().options(
    () => ({ enabled: activeTab === "optimization" })
  );

  // ============================================================================
  // Derived Data
  // ============================================================================

  // Spending Patterns
  const breakdown = $derived(incomeExpenseQuery.data?.breakdown);
  const monthlyHistory = $derived(incomeExpenseHistory.data?.history ?? []);
  const anomalies = $derived(anomalyAlertsQuery.data?.alerts ?? []);
  const recurringPatterns = $derived(recurringPatternsQuery.data?.patterns ?? []);
  const recurringSummary = $derived(recurringSummaryQuery.data?.summary ?? null);

  // Predictive Alerts
  const forecast = $derived(forecastQuery.data);
  const budgetsAtRisk = $derived(budgetRiskQuery.data?.budgets ?? []);
  const missingPatterns = $derived(missingPatternsQuery.data?.missing ?? []);

  // Optimization
  const savingsOpportunities = $derived(savingsQuery.data?.opportunities ?? []);
  const savingsSummary = $derived(savingsSummaryQuery.data);
  // Filter opportunities by type
  const unusedSubscriptions = $derived(
    unusedSubscriptionsQuery.data?.opportunities?.filter(o => o.type === "unused_subscription") ?? []
  );
  const priceIncreases = $derived(
    priceIncreasesQuery.data?.opportunities?.filter(o => o.type === "price_increase") ?? []
  );
  const duplicateServices = $derived(
    duplicateServicesQuery.data?.opportunities?.filter(o => o.type === "duplicate_service") ?? []
  );

  // Total potential savings
  const totalMonthlySavings = $derived(
    savingsSummary?.totalMonthlyPotential ?? 0
  );
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-lg font-semibold">Intelligence</h2>
      <p class="text-muted-foreground text-sm">
        ML-powered insights and recommendations
      </p>
    </div>
    <Button variant="outline" size="sm" href="/settings/intelligence">
      <Settings class="mr-2 h-4 w-4" />
      ML Settings
    </Button>
  </div>

  <!-- Tabs -->
  <Tabs.Root bind:value={activeTab} class="space-y-6">
    <Tabs.List class="grid w-full grid-cols-3">
      <Tabs.Trigger value="spending" class="flex items-center gap-2">
        <BarChart3 class="h-4 w-4" />
        <span class="hidden sm:inline">Spending Patterns</span>
        <span class="sm:hidden">Spending</span>
      </Tabs.Trigger>
      <Tabs.Trigger value="alerts" class="flex items-center gap-2">
        <Bell class="h-4 w-4" />
        <span class="hidden sm:inline">Predictive Alerts</span>
        <span class="sm:hidden">Alerts</span>
      </Tabs.Trigger>
      <Tabs.Trigger value="optimization" class="flex items-center gap-2">
        <Lightbulb class="h-4 w-4" />
        <span class="hidden sm:inline">Optimization</span>
        <span class="sm:hidden">Optimize</span>
      </Tabs.Trigger>
    </Tabs.List>

    <!-- ======================================================================
         SPENDING PATTERNS TAB
    ====================================================================== -->
    <Tabs.Content value="spending" class="space-y-6">
      <!-- Spending Summary Section -->
      <div class="grid gap-4 lg:grid-cols-2">
        <!-- Current Month Summary -->
        <Card.Root>
          <Card.Header class="pb-2">
            <Card.Title class="flex items-center gap-2 text-sm font-medium">
              <DollarSign class="h-4 w-4" />
              Current Month
            </Card.Title>
            <Card.Description>Income vs expenses this month</Card.Description>
          </Card.Header>
          <Card.Content>
            {#if incomeExpenseQuery.isLoading}
              <Skeleton class="h-[200px] w-full" />
            {:else if breakdown?.currentMonth}
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground text-sm">Income</span>
                  <span class="font-semibold text-green-600">
                    {formatCurrency(breakdown.currentMonth.income)}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground text-sm">Expenses</span>
                  <span class="font-semibold text-red-600">
                    {formatCurrency(breakdown.currentMonth.expenses)}
                  </span>
                </div>
                <div class="border-t pt-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium">Net Savings</span>
                    <span class="text-lg font-bold" class:text-green-600={breakdown.currentMonth.netSavings >= 0} class:text-red-600={breakdown.currentMonth.netSavings < 0}>
                      {formatCurrency(breakdown.currentMonth.netSavings)}
                    </span>
                  </div>
                  <div class="mt-2 flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">Savings Rate</span>
                    <Badge variant={breakdown.currentMonth.savingsRate >= 20 ? "default" : "secondary"}>
                      {breakdown.currentMonth.savingsRate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <p class="text-muted-foreground text-xs">
                  {breakdown.currentMonth.daysRemaining} days remaining in month
                </p>
              </div>
            {:else}
              <div class="flex h-[200px] items-center justify-center">
                <p class="text-muted-foreground text-sm">No spending data available</p>
              </div>
            {/if}
          </Card.Content>
        </Card.Root>

        <!-- Monthly Trend Chart -->
        <Card.Root>
          <Card.Header class="pb-2">
            <Card.Title class="flex items-center gap-2 text-sm font-medium">
              <TrendingUp class="h-4 w-4" />
              Monthly Spending Trend
            </Card.Title>
            <Card.Description>Last 6 months</Card.Description>
          </Card.Header>
          <Card.Content>
            {#if incomeExpenseHistory.isLoading}
              <Skeleton class="h-[200px] w-full" />
            {:else if monthlyHistory.length > 0}
              <div class="space-y-2">
                {#each monthlyHistory.slice(-6) as month}
                  {@const maxExpense = Math.max(...monthlyHistory.map(m => Math.abs(m.expenses)))}
                  {@const barWidth = maxExpense > 0 ? (Math.abs(month.expenses) / maxExpense) * 100 : 0}
                  <div class="flex items-center gap-3">
                    <span class="text-muted-foreground w-12 text-xs">
                      {month.period.slice(5)}
                    </span>
                    <div class="flex-1">
                      <div class="h-4 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          class="h-full rounded-full bg-red-500/80 transition-all"
                          style="width: {barWidth}%"
                        ></div>
                      </div>
                    </div>
                    <span class="w-20 text-right text-sm font-medium">
                      {formatCurrency(Math.abs(month.expenses))}
                    </span>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="flex h-[200px] items-center justify-center">
                <p class="text-muted-foreground text-sm">No trend data available</p>
              </div>
            {/if}
          </Card.Content>
        </Card.Root>
      </div>

      <!-- Anomalies and Recurring Section -->
      <div class="grid gap-4 lg:grid-cols-2">
        <!-- Unusual Spending -->
        <Card.Root>
          <Card.Header class="pb-2">
            <div class="flex items-center justify-between">
              <Card.Title class="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle class="h-4 w-4" />
                Unusual Spending
              </Card.Title>
              {#if anomalies.length > 0}
                <Badge variant="outline" class="text-yellow-500">
                  {anomalies.length} detected
                </Badge>
              {/if}
            </div>
            <Card.Description>Transactions that don't fit your patterns</Card.Description>
          </Card.Header>
          <Card.Content>
            {#if anomalyAlertsQuery.isLoading}
              <div class="space-y-2">
                <Skeleton class="h-[80px] w-full" />
                <Skeleton class="h-[80px] w-full" />
              </div>
            {:else if anomalies.length > 0}
              <div class="space-y-2">
                {#each anomalies.slice(0, 3) as alert}
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
            {:else}
              <div class="flex h-[100px] items-center justify-center">
                <div class="text-center">
                  <AlertTriangle class="text-muted-foreground mx-auto h-6 w-6" />
                  <p class="text-muted-foreground mt-2 text-sm">No unusual spending detected</p>
                </div>
              </div>
            {/if}
          </Card.Content>
        </Card.Root>

        <!-- Recurring Patterns -->
        <RecurringPatternCard
          summary={recurringSummary}
          topPatterns={recurringPatterns.slice(0, 4)}
        />
      </div>
    </Tabs.Content>

    <!-- ======================================================================
         PREDICTIVE ALERTS TAB
    ====================================================================== -->
    <Tabs.Content value="alerts" class="space-y-6">
      <!-- Alert Summary Cards -->
      <div class="grid gap-4 sm:grid-cols-3">
        <!-- Upcoming Bills -->
        <Card.Root>
          <Card.Content class="pt-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Calendar class="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p class="text-2xl font-bold">{missingPatterns.length}</p>
                <p class="text-muted-foreground text-xs">Expected this week</p>
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Balance Warning -->
        <Card.Root>
          <Card.Content class="pt-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                <Wallet class="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                {#if forecast}
                  <p class="text-2xl font-bold">
                    {formatCurrency(forecast.predictions[forecast.predictions.length - 1]?.value ?? 0)}
                  </p>
                  <p class="text-muted-foreground text-xs">30-day projected</p>
                {:else}
                  <Skeleton class="h-6 w-16" />
                  <p class="text-muted-foreground text-xs">30-day projected</p>
                {/if}
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Budgets at Risk -->
        <Card.Root>
          <Card.Content class="pt-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <TrendingDown class="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p class="text-2xl font-bold">{budgetsAtRisk.length}</p>
                <p class="text-muted-foreground text-xs">Budgets at risk</p>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      </div>

      <!-- Main Content Grid -->
      <div class="grid gap-4 lg:grid-cols-2">
        <!-- Cash Flow Forecast -->
        {#if forecastQuery.isLoading}
          <Skeleton class="h-[300px]" />
        {:else if forecast}
          <ForecastSummaryCard
            title="30-Day Cash Flow Forecast"
            predictions={forecast.predictions}
            confidence={forecast.confidence}
            granularity="daily"
          />
        {:else}
          <Card.Root>
            <Card.Content class="flex h-[300px] items-center justify-center">
              <p class="text-muted-foreground">Unable to generate forecast</p>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Budget Risk -->
        {#if budgetRiskQuery.isLoading}
          <Skeleton class="h-[300px]" />
        {:else if budgetsAtRisk.length > 0}
          <BudgetRiskCard
            budgetsAtRisk={budgetsAtRisk.length}
            totalBudgets={budgetRiskQuery.data?.total ?? 0}
            overallRisk={budgetsAtRisk[0]?.overSpendRisk ?? "none"}
            predictedOverspend={budgetsAtRisk.reduce((sum, b) => sum + Math.max(0, b.predictedOverspend), 0)}
            topRisks={budgetsAtRisk.slice(0, 3).map(b => ({
              budgetId: b.budgetId,
              budgetName: b.budgetName,
              risk: b.overSpendRisk,
              predictedOverspend: b.predictedOverspend,
              percentSpent: b.percentUsed,
            }))}
          />
        {:else}
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-sm font-medium">Budget Health</Card.Title>
            </Card.Header>
            <Card.Content class="flex h-[240px] items-center justify-center">
              <div class="text-center">
                <TrendingUp class="mx-auto h-8 w-8 text-green-500" />
                <p class="mt-2 font-medium text-green-600">All budgets on track</p>
                <p class="text-muted-foreground text-sm">No overspending predicted</p>
              </div>
            </Card.Content>
          </Card.Root>
        {/if}
      </div>

      <!-- Missing Expected Transactions -->
      {#if missingPatterns.length > 0}
        <Card.Root>
          <Card.Header class="pb-2">
            <Card.Title class="flex items-center gap-2 text-sm font-medium">
              <Bell class="h-4 w-4" />
              Expected Transactions
            </Card.Title>
            <Card.Description>Recurring payments expected in the next 7 days</Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="space-y-2">
              {#each missingPatterns.slice(0, 5) as pattern}
                {@const daysUntil = Math.ceil((new Date(pattern.expectedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                <div class="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p class="font-medium">{pattern.payeeName}</p>
                    <p class="text-muted-foreground text-xs">
                      Expected: {new Date(pattern.expectedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold text-red-600">
                      {formatCurrency(pattern.expectedAmount)}
                    </p>
                    <Badge variant="outline" class="text-xs">
                      {daysUntil < 0 ? `${Math.abs(daysUntil)} days late` : daysUntil === 0 ? 'Due today' : `In ${daysUntil} days`}
                    </Badge>
                  </div>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      {/if}
    </Tabs.Content>

    <!-- ======================================================================
         OPTIMIZATION TAB
    ====================================================================== -->
    <Tabs.Content value="optimization" class="space-y-6">
      <!-- Savings Summary Header -->
      <Card.Root class="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
        <Card.Content class="py-6">
          <div class="flex flex-col items-center justify-center gap-2 text-center">
            <PiggyBank class="h-8 w-8 text-green-500" />
            <div>
              <p class="text-muted-foreground text-sm">Potential Monthly Savings</p>
              <p class="text-3xl font-bold text-green-600">
                {#if savingsSummaryQuery.isLoading}
                  <Skeleton class="mx-auto h-9 w-24" />
                {:else}
                  {formatCurrency(totalMonthlySavings)}
                {/if}
              </p>
              <p class="text-muted-foreground text-xs">
                ~{formatCurrency(totalMonthlySavings * 12)}/year
              </p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Savings Opportunities -->
      {#if savingsQuery.isLoading}
        <Skeleton class="h-[300px]" />
      {:else}
        <SavingsOpportunityCard
          opportunityCount={savingsOpportunities.length}
          totalMonthlyPotential={totalMonthlySavings}
          opportunities={savingsOpportunities.slice(0, 5)}
        />
      {/if}

      <!-- Detailed Breakdown Grid -->
      <div class="grid gap-4 lg:grid-cols-2">
        <!-- Unused Subscriptions -->
        <Card.Root>
          <Card.Header class="pb-2">
            <div class="flex items-center justify-between">
              <Card.Title class="text-sm font-medium">Unused Subscriptions</Card.Title>
              {#if unusedSubscriptions.length > 0}
                <Badge variant="outline" class="text-yellow-500">
                  {unusedSubscriptions.length} found
                </Badge>
              {/if}
            </div>
            <Card.Description>Services you may no longer need</Card.Description>
          </Card.Header>
          <Card.Content>
            {#if unusedSubscriptionsQuery.isLoading}
              <Skeleton class="h-[120px] w-full" />
            {:else if unusedSubscriptions.length > 0}
              <div class="space-y-2">
                {#each unusedSubscriptions.slice(0, 3) as sub}
                  <div class="flex items-center justify-between rounded-lg border p-2">
                    <div>
                      <p class="text-sm font-medium">{sub.payeeName ?? sub.title}</p>
                      <p class="text-muted-foreground text-xs">
                        Last used: {sub.evidence.lastTransactionDate ? new Date(sub.evidence.lastTransactionDate).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <p class="font-semibold text-green-600">
                      {formatCurrency(sub.estimatedMonthlySavings)}/mo
                    </p>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="flex h-[100px] items-center justify-center">
                <p class="text-muted-foreground text-sm">No unused subscriptions detected</p>
              </div>
            {/if}
          </Card.Content>
        </Card.Root>

        <!-- Price Increases -->
        <Card.Root>
          <Card.Header class="pb-2">
            <div class="flex items-center justify-between">
              <Card.Title class="text-sm font-medium">Recent Price Increases</Card.Title>
              {#if priceIncreases.length > 0}
                <Badge variant="outline" class="text-orange-500">
                  {priceIncreases.length} detected
                </Badge>
              {/if}
            </div>
            <Card.Description>Services that have increased in price</Card.Description>
          </Card.Header>
          <Card.Content>
            {#if priceIncreasesQuery.isLoading}
              <Skeleton class="h-[120px] w-full" />
            {:else if priceIncreases.length > 0}
              <div class="space-y-2">
                {#each priceIncreases.slice(0, 3) as increase}
                  <div class="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/5 p-2">
                    <div>
                      <p class="text-sm font-medium">{increase.payeeName ?? increase.title}</p>
                      <p class="text-muted-foreground text-xs">
                        {formatCurrency(increase.evidence.previousAmount ?? 0)} → {formatCurrency(increase.evidence.currentAmount ?? 0)}
                      </p>
                    </div>
                    <Badge variant="secondary" class="text-orange-500">
                      +{(increase.evidence.increasePercent ?? 0).toFixed(0)}%
                    </Badge>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="flex h-[100px] items-center justify-center">
                <p class="text-muted-foreground text-sm">No recent price increases</p>
              </div>
            {/if}
          </Card.Content>
        </Card.Root>
      </div>

      <!-- Duplicate Services -->
      {#if duplicateServices.length > 0}
        <Card.Root>
          <Card.Header class="pb-2">
            <Card.Title class="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle class="h-4 w-4 text-blue-500" />
              Potential Duplicate Services
            </Card.Title>
            <Card.Description>
              Similar services that might be redundant
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="space-y-2">
              {#each duplicateServices.slice(0, 3) as duplicate}
                <div class="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium">{duplicate.categoryName ?? duplicate.title}</p>
                      <p class="text-muted-foreground text-xs">
                        {duplicate.evidence.similarServices?.map(s => s.payeeName).join(", ") ?? duplicate.description}
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-semibold text-green-600">
                        Save {formatCurrency(duplicate.estimatedMonthlySavings)}/mo
                      </p>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>
