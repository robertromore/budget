<script lang="ts">
import {Badge} from '$lib/components/ui/badge';
import {getIconByName} from '$lib/components/ui/icon-picker/icon-categories';
import Tag from '@lucide/svelte/icons/tag';
import FolderTree from '@lucide/svelte/icons/folder-tree';
import Folder from '@lucide/svelte/icons/folder';
import type {CategoryWithGroup} from '$lib/server/domains/categories/repository';

interface Props {
  category: CategoryWithGroup;
}

let {category}: Props = $props();

const iconData = $derived(category.categoryIcon ? getIconByName(category.categoryIcon) : null);
const IconComponent = $derived(iconData?.icon || Tag);

const groupIconData = $derived(category.groupIcon ? getIconByName(category.groupIcon) : null);
const GroupIconComponent = $derived(groupIconData?.icon || Folder);
</script>

<div class="flex items-center gap-2">
  {#if category.groupIcon}
    <div
      class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded"
      style:background-color={category.groupColor || '#6b7280'}
      title={category.groupName || 'Group'}>
      <GroupIconComponent class="h-3 w-3 text-white" />
    </div>
  {/if}
  <IconComponent
    class="h-4 w-4 flex-shrink-0"
    style={category.categoryColor ? `color: ${category.categoryColor};` : ''} />
  <a href="/categories/{category.slug}" class="font-medium hover:underline">
    {category.name || 'Unnamed Category'}
  </a>
  {#if category.parentId}
    <Badge variant="outline" class="text-xs">
      <FolderTree class="mr-1 h-3 w-3" />
      Subcategory
    </Badge>
  {/if}
  {#if !category.isActive}
    <Badge variant="outline" class="text-xs">Inactive</Badge>
  {/if}
</div>
