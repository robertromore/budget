<script lang="ts">
import {page} from '$app/state';
import PayeeAnalyticsDashboard from '$lib/components/payees/payee-analytics-dashboard.svelte';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import * as Card from '$lib/components/ui/card';
import {Skeleton} from '$lib/components/ui/skeleton';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Brain from '@lucide/svelte/icons/brain';
import User from '@lucide/svelte/icons/user';
import Activity from '@lucide/svelte/icons/activity';
import Target from '@lucide/svelte/icons/target';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import {getPayeeDetail} from '$lib/query/payees';

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
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <User class="h-8 w-8 text-muted-foreground" />
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
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      {#each Array(3) as _}
        <Card.Root>
          <Card.Header>
            <Skeleton class="h-4 w-24" />
          </Card.Header>
          <Card.Content>
            <Skeleton class="h-8 w-full mb-2" />
            <Skeleton class="h-3 w-2/3" />
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {:else if error()}
    <!-- Error State -->
    <Card.Root>
      <Card.Content class="text-center py-8">
        <AlertTriangle class="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 class="text-lg font-medium mb-2">Failed to Load Payee</h3>
        <p class="text-muted-foreground mb-4">
          Unable to load payee data. Please check the payee ID and try again.
        </p>
        <Button
          variant="outline"
          onclick={() => payeeQuery?.refetch?.()}
          class="mt-4"
        >
          Retry
        </Button>
      </Card.Content>
    </Card.Root>
  {:else if payee()}
    <!-- Quick Info Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Payee Focus</Card.Title>
          <User class="h-4 w-4 text-muted-foreground" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">{payee()?.name}</div>
          <p class="text-xs text-muted-foreground">
            {payee()?.notes || 'Individual payee analysis'}
          </p>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Analysis Type</Card.Title>
          <Target class="h-4 w-4 text-muted-foreground" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">Detailed</div>
          <p class="text-xs text-muted-foreground">
            Complete performance metrics
          </p>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">ML Intelligence</Card.Title>
          <Brain class="h-4 w-4 text-muted-foreground" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">Active</div>
          <p class="text-xs text-muted-foreground">
            Real-time insights available
          </p>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Main Analytics Dashboard -->
    <PayeeAnalyticsDashboard payeeId={payeeId()} showOverallAnalytics={false} timeframe="12" />
  {/if}
</div>