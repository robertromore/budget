<script lang="ts">
import * as Select from '$lib/components/ui/select';
import { currentUser } from '$lib/states/current-user.svelte';
import { rpc } from '$lib/query';
import { goto } from '$app/navigation';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import UserCircle from '@lucide/svelte/icons/user-circle';
import Plus from '@lucide/svelte/icons/plus';
import Settings from '@lucide/svelte/icons/settings';
import Check from '@lucide/svelte/icons/check';

const currentUserState = $derived(currentUser.get());
const user = $derived(currentUserState.user);

const usersQuery = $derived(rpc.users.listUsers().options());
const users = $derived(usersQuery.data ?? []);

async function handleSelection(value: number | string | undefined) {
  if (!value) return;

  if (value === 'manage') {
    goto('/users');
    return;
  }

  // Switch to the selected workspace
  const userId = Number(value);
  if (!isNaN(userId) && userId !== user?.id) {
    const formData = new FormData();
    formData.append('userId', userId.toString());

    const response = await fetch('/users?/switchUser', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      // Reload the page to reflect the new workspace
      goto('/', { invalidateAll: true });
    }
  }
}
</script>

<div class="w-full px-2 py-2">
  <Select.Root type="single" value={user?.id} onValueChange={handleSelection}>
    <Select.Trigger class="w-full justify-between">
      <div class="flex min-w-0 items-center gap-2">
        <UserCircle class="h-4 w-4 shrink-0" />
        <span class="truncate font-medium">{user?.displayName ?? 'Select User'}</span>
      </div>
    </Select.Trigger>
    <Select.Content>
      <Select.Group>
        <Select.Label>Workspaces</Select.Label>
        {#each users as workspace (workspace.id)}
          <Select.Item value={workspace.id}>
            <div class="flex items-center gap-2">
              <UserCircle class="h-4 w-4" />
              <span class:font-medium={workspace.id === user?.id}>{workspace.displayName}</span>=
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
