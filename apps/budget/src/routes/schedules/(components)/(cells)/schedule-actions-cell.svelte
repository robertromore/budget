<script lang="ts">
import {Button} from '$lib/components/ui/button';
import Eye from '@lucide/svelte/icons/eye';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import type {Schedule} from '$lib/schema/schedules';

interface Props {
  schedule: Schedule;
  onView: (schedule: Schedule) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
}

let {schedule, onView, onEdit, onDelete}: Props = $props();
</script>

<div class="flex items-center justify-end gap-1">
  <Button
    onclick={() => onView(schedule)}
    variant="ghost"
    size="sm"
    aria-label="View schedule {schedule.name}">
    <Eye class="h-4 w-4" />
  </Button>

  <Button
    onclick={() => onEdit(schedule)}
    variant="ghost"
    size="sm"
    aria-label="Edit schedule {schedule.name}">
    <Pencil class="h-4 w-4" />
  </Button>

  <Button
    onclick={() => onDelete(schedule)}
    variant="ghost"
    size="sm"
    class="text-destructive hover:text-destructive"
    aria-label="Delete schedule {schedule.name}">
    <Trash2 class="h-4 w-4" />
  </Button>
</div>
