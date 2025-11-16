<script lang="ts">
import type { EditableEntityItem } from '$lib/types';
import { EntityInput } from '$lib/components/input';
import type { Component as ComponentType } from 'svelte';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import Tag from '@lucide/svelte/icons/tag';
import type { Category } from '$lib/schema';
import { cn } from '$lib/utils';

let {
  value,
  onUpdateValue,
  entityLabel,
  entities,
  management,
  icon,
}: {
  value?: EditableEntityItem;
  onUpdateValue: (newValue: unknown) => void;
  entityLabel: string;
  entities: EditableEntityItem[];
  management: {
    enable: boolean;
    component: ComponentType;
    onSave: (new_value: EditableEntityItem, is_new: boolean) => void;
    onDelete: (id: number) => void;
  };
  icon: ComponentType;
} = $props();

const handleSubmit = (entity?: EditableEntityItem) => {
  onUpdateValue(entity?.id);
};

// Get category-specific icon and color
const categoryData = $derived.by(() => {
  const category = value as Category | undefined;
  if (!category) return { icon: Tag, color: null };

  const iconData = category.categoryIcon ? getIconByName(category.categoryIcon) : null;
  const IconComponent = iconData?.icon || Tag;

  return {
    icon: IconComponent,
    color: category.categoryColor || null,
  };
});
</script>

<div class="relative">
  {#if categoryData.color}
    <div
      class="absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-l"
      style={`background-color: ${categoryData.color};`}>
    </div>
  {/if}
  <EntityInput
    bind:entityLabel
    bind:value
    bind:entities
    icon={categoryData.icon}
    {handleSubmit}
    {management}
    buttonClass={cn('w-48', categoryData.color && 'pl-3')} />
</div>
