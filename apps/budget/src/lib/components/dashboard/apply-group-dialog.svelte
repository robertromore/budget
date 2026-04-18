<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Dialog from '$lib/components/ui/dialog';
import { rpc } from '$lib/query';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Star from '@lucide/svelte/icons/star';

let {
  open = $bindable(false),
  groupId,
  groupName,
  onApplied,
}: {
  open?: boolean;
  groupId: number;
  groupName: string;
  onApplied?: (dashboardId: number, addedCount: number) => void;
} = $props();

const dashboardsQuery = rpc.dashboards.listDashboards().options();
const dashboards = $derived(dashboardsQuery.data ?? []);

let applyingTo = $state<number | null>(null);

async function handleApply(dashboardId: number) {
  applyingTo = dashboardId;
  try {
    const result = await rpc.widgetGroups.applyGroupToDashboard.execute({
      groupId,
      dashboardId,
    });
    onApplied?.(dashboardId, result.addedCount);
    open = false;
  } finally {
    applyingTo = null;
  }
}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Apply "{groupName}"</Dialog.Title>
      <Dialog.Description>
        Select a dashboard to append these widgets to. Existing widgets stay where they are.
      </Dialog.Description>
    </Dialog.Header>
    <div class="space-y-2 max-h-80 overflow-y-auto">
      {#if dashboardsQuery.isLoading}
        <p class="text-muted-foreground text-sm">Loading dashboards…</p>
      {:else if dashboards.length === 0}
        <p class="text-muted-foreground text-sm">No dashboards available.</p>
      {:else}
        {#each dashboards as dashboard (dashboard.id)}
          <button
            class="hover:bg-accent flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors disabled:opacity-50"
            disabled={applyingTo !== null}
            onclick={() => handleApply(dashboard.id)}>
            <div class="flex items-center gap-3">
              <LayoutDashboard class="text-muted-foreground h-4 w-4" />
              <div>
                <div class="flex items-center gap-2 font-medium">
                  {dashboard.name}
                  {#if dashboard.isDefault}
                    <Star class="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {/if}
                </div>
                <div class="text-muted-foreground text-xs">
                  {dashboard.widgets.length} widget{dashboard.widgets.length === 1 ? '' : 's'} · /dashboard/{dashboard.slug}
                </div>
              </div>
            </div>
            {#if applyingTo === dashboard.id}
              <Badge variant="secondary">Applying…</Badge>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
