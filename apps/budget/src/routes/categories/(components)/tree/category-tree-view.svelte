<script lang="ts">
import {Button} from '$lib/components/ui/button';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import FolderOpen from '@lucide/svelte/icons/folder-open';
import Folder from '@lucide/svelte/icons/folder';
import Tag from '@lucide/svelte/icons/tag';
import MoreVertical from '@lucide/svelte/icons/more-vertical';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import Self from './category-tree-view.svelte';
import type {CategoryTreeNode} from '$lib/types/categories';

type Props = {
  nodes: CategoryTreeNode[];
  onView?: ((category: CategoryTreeNode) => void) | undefined;
  onEdit?: ((category: CategoryTreeNode) => void) | undefined;
  onDelete?: ((category: CategoryTreeNode) => void) | undefined;
  onAddChild?: ((parent: CategoryTreeNode) => void) | undefined;
  level?: number | undefined;
};

let {nodes, onView, onEdit, onDelete, onAddChild, level = 0}: Props = $props();

let expandedNodes = $state(new Set<number>());

const toggleExpand = (nodeId: number) => {
  if (expandedNodes.has(nodeId)) {
    expandedNodes.delete(nodeId);
  } else {
    expandedNodes.add(nodeId);
  }
  expandedNodes = new Set(expandedNodes);
};

const isExpanded = (nodeId: number) => expandedNodes.has(nodeId);
</script>

<div class="space-y-1">
  {#each nodes as node}
    {@const hasChildren = node.children && node.children.length > 0}
    {@const expanded = isExpanded(node.id)}

    <div class="group">
      <!-- Node row -->
      <div
        class="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
        style="padding-left: {level * 24 + 8}px">
        <!-- Expand/collapse button -->
        <button
          onclick={() => toggleExpand(node.id)}
          class="hover:bg-muted-foreground/10 flex h-5 w-5 items-center justify-center rounded-sm transition-colors"
          class:invisible={!hasChildren}
          aria-label={expanded ? 'Collapse' : 'Expand'}>
          {#if hasChildren}
            {#if expanded}
              <ChevronDown class="text-muted-foreground h-4 w-4" />
            {:else}
              <ChevronRight class="text-muted-foreground h-4 w-4" />
            {/if}
          {/if}
        </button>

        <!-- Icon -->
        <div class="flex-shrink-0">
          {#if hasChildren}
            {#if expanded}
              <FolderOpen class="text-muted-foreground h-4 w-4" />
            {:else}
              <Folder class="text-muted-foreground h-4 w-4" />
            {/if}
          {:else}
            <Tag class="text-muted-foreground h-4 w-4" />
          {/if}
        </div>

        <!-- Name -->
        <button onclick={() => onView?.(node)} class="flex-1 text-left text-sm hover:underline">
          {node.name}
        </button>

        <!-- Badge for child count -->
        {#if hasChildren}
          <span class="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs">
            {node.children.length}
          </span>
        {/if}

        <!-- Actions menu -->
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100">
              <MoreVertical class="h-4 w-4" />
              <span class="sr-only">Open menu</span>
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            {#if onView}
              <DropdownMenu.Item onclick={() => onView?.(node)}>View Details</DropdownMenu.Item>
            {/if}
            {#if onEdit}
              <DropdownMenu.Item onclick={() => onEdit?.(node)}>Edit</DropdownMenu.Item>
            {/if}
            {#if onAddChild}
              <DropdownMenu.Item onclick={() => onAddChild?.(node)}>
                Add Subcategory
              </DropdownMenu.Item>
            {/if}
            {#if onDelete}
              <DropdownMenu.Separator />
              <DropdownMenu.Item class="text-destructive" onclick={() => onDelete?.(node)}>
                Delete
              </DropdownMenu.Item>
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      <!-- Children (recursive) -->
      {#if hasChildren && expanded}
        <Self nodes={node.children} {onView} {onEdit} {onDelete} {onAddChild} level={level + 1}
        ></Self>
      {/if}
    </div>
  {/each}
</div>
