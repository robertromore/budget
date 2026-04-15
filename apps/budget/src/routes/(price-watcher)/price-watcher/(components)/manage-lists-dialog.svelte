<script lang="ts">
import * as Dialog from '$lib/components/ui/dialog';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import {
  getAllLists,
  createList,
  updateList,
  deleteList as deleteListMutation,
} from '$lib/query/price-watcher';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Plus from '@lucide/svelte/icons/plus';
import ListIcon from '@lucide/svelte/icons/list';

interface Props {
  open: boolean;
}

let { open = $bindable() }: Props = $props();

const listsQuery = $derived(getAllLists().options());
const lists = $derived(listsQuery.data ?? []);

const createMut = createList.options();
const updateMut = updateList.options();
const deleteMut = deleteListMutation.options();

let newListName = $state('');
let newListDescription = $state('');
let editingId = $state<number | null>(null);
let editName = $state('');
let editDescription = $state('');
let showCreateForm = $state(false);

async function handleCreate() {
  const name = newListName.trim();
  if (!name) return;
  await createMut.mutateAsync({
    name,
    description: newListDescription.trim() || null,
  });
  newListName = '';
  newListDescription = '';
  showCreateForm = false;
}

function startEdit(list: { id: number; name: string; description: string | null }) {
  editingId = list.id;
  editName = list.name;
  editDescription = list.description ?? '';
}

async function handleUpdate() {
  if (editingId === null || !editName.trim()) return;
  await updateMut.mutateAsync({
    id: editingId,
    data: {
      name: editName.trim(),
      description: editDescription.trim() || null,
    },
  });
  editingId = null;
}

async function handleDelete(id: number) {
  await deleteMut.mutateAsync({ id });
  if (editingId === id) editingId = null;
}

function handleCreateKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleCreate();
  }
}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <ListIcon class="h-5 w-5" />
        Manage Lists
      </Dialog.Title>
      <Dialog.Description>
        Create and organize product lists.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-3">
      {#if lists.length === 0 && !showCreateForm}
        <div class="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No lists yet. Create your first list to organize products.
        </div>
      {:else}
        <div class="max-h-64 space-y-1 overflow-y-auto">
          {#each lists as list (list.id)}
            {#if editingId === list.id}
              <div class="space-y-2 rounded-lg border p-3">
                <Input
                  class="h-8 text-sm"
                  placeholder="List name"
                  bind:value={editName}
                  autofocus />
                <Input
                  class="h-8 text-sm"
                  placeholder="Description (optional)"
                  bind:value={editDescription} />
                <div class="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-7 text-xs"
                    onclick={() => (editingId = null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    class="h-7 text-xs"
                    onclick={handleUpdate}
                    disabled={!editName.trim() || updateMut.isPending}>
                    Save
                  </Button>
                </div>
              </div>
            {:else}
              <div class="group flex items-center justify-between rounded-lg border px-3 py-2">
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium">{list.name}</div>
                  {#if list.description}
                    <div class="text-muted-foreground truncate text-xs">{list.description}</div>
                  {/if}
                  <div class="text-muted-foreground text-xs">{list.itemCount} products</div>
                </div>
                <div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-7 w-7 p-0"
                    onclick={() => startEdit(list)}>
                    <Pencil class="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-7 w-7 p-0 hover:text-destructive"
                    onclick={() => handleDelete(list.id)}
                    disabled={deleteMut.isPending}>
                    <Trash2 class="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/if}

      {#if showCreateForm}
        <div class="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Label class="text-xs">New List</Label>
          <Input
            class="h-8 text-sm"
            placeholder="List name"
            bind:value={newListName}
            onkeydown={handleCreateKeydown}
            autofocus />
          <Input
            class="h-8 text-sm"
            placeholder="Description (optional)"
            bind:value={newListDescription} />
          <div class="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              class="h-7 text-xs"
              onclick={() => { showCreateForm = false; newListName = ''; newListDescription = ''; }}>
              Cancel
            </Button>
            <Button
              size="sm"
              class="h-7 text-xs"
              onclick={handleCreate}
              disabled={!newListName.trim() || createMut.isPending}>
              Create
            </Button>
          </div>
        </div>
      {:else}
        <Button
          variant="outline"
          size="sm"
          class="w-full"
          onclick={() => (showCreateForm = true)}>
          <Plus class="mr-2 h-4 w-4" />
          New List
        </Button>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
