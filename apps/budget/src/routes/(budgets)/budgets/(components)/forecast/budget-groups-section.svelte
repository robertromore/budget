<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button } from '$lib/components/ui/button';
import { Separator } from '$lib/components/ui/separator';
import { deleteBudgetGroup, listBudgetGroups } from '$lib/query/budgets';
import type { BudgetGroup } from '$core/schema/budgets';
import type { BudgetWithRelations } from '$core/server/domains/budgets';
import FolderTree from '@lucide/svelte/icons/folder-tree';
import Plus from '@lucide/svelte/icons/plus';
import SquarePen from '@lucide/svelte/icons/square-pen';
import Trash2 from '@lucide/svelte/icons/trash-2';
import BudgetSearchResults from '../search/budget-search-results.svelte';

type ViewMode = 'list' | 'grid';

interface Props {
  /** Budgets already filtered by the page-level search/status. */
  budgets: BudgetWithRelations[];
  viewMode: ViewMode;
  searchQuery: string;
  pinnedIds: number[];
  selectedIds: Iterable<number>;
  isLoading: boolean;
  // Per-row actions — forwarded to BudgetSearchResults for each section.
  onView: (budget: BudgetWithRelations) => void;
  onEdit: (budget: BudgetWithRelations) => void;
  onDelete: (budget: BudgetWithRelations) => void;
  onDuplicate: (budget: BudgetWithRelations) => void;
  onArchive: (budget: BudgetWithRelations) => void;
  onBulkDelete: (budgets: BudgetWithRelations[]) => void;
  onTogglePin?: (budget: BudgetWithRelations) => void;
  onSelect?: (budget: BudgetWithRelations, event: MouseEvent | KeyboardEvent) => void;
  onToggleSelectId?: (budgetId: number) => void;
  onRangeSelectId?: (budgetId: number) => void;
  // Group management.
  onCreateGroup?: () => void;
  onEditGroup?: (group: BudgetGroup) => void;
}

let {
  budgets,
  viewMode,
  searchQuery,
  pinnedIds,
  selectedIds,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onBulkDelete,
  onTogglePin,
  onSelect,
  onToggleSelectId,
  onRangeSelectId,
  onCreateGroup,
  onEditGroup,
}: Props = $props();

const groupsQuery = listBudgetGroups().options();
const deleteMutation = deleteBudgetGroup.options();

let deleteDialogOpen = $state(false);
let groupToDelete = $state<BudgetGroup | null>(null);
let deleteConfirmMessage = $state('');

