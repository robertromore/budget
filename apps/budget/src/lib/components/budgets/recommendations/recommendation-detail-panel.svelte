<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Separator } from '$lib/components/ui/separator';
import { getRelatedTransactions } from '$lib/query/transactions';
import type { BudgetRecommendationWithRelations, RecommendationMetadata } from '$lib/schema/recommendations';
import { cn, formatCurrency } from '$lib/utils';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Calendar from '@lucide/svelte/icons/calendar';
import Check from '@lucide/svelte/icons/check';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Hash from '@lucide/svelte/icons/hash';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import X from '@lucide/svelte/icons/x';

interface Props {
  recommendation: BudgetRecommendationWithRelations;
  onBack: () => void;
  onApply: (rec: BudgetRecommendationWithRelations) => void;
  onDismiss: (rec: BudgetRecommendationWithRelations) => void;
}

let { recommendation, onBack, onApply, onDismiss }: Props = $props();

// Extract metadata
const metadata = $derived(recommendation.metadata as RecommendationMetadata | null);

// State for showing all transactions
let showAllTransactions = $state(false);

// Fetch related transactions based on recommendation metadata
const transactionsQuery = $derived(
  getRelatedTransactions({
    accountId: recommendation.accountId ?? undefined,
    categoryId: recommendation.categoryId ?? undefined,
    payeeIds: metadata?.payeeIds,
    dateFrom: metadata?.analysisTimeRange?.startDate,
    dateTo: metadata?.analysisTimeRange?.endDate,
    limit: 500, // Increased limit to show more transactions
  }).options()
);

const transactions = $derived(transactionsQuery.data?.data ?? []);
const displayedTransactions = $derived(
  showAllTransactions ? transactions : transactions.slice(0, 10)
);

// Get confidence color
function getConfidenceBadgeVariant(confidence: number): 'default' | 'secondary' | 'outline' {
  if (confidence >= 80) return 'default';
  if (confidence >= 60) return 'secondary';
  return 'outline';
}

// Get trend icon
function getTrendIcon(trend: string | undefined) {
  if (trend === 'increasing') return TrendingUp;
  if (trend === 'decreasing') return TrendingDown;
  return null;
}

// Format date for display
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Get recommendation type label
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    create_budget: 'Create Budget',
    increase_budget: 'Increase Budget',
    decrease_budget: 'Decrease Budget',
    merge_budgets: 'Merge Budgets',
    seasonal_adjustment: 'Seasonal Adjustment',
    missing_category: 'Missing Category',
    create_budget_group: 'Create Group',
    add_to_budget_group: 'Add to Group',
    merge_budget_groups: 'Merge Groups',
    adjust_group_limit: 'Adjust Group Limit',
  };
  return labels[type] || type;
}
</script>

