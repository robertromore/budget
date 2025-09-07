<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import type { TransactionsFormat } from '$lib/types';
  import { analyticsTypes } from './(analytics)/analytics-types';
  import CashFlowChart from './(charts)/cash-flow-chart.svelte';
  import CategorySpendingChart from './(charts)/category-spending-chart.svelte';
  import IncomeVsExpensesChart from './(charts)/income-vs-expenses-chart.svelte';
  import MonthlySpendingChart from './(charts)/monthly-spending-chart.svelte';
  import PlaceholderChart from './(charts)/placeholder-chart.svelte';
  import TopPayeesChart from './(charts)/top-payees-chart.svelte';

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
      <h2 class="text-2xl font-bold tracking-tight">Analytics</h2>
      <p class="text-muted-foreground">
        Detailed analysis of your spending patterns and financial trends
      </p>
    </div>

    <!-- Analytics Selection Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      {#each analyticsTypes as analytic}
        <Button
          variant={selectedAnalytic === analytic.id ? "default" : "outline"}
          size="sm"
          class="h-auto p-3 flex-col items-start gap-2"
          onclick={() => selectedAnalytic = analytic.id}
        >
          <div class="flex items-center gap-2 w-full">
            <analytic.icon class="h-4 w-4" />
            <span class="text-xs font-medium">{analytic.title}</span>
          </div>
          <span class="text-xs opacity-75 text-left">{analytic.description}</span>
        </Button>
      {/each}
    </div>
  </div>

  <!-- Selected Analytics Chart -->
  {#if currentAnalytic}
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-2">
          <currentAnalytic.icon class="h-5 w-5" />
          <Card.Title>{currentAnalytic.title}</Card.Title>
        </div>
        <Card.Description>{currentAnalytic.description}</Card.Description>
      </Card.Header>
      <Card.Content class="p-6">
        <div class="h-[400px] w-full">
          {#if selectedAnalytic === 'monthly-spending'}
            <MonthlySpendingChart {transactions} />
          {:else if selectedAnalytic === 'income-vs-expenses'}
            <IncomeVsExpensesChart {transactions} />
          {:else if selectedAnalytic === 'cash-flow'}
            <CashFlowChart {transactions} />
          {:else if selectedAnalytic === 'category-spending'}
            <CategorySpendingChart {transactions} />
          {:else if selectedAnalytic === 'top-payees'}
            <TopPayeesChart {transactions} />
          {:else}
            <PlaceholderChart
              title={currentAnalytic?.title || 'Coming Soon'}
              description={currentAnalytic?.description || 'This chart is not yet implemented'}
              icon={currentAnalytic?.icon}
            />
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
