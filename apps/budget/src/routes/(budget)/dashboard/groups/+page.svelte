<script lang="ts">
import { goto } from '$app/navigation';
import ConfirmDialog from '$lib/components/dashboard/confirm-dialog.svelte';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Dialog from '$lib/components/ui/dialog';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Textarea } from '$lib/components/ui/textarea';
import { rpc } from '$lib/query';
import { getWidgetDefinition } from '$lib/types/dashboard-widgets';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Copy from '@lucide/svelte/icons/copy';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Lock from '@lucide/svelte/icons/lock';
import Pencil from '@lucide/svelte/icons/pencil';
import Plus from '@lucide/svelte/icons/plus';
import Trash2 from '@lucide/svelte/icons/trash-2';

const groupsQuery = rpc.widgetGroups.listWidgetGroups().options();
const groups = $derived(groupsQuery.data ?? []);
const systemGroups = $derived(groups.filter((g) => g.isSystem));
const userGroups = $derived(groups.filter((g) => !g.isSystem));

let createOpen = $state(false);
let newGroupName = $state('');
let newGroupDescription = $state('');

let renameOpen = $state(false);
let renameId = $state<number | null>(null);
let renameName = $state('');
let renameDescription = $state('');

let deleteOpen = $state(false);
let deleteId = $state<number | null>(null);
let deleteName = $state('');

async function handleCreate() {
  if (!newGroupName.trim()) return;
  const created = await rpc.widgetGroups.createWidgetGroup.execute({
    name: newGroupName.trim(),
    description: newGroupDescription.trim() || null,
  });
  createOpen = false;
  newGroupName = '';
  newGroupDescription = '';
  await goto(`/dashboard/groups/${created.slug}`);
}

async function handleDuplicate(id: number) {
  const result = await rpc.widgetGroups.duplicateWidgetGroup.execute({ id });
  await goto(`/dashboard/groups/${result.slug}`);
}

function openRename(group: { id: number; name: string; description: string | null }) {
  renameId = group.id;
  renameName = group.name;
  renameDescription = group.description ?? '';
  renameOpen = true;
}

async function handleRename() {
  if (renameId === null || !renameName.trim()) return;
  await rpc.widgetGroups.updateWidgetGroup.execute({
    id: renameId,
    name: renameName.trim(),
    description: renameDescription.trim() || null,
  });
  renameOpen = false;
  renameId = null;
}

function openDelete(group: { id: number; name: string }) {
  deleteId = group.id;
  deleteName = group.name;
  deleteOpen = true;
}

async function confirmDelete() {
  if (deleteId === null) return;
  await rpc.widgetGroups.deleteWidgetGroup.execute({ id: deleteId });
  deleteId = null;
}

function previewLabels(types: string[]): string[] {
  return types.slice(0, 4).map((t) => getWidgetDefinition(t)?.label ?? t);
}
</script>

