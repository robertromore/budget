<script lang="ts">
import { replaceState } from '$app/navigation';
import { page } from '$app/stores';
import { onMount, tick } from 'svelte';
import { TourPromptDialog } from '$lib/components/onboarding';
import { DashboardRenderer } from '$lib/components/dashboard';
import { rpc } from '$lib/query';
import type { DashboardWithWidgets } from '$core/schema/dashboards';
import { Button } from '$lib/components/ui/button';
import * as Empty from '$lib/components/ui/empty';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';

// Load default dashboard
const defaultQuery = rpc.dashboards.getDefaultDashboard().options();
const defaultDashboard = $derived(defaultQuery.data);
const isLoading = $derived(defaultQuery.isLoading);

// If no default dashboard exists, create one from the Home template
let ensureTriggered = $state(false);

async function ensureDefault() {
  if (ensureTriggered) return;
  ensureTriggered = true;
  await rpc.dashboards.ensureDefaultDashboard.execute();
}

$effect(() => {
  if (defaultDashboard === null && !isLoading && !ensureTriggered) {
    ensureDefault();
  }
});

// Tour prompt state
let showTourPrompt = $state(false);

onMount(async () => {
  const tourParam = $page.url.searchParams.get('tour');
  if (tourParam === 'start') {
    showTourPrompt = true;
    await tick();
    const url = new URL(window.location.href);
    url.searchParams.delete('tour');
    replaceState(url, {});
  }
});

function handleTourPromptClose() {
  showTourPrompt = false;
}
</script>

<svelte:head>
  <title>Dashboard - Budget App</title>
  <meta
    name="description"
    content="Your personal finance dashboard with comprehensive insights and analytics" />
</svelte:head>

<div class="space-y-6" data-tour-id="dashboard">
  {#if isLoading}
    <div class="space-y-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {#each Array(4) as _}
          <div class="rounded-lg border p-6">
            <div class="bg-muted h-4 w-1/2 animate-pulse rounded"></div>
            <div class="bg-muted mt-3 h-8 w-3/4 animate-pulse rounded"></div>
            <div class="bg-muted mt-2 h-3 w-full animate-pulse rounded"></div>
          </div>
        {/each}
      </div>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {#each Array(2) as _}
          <div class="rounded-lg border p-6">
            <div class="bg-muted h-4 w-1/3 animate-pulse rounded"></div>
            <div class="bg-muted mt-4 h-48 w-full animate-pulse rounded"></div>
          </div>
        {/each}
      </div>
    </div>
  {:else if defaultDashboard}
    <DashboardRenderer dashboard={defaultDashboard} />
  {:else}
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <LayoutDashboard class="size-6" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No Dashboard Configured</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          Set up your dashboard to see financial insights and track your accounts at a glance.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
      <Empty.EmptyContent>
        <Button href="/dashboard/manage">Set Up Your Dashboard</Button>
      </Empty.EmptyContent>
    </Empty.Empty>
  {/if}
</div>

<TourPromptDialog bind:open={showTourPrompt} onClose={handleTourPromptClose} />
