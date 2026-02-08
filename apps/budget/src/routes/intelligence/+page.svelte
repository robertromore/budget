<script lang="ts">
  import {
    AnomalyAlertCard,
    BudgetRiskCard,
    ForecastSummaryCard,
    IncomeExpenseCard,
    MLHealthOverview,
    NLSearchCard,
    RecurringPatternCard,
    SavingsOpportunityCard,
    SimilarPayeeCard,
  } from "$lib/components/ml";
  import { PatternList, CategoryPatternsSection } from "$lib/components/patterns";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { ML } from "$lib/query/ml";
  import { deleteAllPatterns, detectPatterns, listPatterns } from "$lib/query/patterns";
  import { SchedulesState } from "$lib/states/entities";
  import { trpc } from "$lib/trpc/client";
  import { formatPercent } from "$lib/utils";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import Brain from "@lucide/svelte/icons/brain";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import RefreshCcw from "@lucide/svelte/icons/refresh-ccw";
  import Repeat from "@lucide/svelte/icons/repeat";
  import RotateCw from "@lucide/svelte/icons/rotate-cw";
  import Settings from "@lucide/svelte/icons/settings";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import Users from "@lucide/svelte/icons/users";

  // Queries - use .options() for reactive interface
  const healthQuery = ML.getHealthStatus().options();
  const anomalyAlertsQuery = ML.getAnomalyAlerts({ limit: 5, minRiskLevel: "medium" }).options();
  const forecastQuery = ML.getCashFlowForecast({ horizon: 30, granularity: "daily" }).options();
  const userProfileQuery = ML.getUserProfile().options();

  // New feature queries
  const budgetHealthQuery = ML.getBudgetHealthSummary().options();
  const incomeExpenseQuery = ML.getIncomeExpenseSummary().options();
  const savingsQuery = ML.getSavingsSummary().options();

  // Pattern detection queries
  const recurringSummaryQuery = ML.getRecurringSummary().options();
  const canonicalGroupsQuery = ML.getCanonicalGroups().options();

  // Natural Language Search
  const nlExamplesQuery = ML.nlExamples().options();
  let nlSearchQuery = $state("");
  let nlSearchResults = $state<{
    transactions: Array<{
      id: number;
      date: string;
      amount: number;
      notes: string | null;
      payeeName: string | null;
      categoryName: string | null;
      accountName: string | null;
    }>;
    query: {
      interpretation: string;
      confidence: number;
    };
    totalCount: number;
    executionTimeMs: number;
  } | null>(null);
  let nlSearchLoading = $state(false);

  async function handleNLSearch(query: string) {
    nlSearchQuery = query;
    nlSearchLoading = true;
    try {
      const result = await ML.nlSearch(query).execute();
      nlSearchResults = result;
    } catch (error) {
      console.error("NL search failed:", error);
      nlSearchResults = null;
    } finally {
      nlSearchLoading = false;
    }
  }

  // Mutations - use .options() for reactive interface
  const retrainMutation = ML.retrainModels().options();

  function handleRetrain() {
    retrainMutation.mutate(undefined);
  }

  // Schedule Pattern Detection
  const detectMutation = detectPatterns.options();
  const deleteAllMutation = deleteAllPatterns.options();
  const schedulePatternsQuery = listPatterns().options();
  const schedulePatterns = $derived(schedulePatternsQuery.data || []);
  const schedulesState = SchedulesState.get();

  async function runPatternDetection() {
    await detectMutation.mutateAsync({});
    await schedulePatternsQuery.refetch();
  }

  async function clearAndRegeneratePatterns() {
    await deleteAllMutation.mutateAsync({});
    await detectMutation.mutateAsync({});
    await schedulePatternsQuery.refetch();
  }

  async function handlePatternConvert(scheduleId: number) {
    await schedulePatternsQuery.refetch();
    const newSchedule = await trpc().scheduleRoutes.load.query({ id: scheduleId });
    schedulesState.addSchedule(newSchedule as any);
  }

  async function handlePatternDismiss() {
    await schedulePatternsQuery.refetch();
  }
</script>

