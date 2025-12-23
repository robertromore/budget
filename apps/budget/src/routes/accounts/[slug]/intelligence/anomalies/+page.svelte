<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { AnomalyAlertCard } from "$lib/components/ml";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Label } from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { ML } from "$lib/query/ml";
  import { AccountsState } from "$lib/states/entities";
  import { getPageTabsContext } from "$lib/stores/page-tabs.svelte";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Brain from "@lucide/svelte/icons/brain";
  import Calendar from "@lucide/svelte/icons/calendar";
  import ChartLine from "@lucide/svelte/icons/chart-line";
  import List from "@lucide/svelte/icons/list";
  import RefreshCcw from "@lucide/svelte/icons/refresh-ccw";
  import Scan from "@lucide/svelte/icons/scan";
  import ShieldAlert from "@lucide/svelte/icons/shield-alert";
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import Upload from "@lucide/svelte/icons/upload";
  import Wallet from "@lucide/svelte/icons/wallet";
  import { onDestroy } from "svelte";

  // Get account from state
  const accountsState = AccountsState.get();
  const accountSlug = $derived(page.params.slug ?? "");
  const account = $derived(accountsState.getBySlug(accountSlug));

  // Tab navigation - register with pageTabsContext for header tabs
  const pageTabsContext = getPageTabsContext();

  function handleTabChange(value: string) {
    if (value === "intelligence") {
      goto(`/accounts/${accountSlug}/intelligence`);
    } else if (value === "transactions") {
      goto(`/accounts/${accountSlug}`);
    } else {
      goto(`/accounts/${accountSlug}?tab=${value}`);
    }
  }

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

  // Filter state
  let minRiskLevel = $state<"low" | "medium" | "high" | "critical">("medium");
  let limit = $state(20);

  // Queries - use $derived for reactive filter updates
  const anomalyAlertsQuery = $derived(ML.getAnomalyAlerts({ limit, minRiskLevel }).options());

  // Mutations - use .options() for reactive interface
  const scanAndAlertMutation = ML.scanAndAlert().options();

  function handleScan() {
    scanAndAlertMutation.mutate({ days: 7, minRiskLevel: "high" });
  }

  const riskLevelOptions = [
    { value: "low", label: "Low & Above" },
    { value: "medium", label: "Medium & Above" },
    { value: "high", label: "High & Above" },
    { value: "critical", label: "Critical Only" },
  ];
</script>

<svelte:head>
  <title>Anomalies - {account?.name ?? "Account"} - Budget App</title>
  <meta name="description" content="Transaction anomalies for {account?.name ?? 'account'}" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" href="/accounts/{page.params.slug}/intelligence">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div>
        <div class="flex items-center gap-2">
          <ShieldAlert class="text-primary h-6 w-6" />
          <h1 class="text-2xl font-bold tracking-tight">Anomalies</h1>
        </div>
        <p class="text-muted-foreground">
          {account?.name ?? "Account"} - {anomalyAlertsQuery.data?.total ?? 0} anomalies
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        onclick={handleScan}
        disabled={scanAndAlertMutation.isPending}
      >
        <Scan class="mr-2 h-4 w-4 {scanAndAlertMutation.isPending ? 'animate-pulse' : ''}" />
        Scan
      </Button>
    </div>
  </div>

  <!-- Filters -->
  <Card.Root>
    <Card.Content class="pt-6">
      <div class="flex flex-wrap items-end gap-4">
        <div class="space-y-2">
          <Label>Minimum Risk Level</Label>
          <Select.Root
            type="single"
            value={minRiskLevel}
            onValueChange={(v) => {
              if (v) minRiskLevel = v as typeof minRiskLevel;
            }}
          >
            <Select.Trigger class="w-45">
              {riskLevelOptions.find((o) => o.value === minRiskLevel)?.label}
            </Select.Trigger>
            <Select.Content>
              {#each riskLevelOptions as option}
                <Select.Item value={option.value}>{option.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onclick={() => anomalyAlertsQuery.refetch()}
          disabled={anomalyAlertsQuery.isFetching}
        >
          <RefreshCcw class="mr-2 h-4 w-4 {anomalyAlertsQuery.isFetching ? 'animate-spin' : ''}" />
          Refresh
        </Button>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Alerts List -->
  {#if anomalyAlertsQuery.isLoading}
    <div class="space-y-4">
      {#each Array(5) as _}
        <Skeleton class="h-37.5 w-full" />
      {/each}
    </div>
  {:else if anomalyAlertsQuery.error}
    <Card.Root class="border-destructive">
      <Card.Content class="pt-6">
        <div class="flex items-center gap-2 text-destructive">
          <AlertTriangle class="h-5 w-5" />
          <p>Failed to load anomaly alerts</p>
        </div>
      </Card.Content>
    </Card.Root>
  {:else if anomalyAlertsQuery.data?.alerts.length === 0}
    <Card.Root>
      <Card.Content class="py-12 text-center">
        <AlertTriangle class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h3 class="text-lg font-semibold">No Anomalies Found</h3>
        <p class="text-muted-foreground mt-1">
          No unusual transactions detected for this account.
        </p>
      </Card.Content>
    </Card.Root>
  {:else if anomalyAlertsQuery.data}
    <div class="grid gap-4 md:grid-cols-2">
      {#each anomalyAlertsQuery.data.alerts as alert (alert.transactionId)}
        <AnomalyAlertCard
          transactionId={alert.transactionId}
          overallScore={alert.overallScore}
          riskLevel={alert.riskLevel}
          explanation={alert.explanation}
          recommendedActions={alert.recommendedActions}
          dimensions={alert.dimensions}
          onViewTransaction={() => {
            // Navigate to transaction
          }}
        />
      {/each}
    </div>
  {/if}
</div>
