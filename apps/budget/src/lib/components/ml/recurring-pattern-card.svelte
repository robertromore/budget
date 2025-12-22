<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { cn, formatCurrency } from "$lib/utils";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import Calendar from "@lucide/svelte/icons/calendar";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Clock from "@lucide/svelte/icons/clock";
  import CreditCard from "@lucide/svelte/icons/credit-card";
  import Repeat from "@lucide/svelte/icons/repeat";
  import TrendingUp from "@lucide/svelte/icons/trending-up";

  type Frequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "irregular";

  interface RecurringPatternMatch {
    transactionId: number;
    date: string;
    amount: number;
  }

  // Matches backend RecurringPattern type
  interface RecurringPattern {
    patternId: string;
    payeeId: number;
    payeeName: string;
    categoryId?: number;
    categoryName?: string;
    accountId: number;
    frequency: Frequency;
    interval: number;
    averageAmount: number;
    amountStdDev: number;
    amountMin: number;
    amountMax: number;
    amountType: "exact" | "approximate" | "range";
    typicalDayOfMonth?: number;
    typicalDayOfWeek?: number;
    lastOccurrence: string;
    nextPredicted: string;
    matchingTransactions: RecurringPatternMatch[];
    occurrenceCount: number;
    firstOccurrence: string;
    consistencyScore: number;
    isActive: boolean;
    confidence: number;
  }

  // Matches backend RecurringDetectionSummary type
  interface PatternSummary {
    total: number;
    byFrequency: Record<Frequency, number>;
    highConfidence: number;
    totalMonthlyValue: number;
    subscriptions: number;
    bills: number;
    income: number;
  }

  interface Props {
    summary?: PatternSummary | null;
    topPatterns?: RecurringPattern[];
    inactivePatterns?: RecurringPattern[];
    subscriptions?: RecurringPattern[];
    onViewAll?: () => void;
    onCreateSchedule?: (patternId: string) => void;
    class?: string;
  }

  let {
    summary = null,
    topPatterns = [],
    inactivePatterns = [],
    subscriptions = [],
    onViewAll,
    onCreateSchedule,
    class: className,
  }: Props = $props();

  // Compute monthly income and expenses from patterns
  const monthlyIncome = $derived(
    topPatterns
      .filter(p => p.averageAmount > 0)
      .reduce((sum, p) => sum + p.averageAmount * (30 / p.interval), 0)
  );

  const monthlyExpenses = $derived(
    topPatterns
      .filter(p => p.averageAmount < 0)
      .reduce((sum, p) => sum + Math.abs(p.averageAmount) * (30 / p.interval), 0)
  );

  const frequencyLabels: Record<Frequency, string> = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    irregular: "Irregular",
  };

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return "text-green-500";
    if (confidence >= 0.6) return "text-yellow-500";
    return "text-orange-500";
  }

  const displayPatterns = $derived(
    topPatterns.length > 0 ? topPatterns.slice(0, 4) : []
  );

  const hasInactive = $derived(inactivePatterns.length > 0);
</script>

<Card.Root class={cn("", className)}>
  <Card.Header class="pb-2">
    <div class="flex items-center justify-between">
      <Card.Title class="flex items-center gap-2 text-sm font-medium">
        <Repeat class="h-4 w-4" />
        Recurring Transactions
      </Card.Title>
      {#if summary && summary.total > 0}
        <Badge variant="outline">
          {summary.total} detected
        </Badge>
      {/if}
    </div>
    <Card.Description>
      Automatically detected bills and subscriptions
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    {#if summary && summary.total > 0}
      <!-- Monthly Summary -->
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1 rounded-lg border p-3">
          <p class="text-muted-foreground text-xs">Monthly Income</p>
          <p class="text-lg font-semibold text-green-600">
            {formatCurrency(monthlyIncome)}
          </p>
        </div>
        <div class="space-y-1 rounded-lg border p-3">
          <p class="text-muted-foreground text-xs">Monthly Expenses</p>
          <p class="text-lg font-semibold text-red-600">
            {formatCurrency(monthlyExpenses)}
          </p>
        </div>
      </div>

      <!-- Inactive Warning -->
      {#if hasInactive}
        <div class="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
          <AlertTriangle class="h-4 w-4 text-yellow-500" />
          <div class="flex-1">
            <p class="text-sm font-medium">
              {inactivePatterns.length} potentially missed
            </p>
            <p class="text-muted-foreground text-xs">
              Expected transactions not seen recently
            </p>
          </div>
        </div>
      {/if}

      <!-- Top Patterns -->
      {#if displayPatterns.length > 0}
        <div class="space-y-2">
          <p class="text-muted-foreground text-xs">Top Recurring</p>
          {#each displayPatterns as pattern}
            <div class="flex items-center justify-between gap-2 rounded-lg border p-2">
              <div class="flex items-center gap-2 overflow-hidden">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  {#if pattern.averageAmount >= 0}
                    <TrendingUp class="h-4 w-4 text-green-500" />
                  {:else}
                    <CreditCard class="h-4 w-4 text-red-500" />
                  {/if}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{pattern.payeeName}</p>
                  <div class="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{frequencyLabels[pattern.frequency]}</span>
                    {#if !pattern.isActive}
                      <Badge variant="secondary" class="h-4 px-1 text-[10px] text-yellow-500">
                        Inactive
                      </Badge>
                    {/if}
                  </div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <p class={cn("text-sm font-semibold", {
                  "text-green-600": pattern.averageAmount >= 0,
                  "text-red-600": pattern.averageAmount < 0,
                })}>
                  {formatCurrency(pattern.averageAmount)}
                </p>
                <p class={cn("text-xs", getConfidenceColor(pattern.confidence))}>
                  {(pattern.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Subscriptions Count -->
      {#if subscriptions.length > 0}
        <div class="flex items-center justify-between rounded-lg border p-3">
          <div class="flex items-center gap-2">
            <Clock class="h-4 w-4 text-muted-foreground" />
            <span class="text-sm">{subscriptions.length} subscriptions detected</span>
          </div>
          <p class="text-sm font-medium text-red-600">
            {formatCurrency(subscriptions.reduce((sum, s) => sum + Math.abs(s.averageAmount) * (30 / s.interval), 0))}/mo
          </p>
        </div>
      {/if}
    {:else}
      <!-- No Patterns -->
      <div class="py-4 text-center">
        <Calendar class="text-muted-foreground mx-auto h-8 w-8" />
        <p class="mt-2 text-sm font-medium">No recurring patterns detected</p>
        <p class="text-muted-foreground text-xs">
          Add more transactions to detect patterns
        </p>
      </div>
    {/if}

    {#if onViewAll && summary && summary.total > 0}
      <Button variant="ghost" size="sm" class="w-full" onclick={onViewAll}>
        View All Patterns
        <ChevronRight class="ml-1 h-4 w-4" />
      </Button>
    {/if}
  </Card.Content>
</Card.Root>
