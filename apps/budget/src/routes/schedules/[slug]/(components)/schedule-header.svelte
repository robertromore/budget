<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import type { PageData } from '../$types';
import { formatAmount, formatRecurringPattern, getStatusVariant } from '../(data)';

// Icons
import Activity from '@lucide/svelte/icons/activity';
import RotateCw from '@lucide/svelte/icons/rotate-cw';
import SquarePen from '@lucide/svelte/icons/square-pen';
import Trash from '@lucide/svelte/icons/trash';
import Pause from '@lucide/svelte/icons/pause';
import Play from '@lucide/svelte/icons/play';
let {
  schedule,
  autoAddResult,
  editSchedule,
  toggleStatus,
  deleteSchedule
}: {
  schedule: PageData['schedule'];
  autoAddResult: string | null;
  editSchedule: () => void;
  toggleStatus: () => void;
  deleteSchedule: () => void;
} = $props();
</script>

{#if schedule}
  <!-- Header Section -->
  <div class="flex items-start justify-between gap-4">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight">{schedule.name}</h1>
      <div class="flex items-center gap-2 flex-wrap">
        <Badge variant={getStatusVariant(schedule.status)} class="text-xs">
          <Activity class="h-3 w-3 mr-1" />
          {schedule.status}
        </Badge>
        <span class="text-base font-medium text-muted-foreground">
          {formatAmount(schedule)}
        </span>
        {#if schedule.scheduleDate}
          <Badge variant="outline" class="text-xs">
            <RotateCw class="h-3 w-3 mr-1" />
            {formatRecurringPattern(schedule)}
          </Badge>
        {/if}
      </div>
    </div>

    <div class="flex gap-2 flex-shrink-0">
      <Button variant="outline" onclick={toggleStatus}>
        {#if schedule.status === 'active'}
          <Pause class="mr-2 h-4 w-4" />
          Pause
        {:else}
          <Play class="mr-2 h-4 w-4" />
          Resume
        {/if}
      </Button>
      <Button variant="outline" onclick={editSchedule}>
        <SquarePen class="mr-2 h-4 w-4" />
        Edit
      </Button>
      <Button variant="destructive" onclick={deleteSchedule}>
        <Trash class="mr-2 h-4 w-4" />
        Delete
      </Button>
    </div>
  </div>

  <!-- Auto-add result message -->
  {#if autoAddResult}
    <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
      {autoAddResult}
    </div>
  {/if}
{/if}
