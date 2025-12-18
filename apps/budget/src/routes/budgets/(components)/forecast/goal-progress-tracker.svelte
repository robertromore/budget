<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import Progress from '$lib/components/ui/progress/progress.svelte';
import { getBudgetSummaryStats } from '$lib/query/budgets';
import type { BudgetWithRelations } from '$lib/server/domains/budgets';
import { currencyFormatter } from '$lib/utils/formatters';
import {
  Calendar,
  CircleAlert,
  CircleCheck,
  DollarSign,
  Target,
  TrendingDown,
  TrendingUp,
} from '@lucide/svelte/icons';

interface Props {
  budget: BudgetWithRelations;
  className?: string;
}

let { budget, className }: Props = $props();

const isGoalBudget = $derived(budget.type === 'goal-based');

// Fetch budget summary stats to get actual progress
const summaryStatsQuery = $derived.by(() => {
  if (!budget?.id) return null;
  return getBudgetSummaryStats(budget.id).options();
});

// Goal progress data using real analytics
const goalData = $derived.by(() => {
  const goalMetadata = (budget.metadata as any)?.goal;
  if (!goalMetadata) return null;

  const targetAmount = goalMetadata.targetAmount || 10000;
  const summaryStats = summaryStatsQuery ? summaryStatsQuery.data : null;
  const currentAmount = summaryStats?.totalActual ?? 0; // Real progress from analytics
  const percentComplete = Math.min(100, (currentAmount / targetAmount) * 100);

  const targetDate = new Date(
    goalMetadata.targetDate || new Date().setMonth(new Date().getMonth() + 6)
  );
  const startDate = new Date(
    goalMetadata.startDate || new Date().setMonth(new Date().getMonth() - 3)
  );
  const now = new Date();

  const totalDays = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const expectedPercent = (elapsedDays / totalDays) * 100;
  const remainingAmount = targetAmount - currentAmount;

  // Calculate required contributions
  const dailyRequired = daysRemaining > 0 ? remainingAmount / daysRemaining : 0;
  const weeklyRequired = dailyRequired * 7;
  const monthlyRequired = dailyRequired * 30;

  // Determine status
  let status: 'completed' | 'on-track' | 'ahead' | 'behind' | 'at-risk' = 'on-track';
  if (percentComplete >= 100) {
    status = 'completed';
  } else if (daysRemaining <= 0) {
    status = 'at-risk';
  } else if (percentComplete >= expectedPercent + 10) {
    status = 'ahead';
  } else if (percentComplete < expectedPercent - 20) {
    status = 'at-risk';
  } else if (percentComplete < expectedPercent - 10) {
    status = 'behind';
  }

  return {
    targetAmount,
    currentAmount,
    remainingAmount,
    percentComplete,
    targetDate,
    daysRemaining,
    status,
    requiredContribution: {
      daily: dailyRequired,
      weekly: weeklyRequired,
      monthly: monthlyRequired,
    },
  };
});

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-green-600';
    case 'ahead':
      return 'text-blue-600';
    case 'on-track':
      return 'text-green-600';
    case 'behind':
      return 'text-orange-600';
    case 'at-risk':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
}

function getStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'ahead':
      return 'secondary';
    case 'on-track':
      return 'outline';
    case 'behind':
      return 'outline';
    case 'at-risk':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return CircleCheck;
    case 'ahead':
      return TrendingUp;
    case 'on-track':
      return Target;
    case 'behind':
      return TrendingDown;
    case 'at-risk':
      return CircleAlert;
    default:
      return Target;
  }
}
</script>

