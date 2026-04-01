<script lang="ts">
import { replaceState } from '$app/navigation';
import { page } from '$app/stores';
import { onMount, tick } from 'svelte';
import { TourPromptDialog } from '$lib/components/onboarding';
import { DashboardRenderer } from '$lib/components/dashboard';
import { rpc } from '$lib/query';
import type { DashboardWithWidgets } from '$lib/schema/dashboards';
import { Button } from '$lib/components/ui/button';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Settings from '@lucide/svelte/icons/settings';

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
    <div class="flex h-64 items-center justify-center">
      <p class="text-muted-foreground">Loading dashboard...</p>
    </div>
  {:else if defaultDashboard}
    <DashboardRenderer dashboard={defaultDashboard} />
  {:else}
    <div class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16">
      <LayoutDashboard class="text-muted-foreground h-12 w-12" />
      <p class="text-muted-foreground text-lg">No dashboard configured</p>
      <Button href="/dashboard/manage">Set Up Your Dashboard</Button>
    </div>
  {/if}
</div>

<TourPromptDialog bind:open={showTourPrompt} onClose={handleTourPromptClose} />
