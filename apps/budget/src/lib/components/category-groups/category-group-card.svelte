<script lang="ts">
import { goto } from '$app/navigation';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import type { CategoryGroupWithCounts } from '$lib/schema/category-groups';
import { EllipsisVertical, FolderOpen, Pencil, Trash2, Users } from '@lucide/svelte/icons';

interface Props {
  group: CategoryGroupWithCounts;
  onEdit?: (group: CategoryGroupWithCounts) => void;
  onDelete?: (group: CategoryGroupWithCounts) => void;
  onManageCategories?: (group: CategoryGroupWithCounts) => void;
}

let { group, onEdit, onDelete, onManageCategories }: Props = $props();

// Get dynamic icon or use default
const iconData = $derived(group.groupIcon ? getIconByName(group.groupIcon) : null);
const IconComponent = $derived(iconData?.icon ?? FolderOpen);

// Navigate to group detail page
function viewGroup() {
  goto(`/category-groups/${group.slug}`);
}
</script>

<Card.Root class="cursor-pointer transition-shadow hover:shadow-md" onclick={viewGroup}>
  <Card.Header class="pb-3">
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg"
          style:background-color={group.groupColor || '#6b7280'}>
          <IconComponent class="h-6 w-6 text-white" />
        </div>
        <div>
          <Card.Title class="text-lg">{group.name}</Card.Title>
          {#if group.description}
            <Card.Description class="mt-1 line-clamp-2">
              {group.description}
            </Card.Description>
          {/if}
        </div>
      </div>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              onclick={(e) => e.stopPropagation()}>
              <EllipsisVertical class="h-4 w-4" />
              <span class="sr-only">Open menu</span>
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Item
            onSelect={() => {
              if (onEdit) onEdit(group);
            }}>
            <Pencil class="mr-2 h-4 w-4" />
            Edit Group
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => {
              if (onManageCategories) onManageCategories(group);
            }}>
            <Users class="mr-2 h-4 w-4" />
            Manage Categories
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            class="text-destructive focus:text-destructive"
            onSelect={() => {
              if (onDelete) onDelete(group);
            }}>
            <Trash2 class="mr-2 h-4 w-4" />
            Delete Group
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </Card.Header>

  <Card.Content class="pt-0">
    <div class="text-muted-foreground flex items-center gap-4 text-sm">
      <div class="flex items-center gap-2">
        <Users class="h-4 w-4" />
        <span>{group.memberCount} {group.memberCount === 1 ? 'category' : 'categories'}</span>
      </div>

      {#if group.pendingRecommendationCount > 0}
        <Badge variant="secondary">
          {group.pendingRecommendationCount}
          {group.pendingRecommendationCount === 1 ? 'suggestion' : 'suggestions'}
        </Badge>
      {/if}
    </div>
  </Card.Content>
</Card.Root>
