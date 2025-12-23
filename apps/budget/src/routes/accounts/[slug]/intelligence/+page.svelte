<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import {
    AnomalyAlertCard,
    ForecastSummaryCard,
    MLHealthCard,
  } from "$lib/components/ml";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { ML } from "$lib/query/ml";
  import { AccountsState } from "$lib/states/entities";
  import { getPageTabsContext } from "$lib/stores/page-tabs.svelte";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import Brain from "@lucide/svelte/icons/brain";
  import Calendar from "@lucide/svelte/icons/calendar";
  import ChartLine from "@lucide/svelte/icons/chart-line";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import List from "@lucide/svelte/icons/list";
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import Upload from "@lucide/svelte/icons/upload";
  import Wallet from "@lucide/svelte/icons/wallet";
  import { onDestroy } from "svelte";

  // Get account from state
  const accountsState = AccountsState.get();
  const accountSlug = $derived(page.params.slug ?? "");
  const account = $derived(accountsState.getBySlug(accountSlug));
  const accountId = $derived(account?.id);

  // Tab navigation - register with pageTabsContext for header tabs
  const pageTabsContext = getPageTabsContext();

  function handleTabChange(value: string) {
    if (value === "intelligence") return; // Already on intelligence
    if (value === "transactions") {
      goto(`/accounts/${accountSlug}`);
    } else {
      goto(`/accounts/${accountSlug}?tab=${value}`);
    }
  }

  // Register tabs for header display
  $effect(() => {
    if (pageTabsContext) {
      pageTabsContext.register({
        tabs: [
          { id: "transactions", label: "Transactions", icon: List },
          { id: "analytics", label: "Analytics", icon: ChartLine },
          { id: "intelligence", label: "Intelligence", icon: Brain },
          { id: "schedules", label: "Schedules", icon: Calendar },
          { id: "budgets", label: "Budgets", icon: Wallet },
          { id: "import", label: "Import", icon: Upload },
          { id: "settings", label: "Settings", icon: SlidersHorizontal },
        ],
        activeTab: "intelligence",
        onTabChange: handleTabChange,
      });
    }
  });

  onDestroy(() => {
    pageTabsContext?.clear();
  });

  // Helper to format service names: "anomalyDetection" → "Anomaly Detection"
  function formatServiceName(name: string): string {
    return name
      .replace(/([A-Z])/g, " $1") // Add space before capitals
      .replace(/^./, (c) => c.toUpperCase()) // Capitalize first letter
      .trim();
  }

  // Queries - use .options() for reactive interface
  const healthQuery = ML.getHealthStatus().options();
  const forecastQuery = $derived(
    accountId
      ? ML.getCashFlowForecast({ horizon: 30, granularity: "daily", accountId }).options()
      : null
  );
  const anomalyAlertsQuery = ML.getAnomalyAlerts({ limit: 5, minRiskLevel: "medium" }).options();
</script>

<svelte:head>
  <title>Intelligence - {account?.name ?? "Account"} - Budget App</title>
  <meta name="description" content="ML insights for {account?.name ?? 'account'}" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <div class="flex items-center gap-2">
        <Brain class="text-primary h-6 w-6" />
        <h1 class="text-2xl font-bold tracking-tight">Intelligence</h1>
      </div>
      <p class="text-muted-foreground">
        ML insights for {account?.name ?? "this account"}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" href="/settings/intelligence">
        <SlidersHorizontal class="mr-2 h-4 w-4" />
        ML Settings
      </Button>
    </div>
  </div>

  <!-- Quick Stats Grid -->
  {#if healthQuery.isLoading}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each Array(4) as _}
        <Skeleton class="h-25" />
      {/each}
    </div>
  {:else if healthQuery.data}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each healthQuery.data.services.slice(0, 4) as service}
        <MLHealthCard
          serviceName={formatServiceName(service.name)}
          status={service.status}
          metrics={{
            predictionLatencyMs: service.responseTime,
            errorRate: service.errorRate,
          }}
          lastCheck={service.lastCheck}
        />
      {/each}
    </div>
  {/if}

  <!-- Main Content Grid -->
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Forecast Section -->
    <div class="space-y-4">
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

      {#if forecastQuery}
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
            title="30-Day Forecast"
            predictions={forecastQuery.data.predictions}
            confidence={forecastQuery.data.confidence}
            granularity="daily"
          />
        {/if}
      {:else}
        <Card.Root>
          <Card.Content class="py-8 text-center">
            <p class="text-muted-foreground">Select an account to view forecasts</p>
          </Card.Content>
        </Card.Root>
      {/if}
    </div>

    <!-- Anomalies Section -->
    <div class="space-y-4">
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
            <p class="text-muted-foreground text-sm">
              Transactions for this account look normal
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

  <!-- Quick Actions -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-base">Quick Actions</Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" href="/accounts/{accountSlug}/intelligence/forecast">
          <TrendingUp class="mr-2 h-4 w-4" />
          View Detailed Forecast
        </Button>
        <Button variant="outline" href="/accounts/{accountSlug}/intelligence/anomalies">
          <AlertTriangle class="mr-2 h-4 w-4" />
          Review Anomalies
        </Button>
        <Button variant="outline" href="/intelligence">
          <Brain class="mr-2 h-4 w-4" />
          Global Intelligence Dashboard
        </Button>
      </div>
    </Card.Content>
  </Card.Root>
</div>
