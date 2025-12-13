<script lang="ts">
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import type { Category } from '$lib/schema/categories';

let {
  categories,
  value = $bindable(null),
  currentCategoryId,
  disabled = false,
  error,
}: {
  categories: Category[];
  value?: number | null | undefined;
  currentCategoryId?: number | undefined;
  disabled?: boolean | undefined;
  error?: string | undefined;
} = $props();

// Filter out current category and its descendants
const availableCategories = $derived.by(() => {
  if (!currentCategoryId) return categories;

  // For now, just filter out the current category
  // TODO: Also filter out descendants when editing
  return categories.filter((cat) => cat.id !== currentCategoryId);
});

// Use accessor pattern for type conversion between number|null and string
const selectValue = $state.raw({
  get value() {
    return value ? value.toString() : '';
  },
  set value(newValue: string) {
    if (!newValue || newValue === '') {
      value = null;
    } else {
      const categoryId = parseInt(newValue);
      value = isNaN(categoryId) ? null : categoryId;
    }
  },
});
</script>

<div class="space-y-2">
  <Label for="parent-category">
    Parent Category
    <span class="text-muted-foreground text-sm font-normal">(optional)</span>
  </Label>

  <Select.Root type="single" bind:value={selectValue.value} {disabled}>
    <Select.Trigger id="parent-category" class={error ? 'border-destructive' : ''}>
      {#if selectValue.value && selectValue.value !== ''}
        {@const category = availableCategories.find((c) => c.id.toString() === selectValue.value)}
        {category?.name || 'Unnamed'}
      {:else}
        <span class="text-muted-foreground">None (Top Level)</span>
      {/if}
    </Select.Trigger>
    <Select.Content>
      <Select.Item value="">
        <span class="text-muted-foreground italic">None (Top Level)</span>
      </Select.Item>
      <Select.Separator />
      {#each availableCategories as category}
        <Select.Item value={category.id.toString()}>
          {#if category.parentId}
            <span class="text-muted-foreground">→</span>
          {/if}
          {category.name}
        </Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>

  {#if error}
    <p class="text-destructive text-sm">{error}</p>
  {/if}

  <p class="text-muted-foreground text-xs">Organize this category under a parent category</p>
</div>
