<script lang="ts">
  import { AnomalyAlertCard } from "$lib/components/ml";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Label } from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { ML } from "$lib/query/ml";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import RefreshCcw from "@lucide/svelte/icons/refresh-ccw";
  import Scan from "@lucide/svelte/icons/scan";
  import ShieldAlert from "@lucide/svelte/icons/shield-alert";

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

  const limitOptions = [
    { value: 10, label: "10 Results" },
    { value: 20, label: "20 Results" },
    { value: 50, label: "50 Results" },
    { value: 100, label: "100 Results" },
  ];
</script>

<svelte:head>
  <title>Anomaly Detection - Intelligence - Budget App</title>
  <meta name="description" content="View and manage transaction anomaly alerts" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" href="/intelligence">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div>
        <div class="flex items-center gap-2">
          <ShieldAlert class="text-primary h-6 w-6" />
          <h1 class="text-2xl font-bold tracking-tight">Anomaly Detection</h1>
        </div>
        <p class="text-muted-foreground">
          {anomalyAlertsQuery.data?.total ?? 0} anomalies detected
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
        Scan Recent
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

        <div class="space-y-2">
          <Label>Results</Label>
          <Select.Root
            type="single"
            value={limit.toString()}
            onValueChange={(v) => {
              if (v) limit = parseInt(v);
            }}
          >
            <Select.Trigger class="w-35">
              {limitOptions.find((o) => o.value === limit)?.label}
            </Select.Trigger>
            <Select.Content>
              {#each limitOptions as option}
                <Select.Item value={option.value.toString()}>{option.label}</Select.Item>
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

  <!-- Scan Results Toast -->
  {#if scanAndAlertMutation.isSuccess}
    <Card.Root class="border-green-500/50 bg-green-500/5">
      <Card.Content class="py-4">
        <p class="text-sm">
          Scanned {scanAndAlertMutation.data.transactionsScanned} transactions,
          created {scanAndAlertMutation.data.alertsCreated} new alerts.
        </p>
      </Card.Content>
    </Card.Root>
  {/if}

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
        <Button variant="outline" class="mt-4" onclick={() => anomalyAlertsQuery.refetch()}>
          Try Again
        </Button>
      </Card.Content>
    </Card.Root>
  {:else if anomalyAlertsQuery.data?.alerts.length === 0}
    <Card.Root>
      <Card.Content class="py-12 text-center">
        <AlertTriangle class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h3 class="text-lg font-semibold">No Anomalies Found</h3>
        <p class="text-muted-foreground mt-1">
          No transactions match the current filter criteria.
        </p>
        <Button variant="outline" class="mt-4" onclick={handleScan}>
          Scan for New Anomalies
        </Button>
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
            // TODO: Navigate to transaction details
          }}
          onDismiss={() => {
            // TODO: Implement dismiss functionality
          }}
        />
      {/each}
    </div>
  {/if}
</div>
