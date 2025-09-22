<script lang="ts">
  import { Progress } from '$lib/components/ui';
  import { Badge } from '$lib/components/ui';
  import { AlertTriangle, CheckCircle, AlertCircle, TrendingUp, TrendingDown } from '@lucide/svelte';
  import { formatCurrency } from '$lib/utils/formatters';

  interface BudgetProgressData {
    allocated: number;
    spent: number;
    remaining: number;
    percentUsed: number;
    isOverBudget: boolean;
    daysInPeriod?: number;
    daysRemaining?: number;
  }

  interface Props {
    budgetName: string;
    budgetType: 'account-monthly' | 'category-envelope' | 'goal-based' | 'scheduled-expense';
    progress: BudgetProgressData;
    enforcementLevel?: 'none' | 'warning' | 'strict';
    showDetails?: boolean;
    showTrend?: boolean;
    size?: 'sm' | 'md' | 'lg';
    class?: string;
  }

  let {
    budgetName,
    budgetType,
    progress,
    enforcementLevel = 'none',
    showDetails = true,
    showTrend = false,
    size = 'md',
    class: className,
  }: Props = $props();

  const progressColor = $derived.by(() => {
    if (progress.isOverBudget) {
      return 'hsl(var(--destructive))';
    } else if (progress.percentUsed >= 90) {
      return 'hsl(var(--warning))';
    } else if (progress.percentUsed >= 75) {
      return 'hsl(var(--orange))';
    } else {
      return 'hsl(var(--primary))';
    }
  });

  const statusIcon = $derived.by(() => {
    if (progress.isOverBudget) {
      return { icon: AlertCircle, color: 'hsl(var(--destructive))' };
    } else if (progress.percentUsed >= 90) {
      return { icon: AlertTriangle, color: 'hsl(var(--warning))' };
    } else {
      return { icon: CheckCircle, color: 'hsl(var(--success))' };
    }
  });

  const burnRate = $derived.by(() => {
    if (!progress.daysInPeriod || !progress.daysRemaining) return null;

    const daysElapsed = progress.daysInPeriod - progress.daysRemaining;
    if (daysElapsed <= 0) return null;

    const expectedSpent = (progress.allocated * daysElapsed) / progress.daysInPeriod;
    const actualSpent = progress.spent;

    return {
      isOnTrack: Math.abs(actualSpent - expectedSpent) <= (progress.allocated * 0.1), // Within 10%
      isOverSpending: actualSpent > expectedSpent,
      percentageDifference: ((actualSpent - expectedSpent) / expectedSpent) * 100,
    };
  });

  const sizeClasses = {
    sm: {
      container: 'p-3 gap-2',
      progress: 'h-1.5',
      title: 'text-sm font-medium',
      amounts: 'text-xs',
      details: 'text-xs',
    },
    md: {
      container: 'p-4 gap-3',
      progress: 'h-2',
      title: 'text-base font-semibold',
      amounts: 'text-sm',
      details: 'text-sm',
    },
    lg: {
      container: 'p-6 gap-4',
      progress: 'h-3',
      title: 'text-lg font-semibold',
      amounts: 'text-base',
      details: 'text-sm',
    },
  };

  function getBudgetTypeLabel(type: typeof budgetType): string {
    switch (type) {
      case 'account-monthly':
        return 'Monthly Budget';
      case 'category-envelope':
        return 'Envelope Budget';
      case 'goal-based':
        return 'Goal Budget';
      case 'scheduled-expense':
        return 'Scheduled Budget';
      default:
        return 'Budget';
    }
  }

  function getEnforcementBadge(level: typeof enforcementLevel) {
    switch (level) {
      case 'strict':
        return { label: 'Strict', variant: 'destructive' as const };
      case 'warning':
        return { label: 'Warning', variant: 'outline' as const };
      case 'none':
        return { label: 'Tracking', variant: 'secondary' as const };
      default:
        return null;
    }
  }
</script>

<div class="border rounded-lg bg-card {sizeClasses[size].container} {className || ''}">
  <!-- Header -->
  <div class="flex items-start justify-between">
    <div class="flex items-center gap-2 min-w-0">
      <statusIcon.icon class="h-4 w-4 flex-shrink-0" style="color: {statusIcon.color}" />
      <div class="min-w-0">
        <h3 class="{sizeClasses[size].title} truncate">{budgetName}</h3>
        <p class="text-muted-foreground text-xs">{getBudgetTypeLabel(budgetType)}</p>
      </div>
    </div>

    {#if enforcementLevel !== 'none'}
      {@const badge = getEnforcementBadge(enforcementLevel)}
      {#if badge}
        <Badge variant={badge.variant} class="text-xs">
          {badge.label}
        </Badge>
      {/if}
    {/if}
  </div>

  <!-- Progress Bar -->
  <div class="space-y-2">
    <Progress
      value={Math.min(progress.percentUsed, 100)}
      class="{sizeClasses[size].progress}"
      style="--progress-foreground: {progressColor}"
    />

    <!-- Amounts -->
    <div class="flex justify-between items-center {sizeClasses[size].amounts}">
      <span class="text-muted-foreground">
        {formatCurrency(progress.spent)} spent
      </span>
      <span class="font-medium">
        {formatCurrency(progress.remaining)} {progress.isOverBudget ? 'over' : 'remaining'}
      </span>
    </div>
  </div>

  <!-- Details -->
  {#if showDetails}
    <div class="space-y-2 {sizeClasses[size].details} text-muted-foreground">
      <div class="flex justify-between">
        <span>Budget:</span>
        <span class="font-medium">{formatCurrency(progress.allocated)}</span>
      </div>

      <div class="flex justify-between">
        <span>Progress:</span>
        <span class="font-medium">{progress.percentUsed.toFixed(1)}%</span>
      </div>

      {#if progress.daysRemaining !== undefined}
        <div class="flex justify-between">
          <span>Days left:</span>
          <span class="font-medium">{progress.daysRemaining}</span>
        </div>
      {/if}

      {#if showTrend && burnRate}
        <div class="flex justify-between items-center">
          <span>Spending trend:</span>
          <div class="flex items-center gap-1">
            {#if burnRate.isOnTrack}
              <CheckCircle class="h-3 w-3 text-success" />
              <span class="text-success">On track</span>
            {:else if burnRate.isOverSpending}
              <TrendingUp class="h-3 w-3 text-destructive" />
              <span class="text-destructive">
                {burnRate.percentageDifference.toFixed(0)}% over
              </span>
            {:else}
              <TrendingDown class="h-3 w-3 text-success" />
              <span class="text-success">
                {Math.abs(burnRate.percentageDifference).toFixed(0)}% under
              </span>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Over-budget warning -->
  {#if progress.isOverBudget && enforcementLevel !== 'none'}
    <div class="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
      <AlertTriangle class="h-4 w-4 text-destructive flex-shrink-0" />
      <span class="text-destructive text-xs font-medium">
        {enforcementLevel === 'strict' ? 'Budget exceeded - transactions blocked' : 'Budget exceeded'}
      </span>
    </div>
  {/if}
</div>