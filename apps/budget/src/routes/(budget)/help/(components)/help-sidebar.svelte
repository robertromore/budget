<script lang="ts">
import { helpCategories, getTopicsForCategory } from '$lib/content/help/categories';

interface Props {
  activeCategoryId: string | null;
  onCategorySelect: (id: string) => void;
}

let { activeCategoryId, onCategorySelect }: Props = $props();
</script>

<nav class="space-y-1">
  {#each helpCategories as category}
    {@const Icon = category.icon}
    {@const active = activeCategoryId === category.id}
    {@const topicCount = getTopicsForCategory(category.id).length}
    <button
      type="button"
      onclick={() => onCategorySelect(category.id)}
      class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
      class:bg-accent={active}
      class:text-accent-foreground={active}
      class:hover:bg-muted={!active}
      class:text-muted-foreground={!active}>
      <Icon class="h-4 w-4 shrink-0" />
      <span class="flex-1 text-left">{category.label}</span>
      <span class="text-muted-foreground text-xs">{topicCount}</span>
    </button>
  {/each}
</nav>
