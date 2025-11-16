<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  TriangleAlert,
  CircleCheck,
  CircleX,
  Info,
  Sparkles,
  Calendar,
  Target,
  Wallet,
  Repeat,
} from '@lucide/svelte/icons';
import type { BudgetRecommendationWithRelations } from '$lib/schema/recommendations';
import {
  applyRecommendation,
  dismissRecommendation,
  restoreRecommendation,
} from '$lib/query/budgets';
import { formatCurrency } from '$lib/utils/formatters';

interface Props {
  recommendation: BudgetRecommendationWithRelations;
}

let { recommendation }: Props = $props();

const applyMutation = applyRecommendation.options();
const dismissMutation = dismissRecommendation.options();
const restoreMutation = restoreRecommendation.options();

const isProcessing = $derived(
  applyMutation.isPending || dismissMutation.isPending || restoreMutation.isPending
);

const priorityColor = $derived.by(() => {
  switch (recommendation.priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'default';
  }
});

const confidenceColor = $derived.by(() => {
  if (recommendation.confidence >= 80) return 'text-green-600';
  if (recommendation.confidence >= 60) return 'text-blue-600';
  if (recommendation.confidence >= 40) return 'text-yellow-600';
  return 'text-muted-foreground';
});

function handleApply() {
  applyMutation.mutate(recommendation.id);
}

function handleDismiss() {
  dismissMutation.mutate(recommendation.id);
}

function handleRestore() {
  restoreMutation.mutate(recommendation.id);
}

// Get icon and badge based on suggested budget type
const budgetTypeInfo = $derived.by(() => {
  const suggestedType = recommendation.metadata?.suggestedType || 'category-envelope';
  switch (suggestedType) {
    case 'scheduled-expense':
      return {
        icon: Calendar,
        label: 'Scheduled Expense',
        color: 'bg-purple-100 text-purple-700',
        iconColor: 'text-purple-600',
      };
    case 'goal-based':
      return {
        icon: Target,
        label: 'Goal-Based',
        color: 'bg-blue-100 text-blue-700',
        iconColor: 'text-blue-600',
      };
    case 'account-monthly':
      return {
        icon: Wallet,
        label: 'Account Monthly',
        color: 'bg-orange-100 text-orange-700',
        iconColor: 'text-orange-600',
      };
    case 'category-envelope':
    default:
      return {
        icon: Repeat,
        label: 'Category Envelope',
        color: 'bg-green-100 text-green-700',
        iconColor: 'text-green-600',
      };
  }
});

const isDismissed = $derived(recommendation.status === 'dismissed');
</script>

