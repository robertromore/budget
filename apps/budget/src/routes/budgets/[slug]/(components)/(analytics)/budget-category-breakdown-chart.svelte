<!--
  Budget Category Breakdown Chart

  Shows spending distribution by category for a budget.
-->
<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Progress } from '$lib/components/ui/progress';
import { Skeleton } from '$lib/components/ui/skeleton';
import { getCategoryBreakdown } from '$lib/query/budgets';
import { currencyFormatter } from '$lib/utils/formatters';

interface Props {
  budgetId: number;
}

let { budgetId }: Props = $props();

// Fetch category breakdown data
const breakdownQuery = $derived(getCategoryBreakdown(budgetId).options());
const breakdownData = $derived(breakdownQuery.data);
const isLoading = $derived(breakdownQuery.isLoading);

// Transform and sort data (descending by amount)
const chartData = $derived.by(() => {
  if (!breakdownData) return [];

  const sorted = [...breakdownData].sort((a, b) => b.amount - a.amount);
  return sorted.map((category, index) => ({
    index,
    categoryId: category.categoryId,
    name: category.categoryName,
    type: category.categoryType,
    color: category.categoryColor,
    amount: category.amount,
    count: category.count,
  }));
});

// Calculate total for percentage
const totalAmount = $derived(
  chartData.reduce((sum, cat) => sum + cat.amount, 0)
);
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Category Breakdown</Card.Title>
    <Card.Description>Spending distribution by category</Card.Description>
  </Card.Header>
  <Card.Content>
    {#if isLoading}
      <div class="space-y-3">
        {#each { length: 5 } as _, i (i)}
          <Skeleton class="h-12" />
        {/each}
      </div>
    {:else if !chartData.length}
      <div class="text-muted-foreground py-12 text-center">
        <p>No category spending data available for this budget.</p>
        <p class="text-sm mt-1">Transactions need to be linked to this budget.</p>
      </div>
    {:else}
      <!-- Category List -->
      <div class="space-y-3 max-h-100 overflow-y-auto pr-2">
        {#each chartData as category}
          {@const percentage = totalAmount > 0 ? (category.amount / totalAmount) * 100 : 0}
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <div
                  class="h-3 w-3 rounded-full shrink-0"
                  style="background-color: {category.color}"
                ></div>
                <span class="font-medium truncate">{category.name}</span>
              </div>
              <div class="flex items-center gap-4 shrink-0">
                <span class="text-muted-foreground text-xs">
                  {category.count} txn{category.count !== 1 ? 's' : ''}
                </span>
                <span class="font-medium">
                  {currencyFormatter.format(category.amount)}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Progress
                value={percentage}
                class="h-2 flex-1"
                style="--progress-background: {category.color}"
              />
              <span class="text-muted-foreground text-xs w-12 text-right">
                {percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        {/each}
      </div>

      <!-- Summary -->
      <div class="border-t pt-4 mt-4">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Total ({chartData.length} categories)</span>
          <span class="font-bold">{currencyFormatter.format(totalAmount)}</span>
        </div>
      </div>
    {/if}
  </Card.Content>
</Card.Root>

<style>
  :global([data-slot="progress-indicator"]) {
    background-color: var(--progress-background, currentColor);
  }
</style>
