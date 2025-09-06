<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import type { TransactionsFormat } from '$lib/types';
  import { analyticsTypes } from './(analytics)/analytics-types';
  import MonthlySpendingChart from './(charts)/monthly-spending-chart.svelte';
  import IncomeVsExpensesChart from './(charts)/income-vs-expenses-chart.svelte';
  import CategorySpendingChart from './(charts)/category-spending-chart.svelte';
  import TopPayeesChart from './(charts)/top-payees-chart.svelte';
  import PlaceholderChart from './(charts)/placeholder-chart.svelte';
  
  interface Props {
    transactions: TransactionsFormat[];
    accountId: string;
  }

  let { transactions, accountId }: Props = $props();

  // Current selection
  let selectedAnalytic = $state('monthly-spending');
  const currentAnalytic = $derived(analyticsTypes.find(a => a.id === selectedAnalytic));
</script>

<div class="space-y-6">
  <!-- Analytics Selector -->
  <div class="flex flex-col gap-4">
    <div>
      <h2 class="text-2xl font-bold tracking-tight">Account Analytics</h2>
      <p class="text-muted-foreground">
        Select an analysis type to visualize your account data
      </p>
    </div>

    <!-- Analytics Selection Grid -->
    <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {#each analyticsTypes as analytic}
        <Button
          variant={selectedAnalytic === analytic.id ? "default" : "outline"}
          class="h-auto p-3 justify-start"
          onclick={() => selectedAnalytic = analytic.id}
        >
          <div class="flex items-center gap-3">
            <analytic.icon class="h-4 w-4 shrink-0"></analytic.icon>
            <div class="text-left">
              <div class="font-medium text-sm">{analytic.title}</div>
              <div class="text-xs text-muted-foreground">{analytic.category}</div>
            </div>
          </div>
        </Button>
      {/each}
    </div>
  </div>

  <!-- Chart Display -->
  {#if currentAnalytic}
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <currentAnalytic.icon class="h-5 w-5"></currentAnalytic.icon>
          {currentAnalytic.title}
        </Card.Title>
        <Card.Description>
          {currentAnalytic.description}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="h-[400px] w-full">
          {#if selectedAnalytic === 'monthly-spending'}
            <MonthlySpendingChart {transactions} />
          {:else if selectedAnalytic === 'income-vs-expenses'}
            <IncomeVsExpensesChart {transactions} />
          {:else if selectedAnalytic === 'category-spending'}
            <CategorySpendingChart {transactions} />
          {:else if selectedAnalytic === 'top-payees'}
            <TopPayeesChart {transactions} />
          {:else if currentAnalytic}
            <PlaceholderChart 
              title={currentAnalytic.title} 
              description={currentAnalytic.description}
              icon={currentAnalytic.icon} 
            />
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>