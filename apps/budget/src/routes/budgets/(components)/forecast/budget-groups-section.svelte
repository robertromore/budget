<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import {FolderTree, Plus, ChevronRight, ChevronDown, SquarePen, Trash2} from '@lucide/svelte/icons';
import {listBudgetGroups, deleteBudgetGroup} from '$lib/query/budgets';
import type {BudgetGroup} from '$lib/schema/budgets';

let {
  onCreateGroup,
  onEditGroup,
}: {
  onCreateGroup?: () => void;
  onEditGroup?: (group: BudgetGroup) => void;
} = $props();

const groupsQuery = listBudgetGroups().options();
const deleteMutation = deleteBudgetGroup.options();

let expandedIds = $state<Set<number>>(new Set());
let deleteDialogOpen = $state(false);
let groupToDelete = $state<BudgetGroup | null>(null);
let deleteConfirmMessage = $state('');

function toggleExpand(id: number) {
  const newSet = new Set(expandedIds);
  if (newSet.has(id)) {
    newSet.delete(id);
  } else {
    newSet.add(id);
  }
  expandedIds = newSet;
}

function handleDelete(group: BudgetGroup) {
  const groups = groupsQuery.data || [];
  const hasChildren = groups.some(g => g.parentId === group.id);

  groupToDelete = group;
  deleteConfirmMessage = hasChildren
    ? `Delete "${group.name}" and all its child groups? This will also remove budget assignments.`
    : `Delete budget group "${group.name}"? This will remove budget assignments.`;
  deleteDialogOpen = true;
}

async function confirmDelete() {
  if (!groupToDelete) return;
  try {
    await deleteMutation.mutateAsync(groupToDelete.id);
    deleteDialogOpen = false;
    groupToDelete = null;
  } catch (error) {
    console.error('Failed to delete budget group:', error);
  }
}

const hierarchy = $derived.by(() => {
  const groups = groupsQuery.data || [];
  const rootGroups = groups.filter(g => !g.parentId);
  const childMap = new Map<number, BudgetGroup[]>();

  groups.forEach(group => {
    if (group.parentId) {
      const children = childMap.get(group.parentId) || [];
      children.push(group);
      childMap.set(group.parentId, children);
    }
  });

  return {rootGroups, childMap};
});
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold">Budget Groups</h2>
      <p class="text-sm text-muted-foreground">
        Organize your budgets hierarchically
      </p>
    </div>
    <Button onclick={onCreateGroup} size="sm">
      <Plus class="h-4 w-4 mr-2" />
      New Group
    </Button>
  </div>

  {#if groupsQuery.isLoading}
    <Card.Root>
      <Card.Content class="p-8 text-center text-muted-foreground">
        Loading budget groups...
      </Card.Content>
    </Card.Root>
  {:else if !groupsQuery.data || groupsQuery.data.length === 0}
    <Card.Root>
      <Card.Content class="p-8 text-center">
        <FolderTree class="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 class="font-medium mb-2">No Budget Groups</h3>
        <p class="text-sm text-muted-foreground mb-4">
          Create budget groups to organize your budgets hierarchically
        </p>
        <Button onclick={onCreateGroup} variant="outline" size="sm">
          <Plus class="h-4 w-4 mr-2" />
          Create Your First Group
        </Button>
      </Card.Content>
    </Card.Root>
  {:else}
    <div class="space-y-2">
      {#each hierarchy.rootGroups as rootGroup}
        {@const children = hierarchy.childMap.get(rootGroup.id) || []}
        {@const hasChildren = children.length > 0}
        {@const isExpanded = expandedIds.has(rootGroup.id)}
        <Card.Root>
          <Card.Content class="p-3">
            <div class="flex items-center gap-2">
              {#if hasChildren}
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-6 w-6 p-0"
                  onclick={() => toggleExpand(rootGroup.id)}
                >
                  {#if isExpanded}
                    <ChevronDown class="h-4 w-4" />
                  {:else}
                    <ChevronRight class="h-4 w-4" />
                  {/if}
                </Button>
              {:else}
                <div class="w-6"></div>
              {/if}

              <div class="flex-1">
                <div class="font-medium">{rootGroup.name}</div>
                {#if rootGroup.description}
                  <div class="text-sm text-muted-foreground">{rootGroup.description}</div>
                {/if}
              </div>

              <div class="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => onEditGroup?.(rootGroup)}
                >
                  <SquarePen class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => handleDelete(rootGroup)}
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>

            {#if isExpanded && children.length > 0}
              {#each children as child}
                {@const childChildren = hierarchy.childMap.get(child.id) || []}
                {@const childHasChildren = childChildren.length > 0}
                {@const childIsExpanded = expandedIds.has(child.id)}
                <div class="mt-2 flex items-center gap-2 pl-6">
                  {#if childHasChildren}
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-6 w-6 p-0"
                      onclick={() => toggleExpand(child.id)}
                    >
                      {#if childIsExpanded}
                        <ChevronDown class="h-4 w-4" />
                      {:else}
                        <ChevronRight class="h-4 w-4" />
                      {/if}
                    </Button>
                  {:else}
                    <div class="w-6"></div>
                  {/if}

                  <div class="flex-1">
                    <div class="font-medium">{child.name}</div>
                    {#if child.description}
                      <div class="text-sm text-muted-foreground">{child.description}</div>
                    {/if}
                  </div>

                  <div class="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => onEditGroup?.(child)}
                    >
                      <SquarePen class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => handleDelete(child)}
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              {/each}
            {/if}
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>

<!-- Delete Budget Group Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Budget Group</AlertDialog.Title>
      <AlertDialog.Description>
        {deleteConfirmMessage}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDelete}
        disabled={deleteMutation.isPending}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {#if deleteMutation.isPending}
          Deleting...
        {:else}
          Delete Group
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
