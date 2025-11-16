<script lang="ts">
import CreateUserForm from './(components)/create-user-form.svelte';
import * as Card from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import UserCircle from '@lucide/svelte/icons/user-circle';
import Check from '@lucide/svelte/icons/check';
import { goto } from '$app/navigation';
import { toast } from 'svelte-sonner';
import type { PageData } from './$types';

interface Props {
  data: PageData;
}

let { data }: Props = $props();

const currentUserId = $derived(data.currentUser?.id);

async function switchUser(userId: number) {
  const formData = new FormData();
  formData.append('userId', userId.toString());

  const response = await fetch('?/switchUser', {
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

      {#if data.allUsers.length === 0}
        <Card.Root>
          <Card.Content class="py-8 text-center">
            <p class="text-muted-foreground">No workspaces found. Create one to get started!</p>
          </Card.Content>
        </Card.Root>
      {:else}
        <div class="space-y-3">
          {#each data.allUsers as user (user.id)}
            <Card.Root class={user.id === currentUserId ? 'border-primary' : ''}>
              <Card.Content class="py-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <UserCircle class="text-muted-foreground h-8 w-8" />
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="font-medium">{user.displayName}</h3>
                        {#if user.id === currentUserId}
                          <Badge variant="default" class="text-xs">
                            <Check class="mr-1 h-3 w-3" />
                            Current
                          </Badge>
                        {/if}
                      </div>
                      <p class="text-muted-foreground text-sm">@{user.slug}</p>
                      {#if user.email}
                        <p class="text-muted-foreground text-xs">{user.email}</p>
                      {/if}
                    </div>
                  </div>

                  {#if user.id !== currentUserId}
                    <Button variant="outline" size="sm" onclick={() => switchUser(user.id)}>
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
      <CreateUserForm data={data.form} />
    </div>
  </div>
</div>