<svelte:head>
  <title>Intelligence - Budget App</title>
  <meta name="description" content="AI-powered insights and ML features" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-help-id="intelligence-page-header" data-help-title="Intelligence Page">
    <div>
      <div class="flex items-center gap-2">
        <Brain class="text-primary h-6 w-6" />
        <h1 class="text-2xl font-bold tracking-tight">Intelligence</h1>
      </div>
      <p class="text-muted-foreground">AI-powered insights and machine learning features</p>
    </div>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        onclick={handleRetrain}
        disabled={retrainMutation.isPending}
      >
        <RefreshCcw class="mr-2 h-4 w-4 {retrainMutation.isPending ? 'animate-spin' : ''}" />
        Retrain Models
      </Button>
      <Button variant="outline" href="/settings/intelligence">
        <Settings class="mr-2 h-4 w-4" />
        Settings
      </Button>
    </div>
  </div>

  <!-- Natural Language Search -->
  <NLSearchCard
    results={nlSearchResults?.transactions}
    parsedQuery={nlSearchResults?.query}
    examples={nlExamplesQuery.data?.examples}
    isLoading={nlSearchLoading}
    totalCount={nlSearchResults?.totalCount ?? 0}
    executionTimeMs={nlSearchResults?.executionTimeMs ?? 0}
    onSearch={handleNLSearch}
    onViewTransaction={(id) => {
      // TODO: Navigate to transaction detail
      console.log("View transaction:", id);
    }}
  />

  <!-- Health Overview -->
  {#if healthQuery.isLoading}
    <Skeleton class="h-70 w-full" />
  {:else if healthQuery.error}
    <Card.Root class="border-destructive">
      <Card.Content class="pt-6">
        <div class="flex items-center gap-2 text-destructive">
          <AlertTriangle class="h-5 w-5" />
          <p>Failed to load ML health status</p>
        </div>
      </Card.Content>
    </Card.Root>
  {:else if healthQuery.data}
    <MLHealthOverview
      overall={healthQuery.data.overall}
      score={healthQuery.data.score}
      services={healthQuery.data.services}
      metrics={healthQuery.data.metrics}
    />
  {/if}

  <!-- Quick Insights Grid -->
  <div class="grid gap-4 md:grid-cols-3" data-help-id="ml-insights" data-help-title="ML Insights">
    <!-- Income vs Expenses -->
    {#if incomeExpenseQuery.isLoading}
      <Skeleton class="h-70 w-full" />
    {:else if incomeExpenseQuery.data}
      <IncomeExpenseCard
        thisMonthIncome={incomeExpenseQuery.data.thisMonth.income}
        thisMonthExpenses={incomeExpenseQuery.data.thisMonth.expenses}
        lastMonthIncome={incomeExpenseQuery.data.lastMonth.income}
        lastMonthExpenses={incomeExpenseQuery.data.lastMonth.expenses}
        incomeTrend={incomeExpenseQuery.data.incomeTrend}
        expenseTrend={incomeExpenseQuery.data.expenseTrend}
        savingsRate={incomeExpenseQuery.data.savingsRate}
      />
    {/if}

    <!-- Budget Health -->
    {#if budgetHealthQuery.isLoading}
      <Skeleton class="h-70 w-full" />
    {:else if budgetHealthQuery.data}
      <BudgetRiskCard
        budgetsAtRisk={budgetHealthQuery.data.budgetsAtRisk}
        totalBudgets={budgetHealthQuery.data.totalBudgets}
        overallRisk={budgetHealthQuery.data.overallRisk}
        predictedOverspend={budgetHealthQuery.data.predictedOverspend}
        topRisks={budgetHealthQuery.data.topRisks}
        onViewAll={() => window.location.href = '/budgets'}
      />
    {/if}

    <!-- Savings Opportunities -->
    {#if savingsQuery.isLoading}
      <Skeleton class="h-70 w-full" />
    {:else if savingsQuery.data}
      <SavingsOpportunityCard
        opportunityCount={savingsQuery.data.opportunityCount}
        totalMonthlyPotential={savingsQuery.data.totalMonthlyPotential}
        topOpportunity={savingsQuery.data.topOpportunity}
      />
    {/if}
  </div>

  <!-- Main Content Grid -->
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Forecasts Section -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-lg font-semibold">
          <TrendingUp class="h-5 w-5" />
          Cash Flow Forecast
        </h2>
        <Button variant="ghost" size="sm" href="/intelligence/forecasts">
          View All
          <ChevronRight class="ml-1 h-4 w-4" />
        </Button>
      </div>

      {#if forecastQuery.isLoading}
        <Skeleton class="h-75 w-full" />
      {:else if forecastQuery.error}
        <Card.Root class="border-destructive">
          <Card.Content class="pt-6">
            <p class="text-muted-foreground">Unable to load forecast data</p>
          </Card.Content>
        </Card.Root>
      {:else if forecastQuery.data}
        <ForecastSummaryCard
          title="30-Day Cash Flow"
          predictions={forecastQuery.data.predictions}
          confidence={forecastQuery.data.confidence}
          granularity="daily"
        />
      {/if}
    </div>

    <!-- Anomaly Alerts Section -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle class="h-5 w-5" />
          Recent Anomalies
        </h2>
        <Button variant="ghost" size="sm" href="/intelligence/anomalies">
          View All
          <ChevronRight class="ml-1 h-4 w-4" />
        </Button>
      </div>

      {#if anomalyAlertsQuery.isLoading}
        <div class="space-y-3">
          {#each Array(3) as _}
            <Skeleton class="h-30 w-full" />
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
            <p class="text-muted-foreground text-sm">Your transactions look normal</p>
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
              onViewTransaction={() => {
                // TODO: Navigate to transaction
              }}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Pattern Detection Grid -->
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Recurring Patterns -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-lg font-semibold">
          <Repeat class="h-5 w-5" />
          Recurring Patterns
        </h2>
        <Button variant="ghost" size="sm" href="/intelligence/recurring">
          View All
          <ChevronRight class="ml-1 h-4 w-4" />
        </Button>
      </div>

      {#if recurringSummaryQuery.isLoading}
        <Skeleton class="h-80 w-full" />
      {:else if recurringSummaryQuery.error}
        <Card.Root class="border-destructive">
          <Card.Content class="pt-6">
            <p class="text-muted-foreground">Unable to load recurring patterns</p>
          </Card.Content>
        </Card.Root>
      {:else if recurringSummaryQuery.data}
        <RecurringPatternCard
          summary={recurringSummaryQuery.data.summary}
          topPatterns={recurringSummaryQuery.data.topByValue}
          inactivePatterns={recurringSummaryQuery.data.inactive}
          subscriptions={recurringSummaryQuery.data.subscriptions}
        />
      {/if}
    </div>

    <!-- Payee Matching -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-lg font-semibold">
          <Users class="h-5 w-5" />
          Payee Matching
        </h2>
        <Button variant="ghost" size="sm" href="/intelligence/payees">
          View All
          <ChevronRight class="ml-1 h-4 w-4" />
        </Button>
      </div>

      {#if canonicalGroupsQuery.isLoading}
        <Skeleton class="h-80 w-full" />
      {:else if canonicalGroupsQuery.error}
        <Card.Root class="border-destructive">
          <Card.Content class="pt-6">
            <p class="text-muted-foreground">Unable to load payee groups</p>
          </Card.Content>
        </Card.Root>
      {:else if canonicalGroupsQuery.data}
        {@const groups = canonicalGroupsQuery.data.groups}
        {@const duplicateCount = groups.filter(g => g.variants.length > 1).reduce((sum, g) => sum + g.variants.length - 1, 0)}
        {@const totalPayees = groups.reduce((sum, g) => sum + g.variants.length, 0)}
        <SimilarPayeeCard
          groups={groups}
          totalPayees={totalPayees}
          duplicateCount={duplicateCount}
          consolidationPotential={totalPayees > 0 ? duplicateCount / totalPayees : 0}
        />
      {/if}
    </div>
  </div>

  <!-- Schedule Patterns -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="bg-primary/10 rounded-lg p-2">
            <RotateCw class="text-primary h-5 w-5" />
          </div>
          <div>
            <Card.Title class="text-lg">Schedule Patterns</Card.Title>
            <Card.Description>
              Discover recurring transactions and convert them to schedules
            </Card.Description>
          </div>
        </div>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onclick={clearAndRegeneratePatterns}
            disabled={detectMutation.isPending || deleteAllMutation.isPending}
          >
            <RotateCw class="mr-2 h-4 w-4" />
            {detectMutation.isPending || deleteAllMutation.isPending
              ? 'Regenerating...'
              : 'Regenerate'}
          </Button>
          <Button size="sm" onclick={runPatternDetection} disabled={detectMutation.isPending}>
            <Sparkles class="mr-2 h-4 w-4" />
            {detectMutation.isPending ? 'Detecting...' : 'Detect Patterns'}
          </Button>
        </div>
      </div>
    </Card.Header>
    <Card.Content class="pt-0">
      {#if schedulePatternsQuery.isLoading}
        <div class="p-8 text-center">
          <div
            class="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          ></div>
          <p class="text-muted-foreground text-sm">Loading patterns...</p>
        </div>
      {:else if schedulePatterns.length === 0 && !detectMutation.isPending}
        <div class="p-8 text-center">
          <TrendingUp class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h3 class="mb-2 text-lg font-semibold">No patterns detected yet</h3>
          <p class="text-muted-foreground mb-4">
            Run pattern detection to analyze your transaction history and discover recurring
            patterns
          </p>
          <Button onclick={runPatternDetection} disabled={detectMutation.isPending}>
            <Sparkles class="mr-2 h-4 w-4" />
            {detectMutation.isPending ? 'Detecting...' : 'Detect Patterns'}
          </Button>
        </div>
      {:else}
        <PatternList
          patterns={schedulePatterns}
          isLoading={schedulePatternsQuery.isLoading}
          onConvert={handlePatternConvert}
          onDismiss={handlePatternDismiss}
        />
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Category Patterns -->
  <CategoryPatternsSection />

  <!-- User Profile Section -->
  {#if userProfileQuery.data}
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-base">Learning Progress</Card.Title>
        <Card.Description>
          How well the system has learned your preferences
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-4 sm:grid-cols-4">
          <div class="space-y-1">
            <p class="text-muted-foreground text-xs">Total Recommendations</p>
            <p class="text-xl font-semibold">
              {userProfileQuery.data.learningProgress.totalRecommendations.toLocaleString()}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-muted-foreground text-xs">Accepted</p>
            <p class="text-xl font-semibold">
              {userProfileQuery.data.learningProgress.acceptedRecommendations.toLocaleString()}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-muted-foreground text-xs">Acceptance Rate</p>
            <p class="text-xl font-semibold">
              {formatPercent(userProfileQuery.data.engagement.acceptanceRate, 1)}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-muted-foreground text-xs">Confidence Calibration</p>
            <p class="text-xl font-semibold">
              {formatPercent(userProfileQuery.data.learningProgress.confidenceCalibration)}
            </p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
