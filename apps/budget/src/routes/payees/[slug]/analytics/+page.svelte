<script lang="ts">
import { page } from '$app/state';
import PayeeAnalyticsDashboard from '../../(components)/analytics/payee-analytics-dashboard.svelte';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import * as Card from '$lib/components/ui/card';
import { Skeleton } from '$lib/components/ui/skeleton';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Brain from '@lucide/svelte/icons/brain';
import User from '@lucide/svelte/icons/user';
import Activity from '@lucide/svelte/icons/activity';
import Target from '@lucide/svelte/icons/target';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import { getPayeeDetail } from '$lib/query/payees';

// Get payee ID from params
const payeeId = $derived(() => {
  const id = page.params['id'];
  return id ? parseInt(id) : 0;
});

// Load payee details with reactive payeeId
let payeeQuery = $state<any>(null);
$effect(() => {
  if (payeeId() > 0) {
    payeeQuery = getPayeeDetail(payeeId()).options();
  }
});

const payee = $derived(() => payeeQuery?.data);
const isLoading = $derived(() => payeeQuery?.isLoading ?? true);
const error = $derived(() => payeeQuery?.error);

// Page metadata
const title = $derived(() => {
  const currentPayee = payee();
  return currentPayee ? `${currentPayee.name} - Analytics` : 'Payee Analytics';
});
const description = 'Detailed performance metrics and ML insights for this payee';
</script>

<svelte:head>
  <title>{title()} - Budget App</title>
  <meta name="description" content={description} />
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/payees" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Payees</span>
      </Button>
      <div>
        <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <User class="text-muted-foreground h-8 w-8" />
          {payee()?.name || 'Loading...'}
        </h1>
        <p class="text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant="outline" class="flex items-center gap-2">
        <Activity class="h-4 w-4" />
        Individual Analysis
      </Badge>
      <Badge variant="secondary" class="flex items-center gap-2">
        <Brain class="h-4 w-4" />
        AI Insights
      </Badge>
    </div>
  </div>

  {#if isLoading()}
    <!-- Loading State -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      {#each Array(3) as _}
        <Card.Root>
          <Card.Header>
            <Skeleton class="h-4 w-24" />
          </Card.Header>
          <Card.Content>
            <Skeleton class="mb-2 h-8 w-full" />
            <Skeleton class="h-3 w-2/3" />
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {:else if error()}
    <!-- Error State -->
    <Card.Root>
      <Card.Content class="py-8 text-center">
        <TriangleAlert class="text-destructive mx-auto mb-4 h-12 w-12" />
        <h3 class="mb-2 text-lg font-medium">Failed to Load Payee</h3>
        <p class="text-muted-foreground mb-4">
          Unable to load payee data. Please check the payee ID and try again.
        </p>
        <Button variant="outline" onclick={() => payeeQuery?.refetch?.()} class="mt-4">
          Retry
        </Button>
      </Card.Content>
    </Card.Root>
  {:else if payee()}
    <!-- Quick Info Cards -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Payee Focus</Card.Title>
          <User class="text-muted-foreground h-4 w-4" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">{payee()?.name}</div>
          <p class="text-muted-foreground text-xs">
            {payee()?.notes || 'Individual payee analysis'}
          </p>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Analysis Type</Card.Title>
          <Target class="text-muted-foreground h-4 w-4" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">Detailed</div>
          <p class="text-muted-foreground text-xs">Complete performance metrics</p>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">ML Intelligence</Card.Title>
          <Brain class="text-muted-foreground h-4 w-4" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">Active</div>
          <p class="text-muted-foreground text-xs">Real-time insights available</p>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Main Analytics Dashboard -->
    <PayeeAnalyticsDashboard payeeId={payeeId()} showOverallAnalytics={false} timeframe="12" />
  {/if}
</div>