function handleDelete(group: BudgetGroup) {
  const groups = groupsQuery.data || [];
  const hasChildren = groups.some((g) => g.parentId === group.id);

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

/**
 * Bucket the visible budgets by group. A budget in N groups appears
 * once under each — mirrors how tag-based organizers (Linear, Notion)
 * render cross-tag items, and matches user intent when they
 * deliberately assigned the same budget to multiple organizational
 * buckets. Budgets with no memberships land in the synthetic
 * `Ungrouped` bucket at the bottom.
 */
const sections = $derived.by(() => {
  const groups = [...(groupsQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const ungrouped: BudgetWithRelations[] = [];
  const byGroup = new Map<number, BudgetWithRelations[]>();

  for (const budget of budgets) {
    const memberships = budget.groupMemberships ?? [];
    if (memberships.length === 0) {
      ungrouped.push(budget);
      continue;
    }
    for (const membership of memberships) {
      const id = membership.group?.id;
      if (id == null) continue;
      const list = byGroup.get(id) ?? [];
      list.push(budget);
      byGroup.set(id, list);
    }
  }

  return {
    groupSections: groups.map((group) => ({
      group,
      budgets: byGroup.get(group.id) ?? [],
    })),
    ungrouped,
  };
});

// Count pass-through helpers — BudgetSearchResults's own empty state
// takes over when a section has zero budgets, but we already render a
// tailored "no budgets in this group" line, so we only mount the
// results component when there's actually something to show.
</script>

<div class="space-y-6">
  <!-- Header: group management entry point. Stays close to the list
       so users who think "I need a new group" don't have to hunt. -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold">Budget groups</h2>
      <p class="text-muted-foreground text-sm">
        Budgets bucketed by the groups you've defined. Items in multiple groups appear in each.
      </p>
    </div>
    {#if onCreateGroup}
      <Button onclick={onCreateGroup} size="sm" variant="outline">
        <Plus class="mr-2 h-4 w-4" />
        New group
      </Button>
    {/if}
  </div>

  {#if groupsQuery.isLoading}
    <p class="text-muted-foreground text-sm">Loading groups…</p>
  {:else if sections.groupSections.length === 0 && sections.ungrouped.length === 0}
    <!-- No groups AND no budgets visible — rare; usually the outer
         empty state covers this. -->
    <div class="rounded-lg border p-8 text-center">
      <FolderTree class="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
      <h3 class="mb-2 font-medium">No budget groups yet</h3>
      <p class="text-muted-foreground mb-4 text-sm">
        Create a group to start organizing budgets hierarchically.
      </p>
      {#if onCreateGroup}
        <Button onclick={onCreateGroup} variant="outline" size="sm">
          <Plus class="mr-2 h-4 w-4" />
          Create your first group
        </Button>
      {/if}
    </div>
  {:else}
    <div class="space-y-8">
      {#each sections.groupSections as section (section.group.id)}
        <section class="space-y-3" aria-labelledby="group-heading-{section.group.id}">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3
                  id="group-heading-{section.group.id}"
                  class="text-sm font-semibold tracking-tight">
                  {section.group.name}
                </h3>
                <span class="text-muted-foreground text-xs tabular-nums">
                  · {section.budgets.length}
                </span>
              </div>
              {#if section.group.description}
                <p class="text-muted-foreground mt-0.5 text-xs">
                  {section.group.description}
                </p>
              {/if}
            </div>
            <div class="flex items-center gap-1">
              {#if onEditGroup}
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 w-8 p-0"
                  aria-label="Edit {section.group.name}"
                  onclick={() => onEditGroup?.(section.group)}>
                  <SquarePen class="h-4 w-4" />
                </Button>
              {/if}
              <Button
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive h-8 w-8 p-0"
                aria-label="Delete {section.group.name}"
                onclick={() => handleDelete(section.group)}>
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>

          {#if section.budgets.length > 0}
            <BudgetSearchResults
              budgets={section.budgets}
              isLoading={false}
              {searchQuery}
              {viewMode}
              {pinnedIds}
              {selectedIds}
              {onView}
              {onEdit}
              {onDelete}
              {onDuplicate}
              {onArchive}
              {onBulkDelete}
              {onTogglePin}
              {onSelect}
              {onToggleSelectId}
              {onRangeSelectId} />
          {:else}
            <p class="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
              No budgets in this group.
            </p>
          {/if}
        </section>
      {/each}

      {#if sections.ungrouped.length > 0}
        <Separator />
        <section class="space-y-3" aria-labelledby="ungrouped-heading">
          <div>
            <div class="flex items-center gap-2">
              <h3 id="ungrouped-heading" class="text-sm font-semibold tracking-tight">
                Ungrouped
              </h3>
              <span class="text-muted-foreground text-xs tabular-nums">
                · {sections.ungrouped.length}
              </span>
            </div>
            <p class="text-muted-foreground mt-0.5 text-xs">
              Budgets not assigned to any group.
            </p>
          </div>
          <BudgetSearchResults
            budgets={sections.ungrouped}
            isLoading={false}
            {searchQuery}
            {viewMode}
            {pinnedIds}
            {selectedIds}
            {onView}
            {onEdit}
            {onDelete}
            {onDuplicate}
            {onArchive}
            {onBulkDelete}
            {onTogglePin}
            {onSelect}
            {onToggleSelectId}
            {onRangeSelectId} />
        </section>
      {/if}

      {#if isLoading && sections.groupSections.length === 0 && sections.ungrouped.length === 0}
        <p class="text-muted-foreground text-sm">Loading budgets…</p>
      {/if}
    </div>
  {/if}
</div>

<!-- Delete Budget Group Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete budget group</AlertDialog.Title>
      <AlertDialog.Description>
        {deleteConfirmMessage}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDelete}
        disabled={deleteMutation.isPending}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        {#if deleteMutation.isPending}
          Deleting…
        {:else}
          Delete group
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
