<script lang="ts">
import { goto } from '$app/navigation';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import Check from '@lucide/svelte/icons/check';
import UserCircle from '@lucide/svelte/icons/user-circle';
import { toast } from '$lib/utils/toast-interceptor';
import type { PageData } from './$types';
import CreateWorkspaceForm from './(components)/create-workspace-form.svelte';

interface Props {
  data: PageData;
}

let { data }: Props = $props();

const currentWorkspaceId = $derived(data.currentWorkspace?.id);

async function switchWorkspace(workspaceId: number) {
  const formData = new FormData();
  formData.append('workspaceId', workspaceId.toString());

  const response = await fetch('?/switchWorkspace', {
    method: 'POST',
    body: formData,
  });

  if (response.ok) {
    toast.success('Switched workspace successfully');
    goto('/', { invalidateAll: true });
  } else {
    toast.error('Failed to switch workspace');
  }
}
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
  <div class="mb-8">
    <h1 class="mb-2 text-3xl font-bold">Workspaces</h1>
    <p class="text-muted-foreground">
      Manage your workspaces. Each workspace has its own budgets, accounts, and transactions.
    </p>
  </div>

  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Existing Workspaces -->
    <div>
      <h2 class="mb-4 text-xl font-semibold">Your Workspaces</h2>

      {#if data.allWorkspaces.length === 0}
        <Card.Root>
          <Card.Content class="py-8 text-center">
            <p class="text-muted-foreground">No workspaces found. Create one to get started!</p>
          </Card.Content>
        </Card.Root>
      {:else}
        <div class="space-y-3">
          {#each data.allWorkspaces as workspace (workspace.id)}
            <Card.Root class={workspace.id === currentWorkspaceId ? 'border-primary' : ''}>
              <Card.Content class="py-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <UserCircle class="text-muted-foreground h-8 w-8" />
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="font-medium">{workspace.displayName}</h3>
                        {#if workspace.id === currentWorkspaceId}
                          <Badge variant="default" class="text-xs">
                            <Check class="mr-1 h-3 w-3" />
                            Current
                          </Badge>
                        {/if}
                      </div>
                      <p class="text-muted-foreground text-sm">@{workspace.slug}</p>
                    </div>
                  </div>

                  {#if workspace.id !== currentWorkspaceId}
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => switchWorkspace(workspace.id)}>
                      Switch
                    </Button>
                  {/if}
                </div>
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Create New Workspace -->
    <div>
      <h2 class="mb-4 text-xl font-semibold">Create New Workspace</h2>
      <CreateWorkspaceForm data={data.form} />
    </div>
  </div>
</div>
