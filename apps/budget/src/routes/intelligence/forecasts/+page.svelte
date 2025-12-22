<script lang="ts">
  import { ForecastSummaryCard } from "$lib/components/ml";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Label } from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { ML } from "$lib/query/ml";
  import { formatCurrency } from "$lib/utils";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import RefreshCcw from "@lucide/svelte/icons/refresh-ccw";
  import TrendingUp from "@lucide/svelte/icons/trending-up";

  // Filter state
  let horizon = $state(30);
  let granularity = $state<"daily" | "weekly" | "monthly">("monthly");

  // Queries - use $derived for reactive filter updates
  const forecastQuery = $derived(ML.getCashFlowForecast({ horizon, granularity }).options());

  const horizonOptions = [
    { value: 7, label: "7 Days" },
    { value: 14, label: "14 Days" },
    { value: 30, label: "30 Days" },
    { value: 60, label: "60 Days" },
    { value: 90, label: "90 Days" },
  ];

  const granularityOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];
</script>

<svelte:head>
  <title>Forecasts - Intelligence - Budget App</title>
  <meta name="description" content="Cash flow and spending forecasts" />
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
          <TrendingUp class="text-primary h-6 w-6" />
          <h1 class="text-2xl font-bold tracking-tight">Forecasts</h1>
        </div>
        <p class="text-muted-foreground">Cash flow predictions and spending projections</p>
      </div>
    </div>
  </div>

  <!-- Filters -->
  <Card.Root>
    <Card.Content class="pt-6">
      <div class="flex flex-wrap items-end gap-4">
        <div class="space-y-2">
          <Label>Forecast Horizon</Label>
          <Select.Root
            type="single"
            value={horizon.toString()}
            onValueChange={(v) => {
              if (v) horizon = parseInt(v);
            }}
          >
            <Select.Trigger class="w-[140px]">
              {horizonOptions.find((o) => o.value === horizon)?.label}
            </Select.Trigger>
            <Select.Content>
              {#each horizonOptions as option}
                <Select.Item value={option.value.toString()}>{option.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label>Granularity</Label>
          <Select.Root
            type="single"
            value={granularity}
            onValueChange={(v) => {
              if (v) granularity = v as typeof granularity;
            }}
          >
            <Select.Trigger class="w-[140px]">
              {granularityOptions.find((o) => o.value === granularity)?.label}
            </Select.Trigger>
            <Select.Content>
              {#each granularityOptions as option}
                <Select.Item value={option.value}>{option.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onclick={() => forecastQuery.refetch()}
          disabled={forecastQuery.isFetching}
        >
          <RefreshCcw class="mr-2 h-4 w-4 {forecastQuery.isFetching ? 'animate-spin' : ''}" />
          Refresh
        </Button>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Forecast Content -->
  {#if forecastQuery.isLoading}
    <div class="grid gap-6 lg:grid-cols-2">
      <Skeleton class="h-[300px] w-full" />
      <Skeleton class="h-[300px] w-full" />
    </div>
  {:else if forecastQuery.error}
    <Card.Root class="border-destructive">
      <Card.Content class="pt-6">
        <p class="text-muted-foreground">Unable to load forecast data</p>
        <Button variant="outline" class="mt-4" onclick={() => forecastQuery.refetch()}>
          Try Again
        </Button>
      </Card.Content>
    </Card.Root>
  {:else if forecastQuery.data}
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Main Cash Flow Summary -->
      <ForecastSummaryCard
        title="Net Cash Flow"
        predictions={forecastQuery.data.predictions}
        confidence={forecastQuery.data.confidence}
        {granularity}
      />

      <!-- Income vs Expenses -->
      <div class="grid gap-4">
        <Card.Root>
          <Card.Header class="pb-2">
            <Card.Title class="flex items-center gap-2 text-sm font-medium">
              <ArrowUp class="h-4 w-4 text-green-500" />
              Projected Income
            </Card.Title>
          </Card.Header>
          <Card.Content>
            {#if forecastQuery.data.incomePredictions?.length > 0}
              {@const totalIncome = forecastQuery.data.incomePredictions.reduce(
                (sum, p) => sum + p.value,
                0
              )}
              <p class="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </p>
              <p class="text-muted-foreground text-xs">
                Over next {horizon} days
              </p>
            {:else}
              <p class="text-muted-foreground">No income predictions available</p>
            {/if}
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header class="pb-2">
            <Card.Title class="flex items-center gap-2 text-sm font-medium">
              <ArrowDown class="h-4 w-4 text-red-500" />
              Projected Expenses
            </Card.Title>
          </Card.Header>
          <Card.Content>
            {#if forecastQuery.data.expensePredictions?.length > 0}
              {@const totalExpenses = forecastQuery.data.expensePredictions.reduce(
                (sum, p) => sum + Math.abs(p.value),
                0
              )}
              <p class="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </p>
              <p class="text-muted-foreground text-xs">
                Over next {horizon} days
              </p>
            {:else}
              <p class="text-muted-foreground">No expense predictions available</p>
            {/if}
          </Card.Content>
        </Card.Root>
      </div>
    </div>

    <!-- Predictions Table -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Detailed Predictions</Card.Title>
        <Card.Description>
          Day-by-day cash flow predictions with confidence intervals
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b">
                <th class="py-2 text-left font-medium">Date</th>
                <th class="py-2 text-right font-medium">Predicted</th>
                <th class="py-2 text-right font-medium">Lower Bound</th>
                <th class="py-2 text-right font-medium">Upper Bound</th>
                <th class="py-2 text-right font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {#each forecastQuery.data.predictions.slice(0, 10) as prediction}
                <tr class="border-b last:border-0">
                  <td class="py-2">
                    {new Date(prediction.date).toLocaleDateString()}
                  </td>
                  <td class="py-2 text-right font-medium">
                    {formatCurrency(prediction.value)}
                  </td>
                  <td class="text-muted-foreground py-2 text-right">
                    {formatCurrency(prediction.lowerBound)}
                  </td>
                  <td class="text-muted-foreground py-2 text-right">
                    {formatCurrency(prediction.upperBound)}
                  </td>
                  <td class="py-2 text-right">
                    {(prediction.confidence * 100).toFixed(0)}%
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Forecast Metrics -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Model Performance</Card.Title>
        <Card.Description>Accuracy metrics for the forecast model</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="space-y-1">
            <p class="text-muted-foreground text-xs">Mean Absolute Error (MAE)</p>
            <p class="text-lg font-semibold">
              {formatCurrency(forecastQuery.data.metrics.mae)}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-muted-foreground text-xs">Root Mean Square Error (RMSE)</p>
            <p class="text-lg font-semibold">
              {formatCurrency(forecastQuery.data.metrics.rmse)}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-muted-foreground text-xs">Mean Absolute % Error (MAPE)</p>
            <p class="text-lg font-semibold">
              {(forecastQuery.data.metrics.mape * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
