<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Dialog from '$lib/components/ui/dialog';
import { rpc } from '$lib/query';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Lock from '@lucide/svelte/icons/lock';

let {
  open = $bindable(false),
  dashboardId,
  onApplied,
}: {
  open?: boolean;
  dashboardId: number;
  onApplied?: (groupId: number, addedCount: number) => void;
} = $props();

const groupsQuery = rpc.widgetGroups.listWidgetGroups().options();
const groups = $derived(groupsQuery.data ?? []);
const userGroups = $derived(groups.filter((g) => !g.isSystem));
const systemGroups = $derived(groups.filter((g) => g.isSystem));

let activeTab = $state<'user' | 'presets'>('user');
let applyingId = $state<number | null>(null);

async function handleApply(groupId: number) {
  applyingId = groupId;
  try {
    const result = await rpc.widgetGroups.applyGroupToDashboard.execute({
      groupId,
      dashboardId,
    });
    onApplied?.(groupId, result.addedCount);
    open = false;
  } finally {
    applyingId = null;
  }
}

$effect(() => {
  if (open && userGroups.length === 0 && systemGroups.length > 0) {
    activeTab = 'presets';
  }
});
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Add a widget group</Dialog.Title>
      <Dialog.Description>
        Apply a saved group or a preset. Its widgets will be appended to this dashboard.
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex gap-1 border-b">
      <button
        class="px-3 py-2 text-sm font-medium transition-colors {activeTab === 'user'
          ? 'border-b-2 border-primary text-foreground'
          : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => (activeTab = 'user')}>
        Your groups
        {#if userGroups.length > 0}
          <Badge variant="secondary" class="ml-1 text-xs">{userGroups.length}</Badge>
        {/if}
      </button>
      <button
        class="px-3 py-2 text-sm font-medium transition-colors {activeTab === 'presets'
          ? 'border-b-2 border-primary text-foreground'
          : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => (activeTab = 'presets')}>
        Presets
        {#if systemGroups.length > 0}
          <Badge variant="secondary" class="ml-1 text-xs">{systemGroups.length}</Badge>
        {/if}
      </button>
    </div>

    <div class="space-y-2 max-h-80 overflow-y-auto py-2">
      {#if groupsQuery.isLoading}
        <p class="text-muted-foreground text-sm">Loading groups…</p>
      {:else}
        {@const list = activeTab === 'user' ? userGroups : systemGroups}
        {#if list.length === 0}
          <div class="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <LayoutGrid class="h-8 w-8" />
            {#if activeTab === 'user'}
              <span>No groups yet. Duplicate a preset or save this dashboard to create one.</span>
            {:else}
              <span>No presets available.</span>
            {/if}
          </div>
        {:else}
          {#each list as group (group.id)}
            <button
              class="hover:bg-accent flex w-full items-start justify-between rounded-md border p-3 text-left transition-colors disabled:opacity-50"
              disabled={applyingId !== null}
              onclick={() => handleApply(group.id)}>
              <div class="space-y-1">
                <div class="flex items-center gap-2 font-medium">
                  {group.name}
                  {#if group.isSystem}
                    <Lock class="text-muted-foreground h-3 w-3" />
                  {/if}
                </div>
                {#if group.description}
                  <div class="text-muted-foreground text-xs">{group.description}</div>
                {/if}
                <Badge variant="outline" class="text-xs">
                  {group.itemCount} widget{group.itemCount === 1 ? '' : 's'}
                </Badge>
              </div>
              {#if applyingId === group.id}
                <Badge variant="secondary">Applying…</Badge>
              {/if}
            </button>
          {/each}
        {/if}
      {/if}
    </div>

    <Dialog.Footer class="justify-between">
      <Button variant="ghost" href="/dashboard/groups">Manage groups</Button>
      <Button variant="outline" onclick={() => (open = false)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
