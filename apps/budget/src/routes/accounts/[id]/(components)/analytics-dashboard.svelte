<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import type {TransactionsFormat} from '$lib/types';
import {analyticsTypes} from './(analytics)/analytics-types';
import MonthlySpendingChart from './(charts)/monthly-spending-chart.svelte';
import IncomeVsExpensesChart from './(charts)/income-vs-expenses-chart.svelte';

interface Props {
  transactions: TransactionsFormat[];
  accountId: string;
}

let {transactions, accountId}: Props = $props();

// Current selection
let selectedAnalytic = $state('monthly-spending');
const currentAnalytic = $derived(analyticsTypes.find((a) => a.id === selectedAnalytic));
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
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      {#each analyticsTypes as analytic}
        <Button
          variant={selectedAnalytic === analytic.id ? 'default' : 'outline'}
          size="sm"
          class="h-auto flex-col items-start gap-2 p-3"
          onclick={() => (selectedAnalytic = analytic.id)}>
          <div class="flex w-full items-center gap-2">
            <analytic.icon class="h-4 w-4" />
            <span class="text-xs font-medium">{analytic.title}</span>
          </div>
          <span class="text-left text-xs opacity-75">{analytic.description}</span>
        </Button>
      {/each}
    </div>
  </div>

  <!-- Selected Analytics Chart -->
  {#if currentAnalytic}
    {#if selectedAnalytic === 'monthly-spending'}
      <MonthlySpendingChart accountId={Number(accountId)} />
    {:else if selectedAnalytic === 'income-vs-expenses'}
      <IncomeVsExpensesChart {transactions} />
    {:else}
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-2">
            <currentAnalytic.icon class="h-5 w-5" />
            <Card.Title>{currentAnalytic.title}</Card.Title>
          </div>
          <Card.Description>{currentAnalytic.description}</Card.Description>
        </Card.Header>
        <Card.Content class="p-6">
          <div class="h-[400px] w-full flex items-center justify-center">
            <div class="text-center space-y-4">
              {#if currentAnalytic?.icon}
                <currentAnalytic.icon class="h-12 w-12 mx-auto text-muted-foreground/30" />
              {/if}
              <div>
                <h3 class="text-lg font-semibold text-muted-foreground">
                  {currentAnalytic?.title || 'Coming Soon'}
                </h3>
                <p class="text-sm text-muted-foreground/70">
                  This chart is not yet implemented.
                </p>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  {/if}
</div>
