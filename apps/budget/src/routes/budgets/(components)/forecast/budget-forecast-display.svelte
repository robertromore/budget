<script lang="ts">
import * as Card from '$lib/components/ui/card';
import * as Alert from '$lib/components/ui/alert';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { Skeleton } from '$lib/components/ui/skeleton';
import { getBudgetForecast, autoAllocateBudget } from '$lib/query/budgets';
import { currencyFormatter } from '$lib/utils/formatters';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Zap from '@lucide/svelte/icons/zap';

interface Props {
  budgetId: number;
  daysAhead?: number;
  showAutoAllocate?: boolean;
}

let { budgetId, daysAhead = 30, showAutoAllocate = false }: Props = $props();

const forecastQuery = $derived(getBudgetForecast(budgetId, daysAhead).options());
const autoAllocateMutation = $derived(autoAllocateBudget().execute());

const forecast = $derived(forecastQuery.data);
const isLoading = $derived(forecastQuery.isLoading);
const error = $derived(forecastQuery.error);

function handleAutoAllocate() {
  autoAllocateMutation.mutate(budgetId);
}

const statusConfig = $derived.by(() => {
  if (!forecast) return null;

  switch (forecast.status) {
    case 'sufficient':
      return {
        icon: CircleCheck,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950/50',
        borderColor: 'border-green-200 dark:border-green-800',
        label: 'Sufficient',
        variant: 'default' as const,
      };
    case 'tight':
      return {
        icon: CircleAlert,
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/50',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        label: 'Tight',
        variant: 'secondary' as const,
      };
    case 'exceeded':
      return {
        icon: TrendingDown,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/50',
        borderColor: 'border-red-200 dark:border-red-800',
        label: 'Exceeded',
        variant: 'destructive' as const,
      };
  }
});
</script>

{#if isLoading}
  <Card.Root>
    <Card.Header>
      <div class="flex items-center gap-2">
        <Skeleton class="h-5 w-5 rounded-full" />
        <Skeleton class="h-5 w-32" />
      </div>
    </Card.Header>
    <Card.Content class="space-y-3">
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-3/4" />
      <Skeleton class="h-16 w-full" />
    </Card.Content>
  </Card.Root>
{:else if error}
  <Alert.Root variant="destructive">
    <CircleAlert class="h-4 w-4" />
    <Alert.Title>Error Loading Forecast</Alert.Title>
    <Alert.Description>{error.message}</Alert.Description>
  </Alert.Root>
{:else if forecast && statusConfig}
  <Card.Root class={`${statusConfig.bgColor} ${statusConfig.borderColor} border-2`}>
    <Card.Header class="pb-3">
      <div class="flex items-center justify-between">
        {#if statusConfig.icon}
          {@const Icon = statusConfig.icon}
          <div class="flex items-center gap-2">
            <Icon class={`h-5 w-5 ${statusConfig.color}`} />
            <Card.Title class="text-base">
              Budget Forecast
              <span class="text-muted-foreground ml-2 text-sm font-normal">
                (Next {daysAhead} days)
              </span>
            </Card.Title>
          </div>
        {/if}
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>
    </Card.Header>

    <Card.Content class="space-y-4">
      <!-- Summary Stats -->
      <div class="grid grid-cols-3 gap-4">
        <div class="space-y-1">
          <div class="text-muted-foreground text-xs">Allocated</div>
          <div class="text-sm font-semibold">
            {currencyFormatter.format(forecast.allocatedAmount)}
          </div>
        </div>
        <div class="space-y-1">
          <div class="text-muted-foreground text-xs">Projected</div>
          <div class="text-sm font-semibold">
            {currencyFormatter.format(forecast.projectedScheduledExpenses)}
          </div>
        </div>
        <div class="space-y-1">
          <div class="text-muted-foreground text-xs">Balance</div>
          <div
            class="text-sm font-semibold {forecast.projectedBalance < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-green-600 dark:text-green-400'}">
            {currencyFormatter.format(forecast.projectedBalance)}
          </div>
        </div>
      </div>

      <!-- Scheduled Expenses -->
      {#if forecast.scheduledExpenses.length > 0}
        <div class="space-y-2">
          <div class="text-muted-foreground flex items-center gap-1 text-xs font-medium">
            <CalendarClock class="h-3 w-3" />
            Upcoming Scheduled Expenses
          </div>
          <div class="space-y-2">
            {#each forecast.scheduledExpenses as expense}
              <div
                class="bg-background/50 flex items-center justify-between rounded-md border p-2 text-sm">
                <div class="space-y-0.5">
                  <div class="font-medium">{expense.scheduleName}</div>
                  <div class="text-muted-foreground text-xs">
                    {expense.occurrencesInPeriod}
                    {expense.occurrencesInPeriod === 1 ? 'occurrence' : 'occurrences'}
                    • {expense.frequency}
                  </div>
                </div>
                <div class="text-right">
                  <div class="font-semibold">{currencyFormatter.format(expense.totalImpact)}</div>
                  <div class="text-muted-foreground text-xs">
                    {currencyFormatter.format(expense.amount)} each
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Auto Allocate Action -->
      {#if showAutoAllocate && forecast.status !== 'sufficient'}
        <div class="pt-2">
          <Button
            variant="outline"
            size="sm"
            class="w-full"
            onclick={handleAutoAllocate}
            disabled={autoAllocateMutation.isPending}>
            <Zap class="mr-2 h-4 w-4" />
            Auto-Allocate Budget
          </Button>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
