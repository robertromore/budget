<script lang="ts">
import { goto } from '$app/navigation';
import * as Select from '$lib/components/ui/select';
import { rpc } from '$lib/query';
import { currentWorkspace } from '$lib/states/current-workspace.svelte';
import Settings from '@lucide/svelte/icons/settings';
import UserCircle from '@lucide/svelte/icons/user-circle';

const currentWorkspaceState = currentWorkspace.get();
const workspace = $derived(currentWorkspaceState?.workspace);

const workspacesQuery = $derived(rpc.workspaces.list().options());
const workspaces = $derived(workspacesQuery.data ?? []);

async function handleSelection(value: string | undefined) {
  if (!value) return;

  if (value === 'manage') {
    goto('/workspaces');
    return;
  }

  // Switch to the selected workspace
  const workspaceId = Number(value);
  if (!isNaN(workspaceId) && workspaceId !== workspace?.id) {
    const formData = new FormData();
    formData.append('workspaceId', workspaceId.toString());

    const response = await fetch('/workspaces?/switchWorkspace', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      // Force a full page reload to ensure all queries refetch with new workspace context
      window.location.href = '/';
    }
  }
}
</script>

<div class="w-full px-2 py-2" data-help-id="workspace-switcher" data-help-title="Workspace Switcher">
  <Select.Root type="single" value={workspace?.id?.toString()} onValueChange={handleSelection}>
    <Select.Trigger class="w-full justify-between">
      <div class="flex min-w-0 items-center gap-2">
        <UserCircle class="h-4 w-4 shrink-0" />
        <span class="truncate font-medium">{workspace?.displayName ?? 'Select Workspace'}</span>
      </div>
    </Select.Trigger>
    <Select.Content>
      <Select.Group>
        <Select.Label>Workspaces</Select.Label>
        {#each workspaces as ws (ws.id)}
          <Select.Item value={ws.id.toString()}>
            <div class="flex items-center gap-2">
              <UserCircle class="h-4 w-4" />
              <span class:font-medium={ws.id === workspace?.id}>{ws.displayName}</span>
            </div>
          </Select.Item>
        {/each}
      </Select.Group>
      <Select.Separator />
      <Select.Item value="manage">
        <div class="flex items-center gap-2">
          <Settings class="h-4 w-4" />
          <span>Manage Workspaces</span>
        </div>
      </Select.Item>
    </Select.Content>
  </Select.Root>
</div>
