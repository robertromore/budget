<script lang="ts">
import { Button } from '$lib/components/ui/button';
import Tag from '@lucide/svelte/icons/tag';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import type { Category } from '$lib/schema';

interface Props {
  category: Category;
  onView: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onViewAnalytics: (category: Category) => void;
}

let { category, onView, onEdit, onDelete, onViewAnalytics }: Props = $props();
</script>

<div class="flex items-center justify-end gap-1">
  <Button
    onclick={() => onView(category)}
    variant="ghost"
    size="sm"
    aria-label="View category {category.name}">
    <Tag class="h-4 w-4" />
  </Button>

  <Button
    onclick={() => onViewAnalytics(category)}
    variant="ghost"
    size="sm"
    aria-label="View analytics for {category.name}">
    <BarChart3 class="h-4 w-4" />
  </Button>

  <Button
    onclick={() => onEdit(category)}
    variant="ghost"
    size="sm"
    aria-label="Edit category {category.name}">
    <Pencil class="h-4 w-4" />
  </Button>

  <Button
    onclick={() => onDelete(category)}
    variant="ghost"
    size="sm"
    class="text-destructive hover:text-destructive"
    aria-label="Delete category {category.name}">
    <Trash2 class="h-4 w-4" />
  </Button>
</div>
