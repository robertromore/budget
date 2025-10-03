<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import ChartPlaceholder from "$lib/components/ui/chart-placeholder.svelte";
  import {TrendingDown, Target, AlertTriangle} from "@lucide/svelte/icons";
  import {currencyFormatter} from "$lib/utils/formatters";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";

  interface Props {
    budget: BudgetWithRelations;
    className?: string;
  }

  let {budget, className}: Props = $props();

  const allocatedAmount = $derived((budget.metadata as Record<string, unknown>)?.['allocatedAmount'] as number ?? 0);

  // Placeholder values for metrics (would be calculated from actual data)
  const currentRemaining = $derived(allocatedAmount * 0.65); // Example: 65% remaining
  const projectedEndBalance = $derived(allocatedAmount * 0.15); // Example: 15% projected end balance
  const burnRate = $derived(allocatedAmount * 0.05); // Example: 5% daily burn rate

  const status = $derived.by(() => {
    if (projectedEndBalance < 0) return 'danger';
    if (projectedEndBalance < allocatedAmount * 0.1) return 'warning';
    return 'good';
  });

  const statusColor = $derived.by(() => {
    switch (status) {
      case 'danger': return 'text-destructive';
      case 'warning': return 'text-orange-600';
      default: return 'text-green-600';
    }
  });
</script>

<Card.Root class={className}>
  <Card.Header>
    <div class="flex items-center justify-between">
      <div>
        <Card.Title class="flex items-center gap-2">
          <TrendingDown class="h-5 w-5" />
          Budget Burn-Down
        </Card.Title>
        <Card.Description>Actual vs planned budget consumption</Card.Description>
      </div>
      <div class="text-right">
        <div class="text-2xl font-bold {statusColor}">
          {currencyFormatter.format(currentRemaining ?? 0)}
        </div>
        <div class="text-sm text-muted-foreground">Remaining</div>
      </div>
    </div>
  </Card.Header>
  <Card.Content class="space-y-4">
    <!-- Chart -->
    <ChartPlaceholder class="h-[300px]" title="Budget Burn-Down Chart" />

    <!-- Metrics -->
    <div class="grid grid-cols-3 gap-4 pt-4 border-t">
      <div class="space-y-1">
        <div class="flex items-center gap-1 text-sm text-muted-foreground">
          <Target class="h-3 w-3" />
          <span>Allocated</span>
        </div>
        <div class="text-lg font-bold">{currencyFormatter.format(allocatedAmount)}</div>
      </div>

      <div class="space-y-1">
        <div class="flex items-center gap-1 text-sm text-muted-foreground">
          <TrendingDown class="h-3 w-3" />
          <span>Daily Burn Rate</span>
        </div>
        <div class="text-lg font-bold">{currencyFormatter.format(burnRate)}</div>
      </div>

      <div class="space-y-1">
        <div class="flex items-center gap-1 text-sm text-muted-foreground">
          {#if status === 'danger'}
            <AlertTriangle class="h-3 w-3 text-destructive" />
          {:else if status === 'warning'}
            <AlertTriangle class="h-3 w-3 text-orange-600" />
          {:else}
            <Target class="h-3 w-3 text-green-600" />
          {/if}
          <span>Projected End</span>
        </div>
        <div class="text-lg font-bold {statusColor}">
          {currencyFormatter.format(Math.abs(projectedEndBalance))}
        </div>
      </div>
    </div>

    <!-- Status Alert -->
    {#if status === 'danger'}
      <div class="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
        <div class="flex items-center gap-2 text-destructive">
          <AlertTriangle class="h-4 w-4" />
          <span class="text-sm font-medium">Budget is projected to be exceeded</span>
        </div>
        <p class="text-sm text-muted-foreground mt-1">
          At current burn rate, you'll exceed the budget by {currencyFormatter.format(Math.abs(projectedEndBalance))}
        </p>
      </div>
    {:else if status === 'warning'}
      <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 dark:bg-orange-950 dark:border-orange-800">
        <div class="flex items-center gap-2 text-orange-700 dark:text-orange-300">
          <AlertTriangle class="h-4 w-4" />
          <span class="text-sm font-medium">Budget is running tight</span>
        </div>
        <p class="text-sm text-muted-foreground mt-1">
          Only {currencyFormatter.format(projectedEndBalance)} projected to remain at period end
        </p>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
