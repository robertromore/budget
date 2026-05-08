<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { getPayeeAnalytics } from '$lib/query/payees';
import AlertCircle from '@lucide/svelte/icons/alert-circle';
import Brain from '@lucide/svelte/icons/brain';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Users from '@lucide/svelte/icons/users';

let { config }: { config: DashboardWidget } = $props();

const analyticsQuery = getPayeeAnalytics().options();
const analytics = $derived(analyticsQuery.data);
const isLoading = $derived(analyticsQuery.isLoading);

const totalPayees = $derived(analytics?.totalPayees || 0);
const activePayees = $derived(analytics?.activePayees || 0);
const payeesWithDefaults = $derived(analytics?.payeesWithDefaults || 0);
const payeesNeedingAttention = $derived(analytics?.payeesNeedingAttention || 0);
const avgTransactionsPerPayee = $derived(analytics?.averageTransactionsPerPayee || 0);
const topCategoriesLimit = $derived(config.size === 'full' ? 8 : config.size === 'large' ? 5 : 3);
const topCategories = $derived(analytics?.topCategories?.slice(0, topCategoriesLimit) || []);
const defaultsPct = $derived(totalPayees > 0 ? (payeesWithDefaults / totalPayees) * 100 : 0);
</script>

{#if isLoading}
  <div class="grid grid-cols-2 gap-3">
    {#each Array(4) as _}
      <div class="bg-muted h-16 animate-pulse rounded"></div>
    {/each}
  </div>
{:else if config.size === 'small'}
  <div class="flex items-start gap-3">
    <div class="bg-primary/10 rounded-lg p-2.5 shrink-0">
      <Users class="text-primary h-5 w-5"></Users>
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-xl font-bold tabular-nums">{totalPayees}</div>
      <p class="text-muted-foreground text-xs">
        {activePayees} active
        {#if payeesNeedingAttention > 0}
          · <span class="text-orange-600 font-medium">{payeesNeedingAttention} flag{payeesNeedingAttention === 1 ? '' : 's'}</span>
        {/if}
      </p>
    </div>
  </div>
{:else}
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3" class:lg:grid-cols-4={config.size === 'full'}>
      <div class="rounded-lg border p-2.5 text-center">
        <Users class="text-primary mx-auto h-4 w-4"></Users>
        <div class="mt-1 text-lg font-bold tabular-nums">{totalPayees}</div>
        <div class="text-muted-foreground text-xs">{activePayees} active</div>
      </div>
      <div class="rounded-lg border p-2.5 text-center">
        <CheckCircle class="mx-auto h-4 w-4 text-success"></CheckCircle>
        <div class="mt-1 text-lg font-bold tabular-nums">{payeesWithDefaults}</div>
        <div class="text-muted-foreground text-xs">
          With defaults{#if config.size === 'large' || config.size === 'full'} · {defaultsPct.toFixed(0)}%{/if}
        </div>
      </div>
      {#if config.size !== 'medium'}
        <div class="rounded-lg border p-2.5 text-center">
          <TrendingUp class="mx-auto h-4 w-4 text-purple-600"></TrendingUp>
          <div class="mt-1 text-lg font-bold tabular-nums">{avgTransactionsPerPayee.toFixed(1)}</div>
          <div class="text-muted-foreground text-xs">Avg txns/payee</div>
        </div>
        <div class="rounded-lg border p-2.5 text-center">
          <AlertCircle class="mx-auto h-4 w-4 text-orange-600"></AlertCircle>
          <div class="mt-1 text-lg font-bold tabular-nums">{payeesNeedingAttention}</div>
          <div class="text-muted-foreground text-xs">Need attention</div>
        </div>
      {/if}
    </div>

    {#if topCategories.length > 0 && config.size !== 'medium'}
      <div class="space-y-1.5">
        <h4 class="text-muted-foreground text-xs font-medium uppercase tracking-wider">Top Categories</h4>
        {#each topCategories as category, index}
          <div class="flex items-center justify-between text-sm">
            <div class="flex min-w-0 items-center gap-2">
              <span class="text-muted-foreground text-xs shrink-0">{index + 1}.</span>
              <span class="truncate">{category.categoryName}</span>
            </div>
            <Badge variant="outline" class="text-xs shrink-0">{category.payeeCount}</Badge>
          </div>
        {/each}
      </div>
    {/if}

    <Button variant="outline" size="sm" href="/payees/analytics" class="w-full">
      <Brain class="mr-1.5 h-3.5 w-3.5"></Brain>
      Full Analytics
    </Button>
  </div>
{/if}
