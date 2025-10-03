<script lang="ts">
import * as Card from '$lib/components/ui/card';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import {Skeleton} from '$lib/components/ui/skeleton';
import Brain from '@lucide/svelte/icons/brain';
import Users from '@lucide/svelte/icons/users';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import {getPayeeAnalytics} from '$lib/query/payees';
import {currencyFormatter} from '$lib/utils/formatters';

// Analytics query
const analyticsQuery = getPayeeAnalytics().options();
const analytics = $derived($analyticsQuery.data);
const isLoading = $derived($analyticsQuery.isLoading);
const hasError = $derived($analyticsQuery.error);

// Derived analytics data
const totalPayees = $derived(analytics?.totalPayees || 0);
const activePayees = $derived(analytics?.activePayees || 0);
const totalSpending = $derived(analytics?.totalSpending || 0);
const avgTransaction = $derived(analytics?.avgTransactionAmount || 0);
const mlAccuracy = $derived(Math.round((analytics?.mlAccuracy || 0) * 100));
const topPayees = $derived(analytics?.topPayees?.slice(0, 3) || []);
</script>

<Card.Root>
  <Card.Header>
    <Card.Title class="flex items-center gap-2">
      <Brain class="h-5 w-5 text-blue-500" />
      Payee Intelligence Summary
    </Card.Title>
    <Card.Description>
      ML-powered insights and analytics across all your payees
    </Card.Description>
  </Card.Header>
  <Card.Content class="space-y-6">
    {#if isLoading}
      <!-- Loading State -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <div class="text-center py-4">
        <p class="text-sm text-muted-foreground mb-2">
          Failed to load payee analytics
        </p>
        <Button
          variant="outline"
          size="sm"
          onclick={() => $analyticsQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    {:else}
      <!-- Analytics Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-blue-100">
            <Users class="h-5 w-5 text-blue-600" />
          </div>
          <div class="text-2xl font-bold">{totalPayees}</div>
          <div class="text-xs text-muted-foreground">Total Payees</div>
          <div class="text-xs text-green-600 mt-1">
            {activePayees} active
          </div>
        </div>

        <div class="text-center">
          <div class="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-green-100">
            <DollarSign class="h-5 w-5 text-green-600" />
          </div>
          <div class="text-2xl font-bold">{currencyFormatter.format(totalSpending)}</div>
          <div class="text-xs text-muted-foreground">Total Spending</div>
          <div class="text-xs text-blue-600 mt-1">
            All time
          </div>
        </div>

        <div class="text-center">
          <div class="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-purple-100">
            <TrendingUp class="h-5 w-5 text-purple-600" />
          </div>
          <div class="text-2xl font-bold">{currencyFormatter.format(avgTransaction)}</div>
          <div class="text-xs text-muted-foreground">Avg Transaction</div>
          <div class="text-xs text-purple-600 mt-1">
            Per payee
          </div>
        </div>

        <div class="text-center">
          <div class="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-orange-100">
            <Brain class="h-5 w-5 text-orange-600" />
          </div>
          <div class="text-2xl font-bold">{mlAccuracy}%</div>
          <div class="text-xs text-muted-foreground">ML Accuracy</div>
          <div class="text-xs text-orange-600 mt-1">
            Predictions
          </div>
        </div>
      </div>

      <!-- Top Payees Preview -->
      {#if topPayees.length > 0}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium">Top Spending Payees</h4>
            <Badge variant="outline" class="text-xs">
              Top {topPayees.length}
            </Badge>
          </div>
          <div class="space-y-2">
            {#each topPayees as payee, index}
              <div class="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <span class="text-sm font-medium">{payee.name}</span>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium">{currencyFormatter.format(payee.totalSpent)}</div>
                  <div class="text-xs text-muted-foreground">{payee.transactionCount} transactions</div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Quick Actions -->
      <div class="flex flex-col sm:flex-row gap-2 pt-2">
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
