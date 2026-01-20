<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { cn, formatCurrency } from "$lib/utils";
  import { formatPercentRaw } from "$lib/utils/formatters";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import DollarSign from "@lucide/svelte/icons/dollar-sign";
  import Minus from "@lucide/svelte/icons/minus";
  import TrendingDown from "@lucide/svelte/icons/trending-down";
  import TrendingUp from "@lucide/svelte/icons/trending-up";

  type TrendDirection = "increasing" | "decreasing" | "stable";

  interface Props {
    thisMonthIncome?: number;
    thisMonthExpenses?: number;
    lastMonthIncome?: number;
    lastMonthExpenses?: number;
    incomeTrend?: TrendDirection;
    expenseTrend?: TrendDirection;
    savingsRate?: number;
    onViewDetails?: () => void;
    class?: string;
  }

  let {
    thisMonthIncome = 0,
    thisMonthExpenses = 0,
    lastMonthIncome = 0,
    lastMonthExpenses = 0,
    incomeTrend = "stable",
    expenseTrend = "stable",
    savingsRate = 0,
    onViewDetails,
    class: className,
  }: Props = $props();

  const netThisMonth = $derived(thisMonthIncome - thisMonthExpenses);
  const netLastMonth = $derived(lastMonthIncome - lastMonthExpenses);

  const incomeChange = $derived(
    lastMonthIncome > 0
      ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100
      : 0
  );

  const expenseChange = $derived(
    lastMonthExpenses > 0
      ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
      : 0
  );

  const trendConfig = {
    increasing: {
      icon: TrendingUp,
      color: "text-green-500",
      expenseColor: "text-red-500", // For expenses, increasing is bad
      label: "Up",
    },
    decreasing: {
      icon: TrendingDown,
      color: "text-red-500",
      expenseColor: "text-green-500", // For expenses, decreasing is good
      label: "Down",
    },
    stable: {
      icon: Minus,
      color: "text-muted-foreground",
      expenseColor: "text-muted-foreground",
      label: "Stable",
    },
  };

  const incomeCfg = $derived(trendConfig[incomeTrend]);
  const expenseCfg = $derived(trendConfig[expenseTrend]);
</script>

<Card.Root class={cn("", className)}>
  <Card.Header class="pb-2">
    <div class="flex items-center justify-between">
      <Card.Title class="flex items-center gap-2 text-sm font-medium">
        <DollarSign class="h-4 w-4" />
        Income vs Expenses
      </Card.Title>
      {#if savingsRate > 0}
        <Badge variant="outline" class="text-green-500">
          {formatPercentRaw(savingsRate, 0)} saved
        </Badge>
      {:else if savingsRate < 0}
        <Badge variant="outline" class="text-red-500">
          {formatPercentRaw(Math.abs(savingsRate), 0)} over
        </Badge>
      {/if}
    </div>
    <Card.Description>This month compared to last</Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    <!-- Net Savings -->
    <div class="space-y-1">
      <p class="text-muted-foreground text-xs">Net This Month</p>
      <div class="flex items-baseline gap-2">
        <span
          class={cn("text-2xl font-bold", {
            "text-green-500": netThisMonth > 0,
            "text-red-500": netThisMonth < 0,
          })}
        >
          {netThisMonth >= 0 ? "+" : ""}{formatCurrency(netThisMonth)}
        </span>
        {#if netLastMonth !== 0}
          {@const netChange = netThisMonth - netLastMonth}
          <span
            class={cn("flex items-center text-sm", {
              "text-green-500": netChange > 0,
              "text-red-500": netChange < 0,
            })}
          >
            {#if netChange > 0}
              <ArrowUp class="h-3 w-3" />
            {:else if netChange < 0}
              <ArrowDown class="h-3 w-3" />
            {/if}
            {formatCurrency(Math.abs(netChange))}
          </span>
        {/if}
      </div>
    </div>

    <!-- Income & Expense Grid -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Income -->
      <div class="space-y-2 rounded-lg border p-3">
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground text-xs">Income</span>
          <Badge variant="secondary" class={cn("h-5 px-1", incomeCfg.color)}>
            <incomeCfg.icon class="h-3 w-3" />
          </Badge>
        </div>
        <p class="text-lg font-semibold text-green-600">
          {formatCurrency(thisMonthIncome)}
        </p>
        {#if incomeChange !== 0}
          <p
            class={cn("text-xs", {
              "text-green-500": incomeChange > 0,
              "text-red-500": incomeChange < 0,
            })}
          >
            {incomeChange > 0 ? "+" : ""}{formatPercentRaw(incomeChange, 1)} from last month
          </p>
        {/if}
      </div>

      <!-- Expenses -->
      <div class="space-y-2 rounded-lg border p-3">
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground text-xs">Expenses</span>
          <Badge variant="secondary" class={cn("h-5 px-1", expenseCfg.expenseColor)}>
            <expenseCfg.icon class="h-3 w-3" />
          </Badge>
        </div>
        <p class="text-lg font-semibold text-red-600">
          {formatCurrency(thisMonthExpenses)}
        </p>
        {#if expenseChange !== 0}
          <p
            class={cn("text-xs", {
              "text-red-500": expenseChange > 0,
              "text-green-500": expenseChange < 0,
            })}
          >
            {expenseChange > 0 ? "+" : ""}{formatPercentRaw(expenseChange, 1)} from last month
          </p>
        {/if}
      </div>
    </div>

    <!-- Last Month Comparison -->
    <div class="text-muted-foreground border-t pt-3 text-xs">
      <p>
        Last month: {formatCurrency(lastMonthIncome)} income, {formatCurrency(lastMonthExpenses)} expenses
      </p>
    </div>

    {#if onViewDetails}
      <Button variant="ghost" size="sm" class="w-full" onclick={onViewDetails}>
        View Breakdown
        <ChevronRight class="ml-1 h-4 w-4" />
      </Button>
    {/if}
  </Card.Content>
</Card.Root>
