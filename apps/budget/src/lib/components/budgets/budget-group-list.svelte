<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import {FolderTree, Plus} from '@lucide/svelte';
import {listBudgetGroups, deleteBudgetGroup} from '$lib/query/budgets';
import type {BudgetGroup} from '$lib/schema/budgets';
import BudgetGroupCard from './budget-group-card.svelte';

let {
  onCreateGroup,
  onEditGroup,
}: {
  onCreateGroup?: () => void;
  onEditGroup?: (group: BudgetGroup) => void;
} = $props();

const groupsQuery = listBudgetGroups().options();
const groups = $derived($groupsQuery.data || []);
const deleteMutation = deleteBudgetGroup.options();

// Build hierarchical structure
const rootGroups = $derived(groups.filter(g => !g.parentId));
const childrenMap = $derived.by(() => {
  const map = new Map<number, BudgetGroup[]>();
  groups.forEach(group => {
    if (group.parentId) {
      if (!map.has(group.parentId)) {
        map.set(group.parentId, []);
      }
      map.get(group.parentId)!.push(group);
    }
  });
  return map;
});
const groupHierarchy = $derived({rootGroups, childrenMap});

// Track expanded state for each group
let expandedGroups = $state<Set<number>>(new Set());

function toggleExpand(groupId: number) {
  const newSet = new Set(expandedGroups);
  if (newSet.has(groupId)) {
    newSet.delete(groupId);
  } else {
    newSet.add(groupId);
  }
  expandedGroups = newSet;
}

async function handleDelete(group: BudgetGroup) {
  const {childrenMap} = groupHierarchy;
  const hasChildren = childrenMap.has(group.id) && childrenMap.get(group.id)!.length > 0;

  const confirmMessage = hasChildren
    ? `Delete "${group.name}" and all its child groups? This will also remove budget assignments.`
    : `Delete budget group "${group.name}"? This will remove budget assignments.`;

  const confirmed = confirm(confirmMessage);
  if (confirmed) {
    try {
      await $deleteMutation.mutateAsync(group.id);
    } catch (error) {
      console.error('Failed to delete budget group:', error);
    }
  }
}

const flattenedGroups = $derived(
  groups.map(group => ({
    group,
    level: 0,
    hasChildren: false,
    isExpanded: false
  }))
);
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

  {#if $groupsQuery.isLoading}
    <Card.Root>
      <Card.Content class="p-8 text-center text-muted-foreground">
        Loading budget groups...
      </Card.Content>
    </Card.Root>
  {:else if groupHierarchy.rootGroups.length === 0}
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
      {#each flattenedGroups as {group, level, hasChildren, isExpanded}}
        <BudgetGroupCard
          {group}
          {level}
          {hasChildren}
          {isExpanded}
          onToggleExpand={() => toggleExpand(group.id)}
          onEdit={onEditGroup}
          onDelete={handleDelete}
        />
      {/each}
    </div>
  {/if}
</div>
