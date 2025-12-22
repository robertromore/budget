<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Skeleton } from '$lib/components/ui/skeleton';
import { getPayeeAnalytics } from '$lib/query/payees';
import AlertCircle from '@lucide/svelte/icons/alert-circle';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Brain from '@lucide/svelte/icons/brain';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Users from '@lucide/svelte/icons/users';

// Analytics query
const analyticsQuery = getPayeeAnalytics().options();
const analytics = $derived(analyticsQuery.data);
const isLoading = $derived(analyticsQuery.isLoading);
const hasError = $derived(analyticsQuery.error);

// Derived analytics data
const totalPayees = $derived(analytics?.totalPayees || 0);
const activePayees = $derived(analytics?.activePayees || 0);
const payeesWithDefaults = $derived(analytics?.payeesWithDefaults || 0);
const payeesNeedingAttention = $derived(analytics?.payeesNeedingAttention || 0);
const avgTransactionsPerPayee = $derived(analytics?.averageTransactionsPerPayee || 0);
const topCategories = $derived(analytics?.topCategories?.slice(0, 3) || []);
</script>

<Card.Root data-help-id="payee-intelligence-summary" data-help-title="Payee Intelligence Summary">
  <Card.Header>
    <Card.Title class="flex items-center gap-2">
      <Brain class="h-5 w-5 text-blue-500" />
      Payee Intelligence Summary
    </Card.Title>
    <Card.Description>ML-powered insights and analytics across all your payees</Card.Description>
  </Card.Header>
  <Card.Content class="space-y-6">
    {#if isLoading}
      <!-- Loading State -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        {#each Array(4) as _}
          <div class="space-y-2">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-8 w-3/4" />
            <Skeleton class="h-3 w-full" />
          </div>
        {/each}
      </div>
    {:else if hasError}
      <!-- Error State -->
      <div class="py-4 text-center">
        <p class="text-muted-foreground mb-2 text-sm">Failed to load payee analytics</p>
        <Button variant="outline" size="sm" onclick={() => analyticsQuery.refetch()}>Retry</Button>
      </div>
    {:else}
      <!-- Analytics Summary Cards -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="text-center">
          <div
            class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Users class="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="text-2xl font-bold">{totalPayees}</div>
          <div class="text-muted-foreground text-xs">Total Payees</div>
          <div class="mt-1 text-xs text-green-600">
            {activePayees} active
          </div>
        </div>

        <div class="text-center">
          <div
            class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle class="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div class="text-2xl font-bold">{payeesWithDefaults}</div>
          <div class="text-muted-foreground text-xs">With Defaults</div>
          <div class="mt-1 text-xs text-green-600">Configured</div>
        </div>

        <div class="text-center">
          <div
            class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
            <TrendingUp class="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div class="text-2xl font-bold">{avgTransactionsPerPayee.toFixed(1)}</div>
          <div class="text-muted-foreground text-xs">Avg Transactions</div>
          <div class="mt-1 text-xs text-purple-600">Per payee</div>
        </div>

        <div class="text-center">
          <div
            class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
            <AlertCircle class="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div class="text-2xl font-bold">{payeesNeedingAttention}</div>
          <div class="text-muted-foreground text-xs">Need Attention</div>
          <div class="mt-1 text-xs text-orange-600">Review suggested</div>
        </div>
      </div>

      <!-- Top Categories Preview -->
      {#if topCategories.length > 0}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium">Top Categories by Payee Count</h4>
            <Badge variant="outline" class="text-xs">
              Top {topCategories.length}
            </Badge>
          </div>
          <div class="space-y-2">
            {#each topCategories as category, index}
              <div class="bg-muted/50 flex items-center justify-between rounded-lg p-2">
                <div class="flex items-center gap-2">
                  <div
                    class="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                    {index + 1}
                  </div>
                  <span class="text-sm font-medium">{category.categoryName}</span>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium">
                    {category.payeeCount} payees
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Quick Actions -->
      <div class="flex flex-col gap-2 pt-2 sm:flex-row">
        <Button variant="outline" size="sm" href="/payees/analytics" class="flex-1">
          <BarChart3 class="mr-2 h-4 w-4" />
          Full Analytics Dashboard
          <ArrowRight class="ml-2 h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" href="/payees" class="flex-1">
          <Users class="mr-2 h-4 w-4" />
          Manage Payees
        </Button>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