{#if isGoalBudget && goalData}
  <Card.Root class={className}>
    <Card.Header>
      <div class="flex items-center justify-between">
        <div>
          <Card.Title class="flex items-center gap-2">
            <Target class="h-5 w-5" />
            Goal Progress
          </Card.Title>
          <Card.Description>{budget.name}</Card.Description>
        </div>
        {#if goalData.status === 'completed'}
          <Badge variant={getStatusBadgeVariant(goalData.status)} class="flex items-center gap-1">
            <CircleCheck class="h-3 w-3" />
            Completed
          </Badge>
        {:else if goalData.status === 'ahead'}
          <Badge variant={getStatusBadgeVariant(goalData.status)} class="flex items-center gap-1">
            <TrendingUp class="h-3 w-3" />
            Ahead of Schedule
          </Badge>
        {:else if goalData.status === 'behind'}
          <Badge variant={getStatusBadgeVariant(goalData.status)} class="flex items-center gap-1">
            <TrendingDown class="h-3 w-3" />
            Behind Schedule
          </Badge>
        {:else if goalData.status === 'at-risk'}
          <Badge variant={getStatusBadgeVariant(goalData.status)} class="flex items-center gap-1">
            <CircleAlert class="h-3 w-3" />
            At Risk
          </Badge>
        {:else}
          <Badge variant={getStatusBadgeVariant(goalData.status)} class="flex items-center gap-1">
            <Target class="h-3 w-3" />
            On Track
          </Badge>
        {/if}
      </div>
    </Card.Header>

    <Card.Content class="space-y-6">
      <!-- Progress Bar -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Progress</span>
          <span class="font-medium">{goalData.percentComplete.toFixed(1)}%</span>
        </div>
        <Progress value={goalData.percentComplete} class="h-3" />
        <div class="text-muted-foreground flex items-center justify-between text-xs">
          <span>{currencyFormatter.format(goalData.currentAmount)}</span>
          <span>{currencyFormatter.format(goalData.targetAmount)}</span>
        </div>
      </div>

      <!-- Key Metrics Grid -->
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <div class="text-muted-foreground flex items-center gap-1 text-sm">
            <DollarSign class="h-3 w-3" />
            <span>Remaining</span>
          </div>
          <div class="text-2xl font-bold {getStatusColor(goalData.status)}">
            {currencyFormatter.format(goalData.remainingAmount)}
          </div>
        </div>

        <div class="space-y-1">
          <div class="text-muted-foreground flex items-center gap-1 text-sm">
            <Calendar class="h-3 w-3" />
            <span>Days Left</span>
          </div>
          <div class="text-2xl font-bold {getStatusColor(goalData.status)}">
            {Math.max(0, goalData.daysRemaining)}
          </div>
        </div>
      </div>

      <!-- Required Contributions -->
      <div class="space-y-3 border-t pt-4">
        <h4 class="text-sm font-medium">Required Contributions</h4>
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-muted/30 rounded-lg border p-3">
            <div class="text-muted-foreground mb-1 text-xs">Daily</div>
            <div class="text-lg font-bold">
              {currencyFormatter.format(goalData.requiredContribution.daily)}
            </div>
          </div>
          <div class="bg-muted/30 rounded-lg border p-3">
            <div class="text-muted-foreground mb-1 text-xs">Weekly</div>
            <div class="text-lg font-bold">
              {currencyFormatter.format(goalData.requiredContribution.weekly)}
            </div>
          </div>
          <div class="bg-muted/30 rounded-lg border p-3">
            <div class="text-muted-foreground mb-1 text-xs">Monthly</div>
            <div class="text-lg font-bold">
              {currencyFormatter.format(goalData.requiredContribution.monthly)}
            </div>
          </div>
        </div>
      </div>

      <!-- Target Date -->
      <div class="flex items-center justify-between border-t pt-4">
        <div class="space-y-1">
          <div class="text-muted-foreground text-sm">Target Date</div>
          <div class="text-lg font-medium">
            {goalData.targetDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
        <Button variant="outline" size="sm">
          <DollarSign class="mr-2 h-4 w-4" />
          Contribute
        </Button>
      </div>

      <!-- Status Messages -->
      {#if goalData.status === 'completed'}
        <div
          class="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
          <div class="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CircleCheck class="h-4 w-4" />
            <span class="text-sm font-medium">Goal Completed!</span>
          </div>
          <p class="text-muted-foreground mt-1 text-sm">
            Congratulations! You've reached your target amount.
          </p>
        </div>
      {:else if goalData.status === 'at-risk'}
        <div class="bg-destructive/10 border-destructive/20 rounded-lg border p-3">
          <div class="text-destructive flex items-center gap-2">
            <CircleAlert class="h-4 w-4" />
            <span class="text-sm font-medium">Goal at Risk</span>
          </div>
          <p class="text-muted-foreground mt-1 text-sm">
            {#if goalData.daysRemaining <= 0}
              Target date has passed. Consider extending your timeline or adjusting the goal amount.
            {:else}
              You're behind schedule. Increase contributions to stay on track.
            {/if}
          </p>
        </div>
      {:else if goalData.status === 'ahead'}
        <div
          class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <div class="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <TrendingUp class="h-4 w-4" />
            <span class="text-sm font-medium">Ahead of Schedule</span>
          </div>
          <p class="text-muted-foreground mt-1 text-sm">
            Great progress! You're on track to reach your goal earlier than planned.
          </p>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
{:else if isGoalBudget}
  <Card.Root class={className}>
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <Target class="h-5 w-5" />
        Goal Progress
      </Card.Title>
    </Card.Header>
    <Card.Content>
      <p class="text-muted-foreground py-8 text-center">
        Configure goal settings to track your progress
      </p>
    </Card.Content>
  </Card.Root>
{/if}
