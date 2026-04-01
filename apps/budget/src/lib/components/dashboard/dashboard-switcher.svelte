<script lang="ts">
import { goto } from '$app/navigation';
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import { rpc } from '$lib/query';
import type { DashboardWithWidgets } from '$lib/schema/dashboards';
import Check from '@lucide/svelte/icons/check';
import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Plus from '@lucide/svelte/icons/plus';
import Settings from '@lucide/svelte/icons/settings';

let {
  current,
}: {
  current: DashboardWithWidgets;
} = $props();

const dashboardsQuery = rpc.dashboards.listDashboards().options();
const dashboards = $derived((dashboardsQuery.data ?? []) as DashboardWithWidgets[]);

function handleSelect(dashboard: DashboardWithWidgets) {
  if (dashboard.isDefault) {
    goto('/');
  } else {
    goto(`/dashboard/${dashboard.slug}`);
  }
}
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="outline" size="sm" class="gap-1.5">
        <LayoutDashboard class="h-4 w-4" />
        <span class="max-w-32 truncate">{current.name}</span>
        <ChevronsUpDown class="text-muted-foreground h-3.5 w-3.5" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="start" class="w-56">
    <DropdownMenu.Label>Dashboards</DropdownMenu.Label>
    <DropdownMenu.Separator />
    {#each dashboards as dashboard (dashboard.id)}
      <DropdownMenu.Item onclick={() => handleSelect(dashboard)}>
        <span class="flex-1 truncate">{dashboard.name}</span>
        {#if dashboard.id === current.id}
          <Check class="ml-2 h-4 w-4" />
        {/if}
      </DropdownMenu.Item>
    {/each}
    <DropdownMenu.Separator />
    <DropdownMenu.Item onclick={() => goto('/dashboard/manage')}>
      <Settings class="mr-2 h-4 w-4" />
      Manage Dashboards
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
