<script lang="ts" generics="TEntity extends { name: string }">
import { Button } from '$lib/components/ui/button';
import User from '@lucide/svelte/icons/user';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import type { ComponentType } from 'svelte';

interface Props {
  entity: TEntity;
  onView: (entity: TEntity) => void;
  onEdit: (entity: TEntity) => void;
  onDelete: (entity: TEntity) => void;
  onViewAnalytics: (entity: TEntity) => void;
  entityName: string;
  viewIcon?: ComponentType;
  analyticsIcon?: ComponentType;
  editIcon?: ComponentType;
  deleteIcon?: ComponentType;
}

let {
  entity,
  onView,
  onEdit,
  onDelete,
  onViewAnalytics,
  entityName,
}: Props = $props();
</script>

<div class="flex items-center justify-end gap-1">
  <Button
    onclick={() => onView(entity)}
    variant="ghost"
    size="sm"
    aria-label="View {entityName} {entity.name}">
    <viewIcon class="h-4 w-4"></viewIcon>
  </Button>

  <Button
    onclick={() => onViewAnalytics(entity)}
    variant="ghost"
    size="sm"
    aria-label="View analytics for {entity.name}">
    <analyticsIcon class="h-4 w-4"></analyticsIcon>
  </Button>

  <Button
    onclick={() => onEdit(entity)}
    variant="ghost"
    size="sm"
    aria-label="Edit {entityName} {entity.name}">
    <editIcon class="h-4 w-4"></editIcon>
  </Button>

  <Button
    onclick={() => onDelete(entity)}
    variant="ghost"
    size="sm"
    class="text-destructive hover:text-destructive"
    aria-label="Delete {entityName} {entity.name}">
    <deleteIcon class="h-4 w-4"></deleteIcon>
  </Button>
</div>
