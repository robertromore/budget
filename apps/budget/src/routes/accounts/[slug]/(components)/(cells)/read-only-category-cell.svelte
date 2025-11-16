<script lang="ts">
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import type { Category } from '$lib/schema';
import Tag from '@lucide/svelte/icons/tag';

let {
  category,
}: {
  category: Category | undefined;
} = $props();

const categoryData = $derived.by(() => {
  if (!category) return {icon: Tag, color: null, name: '—'};

  const iconData = category.categoryIcon ? getIconByName(category.categoryIcon) : null;
  const IconComponent = iconData?.icon || Tag;

  return {
    icon: IconComponent,
    color: category.categoryColor || null,
    name: category.name || '—',
  };
});
</script>

<div class="flex items-center gap-2 text-sm">
  {#if categoryData.color}
    <div class="h-6 w-1 rounded" style={`background-color: ${categoryData.color};`}></div>
  {/if}
  <categoryData.icon
    class="h-4 w-4 shrink-0"
    style={categoryData.color ? `color: ${categoryData.color};` : ''} />
  <span class="truncate">{categoryData.name}</span>
</div>
