<script lang="ts">
import type { DashboardWidget } from '$lib/schema/dashboards';
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
const topCategories = $derived(analytics?.topCategories?.slice(0, 3) || []);
</script>

{#if isLoading}
  <div class="grid grid-cols-2 gap-3">
    {#each Array(4) as _}
      <div class="bg-muted h-16 animate-pulse rounded"></div>
    {/each}
  </div>
{:else}
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-lg border p-2.5 text-center">
        <Users class="text-primary mx-auto h-4 w-4" />
        <div class="mt-1 text-lg font-bold">{totalPayees}</div>
        <div class="text-muted-foreground text-xs">{activePayees} active</div>
      </div>
      <div class="rounded-lg border p-2.5 text-center">
        <CheckCircle class="mx-auto h-4 w-4 text-green-600" />
        <div class="mt-1 text-lg font-bold">{payeesWithDefaults}</div>
        <div class="text-muted-foreground text-xs">With defaults</div>
      </div>
      <div class="rounded-lg border p-2.5 text-center">
        <TrendingUp class="mx-auto h-4 w-4 text-purple-600" />
        <div class="mt-1 text-lg font-bold">{avgTransactionsPerPayee.toFixed(1)}</div>
        <div class="text-muted-foreground text-xs">Avg txns/payee</div>
      </div>
      <div class="rounded-lg border p-2.5 text-center">
        <AlertCircle class="mx-auto h-4 w-4 text-orange-600" />
        <div class="mt-1 text-lg font-bold">{payeesNeedingAttention}</div>
        <div class="text-muted-foreground text-xs">Need attention</div>
      </div>
    </div>

    {#if topCategories.length > 0}
      <div class="space-y-1.5">
        <h4 class="text-muted-foreground text-xs font-medium">Top Categories</h4>
        {#each topCategories as category, index}
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <span class="text-muted-foreground text-xs">{index + 1}.</span>
              <span class="truncate">{category.categoryName}</span>
            </div>
            <Badge variant="outline" class="text-xs">{category.payeeCount}</Badge>
          </div>
        {/each}
      </div>
    {/if}

    <Button variant="outline" size="sm" href="/payees/analytics" class="w-full">
      <Brain class="mr-1.5 h-3.5 w-3.5" />
      Full Analytics
    </Button>
  </div>
{/if}
