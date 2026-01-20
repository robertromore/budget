<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import * as Card from "$lib/components/ui/card";
  import { cn, formatCurrency, formatPercent, formatPercentRaw } from "$lib/utils";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import Minus from "@lucide/svelte/icons/minus";
  import TrendingDown from "@lucide/svelte/icons/trending-down";
  import TrendingUp from "@lucide/svelte/icons/trending-up";

  interface Prediction {
    date: string;
    value: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
  }

  interface Props {
    title?: string;
    predictions: Prediction[];
    currentValue?: number;
    granularity?: "daily" | "weekly" | "monthly";
    confidence?: number;
    class?: string;
  }

  let {
    title = "Cash Flow Forecast",
    predictions,
    currentValue,
    granularity = "monthly",
    confidence,
    class: className,
  }: Props = $props();

  // Calculate totals and trends using $derived.by for complex calculation
  const totals = $derived.by(() => {
    if (!predictions || predictions.length === 0) return null;

    const netChange = predictions.reduce((sum, p) => sum + p.value, 0);
    const avgValue = netChange / predictions.length;
    const firstValue = predictions[0]?.value ?? 0;
    const lastValue = predictions[predictions.length - 1]?.value ?? 0;

    // Calculate projected ending balance if currentValue is provided
    const projectedBalance = currentValue !== undefined ? currentValue + netChange : null;

    // Calculate trend based on the overall direction of net change
    let trend: "up" | "down" | "stable" = "stable";
    if (netChange > 100) trend = "up";
    else if (netChange < -100) trend = "down";

    // Calculate percent change from current value
    const percentChange = currentValue && currentValue !== 0
      ? (netChange / Math.abs(currentValue)) * 100
      : 0;

    // Calculate confidence range totals
    const totalLower = predictions.reduce((sum, p) => sum + p.lowerBound, 0);
    const totalUpper = predictions.reduce((sum, p) => sum + p.upperBound, 0);

    return {
      netChange,
      projectedBalance,
      avgValue,
      trend,
      percentChange,
      totalLower,
      totalUpper,
    };
  });

  const trendConfig = {
    up: {
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      label: "Increasing",
    },
    down: {
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      label: "Decreasing",
    },
    stable: {
      icon: Minus,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      label: "Stable",
    },
  };

  const config = $derived(totals ? trendConfig[totals.trend] : trendConfig.stable);

  const periodLabel = $derived(
    granularity === "daily" ? "day" : granularity === "weekly" ? "week" : "month"
  );
</script>

<Card.Root class={cn("", className)}>
  <Card.Header class="pb-2">
    <div class="flex items-center justify-between">
      <Card.Title class="text-sm font-medium">{title}</Card.Title>
      {#if totals}
        <Badge variant="outline" class={cn("gap-1", config.color)}>
          <config.icon class="h-3 w-3" />
          {config.label}
        </Badge>
      {/if}
    </div>
    {#if predictions && predictions.length > 0}
      <Card.Description>
        Next {predictions.length} {periodLabel}{predictions.length > 1 ? "s" : ""}
      </Card.Description>
    {/if}
  </Card.Header>

  <Card.Content class="space-y-4">
    {#if totals}
      <!-- Main Value - Projected Balance or Net Change -->
      <div class="space-y-1">
        {#if totals.projectedBalance !== null}
          <p class="text-muted-foreground text-xs">Projected Balance</p>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold">
              {formatCurrency(totals.projectedBalance)}
            </span>
            {#if totals.percentChange !== 0}
              <span
                class={cn("flex items-center text-sm font-medium", {
                  "text-green-500": totals.percentChange > 0,
                  "text-red-500": totals.percentChange < 0,
                })}
              >
                {#if totals.percentChange > 0}
                  <ArrowUp class="h-3 w-3" />
                {:else}
                  <ArrowDown class="h-3 w-3" />
                {/if}
                {formatPercentRaw(Math.abs(totals.percentChange), 1)}
              </span>
            {/if}
          </div>
        {:else}
          <p class="text-muted-foreground text-xs">Net Cash Flow</p>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold">
              {formatCurrency(totals.netChange)}
            </span>
          </div>
        {/if}
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 gap-4 text-sm">
        {#if currentValue !== undefined}
          <div class="space-y-0.5">
            <p class="text-muted-foreground text-xs">Current Balance</p>
            <p class="font-medium">{formatCurrency(currentValue)}</p>
          </div>
        {/if}

        <div class="space-y-0.5">
          <p class="text-muted-foreground text-xs">Net Change</p>
          <p class={cn("font-medium", {
            "text-green-600": totals.netChange > 0,
            "text-red-600": totals.netChange < 0,
          })}>
            {totals.netChange >= 0 ? "+" : ""}{formatCurrency(totals.netChange)}
          </p>
        </div>

        <div class="space-y-0.5">
          <p class="text-muted-foreground text-xs">Avg per {periodLabel}</p>
          <p class="font-medium">{formatCurrency(totals.avgValue)}</p>
        </div>

        {#if confidence !== undefined}
          <div class="space-y-0.5">
            <p class="text-muted-foreground text-xs">Confidence</p>
            <p class="font-medium">{formatPercent(confidence)}</p>
          </div>
        {/if}
      </div>

      <!-- Confidence Range -->
      {#if totals.totalLower !== 0 || totals.totalUpper !== 0}
        <div class="border-t pt-3">
          <p class="text-muted-foreground text-xs mb-1">Confidence Range</p>
          <p class="text-sm">
            {formatCurrency((currentValue ?? 0) + totals.totalLower)} to {formatCurrency((currentValue ?? 0) + totals.totalUpper)}
          </p>
        </div>
      {/if}
    {:else}
      <p class="text-muted-foreground text-center text-sm">No forecast data available</p>
    {/if}
  </Card.Content>
</Card.Root>
