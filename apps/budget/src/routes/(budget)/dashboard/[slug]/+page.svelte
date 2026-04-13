<script lang="ts">
import { page } from '$app/stores';
import { rpc } from '$lib/query';
import { DashboardRenderer } from '$lib/components/dashboard';

const slug = $derived($page.params.slug ?? '');
const dashboardQuery = $derived(rpc.dashboards.getDashboard(slug).options());
const dashboard = $derived(dashboardQuery.data);
const isLoading = $derived(dashboardQuery.isLoading);
const error = $derived(dashboardQuery.error);
</script>

<svelte:head>
  <title>{dashboard?.name ?? 'Dashboard'} - Budget App</title>
</svelte:head>

{#if isLoading}
  <div class="flex h-64 items-center justify-center">
    <p class="text-muted-foreground">Loading dashboard...</p>
  </div>
{:else if error}
  <div class="flex h-64 flex-col items-center justify-center gap-2">
    <p class="text-destructive">Failed to load dashboard</p>
    <p class="text-muted-foreground text-sm">{error?.message}</p>
  </div>
{:else if dashboard}
  <DashboardRenderer {dashboard} />
{/if}