<svelte:head>
  <title>Widget Groups — Budget App</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <Button variant="outline" size="icon" href="/dashboard/manage">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Widget Groups</h1>
        <p class="text-muted-foreground text-sm">
          Curate reusable widget sets and drop them onto any dashboard.
        </p>
      </div>
    </div>
    <Button onclick={() => (createOpen = true)}>
      <Plus class="mr-1.5 h-4 w-4" />
      New Group
    </Button>
  </div>

  {#if groupsQuery.isLoading}
    <p class="text-muted-foreground">Loading groups…</p>
  {:else}
    {#if userGroups.length > 0}
      <div class="space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Your groups
        </h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {#each userGroups as group (group.id)}
            <Card.Root>
              <Card.Header class="space-y-1">
                <Card.Title>
                  <a href="/dashboard/groups/{group.slug}" class="hover:underline">{group.name}</a>
                </Card.Title>
                {#if group.description}
                  <Card.Description>{group.description}</Card.Description>
                {/if}
              </Card.Header>
              <Card.Content class="space-y-3">
                <div class="flex items-center gap-2">
                  <Badge variant="secondary">{group.itemCount} widgets</Badge>
                </div>
                {#if group.previewTypes.length > 0}
                  <div class="flex flex-wrap gap-1">
                    {#each previewLabels(group.previewTypes) as label}
                      <Badge variant="outline" class="text-xs">{label}</Badge>
                    {/each}
                    {#if group.previewTypes.length > 4}
                      <Badge variant="outline" class="text-xs">+{group.previewTypes.length - 4}</Badge>
                    {/if}
                  </div>
                {/if}
              </Card.Content>
              <Card.Footer class="flex justify-between">
                <div class="flex gap-1">
                  <Button variant="ghost" size="sm" href="/dashboard/groups/{group.slug}">
                    <Pencil class="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onclick={() => handleDuplicate(group.id)}>
                    <Copy class="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => openRename(group)}>
                    Rename
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="text-destructive h-7 w-7"
                  onclick={() => openDelete(group)}>
                  <Trash2 class="h-3.5 w-3.5" />
                </Button>
              </Card.Footer>
            </Card.Root>
          {/each}
        </div>
      </div>
    {/if}

    {#if systemGroups.length > 0}
      <div class="space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Presets
        </h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {#each systemGroups as group (group.id)}
            <Card.Root class="border-dashed">
              <Card.Header class="space-y-1">
                <Card.Title class="flex items-center gap-2">
                  <a href="/dashboard/groups/{group.slug}" class="hover:underline">{group.name}</a>
                  <Lock class="text-muted-foreground h-3.5 w-3.5" />
                </Card.Title>
                {#if group.description}
                  <Card.Description>{group.description}</Card.Description>
                {/if}
              </Card.Header>
              <Card.Content class="space-y-3">
                <div class="flex items-center gap-2">
                  <Badge variant="secondary">{group.itemCount} widgets</Badge>
                  <Badge variant="outline" class="text-xs">Preset</Badge>
                </div>
                {#if group.previewTypes.length > 0}
                  <div class="flex flex-wrap gap-1">
                    {#each previewLabels(group.previewTypes) as label}
                      <Badge variant="outline" class="text-xs">{label}</Badge>
                    {/each}
                    {#if group.previewTypes.length > 4}
                      <Badge variant="outline" class="text-xs">+{group.previewTypes.length - 4}</Badge>
                    {/if}
                  </div>
                {/if}
              </Card.Content>
              <Card.Footer class="flex gap-1">
                <Button variant="ghost" size="sm" href="/dashboard/groups/{group.slug}">
                  Open
                </Button>
                <Button variant="ghost" size="sm" onclick={() => handleDuplicate(group.id)}>
                  <Copy class="mr-1 h-3.5 w-3.5" />
                  Duplicate to edit
                </Button>
              </Card.Footer>
            </Card.Root>
          {/each}
        </div>
      </div>
    {/if}

    {#if groups.length === 0}
      <div class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16">
        <LayoutGrid class="text-muted-foreground h-12 w-12" />
        <p class="text-muted-foreground">No groups yet — try duplicating a preset above.</p>
        <Button onclick={() => (createOpen = true)}>Create your first group</Button>
      </div>
    {/if}
  {/if}
</div>

<Dialog.Root bind:open={createOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>New widget group</Dialog.Title>
      <Dialog.Description>
        A group is a reusable set of widgets you can apply to any dashboard.
      </Dialog.Description>
    </Dialog.Header>
    <div class="space-y-4">
      <div class="space-y-2">
        <Label for="new-group-name">Name</Label>
        <Input id="new-group-name" bind:value={newGroupName} placeholder="My weekly brief" />
      </div>
      <div class="space-y-2">
        <Label for="new-group-description">Description (optional)</Label>
        <Textarea
          id="new-group-description"
          bind:value={newGroupDescription}
          placeholder="What this group is for…"
          rows={3} />
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
      <Button onclick={handleCreate} disabled={!newGroupName.trim()}>Create</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={renameOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Rename group</Dialog.Title>
    </Dialog.Header>
    <div class="space-y-4">
      <div class="space-y-2">
        <Label for="rename-group-name">Name</Label>
        <Input id="rename-group-name" bind:value={renameName} />
      </div>
      <div class="space-y-2">
        <Label for="rename-group-description">Description</Label>
        <Textarea id="rename-group-description" bind:value={renameDescription} rows={3} />
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (renameOpen = false)}>Cancel</Button>
      <Button onclick={handleRename} disabled={!renameName.trim()}>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<ConfirmDialog
  bind:open={deleteOpen}
  title="Delete group"
  description={`This will delete "${deleteName}". Dashboards that were previously applied with this group are unaffected.`}
  confirmLabel="Delete"
  onConfirm={confirmDelete} />