<div class="bg-background flex h-full flex-col">
  <!-- Header -->
  <div class="flex items-center justify-between border-b px-4 py-3">
    <div class="flex items-center gap-3">
      <button
        type="button"
        onclick={onBack}
        class="hover:bg-accent -ml-1 rounded p-1.5 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>
      <div>
        <h3 class="font-semibold">Recommendation Details</h3>
        <p class="text-muted-foreground text-xs">{getTypeLabel(recommendation.type)}</p>
      </div>
    </div>
    <Badge variant={getConfidenceBadgeVariant(recommendation.confidence)}>
      {recommendation.confidence}% confidence
    </Badge>
  </div>

  <!-- Scrollable Content -->
  <div class="flex-1 space-y-4 overflow-auto p-4">
    <!-- Title & Description Card -->
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-base">{recommendation.title}</Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-muted-foreground text-sm whitespace-pre-line">
          {recommendation.description}
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 gap-3">
      {#if metadata?.suggestedAmount}
        <Card.Root class="p-3">
          <div class="flex items-center gap-2">
            <div class="bg-primary/10 text-primary rounded p-1.5">
              <DollarSign class="h-4 w-4" />
            </div>
            <div>
              <p class="text-muted-foreground text-xs">Suggested Amount</p>
              <p class="font-semibold">{formatCurrency(metadata.suggestedAmount)}</p>
            </div>
          </div>
        </Card.Root>
      {/if}

      {#if metadata?.averageMonthlySpend}
        <Card.Root class="p-3">
          <div class="flex items-center gap-2">
            <div class="bg-primary/10 text-primary rounded p-1.5">
              <Calendar class="h-4 w-4" />
            </div>
            <div>
              <p class="text-muted-foreground text-xs">Avg Monthly Spend</p>
              <p class="font-semibold">{formatCurrency(metadata.averageMonthlySpend)}</p>
            </div>
          </div>
        </Card.Root>
      {/if}

      {#if transactions.length > 0 || transactionsQuery.isLoading}
        <Card.Root class="p-3">
          <div class="flex items-center gap-2">
            <div class="bg-primary/10 text-primary rounded p-1.5">
              <Hash class="h-4 w-4" />
            </div>
            <div>
              <p class="text-muted-foreground text-xs">Transactions</p>
              <p class="font-semibold">
                {#if transactionsQuery.isLoading}
                  ...
                {:else}
                  {transactions.length}
                {/if}
              </p>
            </div>
          </div>
        </Card.Root>
      {/if}

      {#if metadata?.trend}
        {@const TrendIcon = getTrendIcon(metadata.trend)}
        <Card.Root class="p-3">
          <div class="flex items-center gap-2">
            <div
              class={cn(
                'rounded p-1.5',
                metadata.trend === 'decreasing' && 'bg-green-500/10 text-green-600',
                metadata.trend === 'increasing' && 'bg-red-500/10 text-red-600',
                metadata.trend === 'stable' && 'bg-muted text-muted-foreground'
              )}
            >
              {#if TrendIcon}
                <TrendIcon class="h-4 w-4" />
              {:else}
                <span class="text-xs font-medium">~</span>
              {/if}
            </div>
            <div>
              <p class="text-muted-foreground text-xs">Trend</p>
              <p class="font-semibold capitalize">{metadata.trend}</p>
            </div>
          </div>
        </Card.Root>
      {/if}
    </div>

    <!-- Additional Stats -->
    {#if metadata?.currentAmount || metadata?.recommendedAmount || metadata?.utilizationRate}
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="text-sm">Budget Analysis</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-2">
          {#if metadata?.currentAmount}
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Current Amount</span>
              <span class="font-medium">{formatCurrency(metadata.currentAmount)}</span>
            </div>
          {/if}
          {#if metadata?.recommendedAmount}
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Recommended Amount</span>
              <span class="font-medium">{formatCurrency(metadata.recommendedAmount)}</span>
            </div>
          {/if}
          {#if metadata?.utilizationRate !== undefined}
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Utilization Rate</span>
              <span class="font-medium">{(metadata.utilizationRate * 100).toFixed(0)}%</span>
            </div>
          {/if}
          {#if metadata?.monthsExceeded !== undefined && metadata.monthsExceeded > 0}
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Months Exceeded</span>
              <span class="font-medium text-red-600">{metadata.monthsExceeded}</span>
            </div>
          {/if}
          {#if metadata?.monthsUnderutilized !== undefined && metadata.monthsUnderutilized > 0}
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Months Underutilized</span>
              <span class="font-medium text-amber-600">{metadata.monthsUnderutilized}</span>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Analysis Time Range -->
    {#if metadata?.analysisTimeRange}
      <Card.Root class="p-3">
        <div class="text-muted-foreground flex items-center justify-between text-sm">
          <span>Analysis Period</span>
          <span>
            {formatDate(metadata.analysisTimeRange.startDate)} -
            {formatDate(metadata.analysisTimeRange.endDate)}
            ({metadata.analysisTimeRange.monthsAnalyzed} months)
          </span>
        </div>
      </Card.Root>
    {/if}

    <Separator />

    <!-- Related Transactions -->
    <div class="space-y-3">
      <h4 class="font-medium">Related Transactions</h4>

      {#if transactionsQuery.isLoading}
        <div class="flex items-center justify-center py-8">
          <div class="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"></div>
          <span class="text-muted-foreground ml-2 text-sm">Loading transactions...</span>
        </div>
      {:else if transactions.length > 0}
        <div class="space-y-2">
          {#each displayedTransactions as transaction (transaction.id)}
            <div class="bg-muted/50 flex items-center justify-between rounded-lg p-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">
                  {transaction.payee?.name || transaction.notes || 'No description'}
                </p>
                <div class="text-muted-foreground flex items-center gap-2 text-xs">
                  <span>{formatDate(transaction.date)}</span>
                  {#if transaction.category}
                    <span>-</span>
                    <span>{transaction.category.name}</span>
                  {/if}
                </div>
              </div>
              <span
                class={cn(
                  'ml-3 font-medium tabular-nums',
                  transaction.amount < 0 && 'text-red-600',
                  transaction.amount > 0 && 'text-green-600'
                )}
              >
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          {/each}

          {#if transactions.length > 10}
            <button
              type="button"
              class="text-primary hover:text-primary/80 w-full py-2 text-center text-sm font-medium"
              onclick={() => (showAllTransactions = !showAllTransactions)}
            >
              {#if showAllTransactions}
                Show less
              {:else}
                Show all {transactions.length} transactions
              {/if}
            </button>
          {/if}
        </div>
      {:else}
        <div class="text-muted-foreground py-8 text-center text-sm">
          No related transactions found for this recommendation.
        </div>
      {/if}
    </div>
  </div>

  <!-- Footer Actions -->
  <div class="flex gap-3 border-t p-4">
    <Button variant="outline" class="flex-1" onclick={() => onDismiss(recommendation)}>
      <X class="mr-2 h-4 w-4" />
      Dismiss
    </Button>
    <Button class="flex-1" onclick={() => onApply(recommendation)}>
      <Check class="mr-2 h-4 w-4" />
      Apply
    </Button>
  </div>
</div>