<Card.Root class="overflow-hidden {isDismissed ? 'opacity-50' : ''}">
  <Card.Header class="pb-3">
    <div class="flex items-start justify-between gap-2">
      <div class="flex flex-1 items-start gap-3">
        <div class="mt-1 rounded-full {budgetTypeInfo.color} p-2">
          <budgetTypeInfo.icon class="h-4 w-4 {budgetTypeInfo.iconColor}" />
        </div>
        <div class="flex-1 space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <Card.Title class="text-base">{recommendation.title}</Card.Title>
            <Badge variant="outline" class="text-xs {budgetTypeInfo.color} border-current">
              {budgetTypeInfo.label}
            </Badge>
          </div>
          <Card.Description class="text-sm">
            {recommendation.description}
          </Card.Description>
        </div>
      </div>
      <Badge variant={priorityColor}>
        {recommendation.priority}
      </Badge>
    </div>
  </Card.Header>

  <Card.Content class="space-y-4 pb-3">
    <!-- Metadata Display -->
    {#if recommendation.metadata}
      <div class="grid gap-3 text-sm">
        <!-- Suggested Amount -->
        {#if recommendation.metadata.suggestedAmount}
          <div class="bg-muted flex items-center justify-between rounded-lg px-3 py-2">
            <span class="text-muted-foreground">Suggested Amount:</span>
            <span class="font-semibold">
              {formatCurrency(recommendation.metadata.suggestedAmount)}
            </span>
          </div>
        {/if}

        <!-- Transaction Count -->
        {#if recommendation.metadata.transactionCount}
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Based on:</span>
            <span class="font-medium">
              {recommendation.metadata.transactionCount} transactions
            </span>
          </div>
        {/if}

        <!-- Average Monthly Spend -->
        {#if recommendation.metadata.averageMonthlySpend}
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Avg. Monthly:</span>
            <span class="font-medium">
              {formatCurrency(recommendation.metadata.averageMonthlySpend)}
            </span>
          </div>
        {/if}

        <!-- Trend -->
        {#if recommendation.metadata.trend}
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Trend:</span>
            <span class="font-medium capitalize">
              {recommendation.metadata.trend}
            </span>
          </div>
        {/if}

        <!-- Detected Frequency -->
        {#if recommendation.metadata.detectedFrequency}
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Frequency:</span>
            <span class="font-medium capitalize">
              {recommendation.metadata.detectedFrequency}
            </span>
          </div>
        {/if}

        <!-- Predictability (for scheduled expenses) -->
        {#if recommendation.metadata['predictability'] !== undefined}
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Predictability:</span>
            <div class="flex items-center gap-2">
              <div class="bg-muted h-2 w-16 overflow-hidden rounded-full">
                <div
                  class="h-full bg-purple-500 transition-all"
                  style="width: {recommendation.metadata['predictability']}%">
                </div>
              </div>
              <span class="text-xs font-medium">
                {Math.round(recommendation.metadata['predictability'] as number)}%
              </span>
            </div>
          </div>
        {/if}

        <!-- Goal Metadata -->
        {#if recommendation.metadata['goalMetadata']}
          {@const goalMeta = recommendation.metadata['goalMetadata'] as {
            targetAmount?: number;
            targetDate?: string;
            monthlyContribution?: number;
          }}
          <div class="space-y-2 rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-950">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground text-sm">Target Amount:</span>
              <span class="font-semibold">
                {formatCurrency(goalMeta.targetAmount || 0)}
              </span>
            </div>
            {#if goalMeta.targetDate}
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-sm">Target Date:</span>
                <span class="text-sm font-medium">
                  {new Date(goalMeta.targetDate).toLocaleDateString()}
                </span>
              </div>
            {/if}
            {#if goalMeta.monthlyContribution}
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-sm">Monthly:</span>
                <span class="text-sm font-medium">
                  {formatCurrency(goalMeta.monthlyContribution)}
                </span>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Category Breakdown (for account-monthly) -->
        {#if recommendation.metadata['categoryBreakdown'] && Array.isArray(recommendation.metadata['categoryBreakdown'])}
          {@const categoryBreakdown = recommendation.metadata['categoryBreakdown'] as Array<{
            categoryName: string;
            amount: number;
          }>}
          {#if categoryBreakdown.length > 0}
            <div class="space-y-2">
              <span class="text-muted-foreground text-sm font-medium">Top Categories:</span>
              <div class="space-y-1.5">
                {#each categoryBreakdown.slice(0, 3) as category}
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-muted-foreground">{category.categoryName}</span>
                    <span class="font-medium">{formatCurrency(category.amount)}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    <!-- Confidence Score -->
    <div class="flex items-center justify-between rounded-lg border px-3 py-2">
      <span class="text-muted-foreground text-sm">Confidence Score:</span>
      <div class="flex items-center gap-2">
        <div class="bg-muted h-2 w-24 overflow-hidden rounded-full">
          <div class="bg-primary h-full transition-all" style="width: {recommendation.confidence}%">
          </div>
        </div>
        <span class="text-sm font-semibold {confidenceColor}">
          {recommendation.confidence}%
        </span>
      </div>
    </div>

    <!-- Related Entities -->
    {#if recommendation.category || recommendation.account || recommendation.budget}
      <div class="flex flex-wrap gap-2 pt-2">
        {#if recommendation.category}
          <Badge variant="outline" class="text-xs">
            <Info class="mr-1 h-3 w-3" />
            {recommendation.category.name}
          </Badge>
        {/if}
        {#if recommendation.account}
          <Badge variant="outline" class="text-xs">
            <Info class="mr-1 h-3 w-3" />
            {recommendation.account.name}
          </Badge>
        {/if}
        {#if recommendation.budget}
          <Badge variant="outline" class="text-xs">
            <Info class="mr-1 h-3 w-3" />
            {recommendation.budget.name}
          </Badge>
        {/if}
      </div>
    {/if}
  </Card.Content>

  <Card.Footer class="bg-muted/50 flex gap-2 pt-3">
    {#if recommendation.status === 'pending'}
      <Button
        variant="outline"
        size="sm"
        class="flex-1"
        onclick={handleDismiss}
        disabled={isProcessing}>
        <CircleX class="mr-1.5 h-3.5 w-3.5" />
        Dismiss
      </Button>
      <Button size="sm" class="flex-1" onclick={handleApply} disabled={isProcessing}>
        <CircleCheck class="mr-1.5 h-3.5 w-3.5" />
        Apply
      </Button>
    {:else if recommendation.status === 'applied'}
      <div class="flex w-full items-center justify-center gap-2 py-1 text-sm text-green-600">
        <CircleCheck class="h-4 w-4" />
        Applied
        {#if recommendation.appliedAt}
          <span class="text-muted-foreground text-xs">
            on {new Date(recommendation.appliedAt).toLocaleDateString()}
          </span>
        {/if}
      </div>
    {:else if recommendation.status === 'dismissed'}
      <div class="flex w-full items-center gap-2">
        <div class="text-muted-foreground flex flex-1 items-center gap-2 text-sm">
          <CircleX class="h-4 w-4" />
          Dismissed
          {#if recommendation.dismissedAt}
            <span class="text-xs">
              on {new Date(recommendation.dismissedAt).toLocaleDateString()}
            </span>
          {/if}
        </div>
        <Button size="sm" variant="outline" onclick={handleRestore} disabled={isProcessing}>
          <CircleCheck class="mr-1.5 h-3.5 w-3.5" />
          Restore
        </Button>
      </div>
    {:else if recommendation.status === 'expired'}
      <div class="text-muted-foreground flex w-full items-center justify-center gap-2 py-1 text-sm">
        <TriangleAlert class="h-4 w-4" />
        Expired
      </div>
    {/if}
  </Card.Footer>
</Card.Root>
