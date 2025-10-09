<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import Tag from '@lucide/svelte/icons/tag';
import FolderTree from '@lucide/svelte/icons/folder-tree';
import type { Category } from '$lib/schema';

interface Props {
  category: Category;
}

let { category }: Props = $props();

const iconData = $derived(category.categoryIcon ? getIconByName(category.categoryIcon) : null);
const IconComponent = $derived(iconData?.icon || Tag);
</script>

<div class="flex items-center gap-2">
  <IconComponent
    class="h-4 w-4 flex-shrink-0"
    style={category.categoryColor ? `color: ${category.categoryColor};` : ''}
  />
  <a
    href="/categories/{category.slug}"
    class="font-medium hover:underline"
  >
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
